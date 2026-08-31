import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { adminSessions, adminUsers } from "@/db/schema";
import { SESSION_COOKIE } from "@/lib/session-cookie";

export { SESSION_COOKIE };
const SESSION_DAYS = 7;

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const derived = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  if (expected.length !== derived.length) return false;
  return timingSafeEqual(derived, expected);
}

export type AdminSession = {
  userId: string;
  email: string;
  fullName: string;
};

/**
 * Works out how the session cookie must be flagged for the current request.
 *
 * The dashboard is frequently opened inside an iframe (preview panes, embedded
 * back-office widgets). In that cross-site context a `SameSite=Lax` cookie is
 * never sent back by the browser, so the user appears to "log in" and then gets
 * bounced straight to the login page again.
 *
 * Over HTTPS we therefore issue `SameSite=None; Secure; Partitioned` (CHIPS),
 * which is the only combination Chrome/Safari accept in a third-party frame.
 * Over plain HTTP (local dev) `Secure` cookies are rejected outright, so we
 * fall back to `Lax`, which is correct for a same-site localhost session.
 */
const DEV_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0", "[::1]", "::1"]);

async function cookieSecurity(): Promise<{
  sameSite: "lax" | "none";
  secure: boolean;
  partitioned: boolean;
}> {
  try {
    const headerList = await headers();
    const host = (headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "")
      .split(",")[0]
      .trim()
      .toLowerCase();
    const hostname = host.replace(/:\d+$/, "");

    // NOTE: we deliberately key off the hostname rather than
    // `x-forwarded-proto`. Many hosting proxies terminate TLS and then forward
    // the request over plain HTTP, so the header reports "http" even though the
    // browser is on HTTPS — which would leave us issuing a Lax cookie that an
    // embedded frame can never send back.
    const isLocal = DEV_HOSTS.has(hostname) || hostname.endsWith(".local");
    if (!isLocal) {
      return { sameSite: "none", secure: true, partitioned: true };
    }
  } catch {
    /* no request scope — fall through to the safe default */
  }
  return { sameSite: "lax", secure: false, partitioned: false };
}

export async function createSession(userId: string): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await db.insert(adminSessions).values({ token, userId, expiresAt });

  const { sameSite, secure, partitioned } = await cookieSecurity();
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite,
    secure,
    partitioned,
    path: "/",
    expires: expiresAt,
  });
  return token;
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.delete(adminSessions).where(eq(adminSessions.token, token));
  }
  // Clearing must repeat the flags the cookie was written with, otherwise the
  // browser keeps the original (Secure/None/Partitioned) copy alive.
  const { sameSite, secure, partitioned } = await cookieSecurity();
  jar.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite,
    secure,
    partitioned,
    path: "/",
    maxAge: 0,
  });
}

export async function getSession(): Promise<AdminSession | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const rows = await db
    .select({
      userId: adminUsers.id,
      email: adminUsers.email,
      fullName: adminUsers.fullName,
    })
    .from(adminSessions)
    .innerJoin(adminUsers, eq(adminUsers.id, adminSessions.userId))
    .where(and(eq(adminSessions.token, token), gt(adminSessions.expiresAt, new Date())))
    .limit(1);
  return rows[0] ?? null;
}

export async function requireAdmin(): Promise<AdminSession> {
  const session = await getSession();
  if (!session) redirect("/admin/login");
  return session;
}
