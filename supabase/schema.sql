-- =====================================================================
--  Laughing Buddha — Supabase / Postgres schema
--  Run this in the Supabase SQL editor (or `supabase db push`).
--  Includes: tables, indexes, RLS policies, storage bucket, seed data.
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- 1. Tables
-- ---------------------------------------------------------------------

create table if not exists public.menu_items (
  id           uuid primary key default gen_random_uuid(),
  name         text        not null,
  description  text        not null default '',
  price        numeric(10,2) not null check (price > 0),
  category     text        not null check (category in
                 ('Starters','Soups','Curries','Noodles','Hotpot','Drinks','Desserts')),
  image_url    text,
  is_available boolean     not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists public.tables (
  id           uuid primary key default gen_random_uuid(),
  table_number integer     not null unique,
  zone         text        not null default 'Main Hall',
  seats        integer     not null default 4,
  qr_code_url  text,
  created_at   timestamptz not null default now()
);

create table if not exists public.orders (
  id            uuid primary key default gen_random_uuid(),
  table_id      uuid references public.tables(id) on delete set null,
  items         jsonb       not null,
  total_price   numeric(10,2) not null check (total_price >= 0),
  status        text        not null default 'pending'
                  check (status in ('pending','preparing','served','paid')),
  customer_name text,
  note          text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists public.bookings (
  id              uuid primary key default gen_random_uuid(),
  name            text        not null,
  phone           text        not null,
  date            date        not null,
  time            text        not null,
  guests          integer     not null check (guests between 1 and 40),
  special_request text,
  status          text        not null default 'pending'
                    check (status in ('pending','confirmed','cancelled')),
  created_at      timestamptz not null default now()
);

-- Optional audit log for owner alerts (email / Telegram / webhook)
create table if not exists public.owner_notifications (
  id         uuid primary key default gen_random_uuid(),
  channel    text        not null,
  subject    text        not null,
  body       text        not null,
  delivered  boolean     not null default false,
  detail     text,
  created_at timestamptz not null default now()
);

create index if not exists menu_items_category_idx on public.menu_items (category);
create index if not exists menu_items_available_idx on public.menu_items (is_available);
create index if not exists orders_created_at_idx on public.orders (created_at desc);
create index if not exists orders_status_idx on public.orders (status);
create index if not exists bookings_date_idx on public.bookings (date);

-- keep updated_at fresh
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists menu_items_touch on public.menu_items;
create trigger menu_items_touch before update on public.menu_items
  for each row execute function public.touch_updated_at();

drop trigger if exists orders_touch on public.orders;
create trigger orders_touch before update on public.orders
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------
-- 2. Row Level Security
--    anon  = guests scanning the QR code
--    authenticated = staff / owner signed in through Supabase Auth
-- ---------------------------------------------------------------------

alter table public.menu_items          enable row level security;
alter table public.tables              enable row level security;
alter table public.orders              enable row level security;
alter table public.bookings            enable row level security;
alter table public.owner_notifications enable row level security;

-- menu_items: guests read only available dishes, staff do everything
drop policy if exists "menu public read available" on public.menu_items;
create policy "menu public read available" on public.menu_items
  for select to anon using (is_available = true);

drop policy if exists "menu staff read all" on public.menu_items;
create policy "menu staff read all" on public.menu_items
  for select to authenticated using (true);

drop policy if exists "menu staff insert" on public.menu_items;
create policy "menu staff insert" on public.menu_items
  for insert to authenticated with check (true);

drop policy if exists "menu staff update" on public.menu_items;
create policy "menu staff update" on public.menu_items
  for update to authenticated using (true) with check (true);

drop policy if exists "menu staff delete" on public.menu_items;
create policy "menu staff delete" on public.menu_items
  for delete to authenticated using (true);

-- tables: guests may resolve the table their QR points at
drop policy if exists "tables public read" on public.tables;
create policy "tables public read" on public.tables
  for select to anon using (true);

drop policy if exists "tables staff all" on public.tables;
create policy "tables staff all" on public.tables
  for all to authenticated using (true) with check (true);

-- orders: guests can only INSERT (no reading other guests' tickets)
drop policy if exists "orders public insert" on public.orders;
create policy "orders public insert" on public.orders
  for insert to anon with check (
    status = 'pending' and table_id is not null
  );

drop policy if exists "orders staff read" on public.orders;
create policy "orders staff read" on public.orders
  for select to authenticated using (true);

drop policy if exists "orders staff update" on public.orders;
create policy "orders staff update" on public.orders
  for update to authenticated using (true) with check (true);

drop policy if exists "orders staff delete" on public.orders;
create policy "orders staff delete" on public.orders
  for delete to authenticated using (true);

-- bookings: guests can only INSERT their own request
drop policy if exists "bookings public insert" on public.bookings;
create policy "bookings public insert" on public.bookings
  for insert to anon with check (status = 'pending');

drop policy if exists "bookings staff read" on public.bookings;
create policy "bookings staff read" on public.bookings
  for select to authenticated using (true);

drop policy if exists "bookings staff update" on public.bookings;
create policy "bookings staff update" on public.bookings
  for update to authenticated using (true) with check (true);

drop policy if exists "bookings staff delete" on public.bookings;
create policy "bookings staff delete" on public.bookings
  for delete to authenticated using (true);

-- notifications: staff only
drop policy if exists "notifications staff read" on public.owner_notifications;
create policy "notifications staff read" on public.owner_notifications
  for select to authenticated using (true);

-- ---------------------------------------------------------------------
-- 3. Realtime
--    Guests listen to menu_items (availability), staff to orders/bookings.
-- ---------------------------------------------------------------------
alter publication supabase_realtime add table public.menu_items;
alter publication supabase_realtime add table public.orders;
alter publication supabase_realtime add table public.bookings;

alter table public.menu_items replica identity full;
alter table public.orders replica identity full;
alter table public.bookings replica identity full;

-- ---------------------------------------------------------------------
-- 4. Storage bucket for dish photos
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('menu-images', 'menu-images', true)
on conflict (id) do nothing;

drop policy if exists "menu images public read" on storage.objects;
create policy "menu images public read" on storage.objects
  for select to public using (bucket_id = 'menu-images');

drop policy if exists "menu images staff write" on storage.objects;
create policy "menu images staff write" on storage.objects
  for insert to authenticated with check (bucket_id = 'menu-images');

drop policy if exists "menu images staff update" on storage.objects;
create policy "menu images staff update" on storage.objects
  for update to authenticated using (bucket_id = 'menu-images');

drop policy if exists "menu images staff delete" on storage.objects;
create policy "menu images staff delete" on storage.objects
  for delete to authenticated using (bucket_id = 'menu-images');

-- ---------------------------------------------------------------------
-- 5. Seed data — 8 tables + 22 dishes
-- ---------------------------------------------------------------------
insert into public.tables (table_number, zone, seats) values
  (1,'Garden Terrace',2), (2,'Garden Terrace',4), (3,'Main Hall',4), (4,'Main Hall',4),
  (5,'Main Hall',6), (6,'Hotpot Bar',2), (7,'Hotpot Bar',2), (8,'Private Room',8)
on conflict (table_number) do nothing;

update public.tables set qr_code_url = '/table/' || id::text where qr_code_url is null;

insert into public.menu_items (name, description, price, category, image_url, is_available) values
 ('Gai Satay Skewers','Charcoal-grilled turmeric chicken skewers, roasted peanut sauce, ajad cucumber relish.',590,'Starters','https://images.pexels.com/photos/4965323/pexels-photo-4965323.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200',true),
 ('Crispy Golden Spring Rolls','Glass noodle, taro and shiitake rolls fried to a shatter, plum-chilli dip.',480,'Starters','https://images.pexels.com/photos/37279442/pexels-photo-37279442.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200',true),
 ('Tod Mun Pla Fish Cakes','Red curry fish cakes pounded with kaffir lime and snake bean.',640,'Starters','https://images.pexels.com/photos/37338385/pexels-photo-37338385.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200',true),
 ('Som Tam Thai','Green papaya pounded with palm sugar, lime, dried shrimp and toasted peanut.',520,'Starters','https://images.pexels.com/photos/4206592/pexels-photo-4206592.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200',true),
 ('Tom Yum Goong','Hot & sour prawn broth with lemongrass, galangal, straw mushroom, bird chilli.',620,'Soups','https://images.pexels.com/photos/21517337/pexels-photo-21517337.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200',true),
 ('Tom Kha Gai','Silky coconut chicken soup, galangal, kaffir lime leaf, coriander root.',560,'Soups','https://images.pexels.com/photos/31649749/pexels-photo-31649749.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200',true),
 ('Wonton & Glass Noodle Soup','Chicken-prawn wontons, glass noodle, garlic oil, spring onion.',520,'Soups','https://images.pexels.com/photos/1390665/pexels-photo-1390665.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200',true),
 ('Gaeng Keow Wan Gai','Signature green curry, chicken thigh, Thai eggplant, sweet basil, coconut cream.',890,'Curries','https://images.pexels.com/photos/9397205/pexels-photo-9397205.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200',true),
 ('Massaman Beef Curry','Slow-braised beef short rib, roasted spices, potato, shallot, cashew.',1180,'Curries','https://images.pexels.com/photos/37279442/pexels-photo-37279442.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200',true),
 ('Panang Duck Curry','Crispy duck leg in thick panang curry, lychee, pea aubergine.',1290,'Curries','https://images.pexels.com/photos/37090676/pexels-photo-37090676.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200',true),
 ('Pad Thai Goong','Wok-tossed rice noodles, tiger prawn, tamarind, chive, crushed peanut.',820,'Noodles','https://images.pexels.com/photos/10756648/pexels-photo-10756648.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200',true),
 ('Khao Soi Chiang Mai','Northern curry noodles, braised chicken, pickled mustard green, crisp egg noodle.',860,'Noodles','https://images.pexels.com/photos/7361022/pexels-photo-7361022.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200',true),
 ('Pad Kee Mao (Drunken Noodles)','Fiery flat noodles, holy basil, young peppercorn, chilli, your choice of protein.',780,'Noodles','https://images.pexels.com/photos/6454810/pexels-photo-6454810.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200',true),
 ('Laughing Buddha Suki Hotpot','Table hotpot for two — clear chicken broth, seafood platter, greens, house suki sauce.',2150,'Hotpot','https://images.pexels.com/photos/4206592/pexels-photo-4206592.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200',true),
 ('Tom Yum Volcano Hotpot','Blistering tom yum broth, river prawn, squid, enoki, glass noodle. Serves 2–3.',2450,'Hotpot','https://images.pexels.com/photos/6454809/pexels-photo-6454809.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200',true),
 ('Isaan Herbal Chicken Hotpot','Lemongrass and galangal broth, free-range chicken, Thai herbs, jasmine rice.',1850,'Hotpot','https://images.pexels.com/photos/37081070/pexels-photo-37081070.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200',true),
 ('Cha Yen (Thai Iced Tea)','Strong black tea, condensed milk, crushed ice.',260,'Drinks','https://images.pexels.com/photos/37179937/pexels-photo-37179937.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200',true),
 ('Mango Sunrise Cooler','Cold-pressed mango, lime, mint, sparkling water.',320,'Drinks','https://images.pexels.com/photos/31029411/pexels-photo-31029411.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200',true),
 ('Lemongrass Pandan Iced Tea','House-brewed lemongrass with pandan syrup and calamansi.',280,'Drinks','https://images.pexels.com/photos/17748109/pexels-photo-17748109.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200',true),
 ('Mango Sticky Rice','Warm coconut sticky rice, ripe mango, salted coconut cream, crisp mung bean.',420,'Desserts','https://images.pexels.com/photos/7361018/pexels-photo-7361018.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200',true),
 ('Grilled Bamboo Coconut Rice','Sticky rice roasted in bamboo, black bean, coconut custard.',380,'Desserts','https://images.pexels.com/photos/37060140/pexels-photo-37060140.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200',true),
 ('Coconut Ice Cream & Palm Sugar','House-churned coconut ice cream, toasted peanut, palm sugar caramel.',340,'Desserts','https://images.pexels.com/photos/7361018/pexels-photo-7361018.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200',false)
on conflict do nothing;

-- Sample reservations so the dashboard looks alive on day one
insert into public.bookings (name, phone, date, time, guests, special_request, status) values
 ('Farhan Rahman','+8801711223344', current_date, '19:30', 4, 'Anniversary — please arrange a corner table.', 'confirmed'),
 ('Tasnim Chowdhury','+8801855667788', current_date, '20:45', 2, 'Hotpot bar seats if possible.', 'pending'),
 ('Arif & family','+8801999001122', current_date + 1, '13:00', 6, null, 'pending')
on conflict do nothing;
