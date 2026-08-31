import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { adminSessions, adminUsers } from "@/db/schema";
import { getSession, hashPassword } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Rename a staff member or reset their password. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = (await request.json().catch(() => null)) as {
    fullName?: string;
    password?: string;
  } | null;

  const patch: Partial<typeof adminUsers.$inferInsert> = {};

  if (body?.fullName !== undefined) {
    const fullName = body.fullName.trim();
    if (fullName.length < 2) {
      return NextResponse.json({ error: "Enter a valid name." }, { status: 400 });
    }
    patch.fullName = fullName;
  }

  if (body?.password !== undefined && body.password !== "") {
    if (body.password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 },
      );
    }
    patch.passwordHash = hashPassword(body.password);
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  const [updated] = await db
    .update(adminUsers)
    .set(patch)
    .where(eq(adminUsers.id, id))
    .returning({ id: adminUsers.id });

  if (!updated) return NextResponse.json({ error: "Staff member not found." }, { status: 404 });

  // A password reset signs that person out everywhere except the current session.
  if (patch.passwordHash) {
    await db.delete(adminSessions).where(eq(adminSessions.userId, id));
  }

  return NextResponse.json({ ok: true, signedOut: Boolean(patch.passwordHash) });
}

/** Remove a staff login. You cannot delete yourself or the last remaining account. */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (id === session.userId) {
    return NextResponse.json(
      { error: "You cannot delete the account you are signed in with." },
      { status: 400 },
    );
  }

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(adminUsers);
  if (Number(count) <= 1) {
    return NextResponse.json(
      { error: "At least one staff login must remain." },
      { status: 400 },
    );
  }

  const [deleted] = await db
    .delete(adminUsers)
    .where(eq(adminUsers.id, id))
    .returning({ id: adminUsers.id });

  if (!deleted) return NextResponse.json({ error: "Staff member not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
