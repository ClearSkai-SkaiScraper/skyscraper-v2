// lib/intel/automation/detectTriggers.ts
/**
 * 🔥 PHASE 12 - SKAI TRIGGER DETECTION SYSTEM
 *
 * Scans claims for conditions that should trigger automations:
 * - Financial underpayment detected
 * - Weather correlation high
 * - Adjuster email overdue
 * - Missing critical items
 * - Claim idle too long
 * - Supplement opportunities
 * - Code violations found
 */

import { getDelegate } from "@/lib/db/modelAliases";
import prisma from "@/lib/prisma";

export type TriggerType =
  | "UNDERPAYMENT_DETECTED"
  | "WEATHER_CORRELATION_HIGH"
  | "ADJUSTER_OVERDUE"
  | "MISSING_ITEMS_CRITICAL"
  | "CLAIM_IDLE"
  | "SUPPLEMENT_OPPORTUNITY"
  | "CODE_VIOLATION"
  | "CAUSATION_DISPUTED"
  | "CARRIER_DENIAL"
  | "INSPECTION_COMPLETED"
  | "PHOTOS_UPLOADED"
  | "WEATHER_EVENT_NEARBY"
  | "SETTLEMENT_READY";

export interface DetectedTrigger {
  type: TriggerType;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload: any;
  reason: string;
}

export async function detectTriggersForClaim(
  claimId: string,
  orgId: string
): Promise<DetectedTrigger[]> {
  const triggers: DetectedTrigger[] = [];

  const claim = await prisma.claims.findUnique({
    where: { id: claimId },
    select: {
      id: true,
      orgId: true,
      status: true,
      last_contacted_at: true,
      claim_supplements: {
        orderBy: { created_at: "desc" },
        select: { id: true, total_cents: true, created_at: true },
      },
    },
  });

  if (!claim || claim.orgId !== orgId) return triggers;

  const latestFinancialReport = await prisma.ai_reports.findFirst({
    where: { orgId, claimId, type: "financial_analysis" },
    orderBy: { createdAt: "desc" },
    select: { id: true, content: true },
  });

  const latestWeatherReport = await prisma.ai_reports.findFirst({
    where: { orgId, claimId, type: "forensic_weather" },
    orderBy: { createdAt: "desc" },
    select: { id: true, content: true, attachments: true },
  });

  const lastActivity = await prisma.claim_activities.findFirst({
    where: { claim_id: claimId },
    orderBy: { created_at: "desc" },
    select: { id: true, created_at: true, type: true },
  });

  // ========================================
  // TRIGGER 1: UNDERPAYMENT DETECTED
  // ========================================
  if (latestFinancialReport?.content) {
    const parsed = safeJsonParse(latestFinancialReport.content);
    const underpayment =
      typeof parsed?.mathResult?.totals?.underpayment === "number"
        ? parsed.mathResult.totals.underpayment
        : 0;

    if (underpayment > 5000) {
      triggers.push({
        type: "UNDERPAYMENT_DETECTED",
        severity: underpayment > 10000 ? "CRITICAL" : "HIGH",
        payload: { underpayment, reportId: latestFinancialReport.id },
        reason: `Carrier estimate is short $${underpayment.toLocaleString()}`,
      });
    }
  }

  // ========================================
  // TRIGGER 2: WEATHER CORRELATION HIGH
  // ========================================
  if (latestWeatherReport) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const attachments = latestWeatherReport.attachments as any;
    const parsed = safeJsonParse(latestWeatherReport.content);
    const confidence =
      typeof attachments?.correlationScore === "number"
        ? attachments.correlationScore
        : typeof parsed?.damageCorrelation?.overallCorrelation === "number"
          ? parsed.damageCorrelation.overallCorrelation
          : 0;

    if (confidence > 0.75) {
      triggers.push({
        type: "WEATHER_CORRELATION_HIGH",
        severity: confidence > 0.9 ? "HIGH" : "MEDIUM",
        payload: { correlation: confidence, reportId: latestWeatherReport.id },
        reason: `Damage correlates ${(confidence * 100).toFixed(1)}% with weather event`,
      });
    }
  }

  // ========================================
  // TRIGGER 3: ADJUSTER OVERDUE
  // ========================================
  const lastAdjusterContact = claim.last_contacted_at;
  if (lastAdjusterContact) {
    const daysSinceContact = Math.floor(
      (Date.now() - lastAdjusterContact.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceContact > 7) {
      triggers.push({
        type: "ADJUSTER_OVERDUE",
        severity: daysSinceContact > 14 ? "HIGH" : "MEDIUM",
        payload: { daysSinceContact, lastContactedAt: lastAdjusterContact },
        reason: `No adjuster response in ${daysSinceContact} days`,
      });
    }
  }

  // ========================================
  // TRIGGER 4: CLAIM IDLE
  // ========================================
  if (lastActivity) {
    const lastActivityAt = lastActivity.created_at ?? null;
    if (lastActivityAt) {
      const daysIdle = Math.floor((Date.now() - lastActivityAt.getTime()) / (1000 * 60 * 60 * 24));

      if (daysIdle > 5 && claim.status !== "closed") {
        triggers.push({
          type: "CLAIM_IDLE",
          severity: daysIdle > 10 ? "HIGH" : "MEDIUM",
          payload: { daysIdle, lastActivityDate: lastActivityAt, event: lastActivity.type },
          reason: `Claim has been idle for ${daysIdle} days`,
        });
      }
    }
  }

  // ========================================
  // TRIGGER 5: SUPPLEMENT OPPORTUNITY
  // ========================================
  if (claim.claim_supplements.length > 0) {
    const totalSupplementValue =
      claim.claim_supplements.reduce((sum, s) => sum + (s.total_cents || 0), 0) / 100;

    if (totalSupplementValue > 3000) {
      triggers.push({
        type: "SUPPLEMENT_OPPORTUNITY",
        severity: totalSupplementValue > 8000 ? "HIGH" : "MEDIUM",
        payload: { totalValue: totalSupplementValue, count: claim.claim_supplements.length },
        reason: `$${totalSupplementValue.toLocaleString()} in supplements detected`,
      });
    }
  }

  // ========================================
  // TRIGGER 7: CAUSATION DISPUTED
  // ========================================
  if (claim.status === "causation_disputed" || claim.status === "denied") {
    triggers.push({
      type: "CAUSATION_DISPUTED",
      severity: "CRITICAL",
      payload: { status: claim.status },
      reason: "Carrier is disputing causation - forensic weather needed",
    });
  }

  return triggers;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function safeJsonParse(value: string): any {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

/**
 * Batch detect triggers for multiple claims (dashboard scan)
 */
export async function detectTriggersForOrg(orgId: string): Promise<Map<string, DetectedTrigger[]>> {
  const claims = await prisma.claims.findMany({
    where: { orgId, status: { not: "closed" } },
    select: { id: true },
    take: 50, // Scan up to 50 active claims
  });

  const triggerMap = new Map<string, DetectedTrigger[]>();

  for (const claim of claims) {
    const triggers = await detectTriggersForClaim(claim.id, orgId);
    if (triggers.length > 0) {
      triggerMap.set(claim.id, triggers);
    }
  }

  return triggerMap;
}

/**
 * Save detected triggers to database
 */
export async function saveTriggers(
  claimId: string,
  orgId: string,
  triggers: DetectedTrigger[]
): Promise<void> {
  for (const trigger of triggers) {
    await getDelegate("automationTrigger").create({
      data: {
        orgId,
        claimId,
        type: trigger.type,
        status: "PENDING",
        metadata: {
          severity: trigger.severity,
          payload: trigger.payload,
          reason: trigger.reason,
        },
      },
    });
  }
}
