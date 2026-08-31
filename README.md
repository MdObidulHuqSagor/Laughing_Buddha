# ☸ Laughing Buddha — Modern Thai Restaurant Platform

QR table ordering, direct seat booking and a live owner dashboard for **Laughing Buddha**, a modern
Thai kitchen & hotpot bar in Gulshan 2, Dhaka.

Built with **Next.js 16 (App Router) + Tailwind CSS v4 + PostgreSQL (Drizzle ORM)**, and shipped
with a complete **Supabase schema** (`supabase/schema.sql`) so the same app can run on a free
Supabase project.

---

## 1. What's inside

| Route | Who | What it does |
| --- | --- | --- |
| `/` | Guests | Hero landing page, signature dishes, hotpot bar, hours & location |
| `/menu` | Guests | Full à-la-carte menu grouped by category (only `is_available = true`) |
| `/table/[tableId]` | Guests | **QR table ordering** — cart, quantities, per-dish notes, checkout, live ticket tracking |
| `/reservations` | Guests | **Direct seat booking** — name, phone, date, time, guests, special request + owner alert |
| `/admin/login` | Staff | Email + password sign-in (session cookie, hashed with scrypt) |
| `/admin` | Staff | Today's paid sales, live incoming orders (auto-refresh), today's reservations, Recharts bar chart of the week's most popular dishes |
| `/admin/menu` | Staff | **Manually add** / edit / duplicate / delete dishes, optional image upload, availability toggle, search & filters, delete confirm dialog |
| `/admin/tables` | Staff | Auto-generated printable QR code card for every table |
| `/admin/staff` | Staff | Create extra staff logins, reset passwords, revoke access |

### API surface

| Method & path | Auth | Purpose |
| --- | --- | --- |
| `GET /api/menu` | public | Available dishes (used by the guest realtime sync poll) |
| `POST /api/orders` | public | Place an order (prices re-validated server side) |
| `GET /api/orders/[id]` | public | Guest polls their own ticket status |
| `GET /api/orders` | staff | Live order feed |
| `PATCH /api/orders/[id]` | staff | `pending → preparing → served → paid` |
| `POST /api/bookings` | public | Create reservation + notify owner |
| `GET /api/bookings` · `PATCH /api/bookings/[id]` | staff | Reservation book, confirm / cancel |
| `GET/POST /api/admin/menu`, `PATCH/DELETE /api/admin/menu/[id]` | staff | Menu CRUD |
| `POST /api/admin/upload` | staff | Dish photo upload into the `menu-images` bucket |
| `GET /api/storage/[id]` | public | Serves an uploaded photo |
| `GET /api/admin/stats` | staff | KPIs + weekly popularity aggregation |
| `GET/POST /api/admin/staff`, `PATCH/DELETE /api/admin/staff/[id]` | staff | Staff login management (create, reset password, remove) |
| `GET /api/health` | public | Health check |

---

## 2. Running this repo (local Postgres + Drizzle)

```bash
npm install
cp .env.example .env      # then set DATABASE_URL
npx drizzle-kit push      # create tables
npm run dev               # http://localhost:3000
```

Demo data (22 dishes, 8 tables, a week of orders, 3 reservations and the owner account) is seeded
automatically and idempotently on the first server render — see `src/db/seed.ts`.

**Demo staff login:** `owner@laughingbuddha.com.bd` / `buddha123`
(override with `ADMIN_EMAIL` / `ADMIN_PASSWORD` before the first seed).

### Staff logins & manual menu entry

- **Sign in** at `/admin/login`. Sessions are opaque tokens in `admin_sessions`, stored in an
  httpOnly cookie and checked by both `middleware.ts` and a server-side `requireAdmin()` on every
  admin page and mutating route.
- **Add more staff** at `/admin/staff`: enter a name, email and password (a strong one is
  suggested for you) and that person can immediately sign in. You can reset anyone's password —
  which force-signs-out all of their devices — or revoke access entirely. You cannot delete the
  account you are currently using, nor the last remaining login. Passwords are salted scrypt
  hashes, so they can never be read back.
- **Add products by hand** at `/admin/menu` → **+ Add dish**: name, description, price, category
  and an availability toggle. Only name, price and category are required — a photo is optional and
  can be either an upload (stored in the `menu-images` bucket) or a pasted URL. **Duplicate** copies
  an existing dish as a starting point for variants. New dishes appear on guest phones within
  seconds, no reload or deploy needed.

### Environment variables

| Key | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | ✅ | Postgres connection string (Supabase: *Project settings → Database → Connection string → URI*) |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | – | Seeds the first owner account |
| `RESEND_API_KEY`, `OWNER_EMAIL`, `RESEND_FROM` | – | Emails the owner on every new reservation / order |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` | – | Telegram alerts instead of email |
| `OWNER_WEBHOOK_URL` | – | Any webhook (Zapier → WhatsApp Cloud API, Slack, n8n…) |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | – | Only needed if you switch the data layer to the Supabase JS client |

Every alert attempt is logged to `owner_notifications`, so nothing is lost when no provider key is
configured.

---

## 3. Running it on Supabase (free tier)

1. **Create the project** — [database.new](https://database.new) → pick a region close to Dhaka
   (e.g. `ap-southeast-1`), save the database password.
2. **Apply the schema** — open *SQL Editor* → *New query* → paste the whole of
   `supabase/schema.sql` → **Run**. This creates:
   - `menu_items`, `tables`, `orders`, `bookings`, `owner_notifications` (+ indexes & `updated_at` triggers)
   - all **RLS policies** (see below)
   - the **`menu-images` storage bucket** with public-read / staff-write policies
   - realtime publication for `menu_items`, `orders`, `bookings`
   - seed data: 8 tables and 22 dishes across the 7 categories
3. **Create the owner login** — *Authentication → Users → Add user* (email + password,
   auto-confirm). Any signed-in user counts as staff under the policies above; tighten with a
   `profiles.role = 'admin'` check if you add floor staff later.
4. **Point the app at Supabase**
   - Simplest: set `DATABASE_URL` to the Supabase Postgres pooler URI — the Drizzle data layer in
     this repo then talks straight to your Supabase database (server-side only, so RLS is bypassed
     by the service role, and the API routes above stay the security boundary).
   - Or go client-first: `npm i @supabase/supabase-js @supabase/ssr`, add
     `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and swap
     `fetch("/api/menu")` polling for `supabase.channel('menu').on('postgres_changes', …)`.
     The RLS policies in `schema.sql` are written for exactly that anon-key setup.
5. **Optional Edge Function for reservation emails**

   ```bash
   supabase functions new notify-owner
   # paste the Resend call from src/lib/notify.ts into index.ts
   supabase secrets set RESEND_API_KEY=... OWNER_EMAIL=...
   supabase functions deploy notify-owner
   ```

   Then add a database webhook (*Database → Webhooks*) on `INSERT` of `public.bookings` pointing at
   the function.

### RLS summary (as shipped in `schema.sql`)

| Table | `anon` (guest) | `authenticated` (staff) |
| --- | --- | --- |
| `menu_items` | `SELECT` where `is_available = true` | full CRUD |
| `tables` | `SELECT` (to resolve the scanned QR) | full CRUD |
| `orders` | `INSERT` only, forced `status = 'pending'` | `SELECT` / `UPDATE` / `DELETE` |
| `bookings` | `INSERT` only, forced `status = 'pending'` | `SELECT` / `UPDATE` / `DELETE` |
| `storage.objects` (`menu-images`) | public read | insert / update / delete |

---

## 4. Deploying to Vercel

```bash
npm i -g vercel
vercel            # link the project
vercel env add DATABASE_URL production        # Supabase pooler URI (port 6543)
vercel env add ADMIN_EMAIL production
vercel env add ADMIN_PASSWORD production
vercel env add RESEND_API_KEY production      # optional
vercel env add OWNER_EMAIL production         # optional
vercel --prod
```

Or via the dashboard: **New Project → import the repo → add the env vars above → Deploy**.
Framework preset is detected automatically (Next.js); no build command changes are needed.

After the first deploy, open `/admin/tables`, hit **Print QR cards** and stand one card on every
table — the codes embed your production domain automatically.

---

## 5. Design & implementation notes

- **Aesthetic** — deep chilli red (`#8a1622`), gold leaf (`#c8a24a`) and cream (`#fbf6ee`) with
  Playfair Display headings; theme tokens live in `src/app/globals.css` (Tailwind v4 `@theme`).
- **Mobile-first ordering** — the table screen is a single scroll with sticky category chips, a
  floating cart bar and a bottom sheet checkout; the dashboard is a desktop 3-column grid.
- **Realtime** — guests poll `/api/menu` every 10 s and their ticket every 6 s; the dashboard polls
  orders/bookings/stats every 5 s. Toggling availability in `/admin/menu` therefore hides a dish on
  every open guest phone without a reload. On Supabase, replace the polls with
  `supabase.channel(...)` subscriptions — the payload shapes are identical.
- **Auth** — scrypt-hashed passwords in `admin_users`, opaque session tokens in `admin_sessions`, an
  httpOnly cookie, an edge `middleware.ts` guard and a server-side `requireAdmin()` check on every
  admin page and mutation route.
- **Storage** — uploads go through `POST /api/admin/upload` into `storage_objects` (the local
  stand-in for the `menu-images` bucket) and are served immutably from `/api/storage/[id]`. Swap the
  body of that route for `supabase.storage.from('menu-images').upload(...)` to use real Supabase
  Storage.
- **Order integrity** — the client only sends `menuItemId` + `quantity`; prices, availability and
  totals are recomputed from the database on the server.

## 6. Project structure

```
src/
├─ app/
│  ├─ page.tsx                 landing page
│  ├─ menu/page.tsx            public menu
│  ├─ reservations/page.tsx    booking form
│  ├─ table/[tableId]/page.tsx QR ordering
│  ├─ admin/                   login · overview · menu · tables
│  └─ api/                     menu · orders · bookings · admin · storage · auth · health
├─ components/                 site + table + admin UI
├─ db/                         drizzle schema, client, idempotent seed
└─ lib/                        auth, queries, owner notifications, constants
supabase/schema.sql            tables · RLS · storage bucket · realtime · seed
```
# Laughing_Buddha
