import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { ensureSeeded } from "@/db/seed";
import { getMenu } from "@/lib/queries";
import { CATEGORIES, formatMoney } from "@/lib/constants";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Menu · Laughing Buddha, Gulshan",
  description:
    "Starters, soups, curries, noodles, hotpot, drinks and desserts at Laughing Buddha, Gulshan 2, Dhaka.",
};

export default async function MenuPage() {
  await ensureSeeded();
  const menu = await getMenu(true);
  const groups = CATEGORIES.map((category) => ({
    category,
    items: menu.filter((item) => item.category === category),
  })).filter((group) => group.items.length > 0);

  return (
    <main className="min-h-screen">
      <SiteHeader />

      <section className="thai-pattern bg-cream pt-14 pb-10">
        <div className="mx-auto max-w-5xl px-5 text-center">
          <p className="text-xs tracking-[0.3em] text-chili-600 uppercase">The carte</p>
          <h1 className="font-display mt-3 text-5xl font-semibold text-chili-900">Our menu</h1>
          <p className="mx-auto mt-4 max-w-xl text-[15px] text-ink/65">
            Cooked to order in an open kitchen. Dishes are marked by heat on request — mild, Thai
            hot, or Buddha hot. Sitting with us? Scan the QR on your table to order straight from
            this list.
          </p>
          <div className="mx-auto mt-7 flex max-w-3xl flex-wrap justify-center gap-2">
            {groups.map((group) => (
              <a
                key={group.category}
                href={`#${group.category.toLowerCase()}`}
                className="rounded-full border border-chili-600/20 bg-white px-4 py-1.5 text-xs font-semibold text-chili-700 transition hover:bg-chili-600 hover:text-cream"
              >
                {group.category}
              </a>
            ))}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-5 pb-20">
        {groups.map((group) => (
          <section key={group.category} id={group.category.toLowerCase()} className="mt-14 scroll-mt-24">
            <div className="flex items-center gap-4">
              <h2 className="font-display text-3xl font-semibold text-chili-900">
                {group.category}
              </h2>
              <span className="gold-rule flex-1" />
            </div>
            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              {group.items.map((item) => (
                <article key={item.id} className="flex gap-4">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="h-24 w-24 shrink-0 rounded-2xl object-cover shadow-sm"
                    />
                  ) : (
                    <div className="grid h-24 w-24 shrink-0 place-items-center rounded-2xl bg-chili-50 text-2xl">
                      🍛
                    </div>
                  )}
                  <div>
                    <div className="flex items-baseline gap-2">
                      <h3 className="text-[15px] font-semibold text-ink">{item.name}</h3>
                      <span className="flex-1 border-b border-dotted border-ink/20" />
                      <span className="text-sm font-semibold text-chili-600">
                        {formatMoney(item.price)}
                      </span>
                    </div>
                    <p className="mt-1.5 text-sm leading-relaxed text-ink/60">
                      {item.description}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}

        <div className="mt-16 rounded-3xl bg-chili-900 px-8 py-10 text-center text-cream">
          <h2 className="font-display text-3xl font-semibold">Hungry now?</h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-cream/75">
            Reserve a table for tonight, or scan your table QR when you arrive to order in seconds.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href="/reservations"
              className="rounded-full bg-gold-500 px-6 py-3 text-sm font-semibold text-chili-900"
            >
              Reserve a seat
            </Link>
            <Link
              href="/table/1"
              className="rounded-full border border-cream/30 px-6 py-3 text-sm font-semibold text-cream"
            >
              Try table ordering
            </Link>
          </div>
        </div>
      </div>

      <SiteFooter />
    </main>
  );
}
