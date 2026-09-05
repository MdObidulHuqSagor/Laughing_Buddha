import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { promoCodes } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ promos: await db.select().from(promoCodes).orderBy(desc(promoCodes.createdAt)) });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await request.json().catch(() => null)) as Record<string, string | number | boolean | null> | null;
  const code = String(body?.code ?? "").trim().toUpperCase();
  const value = Number(body?.discountValue);
  if (!code || !Number.isFinite(value) || value <= 0) {
    return NextResponse.json({ error: "Code and a positive discount are required." }, { status: 400 });
  }
  const [promo] = await db.insert(promoCodes).values({
    code,
    description: String(body?.description ?? "").slice(0, 160),
    discountType: body?.discountType === "fixed" ? "fixed" : "percent",
    discountValue: value.toFixed(2),
    minOrder: Number(body?.minOrder ?? 0).toFixed(2),
    maxUses: body?.maxUses ? Number(body.maxUses) : null,
  }).returning();
  await recordAudit({ userId: session.userId, action: "promo_created", entity: "promo", entityId: promo.id, detail: promo.code });
  return NextResponse.json({ promo }, { status: 201 });
}

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await request.json().catch(() => null)) as { id?: string; isActive?: boolean } | null;
  if (!body?.id) return NextResponse.json({ error: "Missing promo id." }, { status: 400 });
  const [promo] = await db.update(promoCodes).set({ isActive: Boolean(body.isActive) }).where(eq(promoCodes.id, body.id)).returning();
  if (promo) await recordAudit({ userId: session.userId, action: "promo_toggled", entity: "promo", entityId: promo.id, detail: String(promo.isActive) });
  return promo ? NextResponse.json({ promo }) : NextResponse.json({ error: "Not found." }, { status: 404 });
}
