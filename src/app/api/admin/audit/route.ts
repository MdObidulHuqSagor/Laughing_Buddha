import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { auditLogs, adminUsers } from "@/db/schema";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const logs = await db.select({
    id: auditLogs.id,
    action: auditLogs.action,
    entity: auditLogs.entity,
    entityId: auditLogs.entityId,
    detail: auditLogs.detail,
    createdAt: auditLogs.createdAt,
    userName: adminUsers.fullName,
  }).from(auditLogs).leftJoin(adminUsers, eq(adminUsers.id, auditLogs.userId))
    .orderBy(desc(auditLogs.createdAt)).limit(100);
  return NextResponse.json({ logs });
}
