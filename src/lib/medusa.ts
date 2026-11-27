import "server-only";
import { getEnv } from "./env";

export class MedusaRequestError extends Error {
  constructor(readonly status: number, path: string) {
    super(`Medusa request failed with ${status}: ${path}`);
  }
}

// All calls to the store API go through here. The browser never calls the backend itself.
export async function medusa<T>(path: string, init: { method?: "GET" | "POST" | "DELETE"; body?: unknown } = {}) {
  const env = getEnv();
  const response = await fetch(new URL(path, env.MEDUSA_BACKEND_URL), {
    method: init.method ?? "GET",
    headers: {
      "x-publishable-api-key": env.MEDUSA_PUBLISHABLE_KEY,
      ...(init.body === undefined ? {} : { "content-type": "application/json" }),
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) {
    // The query string can carry ids, so only the route is reported.
    throw new MedusaRequestError(response.status, path.split("?")[0]!);
  }
  return (await response.json()) as T;
}
