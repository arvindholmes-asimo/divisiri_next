import type { Env } from "@/lib/env-schema";

// Production shows approved products only. Drafts carry unreviewed claims.
export function visibleProducts(appEnv: Env["APP_ENV"]): { status?: "PUBLISHED" } {
  return appEnv === "production" ? { status: "PUBLISHED" } : {};
}
