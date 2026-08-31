import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { menuItems } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { CATEGORIES } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = (await request.json().catch(() => null)) as {
    name?: string;
    description?: string;
    price?: number | string;
    category?: string;
    imageUrl?: string | null;
    isAvailable?: boolean;
  } | null;

  if (!body) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const patch: Partial<typeof menuItems.$inferInsert> = { updatedAt: new Date() };

  if (body.name !== undefined) {
    const name = body.name.trim();
    if (!name) return NextResponse.json({ error: "Name is required." }, { status: 400 });
    patch.name = name;
  }
  if (body.description !== undefined) patch.description = body.description.trim();
  if (body.price !== undefined) {
    const price = Number(body.price);
    if (!Number.isFinite(price) || price <= 0)
      return NextResponse.json({ error: "Enter a valid price." }, { status: 400 });
    patch.price = price.toFixed(2);
  }
  if (body.category !== undefined) {
    if (!(CATEGORIES as readonly string[]).includes(body.category))
      return NextResponse.json({ error: "Pick a valid category." }, { status: 400 });
    patch.category = body.category;
  }
  if (body.imageUrl !== undefined) patch.imageUrl = body.imageUrl?.trim() || null;
  if (body.isAvailable !== undefined) patch.isAvailable = body.isAvailable;

  const [updated] = await db
    .update(menuItems)
    .set(patch)
    .where(eq(menuItems.id, id))
    .returning();

  if (!updated) return NextResponse.json({ error: "Item not found" }, { status: 404 });
  return NextResponse.json({ item: { ...updated, price: Number(updated.price) } });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const [deleted] = await db.delete(menuItems).where(eq(menuItems.id, id)).returning();
  if (!deleted) return NextResponse.json({ error: "Item not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
