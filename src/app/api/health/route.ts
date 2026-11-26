import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

const headers = { "Cache-Control": "no-store" };

export async function GET() {
  try {
    await getDb().$queryRaw`SELECT 1`;
    return Response.json({ status: "ok" }, { headers });
  } catch (error) {
    // The public response carries no detail; the error type goes to server logs.
    console.error("health check failed:", error instanceof Error ? error.name : "unknown error");
    return Response.json({ status: "unavailable" }, { status: 503, headers });
  }
}
