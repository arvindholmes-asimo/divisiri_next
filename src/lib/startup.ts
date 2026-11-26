import { parseEnv } from "./env-schema";

// Node.js only: loaded by instrumentation.ts so the Edge build never sees process.exit.
export function validateEnvOrExit(): void {
  try {
    parseEnv(process.env);
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Invalid environment configuration");
    process.exit(1);
  }
}
