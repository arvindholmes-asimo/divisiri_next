import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { formatPaise } from "@/lib/money";
import { visibleProducts } from "@/modules/catalog/visibility";
import catalog from "../../catalog/catalog.json";

describe("visibleProducts", () => {
  it("limits production to published products", () => {
    expect(visibleProducts("production")).toEqual({ status: "PUBLISHED" });
  });

  it.each(["development", "test"] as const)("shows drafts in %s", (env) => {
    expect(visibleProducts(env)).toEqual({});
  });
});

describe("formatPaise", () => {
  it("formats rupees with Indian grouping", () => {
    expect(formatPaise(12345600)).toBe("₹1,23,456");
    expect(formatPaise(54950)).toBe("₹549.5");
  });

  it.each([-1, 1.5, Number.NaN])("rejects %s", (value) => {
    expect(() => formatPaise(value)).toThrow();
  });
});

describe("catalog.json", () => {
  const slugs = catalog.products.map((product) => product.slug);

  it("has unique products, each with an image", () => {
    expect(new Set(slugs).size).toBe(slugs.length);
    const images = new Set(readdirSync("public/products"));
    expect(slugs.filter((slug) => !images.has(`${slug}.webp`))).toEqual([]);
  });

  it("links concerns only to known products", () => {
    const linked = catalog.concerns.flatMap((concern) => concern.products);
    expect(linked.filter((slug) => !slugs.includes(slug))).toEqual([]);
  });

  it("carries no prices and only the expected top-level data", () => {
    expect(Object.keys(catalog).sort()).toEqual(["company", "concerns", "products"]);
    expect(readFileSync("catalog/catalog.json", "utf8")).not.toMatch(/"(price|mrp|compliance|chat|competitors)\w*"/i);
  });
});
