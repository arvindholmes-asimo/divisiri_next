import { existsSync } from "node:fs";
import { afterAll, describe, expect, it } from "vitest";
import { GET } from "@/app/api/health/route";
import { getDb } from "@/lib/db";

// Needs a running, migrated database. It fails, rather than skips, without one.
if (existsSync(".env")) process.loadEnvFile(".env");

const actor = "integration-test";

describe("database", () => {
  afterAll(async () => {
    await getDb().auditLog.deleteMany({ where: { actor } });
    await getDb().$disconnect();
  });

  it("writes and reads through the migrated schema", async () => {
    const created = await getDb().auditLog.create({
      data: { actor, action: "create", entityType: "Check", entityId: "1" },
    });
    const found = await getDb().auditLog.findUnique({ where: { id: created.id } });
    expect(found?.createdAt).toBeInstanceOf(Date);
  });

  it("reports healthy without caching", async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toEqual({ status: "ok" });
  });
});
