export const dynamic = "force-dynamic";

/**
 * PHASE 39: Estimate Export API Route
 * POST /api/estimate/export
 *
 * Exports scope as:
 * - Xactimate ESX XML
 * - Symbility D22 JSON
 * - Complete ZIP bundle
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import {
  buildEstimateSummary,
  buildSymbilityJson,
  buildXactimateXml,
  parseScope,
} from "@/lib/ai/estimatorEngine";
import { withAuth } from "@/lib/auth/withAuth";
import { buildEstimateZip } from "@/lib/export/zipBuilder";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { checkRateLimit, getRateLimitError } from "@/lib/ratelimit";

// Input validation schema
const EstimateExportSchema = z.object({
  leadId: z.string().min(1, "Lead ID is required"),
});

export const POST = withAuth(async (req: NextRequest, { orgId, userId }) => {
  try {
    // 1. Rate limiting
    const rateLimit = await checkRateLimit(userId, "API");
    if (!rateLimit.success) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded",
          message: getRateLimitError(rateLimit.reset),
          limit: rateLimit.limit,
          remaining: rateLimit.remaining,
          reset: rateLimit.reset,
        },
        { status: 429 }
      );
    }

    // 2. Parse and validate request
    const body = await req.json();
    const parsed = EstimateExportSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid input",
          details: parsed.error.format(),
        },
        { status: 400 }
      );
    }

    const { leadId } = parsed.data;

    // 3. Load lead
    const lead = await prisma.leads.findFirst({
      where: {
        id: leadId,
        orgId: orgId,
      },
      include: {
        contacts: true,
        claims: true,
      },
    });

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    // 5. Load ClaimWriter record
    const claimWriterRecord = await prisma.claimWriter.findFirst({
      where: {
        leadId,
        orgId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (!claimWriterRecord || !claimWriterRecord.scopeJson) {
      return NextResponse.json(
        { error: "No scope found. Generate claim draft first." },
        { status: 400 }
      );
    }

    // 7. Parse scope
    logger.debug("[estimate/export] Parsing scope...");
    const scope = parseScope(claimWriterRecord.scopeJson);

    // 8. Build Xactimate XML
    logger.debug("[estimate/export] Building Xactimate XML...");
    const primaryContact = lead.contacts;
    const metadata = {
      id: lead.id,
      name: primaryContact
        ? `${primaryContact.firstName || ""} ${primaryContact.lastName || ""}`.trim()
        : lead.title,
      address: primaryContact?.street || undefined,
      dateOfLoss: lead.claims?.dateOfLoss?.toISOString() || undefined,
      claimNumber: lead.claimId || undefined,
    };
    const xml = buildXactimateXml(scope, metadata);

    // 9. Build Symbility JSON
    logger.debug("[estimate/export] Building Symbility JSON...");
    const symbility = buildSymbilityJson(scope, metadata);

    // 10. Build summary
    const summary = buildEstimateSummary(scope);

    // 11. Build ZIP
    logger.debug("[estimate/export] Creating ZIP bundle...");
    const zipUrl = await buildEstimateZip(leadId, { includeReports: true });

    // 12. Save to database
    const estimateExportRecord = await prisma.estimateExport.create({
      data: {
        id: crypto.randomUUID(),
        orgId,
        leadId,
        claimId: lead.claimId || undefined,
        xml,
        symbility,
        summary,
      },
    });

    // 13. Return success
    return NextResponse.json({
      success: true,
      id: estimateExportRecord.id,
      xml,
      symbility,
      summary,
      downloadZipUrl: zipUrl,
    });
  } catch (error) {
    logger.error("[estimate/export] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to export estimate",
        details: "Unknown error",
      },
      { status: 500 }
    );
  }
});
