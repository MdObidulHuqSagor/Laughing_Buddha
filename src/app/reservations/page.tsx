import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import ReservationForm from "@/components/ReservationForm";
import { RESTAURANT } from "@/lib/constants";

export const metadata = {
  title: "Reservations · Laughing Buddha, Gulshan",
  description:
    "Reserve your table or hotpot bar seats at Laughing Buddha, Gulshan 2, Dhaka. Instant request, confirmed by phone.",
};

export default function ReservationsPage() {
  return (
    <main className="min-h-screen">
      <SiteHeader />

      <section className="thai-pattern bg-cream py-14">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <p className="text-xs tracking-[0.3em] text-chili-600 uppercase">Reservations</p>
            <h1 className="font-display mt-3 text-5xl leading-tight font-semibold text-chili-900">
              Save your seat
            </h1>
            <p className="mt-4 text-[15px] leading-relaxed text-ink/70">
              Dinner service fills quickly after 8pm, especially around the hotpot bar. Send us a
              request and our host will confirm by phone within 15 minutes.
            </p>

            <dl className="mt-8 space-y-5 text-sm">
              <div>
                <dt className="text-xs tracking-[0.2em] text-gold-600 uppercase">Address</dt>
                <dd className="mt-1 text-ink/75">{RESTAURANT.address}</dd>
              </div>
              <div>
                <dt className="text-xs tracking-[0.2em] text-gold-600 uppercase">Call us</dt>
                <dd className="mt-1">
                  <a href={`tel:${RESTAURANT.phone}`} className="text-chili-700 underline">
                    {RESTAURANT.phone}
                  </a>
                </dd>
              </div>
              {RESTAURANT.hours.map((hour) => (
                <div key={hour.days}>
                  <dt className="text-xs tracking-[0.2em] text-gold-600 uppercase">{hour.days}</dt>
                  <dd className="mt-1 text-ink/75">{hour.time}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-8 rounded-2xl border border-gold-500/30 bg-white/70 p-5 text-sm text-ink/70">
              <p className="font-semibold text-chili-900">Groups of 8 or more</p>
              <p className="mt-1">
                Our private room seats 10. Call us and we will build a set menu around your budget.
              </p>
            </div>
          </div>

          <ReservationForm />
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
