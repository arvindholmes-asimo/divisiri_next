// Pure validation, shared by medusa-config.ts and the tests.
export type BackendEnv = {
  APP_ENV: "development" | "test" | "production";
  DATABASE_URL: string;
  JWT_SECRET: string;
  COOKIE_SECRET: string;
  REDIS_URL?: string;
  STORE_CORS: string;
  ADMIN_CORS: string;
  AUTH_CORS: string;
  razorpay?: { keyId: string; keySecret: string; webhookSecret?: string };
};

export function parseEnv(source: Record<string, string | undefined>): BackendEnv {
  const problems: string[] = [];
  const need = (name: string) => {
    if (!source[name]) problems.push(`${name}: is required`);
    return source[name] ?? "";
  };

  const APP_ENV = need("APP_ENV") as BackendEnv["APP_ENV"];
  if (APP_ENV && !["development", "test", "production"].includes(APP_ENV)) {
    problems.push("APP_ENV: must be development, test or production");
  }
  const production = APP_ENV === "production";
  const env: BackendEnv = {
    APP_ENV,
    DATABASE_URL: need("DATABASE_URL"),
    JWT_SECRET: need("JWT_SECRET"),
    COOKIE_SECRET: need("COOKIE_SECRET"),
    REDIS_URL: source.REDIS_URL || undefined,
    STORE_CORS: need("STORE_CORS"),
    ADMIN_CORS: need("ADMIN_CORS"),
    AUTH_CORS: need("AUTH_CORS"),
  };

  const { RAZORPAY_KEY_ID: keyId, RAZORPAY_KEY_SECRET: keySecret, RAZORPAY_WEBHOOK_SECRET: webhookSecret } = source;
  if (keyId || keySecret) {
    if (!keyId) problems.push("RAZORPAY_KEY_ID: is required with RAZORPAY_KEY_SECRET");
    if (!keySecret) problems.push("RAZORPAY_KEY_SECRET: is required with RAZORPAY_KEY_ID");
    const prefix = production ? "rzp_live_" : "rzp_test_";
    if (keyId && !keyId.startsWith(prefix)) {
      problems.push(`RAZORPAY_KEY_ID: must start with ${prefix} when APP_ENV is ${APP_ENV}`);
    }
    if (keyId && keySecret) env.razorpay = { keyId, keySecret, webhookSecret: webhookSecret || undefined };
  }

  if (production) {
    for (const name of ["JWT_SECRET", "COOKIE_SECRET"] as const) {
      if (env[name] && env[name].length < 32) problems.push(`${name}: must be at least 32 characters`);
    }
    if (env.DATABASE_URL.includes("local-dev-only")) {
      problems.push("DATABASE_URL: must not use the local development password in production");
    }
    if (!env.REDIS_URL) problems.push("REDIS_URL: is required in production");
    if (env.razorpay && !env.razorpay.webhookSecret) {
      problems.push("RAZORPAY_WEBHOOK_SECRET: is required in production");
    }
  }

  // Names and reasons only. Values may be secrets and must not reach logs.
  if (problems.length > 0) {
    throw new Error(`Invalid environment configuration:\n  ${problems.join("\n  ")}`);
  }
  return env;
}
