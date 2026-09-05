import { notFound } from "next/navigation";
import PrintButton from "@/components/admin/PrintButton";
import { formatMoney, RESTAURANT } from "@/lib/constants";
import { requireAdmin } from "@/lib/auth";
import { getOrderById } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const order = await getOrderById((await params).id);
  if (!order) notFound();
  return (
    <main className="mx-auto max-w-md bg-white p-6 text-sm text-ink print:max-w-none">
      <div className="text-center">
        <h1 className="font-display text-2xl font-semibold text-chili-900">{RESTAURANT.name}</h1>
        <p className="text-xs text-ink/55">{RESTAURANT.address}</p>
        <p className="text-xs text-ink/55">{RESTAURANT.phone}</p>
      </div>
      <div className="my-5 border-t border-dashed border-black/20 pt-4">
        <div className="flex justify-between text-xs text-ink/55"><span>Receipt #{order.id.slice(0, 8).toUpperCase()}</span><span>{new Date(order.createdAt).toLocaleString("en-GB")}</span></div>
        <p className="mt-1 text-xs">Table {order.tableNumber ?? "—"} · Payment: {order.paymentMethod}</p>
      </div>
      <ul className="space-y-2">{order.items.map((item, index) => <li key={index} className="flex justify-between gap-3"><span>{item.quantity}× {item.name}</span><span>{formatMoney(item.price * item.quantity)}</span></li>)}</ul>
      <div className="mt-5 space-y-1 border-t border-black/10 pt-3 text-right">
        {order.discountAmount > 0 && <p className="text-xs text-emerald-700">Discount −{formatMoney(order.discountAmount)}</p>}
        {order.taxAmount > 0 && <p className="text-xs">Tax {formatMoney(order.taxAmount)}</p>}
        {order.serviceChargeAmount > 0 && <p className="text-xs">Service charge {formatMoney(order.serviceChargeAmount)}</p>}
        <p className="text-lg font-semibold text-chili-900">Total {formatMoney(order.totalPrice)}</p>
      </div>
      <div className="mt-6 text-center"><PrintButton /></div>
    </main>
  );
}
