import type { Metadata } from "next";
import Link from "next/link";
import { rupees } from "@/components/checkout/summary";
import { getPlacedOrder } from "@/modules/checkout/cart";

export const metadata: Metadata = { title: "Order placed | DiviSiri Shop", robots: { index: false } };

export default async function OrderPlacedPage() {
  const order = await getPlacedOrder();
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      {order ? (
        <>
          <h1 className="font-display text-3xl font-bold">Order #{order.display_id} placed</h1>
          <p className="mt-2 text-slate-600">Keep this number. Order details are linked to {order.email}.</p>
          <ul className="mt-6 divide-y divide-slate-200">
            {order.items.map((item) => (
              <li key={item.id} className="flex justify-between gap-4 py-3">
                <span>
                  {item.product_title} × {item.quantity}
                </span>
                <span>{rupees(item.total)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-right font-bold">Total {rupees(order.total)}</p>
        </>
      ) : (
        <h1 className="font-display text-3xl font-bold">No recent order</h1>
      )}
      <Link href="/shop" className="text-brand mt-6 inline-block font-semibold">
        Continue shopping
      </Link>
    </main>
  );
}
