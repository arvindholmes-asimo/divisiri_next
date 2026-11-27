import { describe, expect, it } from "vitest";
import { parseEnv } from "@/lib/env-schema";

const development = {
  APP_ENV: "development",
  APP_URL: "http://localhost:3000",
  DATABASE_URL: "postgresql://shop:local-dev-only@127.0.0.1:5433/shop",
  MEDUSA_BACKEND_URL: "http://localhost:9000",
  MEDUSA_PUBLISHABLE_KEY: "pk_example",
};

const production = {
  APP_ENV: "production",
  APP_URL: "https://shop.divisiri.com",
  DATABASE_URL: "postgresql://shop:example-password@db:5432/shop",
  MEDUSA_BACKEND_URL: "http://backend:9000",
  MEDUSA_PUBLISHABLE_KEY: "pk_example",
};

// Built from parts so that secret scanners do not mistake them for real keys.
const testKey = ["rzp", "test", "example"].join("_");
const liveKey = ["rzp", "live", "example"].join("_");

describe("parseEnv", () => {
  it("accepts a complete development configuration", () => {
    expect(parseEnv(development).APP_ENV).toBe("development");
  });

  it("accepts a complete production configuration", () => {
    expect(parseEnv(production).APP_URL).toBe("https://shop.divisiri.com");
  });

  it.each(["APP_ENV", "APP_URL", "MEDUSA_BACKEND_URL", "MEDUSA_PUBLISHABLE_KEY"])("requires %s", (name) => {
    expect(() => parseEnv({ ...development, [name]: undefined })).toThrow(name);
  });

  it("rejects a non-PostgreSQL database address", () => {
    expect(() => parseEnv({ ...development, DATABASE_URL: "mysql://u:p@host/db" })).toThrow(
      "DATABASE_URL",
    );
  });

  it("requires https in production", () => {
    expect(() => parseEnv({ ...production, APP_URL: "http://shop.divisiri.com" })).toThrow("https");
  });

  it("rejects the local database password in production", () => {
    expect(() => parseEnv({ ...production, DATABASE_URL: development.DATABASE_URL })).toThrow(
      "DATABASE_URL",
    );
  });

  it("rejects test payment keys in production", () => {
    expect(() => parseEnv({ ...production, RAZORPAY_KEY_ID: testKey })).toThrow("rzp_live_");
  });

  it("rejects live payment keys outside production", () => {
    expect(() => parseEnv({ ...development, RAZORPAY_KEY_ID: liveKey })).toThrow("rzp_test_");
  });

  it("treats an empty payment key as unset", () => {
    expect(parseEnv({ ...development, RAZORPAY_KEY_ID: "" }).RAZORPAY_KEY_ID).toBeUndefined();
  });

  it("never puts values in the error message", () => {
    const secret = "do-not-print-this";
    let message = "";
    try {
      parseEnv({ ...development, DATABASE_URL: secret, RAZORPAY_KEY_ID: secret });
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).toContain("DATABASE_URL");
    expect(message).not.toContain(secret);
  });
});
