import { z } from "zod";

// Pure validation, with no side effects, so startup and tests share it.
const optional = z.preprocess((value) => (value === "" ? undefined : value), z.string().optional());

const schema = z
  .object({
    APP_ENV: z.enum(["development", "test", "production"]),
    APP_URL: z.url({ protocol: /^https?$/ }),
    DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
    RAZORPAY_KEY_ID: optional,
  })
  .superRefine((env, ctx) => {
    const fail = (path: string, message: string) =>
      ctx.addIssue({ code: "custom", path: [path], message });
    const production = env.APP_ENV === "production";

    if (production && !env.APP_URL.startsWith("https://")) {
      fail("APP_URL", "must use https in production");
    }
    if (production && env.DATABASE_URL.includes("local-dev-only")) {
      fail("DATABASE_URL", "must not use the local development password in production");
    }
    if (env.RAZORPAY_KEY_ID) {
      const expected = production ? "rzp_live_" : "rzp_test_";
      if (!env.RAZORPAY_KEY_ID.startsWith(expected)) {
        fail("RAZORPAY_KEY_ID", `must start with ${expected} when APP_ENV is ${env.APP_ENV}`);
      }
    }
  });

export type Env = z.infer<typeof schema>;

export function parseEnv(source: Record<string, string | undefined>): Env {
  const result = schema.safeParse(source);
  if (result.success) return result.data;

  // Names and reasons only. Values may be secrets and must not reach logs.
  const problems = result.error.issues.map((issue) => `  ${issue.path.join(".")}: ${issue.message}`);
  throw new Error(`Invalid environment configuration:\n${problems.join("\n")}`);
}
