// Production never sells a product whose claim review is still open.
export function blockedFromSale(
  appEnv: string | undefined,
  products: { title?: string | null; metadata?: Record<string, unknown> | null }[],
): string[] {
  if (appEnv !== "production") return [];
  return products
    .filter((product) => product.metadata?.review_open !== false)
    .map((product) => product.title ?? "unnamed product");
}
