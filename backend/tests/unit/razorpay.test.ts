import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import RazorpayProviderService, { toPaise } from "../../src/modules/razorpay/service";
import type { RazorpayPayment } from "../../src/modules/razorpay/service";
import { fakeRazorpay } from "../fakes/razorpay";

const options = { keyId: "rzp_test_abc", keySecret: "secret", webhookSecret: "hook" };
const logger = { error: () => {}, warn: () => {}, info: () => {} };

function provider(payments: RazorpayPayment[] = []) {
  const fake = fakeRazorpay(payments);
  const service = new RazorpayProviderService({ logger } as never, options, fake.client);
  return { service, ...fake };
}

const data = { order_id: "order_1", amount: 49900, currency: "INR" };
const paid = (over: Partial<RazorpayPayment> = {}): RazorpayPayment => ({
  id: "pay_1", order_id: "order_1", amount: 49900, currency: "INR", status: "captured", ...over,
});

describe("toPaise", () => {
  it("converts rupees without floating point drift", () => {
    expect(toPaise(499)).toBe(49900);
    expect(toPaise(0.1 + 0.2)).toBe(30);
    expect(toPaise("1234.56")).toBe(123456);
  });
  it("rejects amounts that are not positive", () => {
    expect(() => toPaise(0)).toThrow();
    expect(() => toPaise(-1)).toThrow();
    expect(() => toPaise("abc")).toThrow();
  });
});

describe("razorpay provider", () => {
  it("creates an order from the server amount and ignores client supplied data", async () => {
    const { service, calls } = provider();
    const result = await service.initiatePayment({
      amount: 499, currency_code: "inr", data: { session_id: "ps_1", amount: 1, order_id: "forged" },
    });
    expect(calls.create[0]).toMatchObject({ amount: 49900, currency: "INR", notes: { session_id: "ps_1" } });
    expect(result.id).toBe("order_1");
    expect(result.data).toEqual({ ...data, key_id: "rzp_test_abc", session_id: "ps_1" });
  });

  it("refuses currencies other than INR", async () => {
    await expect(provider().service.initiatePayment({ amount: 5, currency_code: "usd" })).rejects.toThrow(/INR/);
  });

  it("stays pending until Razorpay reports a payment", async () => {
    const result = await provider([]).service.authorizePayment({ data });
    expect(result.status).toBe("pending");
  });

  it.each([
    ["failed", paid({ status: "failed" })],
    ["short", paid({ amount: 100 })],
    ["other currency", paid({ currency: "USD" })],
  ])("does not accept a %s payment", async (_label, payment) => {
    const result = await provider([payment]).service.authorizePayment({ data });
    expect(result.status).toBe("pending");
  });

  it("reports captured and authorized payments", async () => {
    const captured = await provider([paid()]).service.authorizePayment({ data });
    expect(captured).toMatchObject({ status: "captured", data: { payment_id: "pay_1" } });
    const authorized = await provider([paid({ status: "authorized" })]).service.authorizePayment({ data });
    expect(authorized.status).toBe("authorized");
  });

  it("captures once", async () => {
    const { service, calls } = provider([paid({ status: "authorized" })]);
    await service.capturePayment({ data });
    await service.capturePayment({ data });
    expect(calls.capture).toEqual([["pay_1", 49900, "INR"]]);
  });

  it("refuses to capture when there is no payment", async () => {
    await expect(provider().service.capturePayment({ data })).rejects.toThrow();
  });

  it("refunds in paise", async () => {
    const { service, calls } = provider([paid()]);
    await service.refundPayment({ amount: 100, data: { ...data, payment_id: "pay_1" } });
    expect(calls.refund).toEqual([["pay_1", 10000]]);
  });
});

describe("razorpay webhook", () => {
  const body = {
    event: "order.paid",
    payload: { order: { entity: { id: "order_1", amount_paid: 49900, notes: { session_id: "ps_1" } } } },
  };
  const rawData = JSON.stringify(body);
  const sign = (secret: string) => createHmac("sha256", secret).update(rawData).digest("hex");
  const send = (signature: string) =>
    provider().service.getWebhookActionAndData({
      data: body, rawData, headers: { "x-razorpay-signature": signature },
    });

  it("accepts a correctly signed order.paid", async () => {
    expect(await send(sign("hook"))).toEqual({ action: "captured", data: { session_id: "ps_1", amount: 499 } });
  });

  it("ignores a bad or missing signature", async () => {
    expect(await send(sign("wrong"))).toEqual({ action: "not_supported" });
    expect(await send("")).toEqual({ action: "not_supported" });
  });
});
