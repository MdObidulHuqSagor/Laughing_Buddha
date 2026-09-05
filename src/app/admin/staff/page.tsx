import { asc, sql } from "drizzle-orm";
import StaffManager from "@/components/admin/StaffManager";
import { db } from "@/db";
import { adminSessions, adminUsers } from "@/db/schema";
import { ensureSeeded } from "@/db/seed";
import { requireAdmin } from "@/lib/auth";
import type { StaffDTO } from "@/app/api/admin/staff/route";

export const dynamic = "force-dynamic";

export const metadata = { title: "Staff logins · Laughing Buddha" };

export default async function AdminStaffPage() {
  const session = await requireAdmin();
  await ensureSeeded();

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

  return <StaffManager initialStaff={staff} currentEmail={session.email} />;
}
