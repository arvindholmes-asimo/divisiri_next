import { formatPaise } from "@/lib/money";
import type { Cart } from "@/modules/checkout/cart";

export const rupees = (amount: number) => formatPaise(Math.round(amount * 100));

export function Totals({ cart }: { cart: Cart }) {
  return (
    <dl className="space-y-1 text-sm">
      <div className="flex justify-between">
        <dt>Items</dt>
        <dd>{rupees(cart.item_total)}</dd>
      </div>
      <div className="flex justify-between">
        <dt>Delivery</dt>
        <dd>{cart.shipping_methods?.length ? rupees(cart.shipping_total) : "Added at checkout"}</dd>
      </div>
      <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-bold">
        <dt>Total (inclusive of taxes)</dt>
        <dd>{rupees(cart.total)}</dd>
      </div>
    </dl>
  );
}
