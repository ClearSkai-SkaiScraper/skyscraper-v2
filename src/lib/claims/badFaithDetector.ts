/**
 * MASTER PROMPT #42 - BAD FAITH DETECTION ENGINE
 *
 * Automatically detects insurance carrier bad faith indicators:
 * - Unreasonable delays (>30 days without response)
 * - Repeated requests for same documentation
 * - Arbitrary denials without policy basis
 * - Contradictory positions
 * - Ignoring evidence
 * - Missing deadlines
 * - Policy misrepresentation
 * - Lowball settlements
 *
 * Alerts user to potential legal action when patterns detected.
 */

import { differenceInBusinessDays, differenceInDays } from "date-fns";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export interface BadFaithIndicator {
  type:
    | "unreasonable_delay"
    | "repeated_requests"
    | "arbitrary_denial"
    | "contradictory_position"
    | "ignored_evidence"
    | "missed_deadline"
    | "policy_misrepresentation"
    | "lowball_settlement";
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  evidence: string[];
  detectedAt: Date;
  legalBasis?: string;
  recommendedAction: string;
}

export interface BadFaithAnalysis {
  hasBadFaithIndicators: boolean;
  indicators: BadFaithIndicator[];
  overallSeverity: "none" | "low" | "medium" | "high" | "critical";
  legalActionRecommended: boolean;
  attorneyReferralSuggested: boolean;
  summary: string;
}

/**
 * Analyze claim for bad faith indicators
 */
export async function detectBadFaith(claimId: string): Promise<BadFaithAnalysis> {
  const indicators: BadFaithIndicator[] = [];

  try {
    // Fetch comprehensive claim data
    const claim = await prisma.claims.findUnique({
      where: { id: claimId },
      include: {
        properties: {
          select: {
            carrier: true,
          },
        },
        claim_supplements: {
          orderBy: { created_at: "asc" },
        },
        activities: {
          where: {
            OR: [
              { type: { contains: "carrier" } },
              { type: { contains: "denial" } },
              { type: { contains: "response" } },
              { type: { contains: "document" } },
            ],
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!claim) {
      throw new Error(`Claim ${claimId} not found`);
    }

    const now = new Date();
    const claimAge = differenceInDays(now, claim.createdAt);
    const activities = claim.activities || [];

    // 1. CHECK FOR UNREASONABLE DELAYS
    const lastCarrierResponse = activities
      .filter(
        (a) =>
          a.type?.toLowerCase().includes("carrier") || a.type?.toLowerCase().includes("response")
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];

    if (lastCarrierResponse) {
      const daysSinceResponse = differenceInDays(now, lastCarrierResponse.createdAt);
      const businessDays = differenceInBusinessDays(now, lastCarrierResponse.createdAt);

      if (businessDays > 30) {
        indicators.push({
          type: "unreasonable_delay",
          severity: businessDays > 60 ? "critical" : businessDays > 45 ? "high" : "medium",
          description: `Carrier has not responded in ${businessDays} business days (${daysSinceResponse} calendar days)`,
          evidence: [
            `Last carrier response: ${lastCarrierResponse.createdAt.toLocaleDateString()}`,
            `Current date: ${now.toLocaleDateString()}`,
            `Delay exceeds industry standard of 30 days`,
          ],
          detectedAt: now,
          legalBasis:
            "State insurance regulations typically require carrier response within 15-30 days",
          recommendedAction:
            businessDays > 60
              ? "Immediate attorney consultation recommended"
              : "Send formal demand letter with deadline",
        });
      }
    } else if (claimAge > 45) {
      // No carrier response ever
      indicators.push({
        type: "unreasonable_delay",
        severity: "critical",
        description: `No carrier response received in ${claimAge} days since claim filed`,
        evidence: [
          `Claim filed: ${claim.createdAt.toLocaleDateString()}`,
          `No documented carrier communication`,
        ],
        detectedAt: now,
        legalBasis: "Failure to acknowledge claim violates state prompt payment laws",
        recommendedAction: "File complaint with Department of Insurance; consult attorney",
      });
    }

    // 2. CHECK FOR REPEATED DOCUMENT REQUESTS
    const documentRequests = activities.filter(
      (a) =>
        a.type?.toLowerCase().includes("document") ||
        a.description?.toLowerCase().includes("request") ||
        a.description?.toLowerCase().includes("documentation")
    );

    if (documentRequests.length >= 3) {
      const requestedItems = documentRequests.map((r) => r.description || "").filter(Boolean);
      const uniqueRequests = new Set(requestedItems.map((s) => s.toLowerCase()));

      if (requestedItems.length > uniqueRequests.size * 1.5) {
        // More than 50% duplicate requests
        indicators.push({
          type: "repeated_requests",
          severity: "high",
          description: `Carrier has requested the same documentation multiple times (${documentRequests.length} total requests)`,
          evidence: [
            `Total document requests: ${documentRequests.length}`,
            `Duplicate patterns detected`,
            ...requestedItems.slice(0, 5),
          ],
          detectedAt: now,
          legalBasis:
            "Repeated requests for previously provided documentation may constitute bad faith",
          recommendedAction:
            "Document all previous submissions; send comprehensive evidence package with receipt confirmation",
        });
      }
    }

    // 3. CHECK FOR ARBITRARY DENIALS
    const denials = activities.filter(
      (a) =>
        a.type?.toLowerCase().includes("denial") ||
        a.type?.toLowerCase().includes("denied") ||
        a.description?.toLowerCase().includes("denial")
    );

    if (denials.length > 0) {
      const hasJustification = denials.some(
        (d) =>
          d.description?.includes("policy") ||
          d.description?.includes("coverage") ||
          d.description?.includes("section")
      );

      if (!hasJustification) {
        indicators.push({
          type: "arbitrary_denial",
          severity: "high",
          description: "Claim denied without clear policy language citation or legal basis",
          evidence: denials.map((d) => d.description || "Denial recorded").slice(0, 3),
          detectedAt: now,
          legalBasis: "Denials must cite specific policy exclusions or limitations",
          recommendedAction: "Request written explanation with policy references; prepare appeal",
        });
      }
    }

    // 4. CHECK FOR CONTRADICTORY POSITIONS
    const carrierStatements = activities
      .filter((a) => a.type?.includes("carrier") || a.type?.includes("response"))
      .map((a) => a.description || "")
      .filter(Boolean);

    if (carrierStatements.length >= 2) {
      // Simple heuristic: look for conflicting keywords
      const hasApprovalMention = carrierStatements.some((s) => /approve|accept|cover/i.test(s));
      const hasDenialMention = carrierStatements.some((s) => /deny|decline|reject/i.test(s));

      if (hasApprovalMention && hasDenialMention) {
        indicators.push({
          type: "contradictory_position",
          severity: "medium",
          description: "Carrier has taken contradictory positions on claim coverage",
          evidence: carrierStatements.slice(0, 5),
          detectedAt: now,
          legalBasis: "Inconsistent positions may demonstrate lack of reasonable investigation",
          recommendedAction:
            "Document timeline of carrier statements; highlight contradictions in appeal",
        });
      }
    }

    // 5. CHECK FOR IGNORED EVIDENCE
    const supplements = claim.claim_supplements || [];
    const ignoredSupplements = supplements.filter((s: any) => {
      const age = differenceInDays(now, s.created_at);
      return age > 30 && !s.status?.toLowerCase().includes("reviewed");
    });

    if (ignoredSupplements.length > 0) {
      indicators.push({
        type: "ignored_evidence",
        severity: ignoredSupplements.length > 2 ? "high" : "medium",
        description: `Carrier has not reviewed ${ignoredSupplements.length} supplement(s) submitted over 30 days ago`,
        evidence: ignoredSupplements.map(
          (s) =>
            `Supplement ${s.id} submitted ${differenceInDays(now, s.created_at)} days ago - Status: ${s.status || "Pending"}`
        ),
        detectedAt: now,
        legalBasis: "Failure to consider relevant evidence violates duty of good faith",
        recommendedAction: "Send certified letter demanding review of all submitted evidence",
      });
    }

    // 6. CHECK FOR LOWBALL SETTLEMENTS
    // Check if approvedValue is significantly lower than estimatedValue
    if (claim.estimatedValue && claim.approvedValue) {
      const offer = claim.approvedValue;

      if (offer > 0 && offer < claim.estimatedValue * 0.5) {
        indicators.push({
          type: "lowball_settlement",
          severity: offer < claim.estimatedValue * 0.3 ? "high" : "medium",
          description: `Carrier offer (${offer.toLocaleString()}) is ${Math.round((1 - offer / claim.estimatedValue) * 100)}% below estimated value`,
          evidence: [
            `Estimated value: $${claim.estimatedValue.toLocaleString()}`,
            `Carrier offer: $${offer.toLocaleString()}`,
            `Difference: $${(claim.estimatedValue - offer).toLocaleString()}`,
          ],
          detectedAt: now,
          legalBasis: "Offers significantly below actual value may constitute bad faith",
          recommendedAction:
            "Obtain independent appraisal; prepare detailed rebuttal with evidence",
        });
      }
    }

    // 7. CALCULATE OVERALL SEVERITY
    let overallSeverity: "none" | "low" | "medium" | "high" | "critical" = "none";
    const criticalCount = indicators.filter((i) => i.severity === "critical").length;
    const highCount = indicators.filter((i) => i.severity === "high").length;
    const mediumCount = indicators.filter((i) => i.severity === "medium").length;

    if (criticalCount > 0 || highCount >= 2) {
      overallSeverity = "critical";
    } else if (highCount > 0 || mediumCount >= 3) {
      overallSeverity = "high";
    } else if (mediumCount > 0) {
      overallSeverity = "medium";
    } else if (indicators.length > 0) {
      overallSeverity = "low";
    }

    // 8. DETERMINE RECOMMENDATIONS
    const legalActionRecommended = overallSeverity === "critical" || overallSeverity === "high";
    const attorneyReferralSuggested =
      overallSeverity === "critical" || (overallSeverity === "high" && indicators.length >= 3);

    // 9. GENERATE SUMMARY
    let summary = "";
    if (indicators.length === 0) {
      summary = "No bad faith indicators detected. Carrier behavior appears reasonable.";
    } else if (overallSeverity === "critical") {
      summary = `⚠️ CRITICAL: ${indicators.length} bad faith indicator(s) detected. Immediate attorney consultation strongly recommended. Carrier's conduct may warrant legal action and punitive damages.`;
    } else if (overallSeverity === "high") {
      summary = `⚠️ HIGH CONCERN: ${indicators.length} bad faith indicator(s) detected. Document all interactions carefully. Consider attorney consultation to protect your rights.`;
    } else {
      summary = `${indicators.length} potential bad faith indicator(s) detected. Monitor carrier behavior closely and maintain detailed documentation.`;
    }

    return {
      hasBadFaithIndicators: indicators.length > 0,
      indicators,
      overallSeverity,
      legalActionRecommended,
      attorneyReferralSuggested,
      summary,
    };
  } catch (error: any) {
    logger.error("[BAD FAITH DETECTION ERROR]", error);
    return {
      hasBadFaithIndicators: false,
      indicators: [],
      overallSeverity: "none",
      legalActionRecommended: false,
      attorneyReferralSuggested: false,
      summary: `Error analyzing claim for bad faith: ${error.message}`,
    };
  }
}

/**
 * Get bad faith analysis for a claim (cached or fresh)
 */
export async function getBadFaithAnalysis(claimId: string): Promise<BadFaithAnalysis> {
  // Check if recent analysis exists (within last 7 days) using createdAt (mapped to created_at)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const recentAnalysis = await prisma.claim_bad_faith_analysis
    .findFirst({
      where: {
        claim_id: claimId,
        created_at: { gte: sevenDaysAgo },
      },
      orderBy: { created_at: "desc" },
    })
    .catch(() => null);

  if (recentAnalysis?.analysis) {
    return recentAnalysis.analysis as unknown as BadFaithAnalysis;
  }

  // Run fresh analysis
  const analysis = await detectBadFaith(claimId);

  // Persist minimal fields that exist in schema (severity Int?)
  const severityMap: Record<BadFaithAnalysis["overallSeverity"], number> = {
    none: 0,
    low: 1,
    medium: 2,
    high: 3,
    critical: 4,
  };

  // If detectBadFaith returned an error summary (e.g. claim missing), skip caching
  if (analysis.summary.startsWith("Error analyzing")) {
    return analysis;
  }

  await prisma.claim_bad_faith_analysis
    .create({
      data: {
        id: crypto.randomUUID(),
        claim_id: claimId,
        analysis: analysis as any,
        severity: severityMap[analysis.overallSeverity],
      },
    })
    .catch((err) => console.error("[BAD FAITH] Failed to cache analysis:", err));

  return analysis;
}
