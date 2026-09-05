import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getSalesReport, listCustomerHistory } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(request.url);
  const range = url.searchParams.get("range") as "daily" | "weekly" | "monthly" | null;
  const format = url.searchParams.get("format");
  if (url.searchParams.get("customers") === "1") {
    return NextResponse.json({ customers: await listCustomerHistory(url.searchParams.get("search") ?? "") });
  }
  const rows = await getSalesReport(range === "weekly" || range === "monthly" ? range : "daily");
  if (format === "csv") {
    const header = "period,orders,sales,averageOrder,cash,card,mobile";
    const csv = [header, ...rows.map((row) =>
      [row.period, row.orders, row.sales, row.averageOrder, row.cash, row.card, row.mobile]
        .map((value) => `"${String(value).replaceAll('"', '""')}"`).join(","),
    )].join("\n");
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="laughing-buddha-${range ?? "daily"}-sales.csv"`,
      },
    });
  }
  return NextResponse.json({ rows }, { headers: { "Cache-Control": "no-store" } });
}
