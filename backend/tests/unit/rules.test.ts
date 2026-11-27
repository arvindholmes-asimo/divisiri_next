import { describe, expect, it } from "vitest";
import { parseEnv } from "../../src/lib/env";
import { parsePrices } from "../../src/lib/prices";
import { blockedFromSale } from "../../src/lib/sales-gate";

const base = {
  APP_ENV: "development", DATABASE_URL: "postgresql://shop:local-dev-only@127.0.0.1:5433/medusa",
  JWT_SECRET: "j", COOKIE_SECRET: "c", STORE_CORS: "a", ADMIN_CORS: "a", AUTH_CORS: "a",
};

describe("backend environment", () => {
  it("accepts local settings without payment keys", () => {
    expect(parseEnv(base).razorpay).toBeUndefined();
  });
  it("needs both Razorpay keys and test keys outside production", () => {
    expect(() => parseEnv({ ...base, RAZORPAY_KEY_ID: "rzp_test_a" })).toThrow(/KEY_SECRET/);
    expect(() => parseEnv({ ...base, RAZORPAY_KEY_ID: "rzp_live_a", RAZORPAY_KEY_SECRET: "s" })).toThrow(/rzp_test_/);
  });
  it("rejects local settings in production without printing values", () => {
    expect(() => parseEnv({ ...base, APP_ENV: "production" })).toThrow(/JWT_SECRET[\s\S]*REDIS_URL/);
    try {
      parseEnv({ ...base, APP_ENV: "production" });
    } catch (error) {
      expect((error as Error).message).not.toContain("local-dev-only@");
    }
  });
});

describe("prices", () => {
  const file = (mrp: number | null, price: number | null) => ({ shippingFlatInr: null, products: { a: { mrp, price } } });
  it("accepts unpriced and valid entries", () => {
    expect(() => parsePrices(file(null, null), ["a"])).not.toThrow();
    expect(() => parsePrices(file(599, 499.5), ["a"])).not.toThrow();
  });
  it.each([[499, 599], [599, null], [0, 0], [599, 1.234]])("rejects mrp %s price %s", (mrp, price) => {
    expect(() => parsePrices(file(mrp, price), ["a"])).toThrow();
  });
  it("rejects a product that is not in the catalogue", () => {
    expect(() => parsePrices(file(null, null), ["b"])).toThrow(/not in the catalogue/);
  });
});

describe("sales gate", () => {
  const products = [
    { title: "Reviewed", metadata: { review_open: false } },
    { title: "In review", metadata: { review_open: true } },
    { title: "Unknown", metadata: null },
  ];
  it("blocks anything not clearly reviewed in production only", () => {
    expect(blockedFromSale("production", products)).toEqual(["In review", "Unknown"]);
    expect(blockedFromSale("development", products)).toEqual([]);
  });
});
