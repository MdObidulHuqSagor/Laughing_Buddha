import { NextResponse } from "next/server";
import { db } from "@/db";
import { bookings } from "@/db/schema";
import { ensureSeeded } from "@/db/seed";
import { getSession } from "@/lib/auth";
import { listBookings } from "@/lib/queries";
import { notifyOwner } from "@/lib/notify";

export const dynamic = "force-dynamic";

/** Admin: reservation book. */
export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const upcomingOnly = new URL(request.url).searchParams.get("all") !== "1";
  const rows = await listBookings(upcomingOnly);
  return NextResponse.json(
    { bookings: rows, serverTime: new Date().toISOString() },
    { headers: { "Cache-Control": "no-store" } },
  );
}

/** Public: direct seat booking (anon insert). */
export async function POST(request: Request) {
  await ensureSeeded();
  const body = (await request.json().catch(() => null)) as {
    name?: string;
    phone?: string;
    date?: string;
    time?: string;
    guests?: number | string;
    specialRequest?: string;
  } | null;

  const name = body?.name?.trim();
  const phone = body?.phone?.trim();
  const date = body?.date?.trim();
  const time = body?.time?.trim();
  const guests = Number(body?.guests);

  const errors: Record<string, string> = {};
  if (!name || name.length < 2) errors.name = "Please tell us your name.";
  if (!phone || phone.replace(/\D/g, "").length < 8) errors.phone = "A reachable phone is needed.";
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) errors.date = "Pick a date.";
  if (!time || !/^\d{2}:\d{2}$/.test(time)) errors.time = "Pick a time.";
  if (!Number.isFinite(guests) || guests < 1 || guests > 30)
    errors.guests = "Guests must be between 1 and 30.";

  if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const today = new Date().toISOString().slice(0, 10);
    if (date < today) errors.date = "Please choose today or a future date.";
  }

  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ error: "Please check the form.", errors }, { status: 400 });
  }

  const [created] = await db
    .insert(bookings)
    .values({
      name: name!,
      phone: phone!,
      date: date!,
      time: time!,
      guests: Math.floor(guests),
      specialRequest: body?.specialRequest?.trim().slice(0, 400) || null,
      status: "pending",
    })
    .returning();

  void notifyOwner({
    subject: `New reservation · ${name} · ${date} ${time}`,
    body: [
      `Guest: ${name}`,
      `Phone: ${phone}`,
      `When: ${date} at ${time}`,
      `Guests: ${Math.floor(guests)}`,
      body?.specialRequest ? `Request: ${body.specialRequest}` : "Request: —",
    ].join("\n"),
  });

  return NextResponse.json({
    booking: {
      id: created.id,
      name: created.name,
      date: created.date,
      time: created.time,
      guests: created.guests,
      status: created.status,
    },
  });
}
