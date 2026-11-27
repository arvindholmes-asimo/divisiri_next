import type { Metadata } from "next";
import { notFound } from "next/navigation";

// Sends every unmatched address to the store's not-found page, so it keeps the header and links.
// A root not-found page would be built ahead of time, where the store layout has no environment.
export const metadata: Metadata = { title: "Page not found | DiviSiri Shop" };

export default function UnmatchedPage() {
  notFound();
}
