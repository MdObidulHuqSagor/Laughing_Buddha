import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { getOrderById } from "@/lib/queries";
import { recordAudit } from "@/lib/audit";
import { ORDER_STATUSES } from "@/lib/constants";

export const dynamic = "force-dynamic";

/** Public: a guest polls their own order id to follow its status. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await getOrderById(id);
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  return NextResponse.json({ order }, { headers: { "Cache-Control": "no-store" } });
}

/** Admin: advance the kitchen status (pending → preparing → served → paid). */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = (await request.json().catch(() => null)) as { status?: string; paymentMethod?: string } | null;
  const status = body?.status;
  const paymentMethod = body?.paymentMethod;
  if (paymentMethod && !["cash", "card", "mobile"].includes(paymentMethod)) {
    return NextResponse.json({ error: "Invalid payment method" }, { status: 400 });
  }

  if ((!status || !(ORDER_STATUSES as readonly string[]).includes(status)) && !body?.paymentMethod) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const [updated] = await db
    .update(orders)
    .set({
      ...(status ? { status } : {}),
      ...(paymentMethod ? { paymentMethod } : {}),
      updatedAt: new Date(),
    })
    .where(eq(orders.id, id))
    .returning();

  if (!updated) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  await recordAudit({
    userId: session.userId,
    action: status ? `order_${status}` : "payment_updated",
    entity: "order",
    entityId: id,
    detail: paymentMethod ?? status,
  });
  return NextResponse.json({ ok: true, status: updated.status });
}
