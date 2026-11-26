import "server-only";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { visibleProducts } from "./visibility";

const visible = () => visibleProducts(getEnv().APP_ENV);

const slugSchema = z.string().regex(/^[a-z0-9-]{1,80}$/);
const compositionSchema = z.array(z.object({ name: z.string(), amount: z.string(), rda: z.string() }));

export function listProducts(concernSlug?: string) {
  return getDb().product.findMany({
    where: {
      ...visible(),
      ...(concernSlug ? { concerns: { some: { concern: { slug: concernSlug } } } } : {}),
    },
    orderBy: { position: "asc" },
  });
}

export async function listConcerns() {
  const concerns = await getDb().concern.findMany({
    orderBy: { position: "asc" },
    include: {
      products: {
        where: { product: visible() },
        orderBy: { position: "asc" },
        select: { product: { select: { slug: true } } },
      },
    },
  });
  // A concern with nothing to show is left out.
  return concerns
    .map(({ slug, name, products }) => ({ slug, name, productSlugs: products.map((p) => p.product.slug) }))
    .filter((concern) => concern.productSlugs.length > 0);
}

export async function getProduct(slug: string) {
  if (!slugSchema.safeParse(slug).success) return null;
  const product = await getDb().product.findFirst({ where: { slug, ...visible() } });
  if (!product) return null;
  return { ...product, composition: compositionSchema.parse(product.composition) };
}
