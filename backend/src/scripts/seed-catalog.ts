// Loads catalog/catalog.json and catalog/prices.json. Safe to run again.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules, ProductStatus } from "@medusajs/framework/utils";
import {
  createApiKeysWorkflow, createProductCategoriesWorkflow, createProductsWorkflow, createRegionsWorkflow,
  createSalesChannelsWorkflow, createShippingOptionsWorkflow, createShippingProfilesWorkflow,
  createStockLocationsWorkflow, createTaxRegionsWorkflow, linkSalesChannelsToApiKeyWorkflow,
  linkSalesChannelsToStockLocationWorkflow, updateProductCategoriesWorkflow, updateProductsWorkflow,
  updateProductVariantsWorkflow, updateRegionsWorkflow, updateShippingOptionsWorkflow, updateStoresWorkflow,
} from "@medusajs/medusa/core-flows";
import { parsePrices } from "../lib/prices";

type CatalogProduct = {
  slug: string; position: number; name: string; tagline: string; format: string; pack: string;
  category: string; type: string; composition: unknown[]; ingredients: string; benefits: string[];
  packClaims: string[]; dosage: string; precautions: string; reviewNotes?: string[];
};
type Catalog = {
  concerns: { slug: string; name: string; position: number; products: string[] }[];
  products: CatalogProduct[];
};

const read = (file: string) => JSON.parse(readFileSync(file, "utf8"));
const PAYMENT_PROVIDER = "pp_razorpay_razorpay";

export default async function seedCatalog({ container }: ExecArgs) {
  const appEnv = process.env.APP_ENV;
  if (appEnv !== "development" && appEnv !== "test") {
    throw new Error("The seed runs only when APP_ENV is development or test.");
  }
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const link = container.resolve(ContainerRegistrationKeys.LINK);
  const list = async (entity: string, fields: string[], filters?: Record<string, unknown>) =>
    (await query.graph({ entity, fields, filters })).data as any[];

  const catalog: Catalog = read(resolve(process.cwd(), "../catalog/catalog.json"));
  const prices = parsePrices(
    read(resolve(process.cwd(), process.env.CATALOG_PRICES ?? "../catalog/prices.json")),
    catalog.products.map((product) => product.slug),
  );

  // Sales channel and the key the storefront uses.
  let [channel] = await list("sales_channel", ["id"]);
  if (!channel) {
    [channel] = (
      await createSalesChannelsWorkflow(container).run({
        input: { salesChannelsData: [{ name: "DiviSiri Shop" }] },
      })
    ).result;
  }
  let [key] = await list("api_key", ["id", "token"], { title: "Storefront", type: "publishable" });
  if (!key) {
    [key] = (
      await createApiKeysWorkflow(container).run({
        input: { api_keys: [{ title: "Storefront", type: "publishable", created_by: "seed" }] },
      })
    ).result;
    await linkSalesChannelsToApiKeyWorkflow(container).run({ input: { id: key.id, add: [channel.id] } });
  }

  const [store] = await list("store", ["id"]);
  await updateStoresWorkflow(container).run({
    input: {
      selector: { id: store.id },
      update: {
        name: "DiviSiri Shop",
        default_sales_channel_id: channel.id,
        supported_currencies: [{ currency_code: "inr", is_default: true, is_tax_inclusive: true }],
      },
    },
  });

  // India only, prepaid only. Cash on delivery (pp_system_default) is never linked.
  const registered = await list("payment_provider", ["id"], { id: PAYMENT_PROVIDER, is_enabled: true });
  const payment_providers = registered.map((provider) => provider.id);
  let [region] = await list("region", ["id"], { name: "India" });
  if (!region) {
    [region] = (
      await createRegionsWorkflow(container).run({
        input: {
          regions: [
            { name: "India", currency_code: "inr", countries: ["in"], payment_providers, is_tax_inclusive: true, automatic_taxes: false },
          ],
        },
      })
    ).result;
    await createTaxRegionsWorkflow(container).run({ input: [{ country_code: "in", provider_id: "tp_system" }] });
  } else if (payment_providers.length > 0) {
    await updateRegionsWorkflow(container).run({
      input: { selector: { id: region.id }, update: { payment_providers } },
    });
  }

  let [location] = await list("stock_location", ["id"], { name: "DiviSiri Warehouse" });
  if (!location) {
    [location] = (
      await createStockLocationsWorkflow(container).run({
        input: {
          locations: [
            { name: "DiviSiri Warehouse", address: { city: "Hyderabad", country_code: "IN", address_1: "Kompally" } },
          ],
        },
      })
    ).result;
    await link.create({
      [Modules.STOCK_LOCATION]: { stock_location_id: location.id },
      [Modules.FULFILLMENT]: { fulfillment_provider_id: "manual_manual" },
    });
    await linkSalesChannelsToStockLocationWorkflow(container).run({
      input: { id: location.id, add: [channel.id] },
    });
  }

  let [profile] = await list("shipping_profile", ["id"]);
  if (!profile) {
    [profile] = (
      await createShippingProfilesWorkflow(container).run({
        input: { data: [{ name: "Default", type: "default" }] },
      })
    ).result;
  }

  const fulfillment = container.resolve(Modules.FULFILLMENT);
  let [set] = await fulfillment.listFulfillmentSets(
    { name: "India delivery" },
    { relations: ["service_zones"] },
  );
  if (!set) {
    set = await fulfillment.createFulfillmentSets({
      name: "India delivery",
      type: "shipping",
      service_zones: [{ name: "India", geo_zones: [{ type: "country", country_code: "in" }] }],
    });
    await link.create({
      [Modules.STOCK_LOCATION]: { stock_location_id: location.id },
      [Modules.FULFILLMENT]: { fulfillment_set_id: set.id },
    });
  }

  // Without an approved delivery charge there is no shipping option, so checkout stays closed.
  if (prices.shippingFlatInr !== null) {
    const amounts = [{ currency_code: "inr", amount: prices.shippingFlatInr }];
    const [option] = await list("shipping_option", ["id"], { name: "Standard delivery" });
    if (option) {
      await updateShippingOptionsWorkflow(container).run({ input: [{ id: option.id, prices: amounts }] });
    } else {
      await createShippingOptionsWorkflow(container).run({
        input: [
          {
            name: "Standard delivery",
            price_type: "flat",
            provider_id: "manual_manual",
            service_zone_id: set.service_zones[0]!.id,
            shipping_profile_id: profile.id,
            type: { label: "Standard", description: "Standard delivery", code: "standard" },
            prices: amounts,
            rules: [
              { attribute: "enabled_in_store", value: "true", operator: "eq" },
              { attribute: "is_return", value: "false", operator: "eq" },
            ],
          },
        ],
      });
    }
  }

  // Concerns become categories. A category keeps its own product order.
  const categoryIds = new Map<string, string>();
  for (const concern of catalog.concerns) {
    const fields = {
      name: concern.name, handle: concern.slug, is_active: true, rank: concern.position,
      metadata: { product_slugs: concern.products },
    };
    const [existing] = await list("product_category", ["id"], { handle: concern.slug });
    if (existing) {
      await updateProductCategoriesWorkflow(container).run({
        input: { selector: { id: existing.id }, update: { name: fields.name, metadata: fields.metadata } },
      });
      categoryIds.set(concern.slug, existing.id);
    } else {
      const { result } = await createProductCategoriesWorkflow(container).run({
        input: { product_categories: [fields] },
      });
      categoryIds.set(concern.slug, result[0]!.id);
    }
  }

  for (const product of catalog.products) {
    const approved = prices.products[product.slug];
    const priced = approved?.price != null;
    const shared = {
      title: product.name,
      description: product.tagline,
      thumbnail: `/products/${product.slug}.webp`,
      category_ids: catalog.concerns
        .filter((concern) => concern.products.includes(product.slug))
        .map((concern) => categoryIds.get(concern.slug)!),
      // The store API shows metadata to anyone, so review note text is never copied here.
      metadata: {
        position: product.position, tagline: product.tagline, format: product.format, pack: product.pack,
        category: product.category, type: product.type, composition: product.composition,
        ingredients: product.ingredients, benefits: product.benefits, packClaims: product.packClaims,
        dosage: product.dosage, precautions: product.precautions,
        review_open: (product.reviewNotes?.length ?? 0) > 0,
        mrpInr: approved?.mrp ?? null,
      },
    };
    const [existing] = await list("product", ["id", "metadata", "variants.id"], { handle: product.slug });
    if (existing) {
      // status is not sent, so re-seeding never changes what staff set in the admin.
      // An unpriced entry also leaves any MRP already stored.
      if (!priced) shared.metadata.mrpInr = existing.metadata?.mrpInr ?? null;
      await updateProductsWorkflow(container).run({ input: { products: [{ id: existing.id, ...shared }] } });
      if (priced) {
        await updateProductVariantsWorkflow(container).run({
          input: {
            product_variants: [
              { id: existing.variants[0].id, prices: [{ currency_code: "inr", amount: approved.price! }] },
            ],
          },
        });
      }
    } else {
      await createProductsWorkflow(container).run({
        input: {
          products: [
            {
              ...shared,
              handle: product.slug,
              // Listed here so the local shop can show it. This seed never runs in production.
              status: ProductStatus.PUBLISHED,
              shipping_profile_id: profile.id,
              sales_channels: [{ id: channel.id }],
              options: [{ title: "Pack", values: [product.pack || "Standard"] }],
              variants: [
                {
                  title: product.pack || "Standard",
                  sku: product.slug.toUpperCase(),
                  options: { Pack: product.pack || "Standard" },
                  manage_inventory: false,
                  prices: priced ? [{ currency_code: "inr", amount: approved.price! }] : [],
                },
              ],
            },
          ],
        },
      });
    }
  }

  const priced = catalog.products.filter((product) => prices.products[product.slug]?.price != null).length;
  logger.info(`Seeded ${catalog.products.length} products (${priced} priced) and ${catalog.concerns.length} concerns.`);
  if (prices.shippingFlatInr === null) logger.warn("No delivery charge set: checkout stays closed.");
  if (payment_providers.length === 0) logger.warn("No Razorpay keys: checkout stays closed.");
  logger.info(`Storefront MEDUSA_PUBLISHABLE_KEY=${key.token}`);
}
