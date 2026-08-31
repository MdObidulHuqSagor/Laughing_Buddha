import DashboardClient from "@/components/admin/DashboardClient";
import { ensureSeeded } from "@/db/seed";
import { requireAdmin } from "@/lib/auth";
import { getDashboardStats, listBookings, listRecentOrders } from "@/lib/queries";

export const dynamic = "force-dynamic";

export const metadata = { title: "Dashboard · Laughing Buddha" };

export default async function AdminDashboardPage() {
  await requireAdmin();
  await ensureSeeded();

  const [stats, orders, bookings] = await Promise.all([
    getDashboardStats(),
    listRecentOrders(60),
    listBookings(true),
  ]);

  return (
    <DashboardClient initialStats={stats} initialOrders={orders} initialBookings={bookings} />
  );
}
