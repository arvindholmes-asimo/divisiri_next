import Link from "next/link";
import { listConcerns } from "@/modules/catalog/queries";

export default async function NotFound() {
  const concerns = await listConcerns();

  return (
    <main className="mx-auto max-w-6xl px-4 py-14">
      <h1 className="font-display text-3xl font-bold text-balance">We couldn&apos;t find that page</h1>
      <p className="mt-3 max-w-md text-slate-600">
        The link may be old or mistyped, or the product may not be available.
      </p>
      <Link
        href="/shop"
        className="mt-6 inline-block rounded-xl bg-slate-950 px-6 py-3 font-semibold text-white hover:bg-slate-800"
      >
        Shop all products
      </Link>
      {concerns.length > 0 && (
        <nav aria-labelledby="not-found-concerns" className="mt-12">
          <h2 id="not-found-concerns" className="font-display mb-4 text-xl font-bold">
            Or browse by concern
          </h2>
          <ul className="flex flex-wrap gap-2">
            {concerns.map((concern) => (
              <li key={concern.slug}>
                <Link
                  href={`/shop?concern=${concern.slug}`}
                  className="inline-flex min-h-11 items-center rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold hover:border-slate-400"
                >
                  {concern.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </main>
  );
}
