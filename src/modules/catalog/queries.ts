import "server-only";
import { cache } from "react";
import { z } from "zod";
import { getEnv } from "@/lib/env";
import { medusa } from "@/lib/medusa";
import { toProduct } from "./mapping";
import { getRegionId } from "./region";
import { isVisible } from "./visibility";

const slugSchema = z.string().regex(/^[a-z0-9-]{1,80}$/);
const FIELDS = "handle,title,+metadata,*variants.calculated_price";

async function fetchProducts(filter: Record<string, string>) {
  const query = new URLSearchParams({ ...filter, region_id: await getRegionId(), fields: FIELDS, limit: "100" });
  const { products } = await medusa<{ products: unknown[] }>(`/store/products?${query}`);
  const appEnv = getEnv().APP_ENV;
  return products.map(toProduct).filter((product) => isVisible(appEnv, product));
}

// Cached per request: pages and concern lists both need the full catalogue.
const allProducts = cache(async () => (await fetchProducts({})).sort((a, b) => a.position - b.position));

const allConcerns = cache(async () => {
  const { product_categories } = await medusa<{
    product_categories: { handle: string; name: string; rank: number; metadata: { product_slugs?: string[] } | null }[];
  }>("/store/product-categories?fields=name,handle,rank,metadata&limit=100");
  return product_categories.sort((a, b) => a.rank - b.rank);
});

export async function listConcerns() {
  const [concerns, products] = await Promise.all([allConcerns(), allProducts()]);
  const visible = new Set(products.map((product) => product.slug));
  // A concern with nothing to show is left out.
  return concerns
    .map(({ handle, name, metadata }) => ({
      slug: handle,
      name,
      productSlugs: (metadata?.product_slugs ?? []).filter((slug) => visible.has(slug)),
    }))
    .filter((concern) => concern.productSlugs.length > 0);
}

export async function listProducts(concernSlug?: string) {
  const products = await allProducts();
  if (!concernSlug) return products;
  const concern = (await listConcerns()).find((item) => item.slug === concernSlug);
  const members = new Set(concern?.productSlugs);
  return products.filter((product) => members.has(product.slug));
}

export async function getProduct(slug: string) {
  if (!slugSchema.safeParse(slug).success) return null;
  const [product] = await fetchProducts({ handle: slug });
  return product ?? null;
}
