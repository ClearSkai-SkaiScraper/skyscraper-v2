import { NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import { getDriftMetrics, resetDriftMetrics } from "@/lib/monitoring/driftMetrics";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const reset = url.searchParams.get("reset");
  if (reset === "1") {
    resetDriftMetrics();
  }
  return NextResponse.json({ status: "ok", drift: getDriftMetrics() });
}
