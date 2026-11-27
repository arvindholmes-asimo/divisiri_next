import { z } from "zod";

const text = z.string().default("");
const list = z.array(z.string()).default([]);

const metadataSchema = z.object({
  position: z.number().default(999),
  tagline: text,
  format: text,
  pack: text,
  category: text,
  type: text,
  composition: z.array(z.object({ name: z.string(), amount: z.string(), rda: z.string() })).default([]),
  ingredients: text,
  benefits: list,
  packClaims: list,
  dosage: text,
  precautions: text,
  review_open: z.boolean().optional(),
  mrpInr: z.number().positive().nullish(),
});

const productSchema = z.object({
  handle: z.string(),
  title: z.string(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  variants: z
    .array(
      z.object({
        id: z.string(),
        calculated_price: z.object({ calculated_amount: z.number().nullable() }).nullish(),
      }),
    )
    .nullish(),
});

// Medusa holds rupees. The shop shows money from integer paise.
const paise = (rupees: number | null | undefined) =>
  rupees === null || rupees === undefined ? null : Math.round(rupees * 100);

export function toProduct(raw: unknown) {
  const product = productSchema.parse(raw);
  const { mrpInr, review_open, ...details } = metadataSchema.parse(product.metadata ?? {});
  const variant = product.variants?.[0];
  return {
    ...details,
    slug: product.handle,
    name: product.title,
    review_open,
    variantId: variant?.id ?? null,
    pricePaise: paise(variant?.calculated_price?.calculated_amount),
    mrpPaise: paise(mrpInr),
  };
}

export type Product = ReturnType<typeof toProduct>;
