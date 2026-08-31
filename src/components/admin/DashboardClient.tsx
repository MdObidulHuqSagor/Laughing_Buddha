"use client";

import { useCallback, useEffect, useState } from "react";
import PopularChart from "@/components/admin/PopularChart";
import { LogoLockup, LogoMark } from "@/components/Logo";
import { NEXT_ORDER_STATUS, formatMoney, type OrderStatus } from "@/lib/constants";
import type { BookingDTO, DashboardStats, OrderDTO } from "@/lib/queries";

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 border-amber-200",
  preparing: "bg-sky-100 text-sky-800 border-sky-200",
  served: "bg-emerald-100 text-emerald-800 border-emerald-200",
  paid: "bg-neutral-200 text-neutral-700 border-neutral-300",
};

const BOOKING_STYLE: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  confirmed: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-red-100 text-red-700",
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function DashboardClient({
  initialStats,
  initialOrders,
  initialBookings,
}: {
  initialStats: DashboardStats;
  initialOrders: OrderDTO[];
  initialBookings: BookingDTO[];
}) {
  const [stats, setStats] = useState(initialStats);
  const [orders, setOrders] = useState(initialOrders);
  const [bookings, setBookings] = useState(initialBookings);
  const [busy, setBusy] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<string>(new Date().toISOString());
  const [showPaid, setShowPaid] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [ordersRes, bookingsRes, statsRes] = await Promise.all([
        fetch("/api/orders", { cache: "no-store" }),
        fetch("/api/bookings", { cache: "no-store" }),
        fetch("/api/admin/stats", { cache: "no-store" }),
      ]);
      if (ordersRes.ok) {
        const data = (await ordersRes.json()) as { orders: OrderDTO[] };
        setOrders(data.orders);
      }
      if (bookingsRes.ok) {
        const data = (await bookingsRes.json()) as { bookings: BookingDTO[] };
        setBookings(data.bookings);
      }
      if (statsRes.ok) {
        const data = (await statsRes.json()) as { stats: DashboardStats };
        setStats(data.stats);
      }
      setLastSync(new Date().toISOString());
    } catch {
      /* keep last known state */
    }
  }, []);

  /** Realtime-style order feed (5s poll — swap for supabase.channel() in prod). */
  useEffect(() => {
    const timer = setInterval(refresh, 5000);
    return () => clearInterval(timer);
  }, [refresh]);

  async function advanceOrder(order: OrderDTO) {
    const next = NEXT_ORDER_STATUS[order.status as OrderStatus];
    if (!next) return;
    setBusy(order.id);
    setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, status: next } : o)));
    await fetch(`/api/orders/${order.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    await refresh();
    setBusy(null);
  }

  async function setBookingStatus(booking: BookingDTO, status: string) {
    setBusy(booking.id);
    setBookings((prev) => prev.map((b) => (b.id === booking.id ? { ...b, status } : b)));
    await fetch(`/api/bookings/${booking.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    await refresh();
    setBusy(null);
  }

  const today = new Date().toISOString().slice(0, 10);
  const visibleOrders = orders.filter((order) => showPaid || order.status !== "paid");
  const todaysBookings = bookings.filter((booking) => booking.date === today);
  const upcomingBookings = bookings.filter((booking) => booking.date > today).slice(0, 6);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-center gap-4">
          <LogoMark size={54} rounded="rounded-2xl" className="hidden sm:inline-grid" />
          <div>
            <h1 className="font-display text-3xl font-semibold text-chili-900">Service overview</h1>
            <p className="mt-1 text-sm text-ink/55">
              Live tickets, reservations and sales for{" "}
              {new Date().toLocaleDateString("en-GB", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </p>
          </div>
        </div>
        <p className="flex items-center gap-2 text-xs text-ink/45">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
          live · synced {timeAgo(lastSync)}
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Today's sales (paid)"
          value={formatMoney(stats.todaySales)}
          sub={`${stats.todayPaidOrders} settled tickets`}
          accent
        />
        <StatCard
          label="Open tickets"
          value={String(stats.openOrders)}
          sub="pending · preparing · served"
        />
        <StatCard label="Last 7 days" value={formatMoney(stats.weekSales)} sub="paid revenue" />
        <StatCard
          label="Covers booked today"
          value={String(stats.todayGuests)}
          sub={`${todaysBookings.length} reservations`}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        {/* Live orders */}
        <section className="rounded-3xl border border-black/5 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-xl font-semibold text-chili-900">
              Incoming orders
              <span className="ml-2 rounded-full bg-chili-50 px-2 py-0.5 text-xs font-semibold text-chili-700">
                {visibleOrders.length}
              </span>
            </h2>
            <label className="flex items-center gap-2 text-xs text-ink/55">
              <input
                type="checkbox"
                checked={showPaid}
                onChange={(event) => setShowPaid(event.target.checked)}
                className="accent-chili-600"
              />
              show paid
            </label>
          </div>

          <ul className="mt-4 max-h-[34rem] space-y-3 overflow-y-auto pr-1">
            {visibleOrders.length === 0 && (
              <li className="py-10 text-center text-sm text-ink/45">
                <LogoMark size={56} rounded="rounded-2xl" className="mb-3 opacity-70" />
                <p>No open tickets. The kitchen is calm.</p>
              </li>
            )}
            {visibleOrders.map((order) => {
              const next = NEXT_ORDER_STATUS[order.status as OrderStatus];
              return (
                <li
                  key={order.id}
                  className="rounded-2xl border border-black/5 bg-[#fbf8f3] p-4 transition hover:border-gold-500/40"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-ink">
                        Table {order.tableNumber ?? "—"}
                        <span className="ml-2 text-xs font-normal text-ink/40">
                          #{order.id.slice(0, 8).toUpperCase()}
                        </span>
                      </p>
                      <p className="text-xs text-ink/50">
                        {timeAgo(order.createdAt)}
                        {order.customerName ? ` · ${order.customerName}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold capitalize ${
                          STATUS_STYLE[order.status] ?? ""
                        }`}
                      >
                        {order.status}
                      </span>
                      <span className="text-sm font-semibold text-chili-700">
                        {formatMoney(order.totalPrice)}
                      </span>
                    </div>
                  </div>

                  <ul className="mt-3 space-y-1 text-sm text-ink/75">
                    {order.items.map((item, index) => (
                      <li key={`${order.id}-${index}`} className="flex justify-between gap-3">
                        <span>
                          <span className="font-semibold text-chili-700">{item.quantity}×</span>{" "}
                          {item.name}
                          {item.note && (
                            <span className="ml-1 text-xs text-amber-700">— {item.note}</span>
                          )}
                        </span>
                        <span className="text-xs text-ink/45">
                          {formatMoney(item.price * item.quantity)}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {order.note && (
                    <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                      Table note: {order.note}
                    </p>
                  )}

                  {next && (
                    <button
                      type="button"
                      disabled={busy === order.id}
                      onClick={() => advanceOrder(order)}
                      className="mt-3 rounded-full bg-chili-600 px-4 py-2 text-xs font-semibold tracking-wide text-cream uppercase transition hover:bg-chili-500 disabled:opacity-50"
                    >
                      Mark as {next}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        <div className="space-y-6">
          {/* Reservations */}
          <section className="rounded-3xl border border-black/5 bg-white p-5 shadow-sm">
            <h2 className="font-display text-xl font-semibold text-chili-900">
              Today&apos;s reservations
            </h2>
            <ul className="mt-4 space-y-3">
              {todaysBookings.length === 0 && (
                <li className="py-6 text-center text-sm text-ink/45">
                  No bookings for today yet.
                </li>
              )}
              {todaysBookings.map((booking) => (
                <li key={booking.id} className="rounded-2xl border border-black/5 bg-[#fbf8f3] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-ink">{booking.name}</p>
                      <p className="text-xs text-ink/55">
                        {booking.time} · {booking.guests} guests · {booking.phone}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${
                        BOOKING_STYLE[booking.status] ?? ""
                      }`}
                    >
                      {booking.status}
                    </span>
                  </div>
                  {booking.specialRequest && (
                    <p className="mt-2 text-xs text-ink/60">“{booking.specialRequest}”</p>
                  )}
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      disabled={busy === booking.id || booking.status === "confirmed"}
                      onClick={() => setBookingStatus(booking, "confirmed")}
                      className="rounded-full bg-emerald-600 px-3.5 py-1.5 text-[11px] font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-40"
                    >
                      Confirm
                    </button>
                    <button
                      type="button"
                      disabled={busy === booking.id || booking.status === "cancelled"}
                      onClick={() => setBookingStatus(booking, "cancelled")}
                      className="rounded-full border border-red-300 px-3.5 py-1.5 text-[11px] font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-40"
                    >
                      Cancel
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            {upcomingBookings.length > 0 && (
              <>
                <p className="mt-5 text-[11px] font-semibold tracking-wider text-ink/45 uppercase">
                  Coming up
                </p>
                <ul className="mt-2 space-y-1.5 text-xs text-ink/60">
                  {upcomingBookings.map((booking) => (
                    <li key={booking.id} className="flex justify-between gap-2">
                      <span>
                        {new Date(`${booking.date}T00:00:00`).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                        })}{" "}
                        · {booking.time} · {booking.name}
                      </span>
                      <span>{booking.guests}p</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>

          {/* Chart */}
          <section className="rounded-3xl border border-black/5 bg-white p-5 shadow-sm">
            <h2 className="font-display text-xl font-semibold text-chili-900">
              Most popular this week
            </h2>
            <p className="text-xs text-ink/50">Units sold across all tickets, last 7 days</p>
            <div className="mt-3">
              <PopularChart data={stats.popular} />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  accent = false,
}: {
  label: string;
  value: string;
  sub: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-3xl border p-5 shadow-sm ${
        accent
          ? "border-transparent bg-chili-900 text-cream"
          : "border-black/5 bg-white text-chili-900"
      }`}
    >
      {accent && (
        <LogoLockup
          width={150}
          className="pointer-events-none absolute -right-6 -bottom-8 opacity-25"
        />
      )}
      <p
        className={`relative text-[11px] font-semibold tracking-[0.18em] uppercase ${
          accent ? "text-gold-400" : "text-ink/45"
        }`}
      >
        {label}
      </p>
      <p className="font-display relative mt-2 text-3xl font-semibold">{value}</p>
      <p className={`relative mt-1 text-xs ${accent ? "text-cream/60" : "text-ink/50"}`}>{sub}</p>
    </div>
  );
}
