import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { inventoryItems } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const items = await db.select().from(inventoryItems).orderBy(asc(inventoryItems.name));
  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await request.json().catch(() => null)) as Record<string, string | number> | null;
  const name = String(body?.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "Name is required." }, { status: 400 });
  const [item] = await db.insert(inventoryItems).values({
    name,
    unit: String(body?.unit ?? "pcs"),
    quantity: Number(body?.quantity ?? 0).toFixed(2),
    lowStockThreshold: Number(body?.lowStockThreshold ?? 5).toFixed(2),
  }).returning();
  await recordAudit({ userId: session.userId, action: "inventory_added", entity: "inventory", entityId: item.id, detail: item.name });
  return NextResponse.json({ item }, { status: 201 });
}

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await request.json().catch(() => null)) as { id?: string; quantity?: number; lowStockThreshold?: number } | null;
  if (!body?.id) return NextResponse.json({ error: "Missing inventory id." }, { status: 400 });
  const [item] = await db.update(inventoryItems).set({
    ...(body.quantity === undefined ? {} : { quantity: Number(body.quantity).toFixed(2) }),
    ...(body.lowStockThreshold === undefined ? {} : { lowStockThreshold: Number(body.lowStockThreshold).toFixed(2) }),
    updatedAt: new Date(),
  }).where(eq(inventoryItems.id, body.id)).returning();
  if (item) await recordAudit({ userId: session.userId, action: "inventory_updated", entity: "inventory", entityId: item.id, detail: item.name });
  return item ? NextResponse.json({ item }) : NextResponse.json({ error: "Not found." }, { status: 404 });
}
