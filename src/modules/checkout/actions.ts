"use server";

// Anyone can POST to a server action, so every input is checked here.
// The cart is always the one named by the caller's own cookie.
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { medusa } from "@/lib/medusa";
import { getProduct } from "@/modules/catalog/queries";
import { getRegionId } from "@/modules/catalog/region";
import {
  PAYMENT_PROVIDER, createCart, getCart, listShippingOptions, rememberOrder, type Cart,
} from "./cart";
import { detailsSchema, lineSchema } from "./validation";

async function attempt(task: () => Promise<unknown>) {
  try {
    await task();
    return true;
  } catch (error) {
    console.error("checkout:", error instanceof Error ? error.message : "unknown error");
    return false;
  }
}

export async function addToCart(formData: FormData) {
  // The variant is looked up here, so hidden or unpriced products cannot be added.
  const ok = await attempt(async () => {
    const product = await getProduct(String(formData.get("slug")));
    if (!product?.variantId || product.pricePaise === null) throw new Error("product is not for sale");
    const cartId = (await getCart())?.id ?? (await createCart(await getRegionId()));
    await medusa(`/store/carts/${cartId}/line-items`, {
      method: "POST",
      body: { variant_id: product.variantId, quantity: 1 },
    });
  });
  redirect(ok ? "/cart" : "/cart?error=add");
}

export async function updateLine(formData: FormData) {
  const input = lineSchema.safeParse(Object.fromEntries(formData));
  const cart = await getCart();
  const ok =
    input.success &&
    !!cart &&
    (await attempt(() => {
      const path = `/store/carts/${cart.id}/line-items/${input.data.line_id}`;
      return input.data.quantity === 0
        ? medusa(path, { method: "DELETE" })
        : medusa(path, { method: "POST", body: { quantity: input.data.quantity } });
    }));
  revalidatePath("/cart");
  redirect(ok ? "/cart" : "/cart?error=update");
}

export async function saveDetails(formData: FormData) {
  const input = detailsSchema.safeParse(Object.fromEntries(formData));
  if (!input.success) redirect("/checkout?error=details");
  const cart = await getCart();
  if (!cart || cart.items.length === 0) redirect("/cart");

  let deliverable = true;
  const ok = await attempt(async () => {
    const { email, ...address } = input.data;
    const full = { ...address, country_code: "in" };
    await medusa(`/store/carts/${cart.id}`, {
      method: "POST",
      body: { email, shipping_address: full, billing_address: full },
    });
    const [option] = await listShippingOptions(cart.id);
    if (!option) {
      deliverable = false;
      return;
    }
    await medusa(`/store/carts/${cart.id}/shipping-methods`, { method: "POST", body: { option_id: option.id } });
  });
  if (!ok) redirect("/checkout?error=server");
  if (!deliverable) redirect("/checkout?error=delivery");
  redirect("/checkout?step=pay");
}

export type PaymentStart =
  | { ok: true; keyId: string; orderId: string; amount: number; email: string; phone: string; name: string }
  | { ok: false };

const pendingSession = (cart: Cart) =>
  cart.payment_collection?.payment_sessions?.find(
    (session) => session.provider_id === PAYMENT_PROVIDER && session.status === "pending",
  );

export async function startPayment(): Promise<PaymentStart> {
  const cart = await getCart();
  if (!cart || !cart.email || !cart.shipping_methods?.length) return { ok: false };
  try {
    // Medusa drops the session when the cart changes, so an existing one still matches.
    // Reusing it means a retry can't create a second order for the same cart.
    let data = pendingSession(cart)?.data;
    if (!data) {
      const collectionId =
        cart.payment_collection?.id ??
        (
          await medusa<{ payment_collection: { id: string } }>("/store/payment-collections", {
            method: "POST",
            body: { cart_id: cart.id },
          })
        ).payment_collection.id;
      const { payment_collection } = await medusa<{ payment_collection: NonNullable<Cart["payment_collection"]> }>(
        `/store/payment-collections/${collectionId}/payment-sessions`,
        { method: "POST", body: { provider_id: PAYMENT_PROVIDER } },
      );
      data = pendingSession({ ...cart, payment_collection })?.data;
    }
    const { key_id, order_id, amount } = data ?? {};
    if (typeof key_id !== "string" || typeof order_id !== "string" || typeof amount !== "number") {
      throw new Error("payment session is incomplete");
    }
    const address = cart.shipping_address;
    return {
      ok: true,
      keyId: key_id,
      orderId: order_id,
      amount,
      email: cart.email,
      phone: address?.phone ?? "",
      name: `${address?.first_name ?? ""} ${address?.last_name ?? ""}`.trim(),
    };
  } catch (error) {
    console.error("checkout:", error instanceof Error ? error.message : "unknown error");
    return { ok: false };
  }
}

// The browser's word is not proof of payment: the backend asks Razorpay before it makes an order.
export async function placeOrder(): Promise<{ ok: false }> {
  const cart = await getCart();
  if (!cart) return { ok: false };
  let orderId: string | undefined;
  await attempt(async () => {
    const result = await medusa<{ type: "order" | "cart"; order?: { id: string } }>(
      `/store/carts/${cart.id}/complete`,
      { method: "POST", body: {} },
    );
    if (result.type === "order") orderId = result.order?.id;
  });
  if (!orderId) return { ok: false };
  await rememberOrder(orderId);
  redirect("/order/placed");
}
