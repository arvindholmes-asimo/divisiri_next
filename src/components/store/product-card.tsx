import Image from "next/image";
import Link from "next/link";
import { formatPaise } from "@/lib/money";

type CardProduct = {
  slug: string;
  name: string;
  tagline: string;
  format: string;
  pricePaise: number | null;
};

export function Price({ paise }: { paise: number | null }) {
  return paise === null ? (
    <span className="text-sm text-slate-500">Price to be announced</span>
  ) : (
    <span className="font-bold">{formatPaise(paise)}</span>
  );
}

export function ProductCard({ product }: { product: CardProduct }) {
  return (
    <Link
      href={`/products/${product.slug}`}
      className="group focus-visible:outline-brand block h-full overflow-hidden rounded-2xl border border-slate-200 bg-white transition-shadow hover:shadow-lg focus-visible:outline-2"
    >
      <div className="relative aspect-square bg-slate-100">
        <Image
          src={`/products/${product.slug}.webp`}
          alt={`${product.name} pack`}
          fill
          sizes="(min-width: 1024px) 25vw, 50vw"
          className="object-cover transition-transform duration-300 group-hover:scale-[1.03] motion-reduce:transition-none"
        />
        <span className="absolute top-3 left-3 rounded-full bg-white/95 px-3 py-1 text-xs font-semibold">
          {product.format}
        </span>
      </div>
      <div className="space-y-1 p-4">
        <h3 className="font-display font-semibold">{product.name}</h3>
        <p className="text-sm text-slate-600">{product.tagline}</p>
        <p className="pt-2">
          <Price paise={product.pricePaise} />
        </p>
      </div>
    </Link>
  );
}

export function ProductGrid({ products }: { products: CardProduct[] }) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {products.map((product) => (
        <li key={product.slug}>
          <ProductCard product={product} />
        </li>
      ))}
    </ul>
  );
}
