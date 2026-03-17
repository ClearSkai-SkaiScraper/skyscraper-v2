/**
 * POST /api/claims/[claimId]/carrier-intelligence
 *
 * Generates AI carrier intelligence for a specific claim.
 * Stores the result as an `ai_reports` record with type="carrier-intelligence"
 * and structured JSON in the `content` field.
 */

import { createId } from "@paralleldrive/cuid2";
import { NextResponse } from "next/server";

import { getOpenAI } from "@/lib/ai/client";
import { apiError } from "@/lib/apiError";
import { logCriticalAction } from "@/lib/audit/criticalActions";
import { withOrgScope } from "@/lib/auth/tenant";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const POST = withOrgScope(
  async (
    req: Request,
    { userId, orgId }: { userId: string; orgId: string },
    { params }: { params: { claimId: string } }
  ) => {
    const { claimId } = params;

    try {
      // 1. Fetch the claim and carrier info (with property relation for location)
      const claim = await prisma.claims.findFirst({
        where: { id: claimId, orgId },
        select: {
          id: true,
          carrier: true,
          damageType: true,
          properties: {
            select: { propertyType: true, city: true, state: true },
          },
        },
      });

      if (!claim) {
        return apiError(404, "CLAIM_NOT_FOUND", "Claim not found or access denied.");
      }

      const carrierName = claim.carrier || "Unknown Carrier";

      logger.info("[CARRIER_INTELLIGENCE] Generating", {
        claimId,
        orgId,
        carrier: carrierName,
      });

      // 2. Generate AI carrier intelligence
      const openai = getOpenAI();

      const prompt = `You are an expert insurance claims consultant. Generate comprehensive carrier-specific intelligence for "${carrierName}" to help a storm restoration contractor build better damage reports, supplements, and rebuttals.

Property Details:
- Type: ${claim.properties?.propertyType || "Residential"}
- Location: ${claim.properties?.city || ""}, ${claim.properties?.state || ""}
- Damage Type: ${claim.damageType || "Storm/Hail"}

Generate the following sections in JSON format:
{
  "guidelines": "Detailed coverage guidelines — what this carrier typically covers for storm damage, their documentation requirements, preferred inspection protocols, and any known coverage inclusions/exclusions.",
  "coverageNotes": "Key policy details — typical deductible structures, coverage limits, endorsements relevant to storm claims, ACV vs RCV policies, and depreciation approaches.",
  "policyRules": "Claim filing rules — deadlines, required documentation formats, adjuster communication protocols, supplement submission procedures, and escalation paths.",
  "supplementTips": "Best practices for writing supplements to this carrier — preferred formatting, language that resonates, evidence types they respond to, and common supplement approval triggers.",
  "rebuttalNotes": "Effective rebuttal strategies — how to counter common denials from this carrier, regulatory citations that apply, precedent references, and escalation techniques.",
  "commonDenials": "Frequent denial triggers — documentation gaps that lead to denials, common pitfalls when filing with this carrier, and preventive measures."
}

Be specific, practical, and actionable. Focus on information that helps contractors win more approvals and build stronger documentation.`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are an insurance claims intelligence expert. Always respond with valid JSON.",
          },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
        max_tokens: 4000,
      });

      const raw = completion.choices[0]?.message?.content;
      if (!raw) {
        return apiError(500, "AI_FAILED", "AI generation returned empty response.");
      }

      let parsed: Record<string, string>;
      try {
        parsed = JSON.parse(raw);
      } catch {
        return apiError(500, "AI_PARSE_FAILED", "Failed to parse AI response.");
      }

      // 3. Store as ai_reports record (type = "carrier-intelligence")
      //    Delete any previous carrier-intelligence report for this claim first
      await prisma.ai_reports.deleteMany({
        where: { claimId, orgId, type: "carrier-intelligence" },
      });

      await prisma.ai_reports.create({
        data: {
          id: createId(),
          orgId,
          claimId,
          type: "carrier-intelligence",
          title: `${carrierName} — Carrier Intelligence`,
          content: JSON.stringify(parsed),
          tokensUsed: completion.usage?.total_tokens ?? 0,
          model: "gpt-4o-mini",
          userId,
          userName: "System",
          status: "generated",
          updatedAt: new Date(),
        },
      });

      logger.info("[CARRIER_INTELLIGENCE] Generated successfully", {
        claimId,
        orgId,
        carrier: carrierName,
      });

      // Audit log carrier intelligence generation
      await logCriticalAction("CARRIER_INTELLIGENCE_GENERATED", userId, orgId, {
        claimId,
        carrier: carrierName,
        tokensUsed: completion.usage?.total_tokens ?? 0,
      });

      // Redirect back to carrier tab
      return NextResponse.redirect(new URL(`/claims/${claimId}/carrier`, req.url), 303);
    } catch (err: any) {
      logger.error("[CARRIER_INTELLIGENCE] Error", { error: err.message, claimId });
      return apiError(500, "INTERNAL_ERROR", "Failed to generate carrier intelligence.");
    }
  }
);
