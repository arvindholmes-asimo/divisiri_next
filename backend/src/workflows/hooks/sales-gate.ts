import type { MedusaContainer } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils";
import { addToCartWorkflow, completeCartWorkflow } from "@medusajs/medusa/core-flows";
import { blockedFromSale } from "../../lib/sales-gate";

async function assertSellable(variantIds: string[], container: MedusaContainer) {
  if (variantIds.length === 0) return;
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const { data } = await query.graph({
    entity: "variant",
    fields: ["id", "product.title", "product.metadata"],
    filters: { id: variantIds },
  });
  const blocked = blockedFromSale(process.env.APP_ENV, data.map((variant) => variant.product ?? {}));
  if (blocked.length > 0) {
    throw new MedusaError(MedusaError.Types.NOT_ALLOWED, `Not available for sale: ${blocked.join(", ")}`);
  }
}

const idsOf = (items: ({ variant_id?: string | null } | null)[] | null | undefined) =>
  (items ?? []).flatMap((item) => item?.variant_id ?? []);

addToCartWorkflow.hooks.validate(async ({ input }, { container }) => {
  await assertSellable(idsOf(input.items), container);
});

// Checked again at payment time: a review can reopen while an item sits in a cart.
completeCartWorkflow.hooks.validate(async ({ cart }, { container }) => {
  await assertSellable(idsOf(cart.items), container);
});
