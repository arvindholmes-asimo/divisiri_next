import { existsSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { getDb } from "@/lib/db";

// Needs a migrated and seeded database.
if (existsSync(".env")) process.loadEnvFile(".env");

async function queriesFor(appEnv: "test" | "production") {
  vi.resetModules();
  // Only the environment name changes; the database stays the local one.
  const env = { ...process.env, APP_ENV: appEnv };
  vi.doMock("@/lib/env", () => ({ getEnv: () => env }));
  return import("@/modules/catalog/queries");
}

const temporary = ["zz-test-draft", "zz-test-published"];
const base = {
  position: 999, name: "Temporary", tagline: "", format: "", pack: "", category: "", type: "",
  composition: [], ingredients: "", benefits: [], packClaims: [], dosage: "", precautions: "",
};

describe("catalogue queries", () => {
  beforeAll(async () => {
    await getDb().product.deleteMany({ where: { slug: { in: temporary } } });
    await getDb().product.createMany({
      data: [
        { ...base, slug: "zz-test-draft", status: "DRAFT" },
        { ...base, slug: "zz-test-published", status: "PUBLISHED" },
      ],
    });
  });

  afterAll(async () => {
    await getDb().product.deleteMany({ where: { slug: { in: temporary } } });
    await getDb().$disconnect();
  });

  it("returns seeded products and concern filters outside production", async () => {
    const catalog = await queriesFor("test");
    expect((await catalog.listProducts()).length).toBeGreaterThanOrEqual(21);
    expect((await catalog.listProducts("bone-joint-health")).map((p) => p.slug)).toContain("bonfortis-k2");
    expect((await catalog.getProduct("bonfortis-k2"))?.composition.length).toBeGreaterThan(0);
  });

  it("returns nothing for unknown or malformed slugs", async () => {
    const catalog = await queriesFor("test");
    expect(await catalog.getProduct("no-such-product")).toBeNull();
    expect(await catalog.getProduct("../etc")).toBeNull();
  });

  it("shows published products and hides drafts in production", async () => {
    const catalog = await queriesFor("production");
    const products = await catalog.listProducts();
    expect(products.map((p) => p.slug)).toContain("zz-test-published");
    expect(products.every((p) => p.status === "PUBLISHED")).toBe(true);
    expect(await catalog.getProduct("zz-test-draft")).toBeNull();
    const listed = (await catalog.listConcerns()).flatMap((concern) => concern.productSlugs);
    const published = new Set(products.map((p) => p.slug));
    expect(listed.every((slug) => published.has(slug))).toBe(true);
  });
});
