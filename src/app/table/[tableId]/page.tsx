import Link from "next/link";
import type { Metadata } from "next";
import TableOrderClient from "@/components/table/TableOrderClient";
import { LogoLockup } from "@/components/Logo";
import { ensureSeeded } from "@/db/seed";
import { getMenu, getTable } from "@/lib/queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Order at your table · Laughing Buddha",
};

export default async function TableOrderPage({
  params,
}: {
  params: Promise<{ tableId: string }>;
}) {
  await ensureSeeded();
  const { tableId } = await params;
  const [table, menu] = await Promise.all([getTable(tableId), getMenu(true)]);

  if (!table) {
    return (
      <main className="grid min-h-screen place-items-center bg-chili-900 px-6 text-center text-cream">
        <div>
          <LogoLockup width={200} className="mx-auto" />
          <h1 className="font-display mt-4 text-3xl font-semibold">We can&apos;t find that table</h1>
          <p className="mt-3 max-w-sm text-sm text-cream/70">
            The QR code may be damaged. Please ask a member of our team for a fresh code, or browse
            the menu below.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link
              href="/menu"
              className="rounded-full bg-gold-500 px-5 py-2.5 text-sm font-semibold text-chili-900"
            >
              View menu
            </Link>
            <Link
              href="/table/1"
              className="rounded-full border border-cream/30 px-5 py-2.5 text-sm font-semibold"
            >
              Demo table 1
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <TableOrderClient
      tableId={table.id}
      tableNumber={table.tableNumber}
      zone={table.zone}
      initialMenu={menu}
    />
  );
}
