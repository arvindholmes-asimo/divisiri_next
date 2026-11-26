import type { NextConfig } from "next";

// Baseline headers. A Content-Security-Policy is added with Razorpay Checkout,
// once the exact third-party origins are known.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const config: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  // Pinned so that lockfiles in parent folders cannot change the project root.
  turbopack: { root: process.cwd() },
  images: { qualities: [75, 90] },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default config;
