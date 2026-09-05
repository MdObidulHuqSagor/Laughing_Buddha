import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { restaurantTables } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tables = await db.select().from(restaurantTables);
  return NextResponse.json({ tables }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => null)) as {
    tableNumber?: number | string;
    zone?: string;
    seats?: number | string;
  } | null;

  const tableNumber = Number(body?.tableNumber);
  const seats = Number(body?.seats);
  const zone = body?.zone?.trim() || "Main Hall";

  if (!Number.isInteger(tableNumber) || tableNumber < 1) {
    return NextResponse.json({ error: "Enter a valid table number." }, { status: 400 });
  }

  if (!Number.isInteger(seats) || seats < 1 || seats > 100) {
    return NextResponse.json({ error: "Seats must be between 1 and 100." }, { status: 400 });
  }
  if (zone.length > 100) {
    return NextResponse.json({ error: "Zone must be 100 characters or fewer." }, { status: 400 });
  }

  try {
    const [table] = await db
      .insert(restaurantTables)
      .values({ tableNumber, zone, seats })
      .returning();
    return NextResponse.json({ table }, { status: 201 });
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "23505"
    ) {
      return NextResponse.json(
        { error: `Table ${tableNumber} already exists.` },
        { status: 409 },
      );
    }
    throw error;
  }
}

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await request.json().catch(() => null)) as { id?: string; status?: string } | null;
  if (!body?.id || !["available", "occupied", "reserved"].includes(body.status ?? "")) {
    return NextResponse.json({ error: "A valid table and status are required." }, { status: 400 });
  }
  const [table] = await db
    .update(restaurantTables)
    .set({ status: body.status })
    .where(eq(restaurantTables.id, body.id))
    .returning();
  if (!table) return NextResponse.json({ error: "Table not found." }, { status: 404 });
  await recordAudit({ userId: session.userId, action: "table_status_changed", entity: "table", entityId: body.id, detail: body.status });
  return NextResponse.json({ table });
}
