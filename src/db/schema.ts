import {
  boolean,
  date,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export type OrderItem = {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  note?: string;
};

/** menu_items — the restaurant menu (public read for available items) */
export const menuItems = pgTable("menu_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  description: text("description").default("").notNull(),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  category: text("category").notNull(),
  imageUrl: text("image_url"),
  isAvailable: boolean("is_available").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

/** tables — physical restaurant tables, each with its own QR code */
export const restaurantTables = pgTable("tables", {
  id: uuid("id").defaultRandom().primaryKey(),
  tableNumber: integer("table_number").notNull().unique(),
  zone: text("zone").default("Main Hall").notNull(),
  seats: integer("seats").default(4).notNull(),
  qrCodeUrl: text("qr_code_url"),
  status: text("status").default("available").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/** orders — placed from a table via QR ordering */
export const orders = pgTable("orders", {
  id: uuid("id").defaultRandom().primaryKey(),
  tableId: uuid("table_id").references(() => restaurantTables.id, {
    onDelete: "set null",
  }),
  items: jsonb("items").$type<OrderItem[]>().notNull(),
  totalPrice: numeric("total_price", { precision: 10, scale: 2 }).notNull(),
  status: text("status").default("pending").notNull(),
  paymentMethod: text("payment_method").default("cash").notNull(),
  customerPhone: text("customer_phone"),
  discountAmount: numeric("discount_amount", { precision: 10, scale: 2 }).default("0").notNull(),
  promoCode: text("promo_code"),
  taxAmount: numeric("tax_amount", { precision: 10, scale: 2 }).default("0").notNull(),
  serviceChargeAmount: numeric("service_charge_amount", { precision: 10, scale: 2 })
    .default("0")
    .notNull(),
  customerName: text("customer_name"),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

/** bookings — direct seat reservations */
export const bookings = pgTable("bookings", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  date: date("date").notNull(),
  time: text("time").notNull(),
  guests: integer("guests").notNull(),
  specialRequest: text("special_request"),
  status: text("status").default("pending").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/** admin_users — owner / manager accounts (email + password auth) */
export const adminUsers = pgTable("admin_users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  fullName: text("full_name").default("Owner").notNull(),
  role: text("role").default("owner").notNull(),
  permissions: jsonb("permissions").$type<string[]>().default([]).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/** admin_sessions — server side sessions for the dashboard */
export const adminSessions = pgTable("admin_sessions", {
  token: text("token").primaryKey(),
  userId: uuid("user_id")
    .references(() => adminUsers.id, { onDelete: "cascade" })
    .notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/**
 * storage_objects — stand-in for the Supabase Storage `menu-images` bucket.
 * Uploaded dish photos are stored here and served from /api/storage/[id].
 */
export const storageObjects = pgTable("storage_objects", {
  id: uuid("id").defaultRandom().primaryKey(),
  bucket: text("bucket").default("menu-images").notNull(),
  path: text("path").notNull(),
  mimeType: text("mime_type").notNull(),
  data: text("data").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/** owner_notifications — audit log of reservation / order alerts */
export const ownerNotifications = pgTable("owner_notifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  channel: text("channel").notNull(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  delivered: boolean("delivered").default(false).notNull(),
  detail: text("detail"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const promoCodes = pgTable("promo_codes", {
  id: uuid("id").defaultRandom().primaryKey(),
  code: text("code").notNull().unique(),
  description: text("description").default("").notNull(),
  discountType: text("discount_type").default("percent").notNull(),
  discountValue: numeric("discount_value", { precision: 10, scale: 2 }).notNull(),
  minOrder: numeric("min_order", { precision: 10, scale: 2 }).default("0").notNull(),
  maxUses: integer("max_uses"),
  usedCount: integer("used_count").default(0).notNull(),
  startsAt: timestamp("starts_at", { withTimezone: true }),
  endsAt: timestamp("ends_at", { withTimezone: true }),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const inventoryItems = pgTable("inventory_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  unit: text("unit").default("pcs").notNull(),
  quantity: numeric("quantity", { precision: 10, scale: 2 }).default("0").notNull(),
  lowStockThreshold: numeric("low_stock_threshold", { precision: 10, scale: 2 })
    .default("5")
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const restaurantSettings = pgTable("restaurant_settings", {
  id: integer("id").primaryKey().default(1),
  address: text("address").default("").notNull(),
  phone: text("phone").default("").notNull(),
  taxRate: numeric("tax_rate", { precision: 5, scale: 2 }).default("0").notNull(),
  serviceChargeRate: numeric("service_charge_rate", { precision: 5, scale: 2 })
    .default("0")
    .notNull(),
  hours: jsonb("hours").$type<{ days: string; time: string }[]>().default([]).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => adminUsers.id, { onDelete: "set null" }),
  action: text("action").notNull(),
  entity: text("entity").notNull(),
  entityId: text("entity_id"),
  detail: text("detail"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type MenuItem = typeof menuItems.$inferSelect;
export type RestaurantTable = typeof restaurantTables.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type Booking = typeof bookings.$inferSelect;
export type PromoCode = typeof promoCodes.$inferSelect;
export type InventoryItem = typeof inventoryItems.$inferSelect;
