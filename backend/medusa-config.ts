import { defineConfig, loadEnv } from "@medusajs/framework/utils";
import { parseEnv } from "./src/lib/env";

loadEnv(process.env.NODE_ENV || "development", process.cwd());

// `medusa build` needs no secrets. Every other command validates them and stops on error.
const building = process.argv.includes("build");
const env = building ? undefined : parseEnv(process.env);

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: env?.DATABASE_URL,
    redisUrl: env?.REDIS_URL,
    http: {
      storeCors: env?.STORE_CORS ?? "",
      adminCors: env?.ADMIN_CORS ?? "",
      authCors: env?.AUTH_CORS ?? "",
      jwtSecret: env?.JWT_SECRET,
      cookieSecret: env?.COOKIE_SECRET,
    },
  },
  modules: env?.razorpay
    ? [
        {
          resolve: "@medusajs/medusa/payment",
          options: {
            providers: [{ resolve: "./src/modules/razorpay", id: "razorpay", options: env.razorpay }],
          },
        },
      ]
    : [],
});
