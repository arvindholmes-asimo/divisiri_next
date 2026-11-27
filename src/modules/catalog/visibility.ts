import type { Env } from "@/lib/env-schema";

// Medusa's store API returns published products only. On top of that, production
// hides any product whose claim review is not clearly closed.
export function isVisible(appEnv: Env["APP_ENV"], metadata: { review_open?: unknown }): boolean {
  return appEnv !== "production" || metadata.review_open === false;
}
