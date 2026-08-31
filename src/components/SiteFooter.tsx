import Link from "next/link";
import { LogoLockup } from "@/components/Logo";
import { RESTAURANT } from "@/lib/constants";

export default function SiteFooter() {
  return (
    <footer className="bg-chili-900 text-cream/80">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <LogoLockup width={190} className="-ml-2" />
          <p className="mt-2 text-sm">{RESTAURANT.tagline}</p>
          <p className="mt-4 text-xs tracking-[0.2em] text-gold-400 uppercase">Est. 2019</p>
        </div>
        <div className="text-sm">
          <p className="mb-3 text-xs tracking-[0.2em] text-gold-400 uppercase">Visit</p>
          <p>{RESTAURANT.address}</p>
          <a className="mt-2 block hover:text-gold-400" href={`tel:${RESTAURANT.phone}`}>
            {RESTAURANT.phone}
          </a>
          <a className="block hover:text-gold-400" href={`mailto:${RESTAURANT.email}`}>
            {RESTAURANT.email}
          </a>
        </div>
        <div className="text-sm">
          <p className="mb-3 text-xs tracking-[0.2em] text-gold-400 uppercase">Hours</p>
          {RESTAURANT.hours.map((h) => (
            <p key={h.days} className="mb-1">
              <span className="block text-cream">{h.days}</span>
              <span>{h.time}</span>
            </p>
          ))}
        </div>
        <div className="text-sm">
          <p className="mb-3 text-xs tracking-[0.2em] text-gold-400 uppercase">Quick links</p>
          <Link className="block hover:text-gold-400" href="/menu">
            Full menu
          </Link>
          <Link className="block hover:text-gold-400" href="/reservations">
            Reserve a seat
          </Link>
          <Link className="block hover:text-gold-400" href="/table/1">
            Demo table QR order
          </Link>
          <Link className="block hover:text-gold-400" href="/admin">
            Owner dashboard
          </Link>
        </div>
      </div>
      <div className="border-t border-cream/10 py-5 text-center text-xs text-cream/50">
        © {new Date().getFullYear()} {RESTAURANT.name}. Crafted in Dhaka.
      </div>
    </footer>
  );
}
