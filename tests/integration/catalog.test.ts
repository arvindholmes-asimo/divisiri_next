import { existsSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

// Needs a running, seeded Medusa backend.
if (existsSync(".env")) process.loadEnvFile(".env");

async function queriesFor(appEnv: "test" | "production") {
  vi.resetModules();
  // Only the environment name changes; the backend stays the local one.
  const env = { ...process.env, APP_ENV: appEnv };
  vi.doMock("@/lib/env", () => ({ getEnv: () => env }));
  return import("@/modules/catalog/queries");
}

describe("catalogue queries", () => {
  it("returns seeded products in order, with concern filters", async () => {
    const catalog = await queriesFor("test");
    const products = await catalog.listProducts();
    expect(products.length).toBeGreaterThanOrEqual(21);
    expect(products.map((p) => p.position)).toEqual([...products.map((p) => p.position)].sort((a, b) => a - b));
    expect((await catalog.listProducts("bone-joint-health")).map((p) => p.slug)).toContain("bonfortis-k2");
    expect((await catalog.getProduct("bonfortis-k2"))?.composition.length).toBeGreaterThan(0);
  });

  it("returns nothing for unknown or malformed slugs", async () => {
    const catalog = await queriesFor("test");
    expect(await catalog.getProduct("no-such-product")).toBeNull();
    expect(await catalog.getProduct("../etc")).toBeNull();
  });

  it("hides products under review in production, including from concerns", async () => {
    const catalog = await queriesFor("production");
    const products = await catalog.listProducts();
    expect(products.every((p) => p.review_open === false)).toBe(true);
    const visible = new Set(products.map((p) => p.slug));
    const listed = (await catalog.listConcerns()).flatMap((concern) => concern.productSlugs);
    expect(listed.every((slug) => visible.has(slug))).toBe(true);
  });
});
