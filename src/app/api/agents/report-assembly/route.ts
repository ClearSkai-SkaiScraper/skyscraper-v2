/**
 * Report Assembly Agent
 * POST — Assemble a multi-module report (insurance or retail)
 *
 * Body: { claimId, modules[], format, mode }
 * Returns: { reportId, title, sections[], generatedAt, ... }
 */
import { NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import { checkRateLimit } from "@/lib/rate-limit";
import { safeOrgContext } from "@/lib/safeOrgContext";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: Request) {
  const ctx = await safeOrgContext();
  if (ctx.status !== "ok" || !ctx.orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit — AI-tier
  const rl = await checkRateLimit(ctx.orgId, "AI");
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  try {
    const body = await req.json();
    const { claimId, modules = [], format = "pdf", mode = "insurance" } = body;

    if (!modules.length) {
      return NextResponse.json({ error: "At least one module required" }, { status: 400 });
    }

    if (mode === "insurance" && !claimId) {
      return NextResponse.json(
        { error: "Claim ID required for insurance reports" },
        { status: 400 }
      );
    }

    // Placeholder response — AI generation will be wired in Phase 2
    const sections = modules.map((m: string) => ({
      module: m,
      title: m.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()),
      content: `[${m}] — Section content will be AI-generated. Coming soon.`,
      status: "placeholder",
    }));

    logger.info("[AGENTS:REPORT_ASSEMBLY] Generated", { orgId: ctx.orgId, mode, modules });

    return NextResponse.json({
      reportId: `rpt_${Date.now()}`,
      claimId: claimId || null,
      title: mode === "retail" ? "Retail Property Report" : "Insurance Claim Report",
      format,
      mode,
      sections,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("[AGENTS:REPORT_ASSEMBLY] Error", error);
    return NextResponse.json({ error: "Assembly failed" }, { status: 500 });
  }
}
