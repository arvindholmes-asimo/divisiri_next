import "server-only";
import { cache } from "react";
import { medusa } from "@/lib/medusa";

// Prices depend on the region. The shop sells in India only.
export const getRegionId = cache(async () => {
  const { regions } = await medusa<{ regions: { id: string; currency_code: string }[] }>("/store/regions");
  const region = regions.find((item) => item.currency_code === "inr");
  if (!region) throw new Error("No INR region. Run the backend seed.");
  return region.id;
});
