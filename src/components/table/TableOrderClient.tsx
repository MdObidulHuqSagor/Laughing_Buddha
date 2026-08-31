"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { LogoLockup, LogoMark } from "@/components/Logo";
import { CATEGORIES, estimatedMinutes, formatMoney } from "@/lib/constants";
import type { MenuItemDTO } from "@/lib/queries";

type CartLine = { menuItemId: string; quantity: number; note: string };

type PlacedOrder = {
  id: string;
  totalPrice: number;
  itemCount: number;
  status: string;
};

const STATUS_STEPS = [
  { key: "pending", label: "Sent to kitchen" },
  { key: "preparing", label: "Being cooked" },
  { key: "served", label: "At your table" },
  { key: "paid", label: "Paid" },
];

export default function TableOrderClient({
  tableId,
  tableNumber,
  zone,
  initialMenu,
}: {
  tableId: string;
  tableNumber: number;
  zone: string;
  initialMenu: MenuItemDTO[];
}) {
  const [menu, setMenu] = useState<MenuItemDTO[]>(initialMenu);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [search, setSearch] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [orderNote, setOrderNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [placed, setPlaced] = useState<PlacedOrder | null>(null);
  const [noteFor, setNoteFor] = useState<string | null>(null);
  const cartRef = useRef<CartLine[]>([]);

  cartRef.current = cart;

  /** Realtime-style menu sync: sold-out dishes vanish without a reload. */
  useEffect(() => {
    let cancelled = false;
    const sync = async () => {
      try {
        const res = await fetch("/api/menu", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { items: MenuItemDTO[] };
        if (cancelled) return;
        setMenu(data.items);
        const availableIds = new Set(data.items.map((item) => item.id));
        const dropped = cartRef.current.filter((line) => !availableIds.has(line.menuItemId));
        if (dropped.length > 0) {
          setCart((prev) => prev.filter((line) => availableIds.has(line.menuItemId)));
          setFlash(`${dropped.length} dish just sold out and was removed from your cart.`);
        }
      } catch {
        /* offline — keep the last good menu */
      }
    };
    const timer = setInterval(sync, 10000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (!flash) return;
    const timer = setTimeout(() => setFlash(null), 5000);
    return () => clearTimeout(timer);
  }, [flash]);

  const byId = useMemo(() => new Map(menu.map((item) => [item.id, item])), [menu]);

  const categoriesPresent = useMemo(
    () => CATEGORIES.filter((category) => menu.some((item) => item.category === category)),
    [menu],
  );

  const visibleMenu = useMemo(() => {
    const term = search.trim().toLowerCase();
    return menu.filter((item) => {
      const matchesCategory = activeCategory === "All" || item.category === activeCategory;
      const matchesTerm =
        !term ||
        item.name.toLowerCase().includes(term) ||
        item.description.toLowerCase().includes(term);
      return matchesCategory && matchesTerm;
    });
  }, [menu, activeCategory, search]);

  const grouped = useMemo(() => {
    return categoriesPresent
      .map((category) => ({
        category,
        items: visibleMenu.filter((item) => item.category === category),
      }))
      .filter((group) => group.items.length > 0);
  }, [categoriesPresent, visibleMenu]);

  const cartTotal = cart.reduce(
    (sum, line) => sum + (byId.get(line.menuItemId)?.price ?? 0) * line.quantity,
    0,
  );
  const cartCount = cart.reduce((sum, line) => sum + line.quantity, 0);

  const addItem = useCallback((menuItemId: string) => {
    setCart((prev) => {
      const existing = prev.find((line) => line.menuItemId === menuItemId);
      if (existing) {
        return prev.map((line) =>
          line.menuItemId === menuItemId ? { ...line, quantity: line.quantity + 1 } : line,
        );
      }
      return [...prev, { menuItemId, quantity: 1, note: "" }];
    });
  }, []);

  const changeQuantity = useCallback((menuItemId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((line) =>
          line.menuItemId === menuItemId ? { ...line, quantity: line.quantity + delta } : line,
        )
        .filter((line) => line.quantity > 0),
    );
  }, []);

  const setNote = useCallback((menuItemId: string, note: string) => {
    setCart((prev) =>
      prev.map((line) => (line.menuItemId === menuItemId ? { ...line, note } : line)),
    );
  }, []);

  const quantityOf = (menuItemId: string) =>
    cart.find((line) => line.menuItemId === menuItemId)?.quantity ?? 0;

  async function placeOrder() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tableId,
          customerName,
          note: orderNote,
          items: cart.map((line) => ({
            menuItemId: line.menuItemId,
            quantity: line.quantity,
            note: line.note,
          })),
        }),
      });
      const data = (await res.json()) as {
        order?: PlacedOrder;
        error?: string;
      };
      if (!res.ok || !data.order) {
        setError(data.error ?? "Could not place the order. Please try again.");
        return;
      }
      setPlaced({ ...data.order, status: "pending" });
      setCart([]);
      setCartOpen(false);
    } catch {
      setError("Network hiccup — please try once more.");
    } finally {
      setSubmitting(false);
    }
  }

  if (placed) {
    return (
      <OrderConfirmation
        order={placed}
        tableNumber={tableNumber}
        onOrderMore={() => setPlaced(null)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-cream pb-32">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-chili-900 text-cream shadow-lg shadow-chili-900/20">
        <div className="mx-auto max-w-2xl px-4 pt-4 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <LogoMark size={46} rounded="rounded-2xl" />
              <div>
                <p className="text-[10px] tracking-[0.28em] text-gold-400 uppercase">
                  Laughing Buddha · Gulshan
                </p>
                <h1 className="font-display text-2xl font-semibold">Table {tableNumber}</h1>
                <p className="text-xs text-cream/60">{zone}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 rounded-full bg-cream/10 px-3 py-1.5 text-[11px] text-cream/80">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                Live menu
              </span>
            </div>
          </div>

          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search dishes, e.g. tom yum"
            className="mt-3 w-full rounded-full border border-cream/15 bg-cream/10 px-4 py-2.5 text-sm text-cream placeholder:text-cream/50 focus:border-gold-400 focus:outline-none"
          />

          <div className="no-scrollbar -mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-1">
            {["All", ...categoriesPresent].map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setActiveCategory(category)}
                className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                  activeCategory === category
                    ? "bg-gold-500 text-chili-900"
                    : "bg-cream/10 text-cream/75 hover:bg-cream/20"
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </header>

      {flash && (
        <div className="mx-auto mt-3 max-w-2xl px-4">
          <p className="animate-rise rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {flash}
          </p>
        </div>
      )}

      <div className="mx-auto max-w-2xl px-4">
        {grouped.length === 0 && (
          <p className="mt-16 text-center text-sm text-ink/50">
            Nothing matches that search. Try another dish name.
          </p>
        )}

        {grouped.map((group) => (
          <section key={group.category} className="mt-8">
            <div className="flex items-center gap-3">
              <h2 className="font-display text-xl font-semibold text-chili-900">
                {group.category}
              </h2>
              <span className="h-px flex-1 bg-gold-500/40" />
              <span className="text-[11px] text-ink/40">{group.items.length} dishes</span>
            </div>

            <ul className="mt-4 space-y-3">
              {group.items.map((item) => {
                const quantity = quantityOf(item.id);
                return (
                  <li
                    key={item.id}
                    className="flex gap-3 rounded-2xl border border-black/5 bg-white p-3 shadow-sm"
                  >
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="h-24 w-24 shrink-0 rounded-xl object-cover"
                      />
                    ) : (
                      <div className="grid h-24 w-24 shrink-0 place-items-center rounded-xl bg-chili-50 text-2xl">
                        🍛
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-[15px] leading-snug font-semibold text-ink">
                          {item.name}
                        </h3>
                        <span className="shrink-0 text-sm font-semibold text-chili-600">
                          {formatMoney(item.price)}
                        </span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-ink/55">
                        {item.description}
                      </p>

                      <div className="mt-2.5 flex items-center justify-between gap-2">
                        {quantity === 0 ? (
                          <button
                            type="button"
                            onClick={() => addItem(item.id)}
                            className="rounded-full bg-chili-600 px-4 py-1.5 text-xs font-semibold text-cream transition hover:bg-chili-500"
                          >
                            Add
                          </button>
                        ) : (
                          <div className="flex items-center gap-3 rounded-full bg-chili-50 px-2 py-1">
                            <button
                              type="button"
                              aria-label="Remove one"
                              onClick={() => changeQuantity(item.id, -1)}
                              className="grid h-6 w-6 place-items-center rounded-full bg-white text-chili-700 shadow-sm"
                            >
                              −
                            </button>
                            <span className="w-4 text-center text-sm font-semibold text-chili-900">
                              {quantity}
                            </span>
                            <button
                              type="button"
                              aria-label="Add one"
                              onClick={() => addItem(item.id)}
                              className="grid h-6 w-6 place-items-center rounded-full bg-chili-600 text-cream"
                            >
                              +
                            </button>
                          </div>
                        )}

                        {quantity > 0 && (
                          <button
                            type="button"
                            onClick={() => setNoteFor(noteFor === item.id ? null : item.id)}
                            className="text-[11px] font-medium text-chili-600 underline underline-offset-2"
                          >
                            {noteFor === item.id ? "Hide note" : "Add note"}
                          </button>
                        )}
                      </div>

                      {quantity > 0 && noteFor === item.id && (
                        <input
                          autoFocus
                          value={cart.find((line) => line.menuItemId === item.id)?.note ?? ""}
                          onChange={(event) => setNote(item.id, event.target.value)}
                          placeholder="Extra chilli, no peanut, less sugar…"
                          className="mt-2 w-full rounded-lg border border-black/10 px-3 py-2 text-xs focus:border-chili-500 focus:outline-none"
                        />
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}

        <p className="mt-10 text-center text-[11px] text-ink/40">
          Prices in BDT, VAT included. Allergies? Add a note and our chef will adjust.
        </p>
        <p className="mt-2 text-center text-[11px] text-ink/40">
          <Link href="/reservations" className="underline">
            Book your next visit
          </Link>
        </p>
      </div>

      {/* Cart bar */}
      {cartCount > 0 && !cartOpen && (
        <button
          type="button"
          onClick={() => setCartOpen(true)}
          className="animate-rise fixed inset-x-0 bottom-0 z-30 mx-auto flex max-w-2xl items-center justify-between gap-4 bg-chili-600 px-5 py-3.5 text-cream shadow-2xl sm:bottom-4 sm:rounded-2xl"
        >
          <span className="flex items-center gap-3 text-sm">
            <span className="relative">
              <LogoMark size={38} rounded="rounded-full" />
              <span className="absolute -top-1.5 -right-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-gold-500 px-1 text-[11px] font-bold text-chili-900">
                {cartCount}
              </span>
            </span>
            <span className="text-left">
              <span className="block font-semibold">View cart</span>
              <span className="block text-[11px] text-cream/70">
                {cartCount} {cartCount === 1 ? "item" : "items"} · table {tableNumber}
              </span>
            </span>
          </span>
          <span className="font-semibold">{formatMoney(cartTotal)}</span>
        </button>
      )}

      {/* Cart sheet */}
      {cartOpen && (
        <div className="fixed inset-0 z-40 flex items-end bg-black/50 sm:items-center sm:justify-center">
          <div className="animate-rise max-h-[88vh] w-full overflow-y-auto rounded-t-3xl bg-cream p-5 sm:max-w-lg sm:rounded-3xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <LogoMark size={40} rounded="rounded-xl" />
                <div>
                  <h2 className="font-display text-2xl leading-tight font-semibold text-chili-900">
                    Your order
                  </h2>
                  <p className="text-xs text-ink/50">Table {tableNumber} · dine in</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCartOpen(false)}
                className="rounded-full bg-black/5 px-3 py-1 text-sm"
              >
                Close
              </button>
            </div>

            <ul className="mt-4 space-y-3">
              {cart.map((line) => {
                const item = byId.get(line.menuItemId);
                if (!item) return null;
                return (
                  <li key={line.menuItemId} className="rounded-2xl bg-white p-3 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-ink">{item.name}</p>
                        <p className="text-xs text-ink/50">{formatMoney(item.price)} each</p>
                      </div>
                      <div className="flex items-center gap-3 rounded-full bg-chili-50 px-2 py-1">
                        <button
                          type="button"
                          onClick={() => changeQuantity(line.menuItemId, -1)}
                          className="grid h-6 w-6 place-items-center rounded-full bg-white text-chili-700"
                        >
                          −
                        </button>
                        <span className="w-4 text-center text-sm font-semibold">
                          {line.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => addItem(line.menuItemId)}
                          className="grid h-6 w-6 place-items-center rounded-full bg-chili-600 text-cream"
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <input
                      value={line.note}
                      onChange={(event) => setNote(line.menuItemId, event.target.value)}
                      placeholder="Special note for the chef"
                      className="mt-2 w-full rounded-lg border border-black/10 px-3 py-2 text-xs focus:border-chili-500 focus:outline-none"
                    />
                  </li>
                );
              })}
            </ul>

            <div className="mt-4 space-y-3">
              <input
                value={customerName}
                onChange={(event) => setCustomerName(event.target.value)}
                placeholder="Your name (optional)"
                className="w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm focus:border-chili-500 focus:outline-none"
              />
              <textarea
                value={orderNote}
                onChange={(event) => setOrderNote(event.target.value)}
                rows={2}
                placeholder="Anything for the whole table? (allergies, serve together…)"
                className="w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm focus:border-chili-500 focus:outline-none"
              />
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-black/10 pt-4">
              <span className="text-sm text-ink/60">Total ({cartCount} items)</span>
              <span className="font-display text-2xl font-semibold text-chili-900">
                {formatMoney(cartTotal)}
              </span>
            </div>

            {error && (
              <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>
            )}

            <button
              type="button"
              disabled={submitting || cart.length === 0}
              onClick={placeOrder}
              className="mt-4 w-full rounded-full bg-chili-600 py-3.5 text-sm font-semibold tracking-wide text-cream uppercase transition hover:bg-chili-500 disabled:opacity-60"
            >
              {submitting ? "Sending to kitchen…" : "Send order to kitchen"}
            </button>
            <p className="mt-2 text-center text-[11px] text-ink/45">
              Pay at the table when you are done. No card details needed.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function OrderConfirmation({
  order,
  tableNumber,
  onOrderMore,
}: {
  order: PlacedOrder;
  tableNumber: number;
  onOrderMore: () => void;
}) {
  const [status, setStatus] = useState(order.status);
  const eta = estimatedMinutes(order.itemCount);

  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch(`/api/orders/${order.id}`, { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { order: { status: string } };
        setStatus(data.order.status);
      } catch {
        /* ignore */
      }
    };
    poll();
    const timer = setInterval(poll, 6000);
    return () => clearInterval(timer);
  }, [order.id]);

  const activeIndex = STATUS_STEPS.findIndex((step) => step.key === status);

  return (
    <div className="min-h-screen bg-chili-900 px-5 py-14 text-cream">
      <div className="mx-auto max-w-md text-center">
        <LogoLockup width={200} className="mx-auto" />
        <h1 className="font-display mt-4 text-3xl font-semibold">Order received</h1>
        <p className="mt-2 text-sm text-cream/75">
          Table {tableNumber} · ticket #{order.id.slice(0, 8).toUpperCase()}
        </p>

        <div className="mt-8 rounded-3xl bg-cream/5 p-6 text-left">
          <p className="text-xs tracking-[0.2em] text-gold-400 uppercase">Estimated time</p>
          <p className="font-display mt-1 text-4xl font-semibold">{eta} min</p>
          <p className="mt-2 text-xs text-cream/60">
            {order.itemCount} items · {formatMoney(order.totalPrice)} payable at the table
          </p>

          <ol className="mt-6 space-y-3">
            {STATUS_STEPS.map((step, index) => {
              const done = index <= activeIndex;
              return (
                <li key={step.key} className="flex items-center gap-3">
                  <span
                    className={`grid h-6 w-6 place-items-center rounded-full text-[11px] ${
                      done ? "bg-gold-500 text-chili-900" : "bg-cream/10 text-cream/50"
                    }`}
                  >
                    {done ? "✓" : index + 1}
                  </span>
                  <span className={done ? "text-sm text-cream" : "text-sm text-cream/50"}>
                    {step.label}
                  </span>
                  {index === activeIndex && (
                    <span className="ml-auto flex items-center gap-1.5 text-[11px] text-gold-400">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-gold-400" /> now
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
        </div>

        <button
          type="button"
          onClick={onOrderMore}
          className="mt-8 w-full rounded-full bg-gold-500 py-3.5 text-sm font-semibold tracking-wide text-chili-900 uppercase"
        >
          Order something more
        </button>
        <Link
          href="/reservations"
          className="mt-4 block text-xs text-cream/60 underline underline-offset-4"
        >
          Book a table for next time
        </Link>
      </div>
    </div>
  );
}
