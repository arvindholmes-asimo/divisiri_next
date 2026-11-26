import Image from "next/image";
import Link from "next/link";
import { getEnv } from "@/lib/env";
import catalog from "../../../catalog/catalog.json";

// The catalogue is read per request, so builds need no database.
export const dynamic = "force-dynamic";

const links = [
  { href: "/shop", label: "Shop all" },
  { href: "/#concerns", label: "Shop by concern" },
  { href: "/shop?concern=medical-nutrition", label: "Medical Nutrition" },
];

export default function StoreLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const { name, disclaimer, manufacturer } = catalog.company;
  return (
    <div className="flex min-h-screen flex-col">
      {getEnv().APP_ENV !== "production" && (
        <p className="bg-amber-100 px-4 py-2 text-center text-sm text-amber-900">
          Preview with draft products. Claims, labels and prices are not yet approved.
        </p>
      )}
      <header className="border-b border-slate-200">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-8 gap-y-2 px-4 py-3">
          <Link href="/">
            <Image src="/logo.png" alt="DiviSiri home" width={140} height={62} preload />
          </Link>
          <nav aria-label="Main" className="flex flex-wrap gap-x-6 text-sm font-semibold">
            {links.map((link) => (
              <Link key={link.href} href={link.href} className="hover:text-brand py-2">
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <div className="flex-1">{children}</div>
      <footer className="mt-16 bg-slate-950 text-slate-300">
        <div className="mx-auto max-w-6xl space-y-2 px-4 py-10 text-sm">
          <p className="font-semibold text-white">{name}</p>
          <p>Manufactured by {manufacturer}</p>
          <p className="max-w-3xl">{disclaimer}</p>
        </div>
      </footer>
    </div>
  );
}
