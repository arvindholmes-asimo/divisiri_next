// Loads catalog/catalog.json into a development or test database.
import { existsSync, readFileSync } from "node:fs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

if (existsSync(".env")) process.loadEnvFile(".env");

const { APP_ENV, DATABASE_URL } = process.env;
if (APP_ENV !== "development" && APP_ENV !== "test") {
  throw new Error("The seed runs only when APP_ENV is development or test.");
}

const catalog = JSON.parse(readFileSync("catalog/catalog.json", "utf8")) as {
  concerns: { slug: string; name: string; position: number; products: string[] }[];
  products: {
    slug: string; position: number; name: string; tagline: string; format: string; pack: string;
    category: string; type: string; composition: { name: string; amount: string; rda: string }[];
    ingredients: string; benefits: string[]; packClaims: string[]; dosage: string; precautions: string;
  }[];
};

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: DATABASE_URL }) });

try {
  await db.$transaction(async (tx) => {
    const ids = new Map<string, string>();
    for (const product of catalog.products) {
      // status and prices are not listed, so re-seeding never overwrites them.
      const row = await tx.product.upsert({
        where: { slug: product.slug },
        create: product,
        update: product,
      });
      ids.set(product.slug, row.id);
    }
    for (const { products, ...concern } of catalog.concerns) {
      const row = await tx.concern.upsert({
        where: { slug: concern.slug },
        create: concern,
        update: concern,
      });
      await tx.concernProduct.deleteMany({ where: { concernId: row.id } });
      await tx.concernProduct.createMany({
        data: products.map((slug, position) => ({
          concernId: row.id,
          productId: ids.get(slug)!,
          position,
        })),
      });
    }
  }, { timeout: 30000 });
  console.log(`Seeded ${catalog.products.length} products and ${catalog.concerns.length} concerns.`);
} finally {
  await db.$disconnect();
}
