import { NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import { safeOrgContext } from "@/lib/safeOrgContext";

export const dynamic = "force-dynamic";

/**
 * GET /api/agents/runs
 * Returns recent AI agent runs for the current org.
 * Stub: returns empty array until agent_runs table is created.
 */
export async function GET() {
  try {
    const ctx = await safeOrgContext();
    if (ctx.status === "unauthenticated") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // STUB: agent_runs table not yet in schema. Returns empty array until model is added.
    return NextResponse.json({ runs: [] });
  } catch {
    return NextResponse.json({ runs: [] });
  }
}
