import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PayButton } from "@/components/checkout/pay-button";
import { primaryButton } from "@/components/checkout/styles";
import { Totals } from "@/components/checkout/summary";
import { saveDetails } from "@/modules/checkout/actions";
import { getCart, listShippingOptions, paymentIsConfigured } from "@/modules/checkout/cart";
import { messages } from "@/modules/checkout/validation";

export const metadata: Metadata = { title: "Checkout | DiviSiri Shop" };

const fields = [
  { name: "email", label: "Email", type: "email", autoComplete: "email" },
  { name: "phone", label: "Mobile number", type: "tel", autoComplete: "tel" },
  { name: "first_name", label: "First name", autoComplete: "given-name" },
  { name: "last_name", label: "Last name", autoComplete: "family-name" },
  { name: "address_1", label: "Address", autoComplete: "address-line1" },
  { name: "address_2", label: "Landmark or area (optional)", autoComplete: "address-line2", optional: true },
  { name: "city", label: "City", autoComplete: "address-level2" },
  { name: "province", label: "State", autoComplete: "address-level1" },
  { name: "postal_code", label: "PIN code", autoComplete: "postal-code", inputMode: "numeric" as const },
];

type Props = { searchParams: Promise<{ error?: string; step?: string }> };

export default async function CheckoutPage({ searchParams }: Props) {
  const [{ error, step }, cart] = await Promise.all([searchParams, getCart()]);
  if (!cart || cart.items.length === 0) redirect("/cart");

  const [options, payable] = await Promise.all([listShippingOptions(cart.id), paymentIsConfigured(cart.region_id)]);
  // Checkout opens only once a delivery charge and a payment gateway are both set up.
  const open = options.length > 0 && payable;
  const paying = step === "pay" && !!cart.email && !!cart.shipping_methods?.length;
  const saved: Record<string, string | null | undefined> = { ...cart.shipping_address, email: cart.email };

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="font-display text-3xl font-bold">Checkout</h1>
      <p className="mt-2 text-sm text-slate-600">Guest checkout. Payment is online only; delivery within India.</p>
      {error && messages[error] && (
        <p role="alert" className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm">
          {messages[error]}
        </p>
      )}
      <div className="mt-6">
        <Totals cart={cart} />
      </div>
      {!open ? (
        <p className="mt-6 rounded-xl bg-slate-100 p-4 text-sm">Online ordering is not open yet.</p>
      ) : paying ? (
        <section className="mt-8 space-y-4">
          <h2 className="font-display text-xl font-bold">Deliver to</h2>
          <p className="text-sm text-slate-700">
            {saved.first_name} {saved.last_name}, {saved.address_1}
            {saved.address_2 ? `, ${saved.address_2}` : ""}, {saved.city}, {saved.province} {saved.postal_code}
            <br />
            {saved.email} · {saved.phone}
          </p>
          <Link href="/checkout" className="text-brand text-sm font-semibold">
            Change details
          </Link>
          <PayButton />
        </section>
      ) : (
        <form action={saveDetails} className="mt-8 grid gap-4 sm:grid-cols-2">
          {fields.map(({ name, label, optional, ...input }) => (
            <label key={name} className={`text-sm font-semibold ${name.startsWith("address") ? "sm:col-span-2" : ""}`}>
              {label}
              <input
                {...input}
                name={name}
                required={!optional}
                maxLength={200}
                defaultValue={saved[name] ?? ""}
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"
              />
            </label>
          ))}
          <div className="sm:col-span-2">
            <button type="submit" className={primaryButton}>
              Continue to payment
            </button>
          </div>
        </form>
      )}
    </main>
  );
}
