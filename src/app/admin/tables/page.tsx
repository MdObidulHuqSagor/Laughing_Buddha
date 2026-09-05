import { headers } from "next/headers";
import Link from "next/link";
import QRCode from "qrcode";
import PrintButton from "@/components/admin/PrintButton";
import TableManager from "@/components/admin/TableManager";
import { LogoLockup } from "@/components/Logo";
import { ensureSeeded } from "@/db/seed";
import { requireAdmin } from "@/lib/auth";
import { listTables } from "@/lib/queries";

export const dynamic = "force-dynamic";

export const metadata = { title: "Tables & QR codes · Laughing Buddha" };

export default async function AdminTablesPage() {
  await requireAdmin();
  await ensureSeeded();

  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "localhost:3000";
  const protocol = headerList.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  const origin = `${protocol}://${host}`;

  const tables = await listTables();
  const cards = await Promise.all(
    tables.map(async (table) => {
      const url = `${origin}/table/${table.id}`;
      const qr = await QRCode.toDataURL(url, {
        margin: 1,
        width: 320,
        color: { dark: "#3b070e", light: "#ffffff" },
      });
      return { table, url, qr };
    }),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold text-chili-900">Tables &amp; QR codes</h1>
          <p className="mt-1 text-sm text-ink/55">
            Print these cards and stand one on every table. Each code opens that table&apos;s
            ordering screen.
          </p>
        </div>
        <PrintButton />
      </div>

      <TableManager />

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(({ table, url, qr }) => (
          <article
            key={table.id}
            className="rounded-3xl border border-black/5 bg-white p-5 text-center shadow-sm"
          >
            <div className="mx-auto w-fit rounded-2xl bg-black px-5 py-2 ring-1 ring-gold-500/40">
              <LogoLockup width={120} />
            </div>
            <h2 className="font-display mt-3 text-2xl font-semibold text-chili-900">
              Table {table.tableNumber}
            </h2>
            <p className="text-xs text-ink/50">
              {table.zone} · {table.seats} seats
            </p>
            <span className={`mt-2 inline-block rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${
              table.status === "occupied"
                ? "bg-red-100 text-red-700"
                : table.status === "reserved"
                  ? "bg-amber-100 text-amber-800"
                  : "bg-emerald-100 text-emerald-800"
            }`}>
              {table.status}
            </span>
            <img src={qr} alt={`QR for table ${table.tableNumber}`} className="mx-auto mt-3 w-40" />
            <p className="mt-2 text-[10px] break-all text-ink/40">{url}</p>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              <a
                href={qr}
                download={`laughing-buddha-table-${table.tableNumber}-qr.png`}
                className="rounded-full bg-chili-600 px-4 py-1.5 text-[11px] font-semibold text-cream hover:bg-chili-500"
              >
                Download QR
              </a>
              <Link
                href={`/table/${table.id}`}
                target="_blank"
                className="rounded-full border border-chili-600/25 px-4 py-1.5 text-[11px] font-semibold text-chili-700 hover:bg-chili-50"
              >
                Open ordering screen
              </Link>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
