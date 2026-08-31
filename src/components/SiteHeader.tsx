import Link from "next/link";
import { LogoMark } from "@/components/Logo";
import { RESTAURANT } from "@/lib/constants";

const links = [
  { href: "/menu", label: "Menu" },
  { href: "/reservations", label: "Reservations" },
  { href: "/#hotpot", label: "Hotpot" },
  { href: "/#visit", label: "Visit" },
];

export default function SiteHeader({ transparent = false }: { transparent?: boolean }) {
  return (
    <header
      className={
        transparent
          ? "absolute inset-x-0 top-0 z-30"
          : "sticky top-0 z-30 border-b border-gold-500/25 bg-chili-900/95 backdrop-blur"
      }
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
        <Link href="/" className="flex items-center gap-3">
          <LogoMark size={42} rounded="rounded-full" />
          <span className="leading-tight">
            <span className="font-display block text-lg font-semibold text-cream">
              {RESTAURANT.name}
            </span>
            <span className="block text-[10px] tracking-[0.24em] text-gold-400 uppercase">
              Gulshan · Dhaka
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-7 text-sm text-cream/85 md:flex">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="transition hover:text-gold-400">
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/reservations"
            className="rounded-full bg-gold-500 px-4 py-2 text-xs font-semibold tracking-wide text-chili-900 uppercase transition hover:bg-gold-400"
          >
            Book a table
          </Link>
          <Link
            href="/admin"
            className="hidden rounded-full border border-cream/30 px-4 py-2 text-xs font-semibold tracking-wide text-cream/80 uppercase transition hover:border-gold-400 hover:text-gold-400 sm:block"
          >
            Staff
          </Link>
        </div>
      </div>
    </header>
  );
}
