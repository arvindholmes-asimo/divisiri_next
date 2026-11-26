import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Price } from "@/components/store/product-card";
import { getProduct } from "@/modules/catalog/queries";
import catalog from "../../../../../catalog/catalog.json";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await getProduct((await params).slug);
  return { title: product ? `${product.name} | DiviSiri Shop` : "Product not found" };
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="font-display mb-3 text-xl font-bold">{title}</h2>
      {children}
    </section>
  );
}

function List({ items }: { items: string[] }) {
  return (
    <ul className="list-disc space-y-1 pl-5 text-slate-700">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

export default async function ProductPage({ params }: Props) {
  const product = await getProduct((await params).slug);
  if (!product) notFound();
  const medical = /medical/i.test(product.type);
  const prescription = /\(rx\)/i.test(product.type);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <Link href="/shop" className="text-brand text-sm font-semibold">
        ← All products
      </Link>
      <div className="mt-4 grid gap-8 lg:grid-cols-2">
        <div className="relative aspect-[4/5] self-start overflow-hidden rounded-3xl bg-slate-100 lg:sticky lg:top-6">
          <Image
            src={`/products/${product.slug}.webp`}
            alt={`${product.name} pack`}
            fill
            preload
            sizes="(min-width: 1024px) 50vw, 100vw"
            quality={90}
            className="object-cover"
          />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-500">{product.category}</p>
          <h1 className="font-display text-4xl font-bold">{product.name}</h1>
          <p className="mt-2 text-lg text-slate-600">{product.tagline}</p>
          <p className="mt-4 text-sm text-slate-600">
            {product.type} · {product.format} · {product.pack}
          </p>
          <p className="mt-4 text-2xl">
            <Price paise={product.pricePaise} />
          </p>
          <p className="mt-2 rounded-xl bg-slate-100 p-4 text-sm">Online ordering is not open yet.</p>
          {(medical || prescription) && (
            <p className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm font-semibold">
              {prescription ? "This product may require a prescription." : "Use under medical supervision."}
            </p>
          )}
          {product.packClaims.length > 0 && (
            <Section title="On the pack">
              <List items={product.packClaims} />
            </Section>
          )}
          {product.benefits.length > 0 && (
            <Section title="Highlights">
              <List items={product.benefits} />
            </Section>
          )}
          {product.composition.length > 0 && (
            <Section title="Composition">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-300">
                    <th scope="col" className="py-2 pr-3">Ingredient</th>
                    <th scope="col" className="py-2 pr-3">Amount</th>
                    <th scope="col" className="py-2">% RDA</th>
                  </tr>
                </thead>
                <tbody>
                  {product.composition.map((row) => (
                    <tr key={row.name} className="border-b border-slate-100">
                      <th scope="row" className="py-2 pr-3 font-normal">{row.name}</th>
                      <td className="py-2 pr-3">{row.amount}</td>
                      <td className="py-2">{row.rda || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-2 text-xs text-slate-500">{catalog.company.rdaBasis}</p>
            </Section>
          )}
          <Section title="Ingredients">
            <p className="text-slate-700">{product.ingredients}</p>
          </Section>
          <Section title="How to use">
            <p className="text-slate-700">{product.dosage}</p>
          </Section>
          <Section title="Precautions">
            <p className="text-slate-700">{product.precautions}</p>
            <p className="mt-2 text-sm text-slate-500">Shelf life: {catalog.company.shelfLife}</p>
          </Section>
        </div>
      </div>
    </main>
  );
}
