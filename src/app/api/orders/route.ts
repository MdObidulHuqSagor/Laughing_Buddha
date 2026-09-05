import { NextResponse } from "next/server";
import { and, eq, gte, inArray, isNull, lte, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { menuItems, orders, promoCodes, type OrderItem } from "@/db/schema";
import { ensureSeeded } from "@/db/seed";
import { getSession } from "@/lib/auth";
import { getTable, listRecentOrders } from "@/lib/queries";
import { notifyOwner } from "@/lib/notify";
import { formatMoney } from "@/lib/constants";

export const dynamic = "force-dynamic";

type IncomingItem = { menuItemId?: string; quantity?: number; note?: string };

/** Admin: live order feed (polled by the dashboard for realtime updates). */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const items = await listRecentOrders(60);
  return NextResponse.json(
    { orders: items, serverTime: new Date().toISOString() },
    { headers: { "Cache-Control": "no-store" } },
  );
}

/** Public: place an order from a table (anon insert, like the Supabase RLS policy). */
export async function POST(request: Request) {
  await ensureSeeded();
  const body = (await request.json().catch(() => null)) as {
    tableId?: string;
    items?: IncomingItem[];
    customerName?: string;
    customerPhone?: string;
    paymentMethod?: string;
    promoCode?: string;
    note?: string;
  } | null;

  const incoming = (body?.items ?? []).filter(
    (i) => typeof i.menuItemId === "string" && Number(i.quantity) > 0,
  );

  if (!body?.tableId) {
    return NextResponse.json({ error: "Missing table." }, { status: 400 });
  }
  if (incoming.length === 0) {
    return NextResponse.json({ error: "Your cart is empty." }, { status: 400 });
  }

  const table = await getTable(body.tableId);
  if (!table) {
    return NextResponse.json({ error: "Unknown table." }, { status: 404 });
  }

  const ids = incoming.map((i) => i.menuItemId as string);
  const rows = await db.select().from(menuItems).where(inArray(menuItems.id, ids));
  const byId = new Map(rows.map((row) => [row.id, row]));

  const unavailable = ids.filter((id) => !byId.get(id)?.isAvailable);
  if (unavailable.length > 0) {
    return NextResponse.json(
      {
        error: "Some dishes just sold out. Please review your cart.",
        unavailable,
      },
      { status: 409 },
    );
  }

  // Prices are always re-read from the DB — never trusted from the client.
  const orderItems: OrderItem[] = incoming.map((i) => {
    const row = byId.get(i.menuItemId as string)!;
    return {
      menuItemId: row.id,
      name: row.name,
      price: Number(row.price),
      quantity: Math.min(20, Math.max(1, Math.floor(Number(i.quantity)))),
      note: i.note?.trim() ? i.note.trim().slice(0, 240) : undefined,
    };
  });

  const subtotal = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  let discount = 0;
  const promoCode = body.promoCode?.trim().toUpperCase();
  if (promoCode) {
    const [promo] = await db.select().from(promoCodes).where(and(
      eq(promoCodes.code, promoCode),
      eq(promoCodes.isActive, true),
      lte(promoCodes.minOrder, subtotal.toFixed(2)),
      or(isNull(promoCodes.maxUses), sql`${promoCodes.usedCount} < ${promoCodes.maxUses}`),
      or(isNull(promoCodes.startsAt), lte(promoCodes.startsAt, new Date())),
      or(isNull(promoCodes.endsAt), gte(promoCodes.endsAt, new Date())),
    )).limit(1);
    if (promo) {
      discount = promo.discountType === "fixed"
        ? Math.min(subtotal, Number(promo.discountValue))
        : Math.min(subtotal, subtotal * Number(promo.discountValue) / 100);
      await db.update(promoCodes).set({ usedCount: promo.usedCount + 1 }).where(eq(promoCodes.id, promo.id));
    }
  }
  const total = Math.max(0, subtotal - discount);
  const paymentMethod =
    body.paymentMethod && ["cash", "card", "mobile"].includes(body.paymentMethod)
      ? body.paymentMethod
      : "cash";

  const [created] = await db
    .insert(orders)
    .values({
      tableId: table.id,
      items: orderItems,
      totalPrice: total.toFixed(2),
      discountAmount: discount.toFixed(2),
      promoCode: discount > 0 ? promoCode : null,
      status: "pending",
      customerName: body.customerName?.trim().slice(0, 80) || null,
      customerPhone: body.customerPhone?.trim().slice(0, 40) || null,
      paymentMethod,
      note: body.note?.trim().slice(0, 300) || null,
    })
    .returning();

  void notifyOwner({
    subject: `New order · Table ${table.tableNumber} · ${formatMoney(total)}`,
    body: orderItems
      .map((i) => `${i.quantity} × ${i.name}${i.note ? ` (${i.note})` : ""}`)
      .join("\n"),
  });

  return NextResponse.json({
    order: {
      id: created.id,
      status: created.status,
      totalPrice: Number(created.totalPrice),
      itemCount: orderItems.reduce((sum, i) => sum + i.quantity, 0),
    },
  });
}
