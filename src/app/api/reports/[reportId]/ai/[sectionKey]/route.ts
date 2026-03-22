export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

// ============================================================================
// API: GET/POST AI SECTION STATE
// ============================================================================
// GET  /api/reports/[reportId]/ai/[sectionKey] — get section state
// POST /api/reports/[reportId]/ai/[sectionKey] — generate AI suggestion

import { NextRequest, NextResponse } from "next/server";

import { withAuth } from "@/lib/auth/withAuth";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { runReportBuilder } from "@/lib/report-engine/ai";
import { buildPayloadWithAddons } from "@/lib/report-engine/buildMasterPayload";
import { getAISection } from "@/modules/ai/jobs/persist";
import type { AISectionKey } from "@/modules/ai/types";

// Simple prompts for retail wizard section suggestions
const SIMPLE_SECTION_PROMPTS: Record<string, string> = {
  baseline:
    "Summarize property baseline: location context, known pre-loss condition, and claim context in 3-5 concise sentences.",
  damageSummary:
    "Create a homeowner-friendly damage summary highlighting major observed issues and urgency factors.",
  measurements:
    "List key measurement data points typically needed for a retail proposal (roof squares, pitch, elevations, interior spaces).",
  materials:
    "Provide recommended material upgrades: good/better/best with warranty or performance notes.",
  investmentTiers:
    "Draft Essential / Recommended / Premium tier breakdown with value justification.",
  timeline:
    "Outline a phased timeline (prep, removal, installation, finishes) with approximate durations.",
  insuranceAlignment:
    "Explain how proposed scope aligns with carrier standards and policy language without sounding adversarial.",
};

export const GET = withAuth(async (req: NextRequest, { orgId }, routeParams) => {
  try {
    const { reportId, sectionKey: rawKey } = await routeParams.params;
    const sectionKey = rawKey as AISectionKey;

    // B-04: Verify report belongs to caller's org (cross-tenant fix)
    const reportOwnership = await prisma.ai_reports
      .findFirst({ where: { id: reportId, orgId }, select: { id: true } })
      .catch(() => null);
    if (!reportOwnership) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    const state = await getAISection(reportId, sectionKey);

    if (!state) {
      return NextResponse.json({ error: "Section not found" }, { status: 404 });
    }

    return NextResponse.json(state);
  } catch (error) {
    logger.error("[AI Section API]", error);
    return NextResponse.json({ error: "Failed to get section" }, { status: 500 });
  }
});

// POST: Generate AI suggestion for section (retail wizard support)
export const POST = withAuth(async (req: NextRequest, { orgId, userId }, routeParams) => {
  try {
    const { reportId, sectionKey: rawKey } = await routeParams.params;
    const key = rawKey as string;

    const basePrompt = SIMPLE_SECTION_PROMPTS[key];
    if (!basePrompt) {
      return NextResponse.json({ error: "Unknown section key" }, { status: 400 });
    }

    // B-04: Check if report exists AND belongs to caller's org (cross-tenant fix)
    const report = await prisma.ai_reports
      .findFirst({ where: { id: reportId, orgId }, select: { id: true } })
      .catch(() => null);
    if (!report) {
      logger.debug(`[AI Section] No existing report ${reportId}, generating suggestion anyway`);
    }

    // Build payload for report generation
    const payload = await buildPayloadWithAddons(reportId, {}, orgId);

    // Generate report content using the AI engine
    const aiContent = await runReportBuilder({
      claimId: reportId,
      reportType: "RETAIL_PROPOSAL",
      audience: "HOMEOWNER",
      addonPayload: payload ?? {},
      address: "Unknown",
      roofType: undefined,
      lossType: undefined,
      orgId,
    }).catch(() => null);

    // Extract content from GeneratedReport (executiveSummary or first section)
    const content =
      aiContent?.executiveSummary ||
      aiContent?.sections?.[0]?.content ||
      "(Suggestion temporarily unavailable)";
    return NextResponse.json({ sectionKey: key, content });
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : "Internal error";
    logger.error("[AI Section Suggest] Failure", e);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
});
