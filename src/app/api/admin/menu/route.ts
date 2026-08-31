import { NextResponse } from "next/server";
import { db } from "@/db";
import { menuItems } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { CATEGORIES } from "@/lib/constants";
import { getMenu } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const items = await getMenu(false);
  return NextResponse.json({ items }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => null)) as {
    name?: string;
    description?: string;
    price?: number | string;
    category?: string;
    imageUrl?: string | null;
    isAvailable?: boolean;
  } | null;

  const name = body?.name?.trim();
  const price = Number(body?.price);
  const category = body?.category;

  if (!name) return NextResponse.json({ error: "Name is required." }, { status: 400 });
  if (!Number.isFinite(price) || price <= 0)
    return NextResponse.json({ error: "Enter a valid price." }, { status: 400 });
  if (!category || !(CATEGORIES as readonly string[]).includes(category))
    return NextResponse.json({ error: "Pick a valid category." }, { status: 400 });

  const [created] = await db
    .insert(menuItems)
    .values({
      name,
      description: body?.description?.trim() ?? "",
      price: price.toFixed(2),
      category,
      imageUrl: body?.imageUrl?.trim() || null,
      isAvailable: body?.isAvailable ?? true,
    })
    .returning();

  return NextResponse.json({ item: { ...created, price: Number(created.price) } });
}
