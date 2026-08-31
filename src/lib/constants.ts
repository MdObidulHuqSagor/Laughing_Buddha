export const CATEGORIES = [
  "Starters",
  "Soups",
  "Curries",
  "Noodles",
  "Hotpot",
  "Drinks",
  "Desserts",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const ORDER_STATUSES = ["pending", "preparing", "served", "paid"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const BOOKING_STATUSES = ["pending", "confirmed", "cancelled"] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const NEXT_ORDER_STATUS: Record<OrderStatus, OrderStatus | null> = {
  pending: "preparing",
  preparing: "served",
  served: "paid",
  paid: null,
};

export const RESTAURANT = {
  name: "Laughing Buddha",
  tagline: "Modern Thai kitchen & hotpot bar",
  address: "House 42, Road 11, Gulshan 2, Dhaka 1212",
  phone: "+880 1711 000 420",
  email: "hello@laughingbuddha.com.bd",
  hours: [
    { days: "Sunday – Thursday", time: "12:00 PM – 11:00 PM" },
    { days: "Friday – Saturday", time: "12:00 PM – 12:00 AM" },
  ],
  mapUrl: "https://maps.google.com/?q=Gulshan+2+Dhaka",
};

export const CURRENCY = "৳";

export function formatMoney(value: number | string): string {
  const amount = typeof value === "string" ? Number(value) : value;
  return `${CURRENCY}${amount.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

export function estimatedMinutes(itemCount: number): number {
  return Math.min(45, 12 + itemCount * 3);
}
