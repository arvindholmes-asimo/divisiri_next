import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { getEnv } from "./env";

// Reused across hot reloads so development does not exhaust connections.
const globalForDb = globalThis as unknown as { db?: PrismaClient };

export function getDb(): PrismaClient {
  globalForDb.db ??= new PrismaClient({
    adapter: new PrismaPg({
      connectionString: getEnv().DATABASE_URL,
      max: 5,
      connectionTimeoutMillis: 3000,
    }),
  });
  return globalForDb.db;
}
