import type { Metadata } from "next";
import Link from "next/link";
import { primaryButton } from "@/components/checkout/styles";
import { Totals, rupees } from "@/components/checkout/summary";
import { updateLine } from "@/modules/checkout/actions";
import { getCart } from "@/modules/checkout/cart";
import { messages } from "@/modules/checkout/validation";

export const metadata: Metadata = { title: "Cart | DiviSiri Shop" };

export default async function CartPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const [{ error }, cart] = await Promise.all([searchParams, getCart()]);
  const items = cart?.items ?? [];

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="font-display text-3xl font-bold">Your cart</h1>
      {error && messages[error] && (
        <p role="alert" className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm">
          {messages[error]}
        </p>
      )}
      {!cart || items.length === 0 ? (
        <p className="mt-6">
          Your cart is empty.{" "}
          <Link href="/shop" className="text-brand font-semibold">
            Browse products
          </Link>
        </p>
      ) : (
        <>
          <ul className="mt-6 divide-y divide-slate-200">
            {items.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
                <div>
                  <Link href={`/products/${item.product_handle}`} className="font-semibold">
                    {item.product_title}
                  </Link>
                  <p className="text-sm text-slate-600">
                    {rupees(item.unit_price)} each · {rupees(item.total)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <form action={updateLine} className="flex items-center gap-2">
                    <input type="hidden" name="line_id" value={item.id} />
                    <label className="text-sm">
                      <span className="sr-only">Quantity of {item.product_title}</span>
                      <input
                        type="number"
                        name="quantity"
                        min={1}
                        max={10}
                        required
                        defaultValue={item.quantity}
                        key={item.quantity}
                        className="w-16 rounded-lg border border-slate-300 px-2 py-1"
                      />
                    </label>
                    <button type="submit" className="text-sm font-semibold underline">
                      Update
                    </button>
                  </form>
                  <form action={updateLine}>
                    <input type="hidden" name="line_id" value={item.id} />
                    <input type="hidden" name="quantity" value="0" />
                    <button type="submit" className="text-sm text-slate-600 underline">
                      Remove<span className="sr-only"> {item.product_title}</span>
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-4">
            <Totals cart={cart} />
          </div>
          <Link href="/checkout" className={`${primaryButton} mt-6 inline-block`}>
            Checkout
          </Link>
        </>
      )}
    </main>
  );
}
