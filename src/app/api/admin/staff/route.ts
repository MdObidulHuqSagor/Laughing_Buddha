import { NextResponse } from "next/server";
import { asc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { adminSessions, adminUsers } from "@/db/schema";
import { getSession, hashPassword } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export type StaffDTO = {
  id: string;
  email: string;
  fullName: string;
  createdAt: string;
  activeSessions: number;
  isSelf: boolean;
  role: string;
  permissions: string[];
};

/** List every staff login that can reach the dashboard. */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await db
    .select({
      id: adminUsers.id,
      email: adminUsers.email,
      fullName: adminUsers.fullName,
      createdAt: adminUsers.createdAt,
      role: adminUsers.role,
      permissions: adminUsers.permissions,
      activeSessions: sql<number>`(
        select count(*)::int from ${adminSessions}
        where ${adminSessions.userId} = ${adminUsers.id}
          and ${adminSessions.expiresAt} > now()
      )`,
    })
    .from(adminUsers)
    .orderBy(asc(adminUsers.createdAt));

  const staff: StaffDTO[] = rows.map((row) => ({
    id: row.id,
    email: row.email,
    fullName: row.fullName,
    createdAt: row.createdAt.toISOString(),
    activeSessions: Number(row.activeSessions ?? 0),
    isSelf: row.id === session.userId,
    role: row.role,
    permissions: row.permissions ?? [],
  }));

  return NextResponse.json({ staff }, { headers: { "Cache-Control": "no-store" } });
}

/** Create a new staff login manually (owner adds a manager / floor lead). */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => null)) as {
    email?: string;
    fullName?: string;
    password?: string;
    role?: string;
    permissions?: string[];
  } | null;

  const email = body?.email?.trim().toLowerCase();
  const fullName = body?.fullName?.trim();
  const password = body?.password ?? "";

  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  if (!fullName || fullName.length < 2) {
    return NextResponse.json({ error: "Enter the staff member's name." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters." },
      { status: 400 },
    );
  }

  const [existing] = await db
    .select({ id: adminUsers.id })
    .from(adminUsers)
    .where(eq(adminUsers.email, email))
    .limit(1);
  if (existing) {
    return NextResponse.json({ error: "That email already has a login." }, { status: 409 });
  }

  const [created] = await db
    .insert(adminUsers)
    .values({
      email,
      fullName,
      passwordHash: hashPassword(password),
      role: body?.role?.trim() || "staff",
      permissions: Array.isArray(body?.permissions) ? body.permissions : ["orders"],
    })
    .returning({
      id: adminUsers.id,
      email: adminUsers.email,
      fullName: adminUsers.fullName,
      createdAt: adminUsers.createdAt,
      role: adminUsers.role,
      permissions: adminUsers.permissions,
    });
  await recordAudit({ userId: session.userId, action: "staff_created", entity: "staff", entityId: created.id, detail: created.email });

  return NextResponse.json({
    staff: {
      ...created,
      createdAt: created.createdAt.toISOString(),
      activeSessions: 0,
      isSelf: false,
      role: created.role,
      permissions: created.permissions ?? [],
    } satisfies StaffDTO,
  });
}
