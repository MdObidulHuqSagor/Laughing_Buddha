import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { restaurantSettings } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const [settings] = await db.select().from(restaurantSettings).where(eq(restaurantSettings.id, 1)).limit(1);
  return NextResponse.json({ settings: settings ?? null });
}

export async function PUT(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await request.json().catch(() => null)) as {
    address?: string; phone?: string; taxRate?: number; serviceChargeRate?: number;
    hours?: { days: string; time: string }[];
  } | null;
  const values = {
    address: String(body?.address ?? "").slice(0, 300),
    phone: String(body?.phone ?? "").slice(0, 60),
    taxRate: Number(body?.taxRate ?? 0).toFixed(2),
    serviceChargeRate: Number(body?.serviceChargeRate ?? 0).toFixed(2),
    hours: Array.isArray(body?.hours) ? body.hours.slice(0, 14) : [],
    updatedAt: new Date(),
  };
  const [settings] = await db.insert(restaurantSettings).values({ id: 1, ...values })
    .onConflictDoUpdate({ target: restaurantSettings.id, set: values }).returning();
  await recordAudit({ userId: session.userId, action: "settings_updated", entity: "restaurant_settings", entityId: "1" });
  return NextResponse.json({ settings });
}
