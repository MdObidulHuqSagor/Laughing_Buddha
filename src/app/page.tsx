import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { LogoLockup } from "@/components/Logo";
import { ensureSeeded } from "@/db/seed";
import { getMenu } from "@/lib/queries";
import { RESTAURANT, formatMoney } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  await ensureSeeded();
  const menu = await getMenu(true);
  const signatures = menu
    .filter((item) => ["Curries", "Noodles", "Hotpot"].includes(item.category))
    .slice(0, 6);

  return (
    <main className="min-h-screen">
      <SiteHeader transparent />

      {/* Hero */}
      <section className="relative isolate flex min-h-[92vh] items-end overflow-hidden">
        <img
          src="/images/hero.jpg"
          alt="Laughing Buddha dining room"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-chili-900 via-chili-900/70 to-chili-900/40" />
        <div className="relative mx-auto w-full max-w-6xl px-5 pb-20">
          <p className="text-xs tracking-[0.35em] text-gold-400 uppercase">
            Gulshan 2 · Dhaka · Since 2019
          </p>
          <h1 className="mt-4">
            <span className="sr-only">Laughing Buddha — modern Thai kitchen, Gulshan, Dhaka</span>
            <LogoLockup
              priority
              width={300}
              className="drop-shadow-[0_10px_35px_rgba(0,0,0,0.55)]"
            />
          </h1>
          <p className="mt-5 max-w-xl text-lg text-cream/85">
            Charcoal, coconut and chilli. A modern Thai kitchen and hotpot bar plating the street
            food of Bangkok and the slow curries of Chiang Mai — right on Road 11.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link
              href="/reservations"
              className="rounded-full bg-gold-500 px-7 py-3.5 text-sm font-semibold tracking-wide text-chili-900 uppercase shadow-lg shadow-black/30 transition hover:bg-gold-400"
            >
              Reserve a seat
            </Link>
            <Link
              href="/menu"
              className="rounded-full border border-cream/40 px-7 py-3.5 text-sm font-semibold tracking-wide text-cream uppercase transition hover:border-gold-400 hover:text-gold-400"
            >
              Explore the menu
            </Link>
          </div>
          <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-3 text-xs tracking-[0.2em] text-cream/60 uppercase">
            <span>Scan · Order · Eat</span>
            <span className="hidden h-3 w-px bg-cream/25 sm:block" />
            <span>Table hotpot for two</span>
            <span className="hidden h-3 w-px bg-cream/25 sm:block" />
            <span>Open till midnight Fri–Sat</span>
          </div>
        </div>
      </section>

      {/* QR ordering explainer */}
      <section className="thai-pattern bg-cream py-16">
        <div className="mx-auto max-w-6xl px-5">
          <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div>
              <p className="text-xs tracking-[0.3em] text-chili-600 uppercase">
                Order from your table
              </p>
              <h2 className="font-display mt-3 text-4xl font-semibold text-chili-900">
                No queue, no waiting on a waiter
              </h2>
              <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-ink/70">
                Every table carries its own QR code. Scan it, browse the live kitchen menu, add what
                you like, leave a note for the chef — and your ticket prints instantly in the
                kitchen. Sold-out dishes disappear from your screen in real time.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  href="/table/1"
                  className="rounded-full bg-chili-600 px-6 py-3 text-sm font-semibold text-cream transition hover:bg-chili-500"
                >
                  Try table #1 ordering
                </Link>
                <Link
                  href="/menu"
                  className="rounded-full border border-chili-600/30 px-6 py-3 text-sm font-semibold text-chili-700 transition hover:bg-chili-50"
                >
                  Browse only
                </Link>
              </div>
            </div>
            <ol className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
              {[
                {
                  step: "01",
                  title: "Scan the QR",
                  body: "The code on your table opens your personal menu.",
                },
                {
                  step: "02",
                  title: "Build your tray",
                  body: "Adjust quantities, add chilli notes or allergies.",
                },
                {
                  step: "03",
                  title: "Track & pay",
                  body: "Watch pending → preparing → served on your phone.",
                },
              ].map((s) => (
                <li
                  key={s.step}
                  className="rounded-2xl border border-gold-500/30 bg-white/70 p-5 shadow-sm"
                >
                  <span className="font-display text-2xl text-gold-600">{s.step}</span>
                  <p className="mt-1 font-semibold text-chili-900">{s.title}</p>
                  <p className="mt-1 text-sm text-ink/60">{s.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* Signature dishes */}
      <section className="bg-chili-900 py-20">
        <div className="mx-auto max-w-6xl px-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs tracking-[0.3em] text-gold-400 uppercase">From the kitchen</p>
              <h2 className="font-display mt-3 text-4xl font-semibold text-cream">
                Signature plates
              </h2>
            </div>
            <Link href="/menu" className="text-sm text-gold-400 underline-offset-4 hover:underline">
              See all {menu.length} dishes →
            </Link>
          </div>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {signatures.map((item) => (
              <article
                key={item.id}
                className="group overflow-hidden rounded-3xl border border-cream/10 bg-chili-700/40"
              >
                <div className="aspect-[4/3] overflow-hidden">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="h-full w-full bg-chili-700" />
                  )}
                </div>
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-display text-xl text-cream">{item.name}</h3>
                    <span className="shrink-0 text-sm font-semibold text-gold-400">
                      {formatMoney(item.price)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-cream/65">{item.description}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Hotpot */}
      <section id="hotpot" className="bg-cream py-20">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 lg:grid-cols-2 lg:items-center">
          <div className="order-2 lg:order-1">
            <p className="text-xs tracking-[0.3em] text-chili-600 uppercase">The hotpot bar</p>
            <h2 className="font-display mt-3 text-4xl font-semibold text-chili-900">
              Twelve seats around a simmering broth
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-ink/70">
              Pull up at the copper counter for Thai suki. Choose clear chicken or volcano tom yum,
              then dip river prawn, wagyu shoulder, enoki and morning glory into the pot while our
              team keeps the broth topped up. Book ahead — the bar fills up by 8pm.
            </p>
            <ul className="mt-6 space-y-2 text-sm text-ink/75">
              <li>· Two broths, one pot — split-pan available</li>
              <li>· House suki sauce pounded fresh every service</li>
              <li>· Free-flow greens and noodle refills</li>
            </ul>
            <Link
              href="/reservations"
              className="mt-8 inline-block rounded-full bg-chili-600 px-6 py-3 text-sm font-semibold text-cream transition hover:bg-chili-500"
            >
              Reserve the hotpot bar
            </Link>
          </div>
          <div className="order-1 grid grid-cols-2 gap-4 lg:order-2">
            {menu
              .filter((i) => i.category === "Hotpot")
              .slice(0, 2)
              .map((item, index) => (
                <img
                  key={item.id}
                  src={item.imageUrl ?? "/images/hero.jpg"}
                  alt={item.name}
                  className={`h-64 w-full rounded-3xl object-cover shadow-lg ${
                    index === 1 ? "mt-8" : ""
                  }`}
                />
              ))}
          </div>
        </div>
      </section>

      {/* Visit */}
      <section id="visit" className="bg-chili-700 py-20 text-cream">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 lg:grid-cols-3">
          <div>
            <p className="text-xs tracking-[0.3em] text-gold-200 uppercase">Find us</p>
            <h2 className="font-display mt-3 text-3xl font-semibold">{RESTAURANT.address}</h2>
            <a
              href={RESTAURANT.mapUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-block text-sm text-gold-200 underline underline-offset-4"
            >
              Open in Google Maps
            </a>
          </div>
          <div>
            <p className="text-xs tracking-[0.3em] text-gold-200 uppercase">Hours</p>
            {RESTAURANT.hours.map((h) => (
              <p key={h.days} className="mt-3 text-sm">
                <span className="block font-semibold">{h.days}</span>
                <span className="text-cream/75">{h.time}</span>
              </p>
            ))}
          </div>
          <div>
            <p className="text-xs tracking-[0.3em] text-gold-200 uppercase">Reservations</p>
            <p className="mt-3 text-sm text-cream/80">
              Same-day tables are held for 15 minutes. Groups of 8+ please call us directly.
            </p>
            <a
              href={`tel:${RESTAURANT.phone}`}
              className="font-display mt-3 block text-2xl text-gold-200"
            >
              {RESTAURANT.phone}
            </a>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
