/**
 * POST /api/reports/build-smart
 *
 * AI-powered "Smart Report" builder.
 * Called from:
 *   - /intelligence/[id] page (full addon payload with 26 feature toggles)
 *   - /reports/new/smart page (simplified 13-toggle version)
 *
 * Returns a structured report with sections, metadata, etc.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { createId } from "@paralleldrive/cuid2";
import { NextRequest, NextResponse } from "next/server";

import { getOpenAI } from "@/lib/ai/client";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { safeOrgContext } from "@/lib/safeOrgContext";

type ReportKind = "QUICK" | "CLAIMS_READY" | "RETAIL" | "FORENSIC";
type ReportAudience = "INTERNAL" | "ADJUSTER" | "RETAIL" | "HOMEOWNER";

interface ReportSection {
  key: string;
  title: string;
  content: string;
  order: number;
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await safeOrgContext();
    if (!ctx.ok || !ctx.orgId || !ctx.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      claimId,
      reportType = "QUICK",
      audience = "INTERNAL",
      addonPayload = {},
      address,
      roofType,
      lossType,
    } = body;

    if (!claimId) {
      return NextResponse.json({ error: "claimId is required" }, { status: 400 });
    }

    // Verify claim belongs to org
    const claim = await prisma.claims.findFirst({
      where: { id: claimId, orgId: ctx.orgId },
      select: {
        id: true,
        claimNumber: true,
        title: true,
        damageType: true,
        dateOfLoss: true,
        insured_name: true,
        policy_number: true,
        carrier: true,
        estimatedValue: true,
        properties: {
          select: { street: true, city: true, state: true, zipCode: true, roofType: true },
        },
      },
    });

    if (!claim) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }

    // Resolve user name for report attribution
    const dbUser = await prisma.users.findFirst({
      where: { clerkUserId: ctx.userId },
      select: { id: true, name: true },
    });

    // Build the prompt based on report type and addons
    const enabledAddons = Object.entries(addonPayload)
      .filter(([, v]) => v === true)
      .map(([k]) => k);

    const propertyAddress =
      address ||
      [claim.properties?.street, claim.properties?.city, claim.properties?.state]
        .filter(Boolean)
        .join(", ") ||
      "Unknown";

    const systemPrompt = `You are an expert storm restoration report writer. Generate a professional ${reportType} report for a ${audience.toLowerCase()} audience.

The report must be structured with clear sections. Each section should have a title and detailed content.
Report type: ${reportType}
Target audience: ${audience}
${enabledAddons.length > 0 ? `Include these optional sections: ${enabledAddons.join(", ")}` : ""}

Output valid JSON matching this shape:
{
  "title": "Report title",
  "subtitle": "Optional subtitle",
  "executiveSummary": "Brief executive summary paragraph",
  "sections": [
    { "key": "section-key", "title": "Section Title", "content": "Section content...", "order": 1 }
  ]
}`;

    const userPrompt = `Generate a ${reportType} report for:
Claim: ${claim.claimNumber || claim.id.slice(0, 8)}
Insured: ${claim.insured_name || "N/A"}
Policy: ${claim.policy_number || "N/A"}
Date of Loss: ${claim.dateOfLoss?.toISOString().split("T")[0] || "N/A"}
Damage Type: ${claim.damageType || lossType || "Unknown"}
Property: ${propertyAddress}
Roof Type: ${roofType || claim.properties?.roofType || "Unknown"}
Carrier: ${claim.carrier || "N/A"}
${claim.estimatedValue ? `Estimate Total: $${claim.estimatedValue}` : ""}`;

    let reportData: {
      title: string;
      subtitle?: string;
      executiveSummary?: string;
      sections: ReportSection[];
    };

    try {
      const client = getOpenAI();
      const completion = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
        response_format: { type: "json_object" },
      });

      const rawContent = completion.choices[0]?.message?.content || "{}";
      reportData = JSON.parse(rawContent);

      // Save to ai_reports table
      await prisma.ai_reports.create({
        data: {
          id: createId(),
          orgId: ctx.orgId,
          type: reportType,
          title: reportData.title || `${reportType} Report`,
          content: rawContent,
          tokensUsed: completion.usage?.total_tokens || 0,
          model: "gpt-4o-mini",
          claimId: claim.id,
          userId: dbUser?.id || ctx.userId,
          userName: dbUser?.name || "System",
          status: "generated",
          updatedAt: new Date(),
        },
      });
    } catch (aiError) {
      logger.error("[BUILD_SMART] AI generation failed:", aiError);
      // Return a fallback structure so UI doesn't crash
      reportData = {
        title: `${reportType} Report — ${claim.claimNumber || claim.id.slice(0, 8)}`,
        subtitle: "AI generation unavailable — template report",
        executiveSummary:
          "This report could not be generated by AI at this time. Please try again or use a manual template.",
        sections: [
          {
            key: "overview",
            title: "Claim Overview",
            content: `Claim ${claim.claimNumber || "N/A"} for ${claim.insured_name || "N/A"} at ${propertyAddress}. Date of loss: ${claim.dateOfLoss?.toISOString().split("T")[0] || "N/A"}.`,
            order: 1,
          },
        ],
      };
    }

    logger.info("[BUILD_SMART] Report generated", {
      orgId: ctx.orgId,
      claimId,
      reportType,
      sections: reportData.sections?.length || 0,
    });

    return NextResponse.json({
      title: reportData.title,
      subtitle: reportData.subtitle,
      reportType: reportType as ReportKind,
      audience: audience as ReportAudience,
      executiveSummary: reportData.executiveSummary,
      sections: reportData.sections || [],
      meta: {
        claimId: claim.id,
        claimNumber: claim.claimNumber,
        dateOfLoss: claim.dateOfLoss?.toISOString() || null,
        location: propertyAddress,
        roofType: roofType || claim.properties?.roofType || null,
        totalRequested: claim.estimatedValue ? Number(claim.estimatedValue) : null,
        estimateMode: null,
      },
    });
  } catch (error) {
    logger.error("[BUILD_SMART] Error:", error);
    return NextResponse.json({ error: "Failed to generate report" }, { status: 500 });
  }
}
