import OperationsClient from "@/components/admin/OperationsClient";
import { ensureSeeded } from "@/db/seed";
import { requireAdmin } from "@/lib/auth";
import { getAdminOperationsData, listBookings, listCustomerHistory, listRecentOrders } from "@/lib/queries";

export const dynamic = "force-dynamic";
export const metadata = { title: "Operations · Laughing Buddha" };

export default async function AdminOperationsPage() {
  await requireAdmin();
  await ensureSeeded();
  const [data, orders, bookings, customers] = await Promise.all([
    getAdminOperationsData(),
    listRecentOrders(80),
    listBookings(false),
    listCustomerHistory(),
  ]);
  return <OperationsClient initial={{ ...data, orders, bookings, customers, today: new Date().toISOString().slice(0, 10) }} />;
}
