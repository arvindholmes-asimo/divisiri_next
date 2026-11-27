import Image from "next/image";
import Link from "next/link";
import { ProductGrid } from "@/components/store/product-card";
import { listConcerns, listProducts } from "@/modules/catalog/queries";

// Same selections as the design. "Featured", because there are no sales yet.
const HERO = ["bonfortis-k2", "primmune-pro", "optimeal-pro"];
const FEATURED = [
  "bonfortis-k2", "primmune-pro", "herbosome", "optimeal-pro",
  "omegasea", "stressnil", "momvit", "herbagut",
];

export default async function HomePage() {
  const [products, concerns] = await Promise.all([listProducts(), listConcerns()]);
  const bySlug = new Map(products.map((product) => [product.slug, product]));
  const pick = (slugs: string[]) => slugs.flatMap((slug) => bySlug.get(slug) ?? []);
  const hero = pick(HERO);
  const featured = pick(FEATURED);

  return (
    <main>
      <section className="from-brand/5 to-accent/10 bg-gradient-to-br via-white">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 lg:grid-cols-2">
          <div>
            <h1 className="font-display text-5xl leading-tight font-bold sm:text-6xl">
              Holistic Care.
              <br />
              <span className="text-brand">Healthier</span> <span className="text-accent">Life.</span>
            </h1>
            <p className="mt-5 max-w-md text-lg text-slate-600">
              Nutrition from everyday wellness to clinical recovery.
            </p>
            <Link
              href="/shop"
              className="mt-8 inline-block rounded-xl bg-slate-950 px-6 py-3 font-semibold text-white hover:bg-slate-800"
            >
              Shop all products
            </Link>
          </div>
          {hero.length > 0 && (
            <ul className="grid grid-cols-3 gap-3">
              {hero.map((product) => (
                <li key={product.slug} className="relative aspect-[2/3] overflow-hidden rounded-2xl shadow-xl">
                  <Image
                    src={`/products/${product.slug}.webp`}
                    alt={`${product.name} pack`}
                    fill
                    loading="eager"
                    sizes="(min-width: 1024px) 16vw, 33vw"
                    quality={90}
                    className="object-cover"
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section id="concerns" className="mx-auto max-w-6xl px-4 pt-14">
        <h2 className="font-display text-3xl font-bold">Shop by concern</h2>
        <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {concerns.map((concern) => (
            <li key={concern.slug}>
              <Link
                href={`/shop?concern=${concern.slug}`}
                className="flex h-full items-center gap-3 rounded-2xl border border-slate-200 p-3 hover:border-slate-400"
              >
                <span className="hidden shrink-0 -space-x-4 sm:flex" aria-hidden="true">
                  {concern.productSlugs.slice(0, 2).map((slug) => (
                    <Image
                      key={slug}
                      src={`/products/${slug}.webp`}
                      alt=""
                      width={44}
                      height={44}
                      className="size-11 rounded-lg border-2 border-white object-cover"
                    />
                  ))}
                </span>
                <span>
                  <span className="block text-sm font-bold">{concern.name}</span>
                  <span className="block text-xs text-slate-500">
                    {concern.productSlugs.length} {concern.productSlugs.length === 1 ? "product" : "products"}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-auto max-w-6xl px-4 pt-14">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <h2 className="font-display text-3xl font-bold">Featured products</h2>
          <Link href="/shop" className="text-brand font-semibold">
            View all {products.length} products →
          </Link>
        </div>
        {featured.length > 0 ? (
          <ProductGrid products={featured} />
        ) : (
          <p className="text-slate-600">Products are coming soon.</p>
        )}
      </section>
    </main>
  );
}
