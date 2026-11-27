import { describe, expect, it } from "vitest";
import { toProduct } from "@/modules/catalog/mapping";
import { detailsSchema, lineSchema } from "@/modules/checkout/validation";

const details = {
  email: " buyer@example.com ", first_name: "A", last_name: "B", phone: "+91 98765-43210",
  address_1: "1 Road", city: "Hyderabad", province: "Telangana", postal_code: "500100",
};

describe("checkout input", () => {
  it("cleans up a valid address and mobile number", () => {
    expect(detailsSchema.parse(details)).toMatchObject({ email: "buyer@example.com", phone: "9876543210" });
  });

  it.each([
    ["email", "nope"], ["phone", "12345"], ["postal_code", "012345"], ["first_name", "  "],
  ])("rejects a bad %s", (field, value) => {
    expect(detailsSchema.safeParse({ ...details, [field]: value }).success).toBe(false);
  });

  it("limits quantities and line ids", () => {
    const line_id = "cali_01M8EC812065GABKQXSF4V0XCC";
    expect(lineSchema.parse({ line_id, quantity: "0" }).quantity).toBe(0);
    expect(lineSchema.safeParse({ line_id, quantity: "11" }).success).toBe(false);
    expect(lineSchema.safeParse({ line_id: "../carts", quantity: "1" }).success).toBe(false);
  });
});

describe("toProduct", () => {
  const raw = { handle: "a", title: "A", metadata: { mrpInr: 599 }, variants: [{ id: "v", calculated_price: null }] };

  it("leaves an unpriced product without a price", () => {
    expect(toProduct(raw)).toMatchObject({ pricePaise: null, mrpPaise: 59900, variantId: "v" });
  });

  it("converts rupees to paise", () => {
    const priced = { ...raw, variants: [{ id: "v", calculated_price: { calculated_amount: 499.5 } }] };
    expect(toProduct(priced).pricePaise).toBe(49950);
  });
});
