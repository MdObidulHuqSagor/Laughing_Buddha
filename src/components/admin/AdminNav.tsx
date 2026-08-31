"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/menu", label: "Menu" },
  { href: "/admin/tables", label: "Tables & QR" },
  { href: "/admin/staff", label: "Staff" },
];

export default function AdminNav({ email }: { email: string }) {
  const pathname = usePathname();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
    // Hard navigation so the server re-renders without the cleared cookie.
    window.location.assign("/admin/login");
  }

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <nav className="flex items-center gap-1 rounded-full bg-cream/10 p-1">
        {links.map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                active ? "bg-gold-500 text-chili-900" : "text-cream/75 hover:text-gold-400"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
      <span className="hidden text-xs text-cream/50 lg:block">{email}</span>
      <Link
        href="/"
        target="_blank"
        className="rounded-full border border-cream/20 px-3 py-1.5 text-xs text-cream/75 hover:border-gold-400 hover:text-gold-400"
      >
        View site
      </Link>
      <button
        type="button"
        onClick={logout}
        className="rounded-full border border-cream/20 px-3 py-1.5 text-xs text-cream/75 hover:border-red-400 hover:text-red-300"
      >
        Sign out
      </button>
    </div>
  );
}
