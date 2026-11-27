import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import { MedusaRequestError, medusa } from "@/lib/medusa";
import { getEnv } from "@/lib/env";

export const PAYMENT_PROVIDER = "pp_razorpay_razorpay";
const CART_COOKIE = "cart_id";
const ORDER_COOKIE = "last_order_id";
const ID = /^[a-z]+_[A-Za-z0-9]{10,40}$/;

export type Cart = {
  id: string;
  region_id: string;
  email: string | null;
  completed_at?: string | null;
  items: {
    id: string;
    product_title: string;
    product_handle: string;
    variant_title: string;
    quantity: number;
    unit_price: number;
    total: number;
  }[];
  item_total: number;
  shipping_total: number;
  total: number;
  shipping_address: Record<string, string | null> | null;
  shipping_methods?: { id: string }[];
  payment_collection?: {
    id: string;
    payment_sessions?: { provider_id: string; status: string; data: Record<string, unknown> }[];
  } | null;
};

export type Order = {
  id: string;
  display_id: number;
  email: string;
  total: number;
  items: { id: string; product_title: string; quantity: number; total: number }[];
};

async function readCookie(name: string) {
  const value = (await cookies()).get(name)?.value;
  return value && ID.test(value) ? value : null;
}

// Only server actions may write cookies.
async function writeCookie(name: string, value: string, maxAge: number) {
  (await cookies()).set(name, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: getEnv().APP_ENV === "production",
    path: "/",
    maxAge,
  });
}

export const getCart = cache(async (): Promise<Cart | null> => {
  const id = await readCookie(CART_COOKIE);
  if (!id) return null;
  try {
    const { cart } = await medusa<{ cart: Cart }>(
      `/store/carts/${id}?fields=+completed_at,*payment_collection.payment_sessions`,
    );
    return cart.completed_at ? null : cart;
  } catch (error) {
    if (error instanceof MedusaRequestError && error.status === 404) return null;
    throw error;
  }
});

export async function createCart(regionId: string) {
  const { cart } = await medusa<{ cart: { id: string } }>("/store/carts", {
    method: "POST",
    body: { region_id: regionId },
  });
  await writeCookie(CART_COOKIE, cart.id, 60 * 60 * 24 * 14);
  return cart.id;
}

export async function listShippingOptions(cartId: string) {
  const { shipping_options } = await medusa<{ shipping_options: { id: string; name: string; amount: number }[] }>(
    `/store/shipping-options?cart_id=${cartId}`,
  );
  return shipping_options;
}

export async function paymentIsConfigured(regionId: string) {
  const { payment_providers } = await medusa<{ payment_providers: { id: string }[] }>(
    `/store/payment-providers?region_id=${regionId}`,
  );
  return payment_providers.some((provider) => provider.id === PAYMENT_PROVIDER);
}

export async function rememberOrder(orderId: string) {
  await writeCookie(ORDER_COOKIE, orderId, 60 * 60 * 24);
  (await cookies()).delete(CART_COOKIE);
}

// Shown only to the browser that placed the order.
export async function getPlacedOrder(): Promise<Order | null> {
  const id = await readCookie(ORDER_COOKIE);
  if (!id) return null;
  const { order } = await medusa<{ order: Order }>(`/store/orders/${id}`);
  return order;
}
