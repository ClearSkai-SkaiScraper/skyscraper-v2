export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

// Phase 5 - Audit Logs API Route
import { NextRequest, NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import { requireRole } from "@/lib/security/roles";
import { getJobAuditLogs } from "@/modules/audit/core/logger";

export async function GET(req: NextRequest, { params }: { params: { jobId: string } }) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { orgId } = await requireRole(["contractor", "adjuster", "admin"]);
    const { jobId } = params;

    const logs = await getJobAuditLogs(jobId);

    return NextResponse.json({ logs });
  } catch (error) {
    logger.error("Error fetching audit logs:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
