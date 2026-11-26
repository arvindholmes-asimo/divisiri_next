import "server-only";
import { parseEnv, type Env } from "./env-schema";

let cached: Env | undefined;

// Read on first use so that `next build` needs no secrets.
export function getEnv(): Env {
  cached ??= parseEnv(process.env);
  return cached;
}
