import type { MetadataRoute } from "next";

// Blocks crawlers until launch.
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", disallow: "/" } };
}
