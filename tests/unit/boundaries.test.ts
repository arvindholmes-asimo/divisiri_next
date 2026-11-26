import { describe, expect, it } from "vitest";
import { findViolations } from "../../scripts/check-boundaries.mjs";

describe("findViolations", () => {
  it.each([
    'import { fakeGateway } from "../../tests/fakes/gateway";',
    'const fake = await import("../tests/fakes/gateway");',
    'const fake = require("../tests/fakes/gateway");',
    'import "../tests/fakes/gateway";',
  ])("rejects a test import: %s", (source) => {
    expect(findViolations("src/a.ts", source)).toHaveLength(1);
  });

  it("rejects a secret exposed to the browser", () => {
    const name = ["NEXT_PUBLIC", "RAZORPAY", "KEY", "SECRET"].join("_");
    expect(findViolations("src/a.ts", `process.env.${name}`)).toHaveLength(1);
  });

  it("allows ordinary imports", () => {
    expect(findViolations("src/a.ts", 'import { getDb } from "@/lib/db";')).toEqual([]);
    expect(findViolations("src/a.ts", 'import x from "@/modules/contests/x";')).toEqual([]);
  });
});
