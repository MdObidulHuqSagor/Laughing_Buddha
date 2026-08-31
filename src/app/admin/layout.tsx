import type { ReactNode } from "react";
import Link from "next/link";
import AdminNav from "@/components/admin/AdminNav";
import { LogoMark } from "@/components/Logo";
import { getSession } from "@/lib/auth";
import { RESTAURANT } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await getSession();

  if (!session) {
    return <div className="min-h-screen bg-chili-900">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-[#f5f1ea]">
      <header className="border-b border-black/10 bg-chili-900 text-cream">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <Link href="/admin" className="flex items-center gap-3">
            <LogoMark size={40} rounded="rounded-xl" />
            <span>
              <span className="font-display block text-base font-semibold">
                {RESTAURANT.name}
              </span>
              <span className="block text-[10px] tracking-[0.24em] text-gold-400 uppercase">
                Operations console
              </span>
            </span>
          </Link>
          <AdminNav email={session.email} />
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
    </div>
  );
}
