"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { formatMoney, NEXT_ORDER_STATUS, type OrderStatus } from "@/lib/constants";
import type { BookingDTO, OrderDTO } from "@/lib/queries";

type Table = { id: string; tableNumber: number; zone: string; seats: number; status: string };
type Inventory = { id: string; name: string; unit: string; quantity: string; lowStockThreshold: string };
type Promo = { id: string; code: string; description: string; discountType: string; discountValue: string; isActive: boolean; usedCount: number };
type Customer = { name: string; phone: string; orders: number; total: number; lastOrder: string };
type Log = { id: string; action: string; entity: string; detail: string | null; createdAt: string | Date; userName?: string | null };

const tabs = ["Reports", "Kitchen", "Reservations", "Customers", "Tables", "Promos", "Inventory", "Settings", "Audit"] as const;
type Tab = (typeof tabs)[number];

export default function OperationsClient({ initial }: { initial: {
  tables: Table[]; inventory: Inventory[]; promos: Promo[]; settings: {
    address: string; phone: string; taxRate: string; serviceChargeRate: string; hours: { days: string; time: string }[];
  } | null; logs: Log[]; orders: OrderDTO[]; bookings: BookingDTO[]; customers: Customer[];
  today: string;
} }) {
  const [tab, setTab] = useState<Tab>("Reports");
  const [tables, setTables] = useState(initial.tables);
  const [orders, setOrders] = useState(initial.orders);
  const [inventory, setInventory] = useState(initial.inventory);
  const [promos, setPromos] = useState(initial.promos);
  const [customers, setCustomers] = useState(initial.customers);
  const [range, setRange] = useState<"daily" | "weekly" | "monthly">("daily");
  const [report, setReport] = useState<{ period: string; orders: number; sales: number; averageOrder: number; cash: number; card: number; mobile: number }[]>([]);
  const [message, setMessage] = useState("");

  async function loadReport(next = range) {
    const res = await fetch(`/api/admin/reports?range=${next}`, { cache: "no-store" });
    if (res.ok) setReport((await res.json()).rows);
  }
  async function setTableStatus(id: string, status: string) {
    const res = await fetch("/api/admin/tables", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status }) });
    if (res.ok) {
      const { table } = await res.json();
      setTables((rows) => rows.map((row) => row.id === id ? { ...row, status: table.status } : row));
    }
  }
  async function advance(order: OrderDTO) {
    const status = NEXT_ORDER_STATUS[order.status as OrderStatus];
    if (!status) return;
    const res = await fetch(`/api/orders/${order.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    if (res.ok) setOrders((rows) => rows.map((row) => row.id === order.id ? { ...row, status } : row));
  }
  async function setPayment(order: OrderDTO, paymentMethod: string) {
    const res = await fetch(`/api/orders/${order.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ paymentMethod }) });
    if (res.ok) setOrders((rows) => rows.map((row) => row.id === order.id ? { ...row, paymentMethod } : row));
  }
  async function addPromo(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const res = await fetch("/api/admin/promos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(form)) });
    if (res.ok) { const { promo } = await res.json(); setPromos((rows) => [promo, ...rows]); event.currentTarget.reset(); setMessage("Promo code created."); }
  }
  async function addInventory(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const res = await fetch("/api/admin/inventory", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(form)) });
    if (res.ok) { const { item } = await res.json(); setInventory((rows) => [...rows, item]); event.currentTarget.reset(); setMessage("Inventory item added."); }
  }
  async function saveSettings(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const res = await fetch("/api/admin/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ address: form.get("address"), phone: form.get("phone"), taxRate: form.get("taxRate"), serviceChargeRate: form.get("serviceChargeRate"), hours: [{ days: "Every day", time: form.get("hours") }] }) });
    if (res.ok) setMessage("Restaurant settings saved.");
  }
  const lowStock = inventory.filter((item) => Number(item.quantity) <= Number(item.lowStockThreshold));
  const activeOrders = orders.filter((order) => order.status !== "paid");
  const dates = useMemo(() => Array.from({ length: 7 }, (_, index) => {
    const date = new Date(`${initial.today}T00:00:00`);
    date.setDate(date.getDate() + index);
    return date.toISOString().slice(0, 10);
  }), [initial.today]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold text-chili-900">Operations hub</h1>
        <p className="mt-1 text-sm text-ink/55">Reports, kitchen workflow, reservations, customers and restaurant controls.</p>
      </div>
      <div className="flex flex-wrap gap-2 rounded-2xl border border-black/5 bg-white p-2 shadow-sm">
        {tabs.map((item) => <button key={item} type="button" onClick={() => { setTab(item); if (item === "Reports" && !report.length) void loadReport(); }} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${tab === item ? "bg-chili-600 text-white" : "text-ink/60 hover:bg-chili-50"}`}>{item}</button>)}
      </div>
      {message && <p className="rounded-xl bg-emerald-50 px-4 py-2 text-sm text-emerald-800">{message}</p>}

      {tab === "Reports" && <section className="space-y-4 rounded-3xl border border-black/5 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-display text-xl font-semibold text-chili-900">Sales & payment reports</h2><p className="text-xs text-ink/50">Paid tickets grouped by day or hour.</p></div><div className="flex gap-2">{(["daily", "weekly", "monthly"] as const).map((value) => <button key={value} type="button" onClick={() => { setRange(value); void loadReport(value); }} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${range === value ? "bg-gold-500 text-chili-900" : "border border-black/10"}`}>{value}</button>)}<a href={`/api/admin/reports?range=${range}&format=csv`} className="rounded-full bg-chili-600 px-3 py-1.5 text-xs font-semibold text-white">Export CSV</a><button type="button" onClick={() => window.print()} className="rounded-full border border-black/10 px-3 py-1.5 text-xs font-semibold">Print / PDF</button></div></div>
        <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="text-xs text-ink/50"><tr><th className="py-2">Period</th><th>Orders</th><th>Sales</th><th>Average</th><th>Cash</th><th>Card</th><th>Mobile</th></tr></thead><tbody>{report.map((row) => <tr key={row.period} className="border-t border-black/5"><td className="py-2">{row.period}</td><td>{row.orders}</td><td>{formatMoney(row.sales)}</td><td>{formatMoney(row.averageOrder)}</td><td>{formatMoney(row.cash)}</td><td>{formatMoney(row.card)}</td><td>{formatMoney(row.mobile)}</td></tr>)}</tbody></table></div>
      </section>}

      {tab === "Kitchen" && <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{activeOrders.map((order) => <article key={order.id} className="rounded-3xl border border-black/5 bg-white p-5 shadow-sm"><div className="flex justify-between"><h2 className="font-display text-xl font-semibold">Table {order.tableNumber ?? "—"}</h2><span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold capitalize">{order.status}</span></div><ul className="my-4 space-y-1 text-sm">{order.items.map((item, index) => <li key={index}>{item.quantity}× {item.name}</li>)}</ul><button type="button" onClick={() => void advance(order)} className="rounded-full bg-chili-600 px-4 py-2 text-xs font-semibold text-white">{NEXT_ORDER_STATUS[order.status as OrderStatus] ? `Mark ${NEXT_ORDER_STATUS[order.status as OrderStatus]}` : "Complete"}</button>            <select value={order.paymentMethod} onChange={(event) => void setPayment(order, event.target.value)} className="ml-2 rounded-full border border-black/15 px-2 py-2 text-xs"><option value="cash">Cash</option><option value="card">Card</option><option value="mobile">Mobile</option></select><Link href={`/admin/orders/${order.id}/receipt`} target="_blank" className="ml-2 rounded-full border border-black/15 px-4 py-2 text-xs font-semibold">Receipt</Link></article>)}</section>}

      {tab === "Reservations" && <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{dates.map((date) => <article key={date} className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm"><h2 className="font-semibold text-chili-900">{new Date(`${date}T00:00:00`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}</h2><ul className="mt-3 space-y-2 text-xs">{initial.bookings.filter((booking) => booking.date === date).map((booking) => <li key={booking.id} className="rounded-xl bg-chili-50 p-2"><b>{booking.time}</b> · {booking.name}<br />{booking.guests} guests · {booking.status}</li>)}{!initial.bookings.some((booking) => booking.date === date) && <li className="text-ink/40">No reservations</li>}</ul></article>)}</section>}

      {tab === "Customers" && <section className="rounded-3xl border border-black/5 bg-white p-5 shadow-sm"><h2 className="font-display text-xl font-semibold text-chili-900">Customer order history</h2><div className="mt-4 overflow-x-auto"><table className="w-full text-left text-sm"><thead className="text-xs text-ink/50"><tr><th>Name</th><th>Phone</th><th>Orders</th><th>Total spent</th><th>Last order</th></tr></thead><tbody>{customers.map((customer) => <tr key={`${customer.name}-${customer.phone}`} className="border-t border-black/5"><td className="py-2">{customer.name}</td><td>{customer.phone || "—"}</td><td>{customer.orders}</td><td>{formatMoney(customer.total)}</td><td>{new Date(customer.lastOrder).toLocaleDateString("en-GB")}</td></tr>)}</tbody></table></div></section>}

      {tab === "Tables" && <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{tables.map((table) => <article key={table.id} className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm"><div className="flex justify-between"><h2 className="font-display text-xl font-semibold">Table {table.tableNumber}</h2><span className="text-xs text-ink/50">{table.zone}</span></div><p className="mt-1 text-xs text-ink/50">{table.seats} seats</p><select value={table.status} onChange={(event) => void setTableStatus(table.id, event.target.value)} className="mt-3 w-full rounded-xl border border-black/10 px-3 py-2 text-sm"><option value="available">Available</option><option value="occupied">Occupied</option><option value="reserved">Reserved</option></select></article>)}</section>}

      {tab === "Promos" && <section className="space-y-4"><form onSubmit={addPromo} className="grid gap-2 rounded-3xl border border-black/5 bg-white p-5 shadow-sm sm:grid-cols-5"><input name="code" required placeholder="WELCOME10" className="rounded-xl border px-3 py-2 text-sm" /><select name="discountType" className="rounded-xl border px-3 py-2 text-sm"><option value="percent">Percent</option><option value="fixed">Fixed</option></select><input name="discountValue" required type="number" min="1" placeholder="10" className="rounded-xl border px-3 py-2 text-sm" /><input name="minOrder" type="number" placeholder="Min order" className="rounded-xl border px-3 py-2 text-sm" /><button className="rounded-full bg-chili-600 px-4 py-2 text-sm font-semibold text-white">Add promo</button></form><div className="grid gap-3 sm:grid-cols-2">{promos.map((promo) => <article key={promo.id} className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm"><b>{promo.code}</b> · {promo.discountValue}{promo.discountType === "percent" ? "%" : " ৳"}<p className="text-xs text-ink/50">{promo.description || "No description"} · used {promo.usedCount}</p></article>)}</div></section>}

      {tab === "Inventory" && <section className="space-y-4"><form onSubmit={addInventory} className="grid gap-2 rounded-3xl border border-black/5 bg-white p-5 shadow-sm sm:grid-cols-4"><input name="name" required placeholder="Ingredient / supply" className="rounded-xl border px-3 py-2 text-sm" /><input name="unit" placeholder="kg" className="rounded-xl border px-3 py-2 text-sm" /><input name="quantity" type="number" step="0.01" placeholder="Quantity" className="rounded-xl border px-3 py-2 text-sm" /><button className="rounded-full bg-chili-600 px-4 py-2 text-sm font-semibold text-white">Add item</button></form>{lowStock.length > 0 && <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">Low stock: {lowStock.map((item) => item.name).join(", ")}</p>}<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{inventory.map((item) => <article key={item.id} className={`rounded-2xl border p-4 shadow-sm ${Number(item.quantity) <= Number(item.lowStockThreshold) ? "border-amber-300 bg-amber-50" : "border-black/5 bg-white"}`}><b>{item.name}</b><p className="mt-1 text-sm">{item.quantity} {item.unit}</p><p className="text-xs text-ink/50">Alert below {item.lowStockThreshold}</p></article>)}</div></section>}

      {tab === "Settings" && <form onSubmit={saveSettings} className="max-w-2xl space-y-4 rounded-3xl border border-black/5 bg-white p-6 shadow-sm"><h2 className="font-display text-xl font-semibold text-chili-900">Restaurant settings</h2><input name="address" defaultValue={initial.settings?.address ?? ""} placeholder="Address" className="w-full rounded-xl border px-3 py-2 text-sm" /><input name="phone" defaultValue={initial.settings?.phone ?? ""} placeholder="Phone" className="w-full rounded-xl border px-3 py-2 text-sm" /><div className="grid gap-3 sm:grid-cols-3"><label className="text-xs">Tax %<input name="taxRate" defaultValue={initial.settings?.taxRate ?? "0"} type="number" step="0.01" className="mt-1 w-full rounded-xl border px-3 py-2 text-sm" /></label><label className="text-xs">Service charge %<input name="serviceChargeRate" defaultValue={initial.settings?.serviceChargeRate ?? "0"} type="number" step="0.01" className="mt-1 w-full rounded-xl border px-3 py-2 text-sm" /></label><label className="text-xs">Hours<input name="hours" defaultValue={initial.settings?.hours?.[0]?.time ?? "12:00 PM – 11:00 PM"} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm" /></label></div><button className="rounded-full bg-chili-600 px-5 py-2 text-sm font-semibold text-white">Save settings</button></form>}

      {tab === "Audit" && <section className="rounded-3xl border border-black/5 bg-white p-5 shadow-sm"><h2 className="font-display text-xl font-semibold text-chili-900">Activity & audit log</h2><ul className="mt-4 space-y-2 text-sm">{initial.logs.map((log) => <li key={log.id} className="rounded-xl bg-[#fbf8f3] px-3 py-2"><b>{log.action}</b> · {log.entity} {log.detail ? `— ${log.detail}` : ""}<span className="ml-2 text-xs text-ink/40">{new Date(log.createdAt).toLocaleString("en-GB")}</span></li>)}{initial.logs.length === 0 && <li className="text-ink/45">No activity recorded yet.</li>}</ul></section>}
    </div>
  );
}
