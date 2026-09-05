import { and, desc, eq, gte, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  bookings,
  auditLogs,
  inventoryItems,
  menuItems,
  orders,
  ownerNotifications,
  promoCodes,
  restaurantSettings,
  restaurantTables,
  type OrderItem,
} from "@/db/schema";
import { CATEGORIES } from "@/lib/constants";

export type MenuItemDTO = {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  imageUrl: string | null;
  isAvailable: boolean;
  updatedAt: string;
};

export type OrderDTO = {
  id: string;
  tableId: string | null;
  tableNumber: number | null;
  items: OrderItem[];
  totalPrice: number;
  status: string;
  customerName: string | null;
  note: string | null;
  paymentMethod: string;
  customerPhone: string | null;
  discountAmount: number;
  taxAmount: number;
  serviceChargeAmount: number;
  createdAt: string;
};

export type BookingDTO = {
  id: string;
  name: string;
  phone: string;
  date: string;
  time: string;
  guests: number;
  specialRequest: string | null;
  status: string;
  createdAt: string;
};

const categoryRank = (category: string) => {
  const index = (CATEGORIES as readonly string[]).indexOf(category);
  return index === -1 ? CATEGORIES.length : index;
};

export function sortMenu<T extends { category: string; name: string }>(items: T[]): T[] {
  return [...items].sort(
    (a, b) => categoryRank(a.category) - categoryRank(b.category) || a.name.localeCompare(b.name),
  );
}

function toMenuDTO(row: typeof menuItems.$inferSelect): MenuItemDTO {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? "",
    price: Number(row.price),
    category: row.category,
    imageUrl: row.imageUrl,
    isAvailable: row.isAvailable,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function getMenu(onlyAvailable: boolean): Promise<MenuItemDTO[]> {
  const rows = onlyAvailable
    ? await db.select().from(menuItems).where(eq(menuItems.isAvailable, true))
    : await db.select().from(menuItems);
  return sortMenu(rows.map(toMenuDTO));
}

export async function getTable(tableId: string) {
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tableId);
  const numeric = Number(tableId);
  if (!isUuid && !Number.isInteger(numeric)) return null;
  const rows = await db
    .select()
    .from(restaurantTables)
    .where(isUuid ? eq(restaurantTables.id, tableId) : eq(restaurantTables.tableNumber, numeric))
    .limit(1);
  return rows[0] ?? null;
}

export async function listTables() {
  return db.select().from(restaurantTables).orderBy(restaurantTables.tableNumber);
}

export function toOrderDTO(
  row: typeof orders.$inferSelect & { tableNumber?: number | null },
): OrderDTO {
  return {
    id: row.id,
    tableId: row.tableId,
    tableNumber: row.tableNumber ?? null,
    items: row.items ?? [],
    totalPrice: Number(row.totalPrice),
    status: row.status,
    customerName: row.customerName,
    note: row.note,
    paymentMethod: row.paymentMethod,
    customerPhone: row.customerPhone,
    discountAmount: Number(row.discountAmount ?? 0),
    taxAmount: Number(row.taxAmount ?? 0),
    serviceChargeAmount: Number(row.serviceChargeAmount ?? 0),
    createdAt: row.createdAt.toISOString(),
  };
}

export async function getOrderById(id: string): Promise<OrderDTO | null> {
  const rows = await db
    .select({ order: orders, tableNumber: restaurantTables.tableNumber })
    .from(orders)
    .leftJoin(restaurantTables, eq(restaurantTables.id, orders.tableId))
    .where(eq(orders.id, id))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  return toOrderDTO({ ...row.order, tableNumber: row.tableNumber });
}

export async function listRecentOrders(limit = 40): Promise<OrderDTO[]> {
  const rows = await db
    .select({ order: orders, tableNumber: restaurantTables.tableNumber })
    .from(orders)
    .leftJoin(restaurantTables, eq(restaurantTables.id, orders.tableId))
    .orderBy(desc(orders.createdAt))
    .limit(limit);
  return rows.map((row) => toOrderDTO({ ...row.order, tableNumber: row.tableNumber }));
}

export function toBookingDTO(row: typeof bookings.$inferSelect): BookingDTO {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    date: row.date,
    time: row.time,
    guests: row.guests,
    specialRequest: row.specialRequest,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listBookings(fromToday = true): Promise<BookingDTO[]> {
  const today = new Date().toISOString().slice(0, 10);
  const rows = fromToday
    ? await db.select().from(bookings).where(gte(bookings.date, today)).orderBy(bookings.date)
    : await db.select().from(bookings).orderBy(desc(bookings.createdAt));
  return rows.map(toBookingDTO);
}

export type PopularItem = { name: string; quantity: number };

export type DashboardStats = {
  todaySales: number;
  todayPaidOrders: number;
  openOrders: number;
  weekSales: number;
  todayGuests: number;
  popular: PopularItem[];
};

export type SalesReportRow = {
  period: string;
  orders: number;
  sales: number;
  averageOrder: number;
  cash: number;
  card: number;
  mobile: number;
};

export async function getSalesReport(range: "daily" | "weekly" | "monthly" = "daily") {
  const days = range === "monthly" ? 30 : range === "weekly" ? 7 : 1;
  const since = new Date(Date.now() - days * 86400000);
  const result = await db.execute<{
    period: string;
    orders: number;
    sales: string;
    average_order: string;
    cash: string;
    card: string;
    mobile: string;
  }>(sql`
    select to_char(date_trunc(${range === "daily" ? "hour" : "day"}, created_at), 'YYYY-MM-DD HH24:00') as period,
      count(*)::int as orders,
      coalesce(sum(total_price), 0) as sales,
      coalesce(avg(total_price), 0) as average_order,
      coalesce(sum(case when payment_method = 'cash' then total_price else 0 end), 0) as cash,
      coalesce(sum(case when payment_method = 'card' then total_price else 0 end), 0) as card,
      coalesce(sum(case when payment_method not in ('cash','card') then total_price else 0 end), 0) as mobile
    from orders
    where status = 'paid' and created_at >= ${since.toISOString()}
    group by 1 order by 1
  `);
  return result.rows.map((row) => ({
    period: row.period,
    orders: Number(row.orders),
    sales: Number(row.sales),
    averageOrder: Number(row.average_order),
    cash: Number(row.cash),
    card: Number(row.card),
    mobile: Number(row.mobile),
  }));
}

export async function listCustomerHistory(search?: string) {
  const pattern = search?.trim();
  const result = await db.execute<{
    customer_name: string | null;
    customer_phone: string | null;
    orders: number;
    total: string;
    last_order: Date;
  }>(sql`
    select customer_name, customer_phone, count(*)::int as orders,
      coalesce(sum(total_price), 0) as total, max(created_at) as last_order
    from orders
    where status = 'paid'
      ${pattern ? sql`and (customer_name ilike ${`%${pattern}%`} or customer_phone ilike ${`%${pattern}%`})` : sql``}
    group by customer_name, customer_phone
    order by last_order desc limit 100
  `);
  return result.rows.map((row) => ({
    name: row.customer_name ?? "Walk-in",
    phone: row.customer_phone ?? "",
    orders: Number(row.orders),
    total: Number(row.total),
    lastOrder: new Date(row.last_order).toISOString(),
  }));
}

export async function getAdminOperationsData() {
  const [tables, inventory, promos, settings, logs] = await Promise.all([
    db.select().from(restaurantTables).orderBy(restaurantTables.tableNumber),
    db.select().from(inventoryItems).orderBy(inventoryItems.name),
    db.select().from(promoCodes).orderBy(desc(promoCodes.createdAt)),
    db.select().from(restaurantSettings).limit(1),
    db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(50),
  ]);
  return { tables, inventory, promos, settings: settings[0] ?? null, logs };
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const weekAgo = new Date(Date.now() - 7 * 86400000);
  const today = new Date().toISOString().slice(0, 10);

  const [todayAgg] = await db
    .select({
      total: sql<string>`coalesce(sum(${orders.totalPrice}), 0)`,
      count: sql<number>`count(*)::int`,
    })
    .from(orders)
    .where(and(eq(orders.status, "paid"), gte(orders.createdAt, startOfToday)));

  const [openAgg] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(orders)
    .where(sql`${orders.status} <> 'paid'`);

  const [weekAgg] = await db
    .select({ total: sql<string>`coalesce(sum(${orders.totalPrice}), 0)` })
    .from(orders)
    .where(and(eq(orders.status, "paid"), gte(orders.createdAt, weekAgo)));

  const [guestAgg] = await db
    .select({ total: sql<number>`coalesce(sum(${bookings.guests}), 0)::int` })
    .from(bookings)
    .where(and(eq(bookings.date, today), sql`${bookings.status} <> 'cancelled'`));

  const popularResult = await db.execute<{ name: string; quantity: number }>(sql`
    select item->>'name' as name,
           sum((item->>'quantity')::int)::int as quantity
    from ${orders}, jsonb_array_elements(${orders.items}) as item
    where ${orders.createdAt} >= ${weekAgo.toISOString()}
    group by 1
    order by quantity desc
    limit 8
  `);

  return {
    todaySales: Number(todayAgg?.total ?? 0),
    todayPaidOrders: Number(todayAgg?.count ?? 0),
    openOrders: Number(openAgg?.count ?? 0),
    weekSales: Number(weekAgg?.total ?? 0),
    todayGuests: Number(guestAgg?.total ?? 0),
    popular: popularResult.rows.map((r) => ({
      name: String(r.name),
      quantity: Number(r.quantity),
    })),
  };
}

export async function listNotifications(limit = 8) {
  const rows = await db
    .select()
    .from(ownerNotifications)
    .orderBy(desc(ownerNotifications.createdAt))
    .limit(limit);
  return rows.map((row) => ({
    id: row.id,
    channel: row.channel,
    subject: row.subject,
    delivered: row.delivered,
    detail: row.detail,
    createdAt: row.createdAt.toISOString(),
  }));
}
