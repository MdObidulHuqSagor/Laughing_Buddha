import { sql } from "drizzle-orm";
import { db } from "@/db";
import {
  adminUsers,
  menuItems,
  orders,
  restaurantTables,
  bookings,
  type OrderItem,
} from "@/db/schema";
import { hashPassword } from "@/lib/auth";

const P = (id: number) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200`;

type SeedItem = {
  name: string;
  description: string;
  price: string;
  category: string;
  imageUrl: string;
  isAvailable?: boolean;
};

export const SEED_MENU: SeedItem[] = [
  {
    name: "Gai Satay Skewers",
    description:
      "Charcoal-grilled turmeric chicken skewers, roasted peanut sauce, ajad cucumber relish.",
    price: "590",
    category: "Starters",
    imageUrl: P(4965323),
  },
  {
    name: "Crispy Golden Spring Rolls",
    description: "Glass noodle, taro and shiitake rolls fried to a shatter, plum-chilli dip.",
    price: "480",
    category: "Starters",
    imageUrl: P(37279442),
  },
  {
    name: "Tod Mun Pla Fish Cakes",
    description: "Red curry fish cakes pounded with kaffir lime and snake bean.",
    price: "640",
    category: "Starters",
    imageUrl: P(37338385),
  },
  {
    name: "Som Tam Thai",
    description: "Green papaya pounded with palm sugar, lime, dried shrimp and toasted peanut.",
    price: "520",
    category: "Starters",
    imageUrl: P(4206592),
  },
  {
    name: "Tom Yum Goong",
    description: "Hot & sour prawn broth with lemongrass, galangal, straw mushroom, bird chilli.",
    price: "620",
    category: "Soups",
    imageUrl: P(21517337),
  },
  {
    name: "Tom Kha Gai",
    description: "Silky coconut chicken soup, galangal, kaffir lime leaf, coriander root.",
    price: "560",
    category: "Soups",
    imageUrl: P(31649749),
  },
  {
    name: "Wonton & Glass Noodle Soup",
    description: "Chicken-prawn wontons, glass noodle, garlic oil, spring onion.",
    price: "520",
    category: "Soups",
    imageUrl: P(1390665),
  },
  {
    name: "Gaeng Keow Wan Gai",
    description: "Signature green curry, chicken thigh, Thai eggplant, sweet basil, coconut cream.",
    price: "890",
    category: "Curries",
    imageUrl: P(9397205),
  },
  {
    name: "Massaman Beef Curry",
    description: "Slow-braised beef short rib, roasted spices, potato, shallot, cashew.",
    price: "1180",
    category: "Curries",
    imageUrl: P(37279442),
  },
  {
    name: "Panang Duck Curry",
    description: "Crispy duck leg in thick panang curry, lychee, pea aubergine.",
    price: "1290",
    category: "Curries",
    imageUrl: P(37090676),
  },
  {
    name: "Pad Thai Goong",
    description: "Wok-tossed rice noodles, tiger prawn, tamarind, chive, crushed peanut.",
    price: "820",
    category: "Noodles",
    imageUrl: P(10756648),
  },
  {
    name: "Khao Soi Chiang Mai",
    description: "Northern curry noodles, braised chicken, pickled mustard green, crisp egg noodle.",
    price: "860",
    category: "Noodles",
    imageUrl: P(7361022),
  },
  {
    name: "Pad Kee Mao (Drunken Noodles)",
    description: "Fiery flat noodles, holy basil, young peppercorn, chilli, your choice of protein.",
    price: "780",
    category: "Noodles",
    imageUrl: P(6454810),
  },
  {
    name: "Laughing Buddha Suki Hotpot",
    description:
      "Table hotpot for two — clear chicken broth, seafood platter, greens, house suki sauce.",
    price: "2150",
    category: "Hotpot",
    imageUrl: P(4206592),
  },
  {
    name: "Tom Yum Volcano Hotpot",
    description: "Blistering tom yum broth, river prawn, squid, enoki, glass noodle. Serves 2–3.",
    price: "2450",
    category: "Hotpot",
    imageUrl: P(6454809),
  },
  {
    name: "Isaan Herbal Chicken Hotpot",
    description: "Lemongrass and galangal broth, free-range chicken, Thai herbs, jasmine rice.",
    price: "1850",
    category: "Hotpot",
    imageUrl: P(37081070),
  },
  {
    name: "Cha Yen (Thai Iced Tea)",
    description: "Strong black tea, condensed milk, crushed ice.",
    price: "260",
    category: "Drinks",
    imageUrl: P(37179937),
  },
  {
    name: "Mango Sunrise Cooler",
    description: "Cold-pressed mango, lime, mint, sparkling water.",
    price: "320",
    category: "Drinks",
    imageUrl: P(31029411),
  },
  {
    name: "Lemongrass Pandan Iced Tea",
    description: "House-brewed lemongrass with pandan syrup and calamansi.",
    price: "280",
    category: "Drinks",
    imageUrl: P(17748109),
  },
  {
    name: "Mango Sticky Rice",
    description: "Warm coconut sticky rice, ripe mango, salted coconut cream, crisp mung bean.",
    price: "420",
    category: "Desserts",
    imageUrl: P(7361018),
  },
  {
    name: "Grilled Bamboo Coconut Rice",
    description: "Sticky rice roasted in bamboo, black bean, coconut custard.",
    price: "380",
    category: "Desserts",
    imageUrl: P(37060140),
  },
  {
    name: "Coconut Ice Cream & Palm Sugar",
    description: "House-churned coconut ice cream, toasted peanut, palm sugar caramel.",
    price: "340",
    category: "Desserts",
    imageUrl: P(7361018),
    isAvailable: false,
  },
];

const SEED_TABLES = [
  { tableNumber: 1, zone: "Garden Terrace", seats: 2 },
  { tableNumber: 2, zone: "Garden Terrace", seats: 4 },
  { tableNumber: 3, zone: "Main Hall", seats: 4 },
  { tableNumber: 4, zone: "Main Hall", seats: 4 },
  { tableNumber: 5, zone: "Main Hall", seats: 6 },
  { tableNumber: 6, zone: "Hotpot Bar", seats: 2 },
  { tableNumber: 7, zone: "Hotpot Bar", seats: 2 },
  { tableNumber: 8, zone: "Private Room", seats: 8 },
];

async function ensureOperationsSchema() {
  await db.execute(sql.raw(`
    create extension if not exists pgcrypto;
    alter table if exists tables add column if not exists status text not null default 'available';
    alter table if exists orders add column if not exists payment_method text not null default 'cash';
    alter table if exists orders add column if not exists customer_phone text;
    alter table if exists orders add column if not exists discount_amount numeric(10,2) not null default 0;
    alter table if exists orders add column if not exists promo_code text;
    alter table if exists orders add column if not exists tax_amount numeric(10,2) not null default 0;
    alter table if exists orders add column if not exists service_charge_amount numeric(10,2) not null default 0;
    alter table if exists admin_users add column if not exists role text not null default 'owner';
    alter table if exists admin_users add column if not exists permissions jsonb not null default '[]'::jsonb;
    create table if not exists promo_codes (
      id uuid primary key default gen_random_uuid(), code text not null unique,
      description text not null default '', discount_type text not null default 'percent',
      discount_value numeric(10,2) not null, min_order numeric(10,2) not null default 0,
      max_uses integer, used_count integer not null default 0, starts_at timestamptz,
      ends_at timestamptz, is_active boolean not null default true, created_at timestamptz not null default now()
    );
    create table if not exists inventory_items (
      id uuid primary key default gen_random_uuid(), name text not null,
      unit text not null default 'pcs', quantity numeric(10,2) not null default 0,
      low_stock_threshold numeric(10,2) not null default 5, updated_at timestamptz not null default now()
    );
    create table if not exists restaurant_settings (
      id integer primary key default 1, address text not null default '', phone text not null default '',
      tax_rate numeric(5,2) not null default 0, service_charge_rate numeric(5,2) not null default 0,
      hours jsonb not null default '[]'::jsonb, updated_at timestamptz not null default now()
    );
    create table if not exists audit_logs (
      id uuid primary key default gen_random_uuid(), user_id uuid references admin_users(id) on delete set null,
      action text not null, entity text not null, entity_id text, detail text,
      created_at timestamptz not null default now()
    );
  `));
}

let seedPromise: Promise<void> | null = null;

async function runSeed(): Promise<void> {
  await ensureOperationsSchema();
  // menu
  const existingMenu = await db.select({ id: menuItems.id }).from(menuItems).limit(1);
  if (existingMenu.length === 0) {
    await db.insert(menuItems).values(SEED_MENU);
  }

  // tables
  const existingTables = await db
    .select({ id: restaurantTables.id })
    .from(restaurantTables)
    .limit(1);
  if (existingTables.length === 0) {
    await db.insert(restaurantTables).values(
      SEED_TABLES.map((t) => ({
        ...t,
        qrCodeUrl: null,
      })),
    );
    await db.execute(
      sql`update tables set qr_code_url = '/table/' || id::text where qr_code_url is null`,
    );
  }

  // admin account
  const existingAdmin = await db.select({ id: adminUsers.id }).from(adminUsers).limit(1);
  if (existingAdmin.length === 0) {
    const email = process.env.ADMIN_EMAIL ?? "owner@laughingbuddha.com.bd";
    const password = process.env.ADMIN_PASSWORD ?? "buddha123";
    await db.insert(adminUsers).values({
      email: email.toLowerCase(),
      passwordHash: hashPassword(password),
      fullName: "Nong Ploy — Owner",
    });
  }

  // demo orders + bookings so the dashboard looks alive
  const existingOrders = await db.select({ id: orders.id }).from(orders).limit(1);
  if (existingOrders.length === 0) {
    const menu = await db
      .select({ id: menuItems.id, name: menuItems.name, price: menuItems.price })
      .from(menuItems);
    const tables = await db.select({ id: restaurantTables.id }).from(restaurantTables);
    if (menu.length > 0 && tables.length > 0) {
      const rows: (typeof orders.$inferInsert)[] = [];
      for (let day = 6; day >= 0; day -= 1) {
        const perDay = day === 0 ? 5 : 3 + (day % 3);
        for (let i = 0; i < perDay; i += 1) {
          const picks: OrderItem[] = [];
          const count = 2 + ((day + i) % 3);
          for (let k = 0; k < count; k += 1) {
            const m = menu[(day * 5 + i * 3 + k * 7) % menu.length];
            picks.push({
              menuItemId: m.id,
              name: m.name,
              price: Number(m.price),
              quantity: 1 + ((i + k) % 2),
            });
          }
          const total = picks.reduce((sum, p) => sum + p.price * p.quantity, 0);
          const createdAt = new Date(Date.now() - day * 86400000 + i * 3600000);
          const status = day === 0 && i >= 3 ? (i === 3 ? "pending" : "preparing") : "paid";
          rows.push({
            tableId: tables[(day + i) % tables.length].id,
            items: picks,
            totalPrice: total.toFixed(2),
            status,
            createdAt,
            updatedAt: createdAt,
          });
        }
      }
      await db.insert(orders).values(rows);
    }
  }

  const existingBookings = await db.select({ id: bookings.id }).from(bookings).limit(1);
  if (existingBookings.length === 0) {
    const today = new Date().toISOString().slice(0, 10);
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    await db.insert(bookings).values([
      {
        name: "Farhan Rahman",
        phone: "+8801711223344",
        date: today,
        time: "19:30",
        guests: 4,
        specialRequest: "Anniversary — please arrange a corner table.",
        status: "confirmed",
      },
      {
        name: "Tasnim Chowdhury",
        phone: "+8801855667788",
        date: today,
        time: "20:45",
        guests: 2,
        specialRequest: "Hotpot bar seats if possible.",
        status: "pending",
      },
      {
        name: "Arif & family",
        phone: "+8801999001122",
        date: tomorrow,
        time: "13:00",
        guests: 6,
        specialRequest: null,
        status: "pending",
      },
    ]);
  }
}

/** Idempotent demo seeding — safe to call from any server render. */
export async function ensureSeeded(): Promise<void> {
  if (!seedPromise) {
    seedPromise = runSeed().catch((error) => {
      seedPromise = null;
      console.error("[seed] failed", error);
    });
  }
  return seedPromise;
}
