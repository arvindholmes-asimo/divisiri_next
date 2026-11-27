import type { RazorpayClient, RazorpayPayment } from "../../src/modules/razorpay/service";

// In-memory stand-in for the parts of the Razorpay SDK the provider uses.
export function fakeRazorpay(payments: RazorpayPayment[] = []) {
  const calls = { create: [] as Record<string, unknown>[], capture: [] as unknown[][], refund: [] as unknown[][] };
  const client: RazorpayClient = {
    orders: {
      create: async (body) => {
        calls.create.push(body);
        return { id: "order_1" };
      },
      fetchPayments: async () => ({ items: payments }),
    },
    payments: {
      capture: async (id, amount, currency) => {
        calls.capture.push([id, amount, currency]);
        const payment = payments.find((item) => item.id === id)!;
        payment.status = "captured";
        return payment;
      },
      refund: async (id, body) => {
        calls.refund.push([id, body.amount]);
        return { id: "rfnd_1" };
      },
    },
  };
  return { client, calls };
}
