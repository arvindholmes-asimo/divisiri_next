// Approved prices come from catalog/prices.json. null means "not approved yet".
export type Prices = {
  shippingFlatInr: number | null;
  products: Record<string, { mrp: number | null; price: number | null }>;
};

const isAmount = (value: unknown): value is number =>
  typeof value === "number" && value > 0 && Math.abs(value * 100 - Math.round(value * 100)) < 1e-6;

export function parsePrices(raw: unknown, slugs: string[]): Prices {
  const input = raw as Prices;
  const problems: string[] = [];
  const shipping = input?.shippingFlatInr;
  if (shipping !== null && !(shipping === 0 || isAmount(shipping))) {
    problems.push("shippingFlatInr: must be null, 0 or rupees with at most two decimals");
  }
  for (const [slug, entry] of Object.entries(input?.products ?? {})) {
    if (!slugs.includes(slug)) problems.push(`${slug}: is not in the catalogue`);
    const { mrp, price } = entry;
    if (mrp === null && price === null) continue;
    if (!isAmount(mrp) || !isAmount(price)) {
      problems.push(`${slug}: give both mrp and price as positive rupees, or both as null`);
    } else if (price > mrp) {
      problems.push(`${slug}: price must not be higher than mrp`);
    }
  }
  if (problems.length > 0) throw new Error(`Invalid prices file:\n  ${problems.join("\n  ")}`);
  return { shippingFlatInr: shipping, products: input.products ?? {} };
}
