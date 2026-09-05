import { db } from "@/db";
import { auditLogs } from "@/db/schema";

export async function recordAudit(input: {
  userId?: string;
  action: string;
  entity: string;
  entityId?: string;
  detail?: string;
}) {
  try {
    await db.insert(auditLogs).values({
      userId: input.userId ?? null,
      action: input.action,
      entity: input.entity,
      entityId: input.entityId ?? null,
      detail: input.detail?.slice(0, 500) ?? null,
    });
  } catch {
    // Audit logging must never prevent an order or reservation update.
  }
}
