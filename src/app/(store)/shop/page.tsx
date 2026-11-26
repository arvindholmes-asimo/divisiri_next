import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductGrid } from "@/components/store/product-card";
import { listConcerns, listProducts } from "@/modules/catalog/queries";

export const metadata: Metadata = { title: "Shop all | DiviSiri Shop" };

const chip = "rounded-full border px-4 py-2 text-sm font-semibold";

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<{ concern?: string | string[] }>;
}) {
  const { concern } = await searchParams;
  const concerns = await listConcerns();
  const selected = concerns.find((item) => item.slug === concern);
  if (concern !== undefined && !selected) notFound();
  const products = await listProducts(selected?.slug);

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-display text-3xl font-bold">{selected?.name ?? "Shop all"}</h1>
      <p className="mt-2 text-slate-600">
        {products.length} {products.length === 1 ? "product" : "products"}
      </p>
      <nav aria-label="Filter by concern" className="my-6 flex flex-wrap gap-2">
        {[{ slug: undefined, name: "All" }, ...concerns].map((item) => {
          const active = item.slug === selected?.slug;
          return (
            <Link
              key={item.slug ?? "all"}
              href={item.slug ? `/shop?concern=${item.slug}` : "/shop"}
              aria-current={active ? "page" : undefined}
              className={`${chip} ${active ? "border-brand bg-brand text-white" : "border-slate-200 hover:border-slate-400"}`}
            >
              {item.name}
            </Link>
          );
        })}
      </nav>
      {products.length > 0 ? <ProductGrid products={products} /> : <p>No products are available yet.</p>}
    </main>
  );
}
