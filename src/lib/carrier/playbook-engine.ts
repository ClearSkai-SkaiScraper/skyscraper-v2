/**
 * Carrier Playbook Engine — R2
 *
 * Aggregates historical claim outcomes by carrier to build
 * intelligence profiles: approval rates, denial patterns,
 * typical supplement rounds, winning strategies, and behavioral notes.
 *
 * Writes results to `carrier_playbooks` table.
 */

import { createId } from "@paralleldrive/cuid2";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface CarrierPlaybook {
  carrierName: string;
  totalClaims: number;
  approvedCount: number;
  partialCount: number;
  deniedCount: number;
  approvalRate: number;
  avgDaysToResolve: number;
  avgSupplementRounds: number;
  supplementWinRate: number;
  commonDenialReasons: string[];
  keyEvidenceNeeded: string[];
  carrierBehaviorNotes: string;
  preferredStrategy: string;
  typicalResponse: string;
}

export interface CarrierPlaybookSummary {
  playbooks: CarrierPlaybook[];
  totalCarriers: number;
  overallApprovalRate: number;
  bestCarrier: string | null;
  hardestCarrier: string | null;
  computedAt: string;
}

/* ------------------------------------------------------------------ */
/* Core Engine                                                         */
/* ------------------------------------------------------------------ */

/**
 * Build playbooks for all carriers the org has dealt with.
 * Aggregates from claim_outcomes + claims + supplements tables.
 */
export async function buildCarrierPlaybooks(orgId: string): Promise<CarrierPlaybookSummary> {
  logger.info("[CARRIER_PLAYBOOK] Building playbooks", { orgId });

  // 1. Get all claims with carrier info + outcomes
  const claims = await prisma.claims.findMany({
    where: {
      orgId,
      carrier: { not: null },
    },
    select: {
      id: true,
      carrier: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (claims.length === 0) {
    return {
      playbooks: [],
      totalCarriers: 0,
      overallApprovalRate: 0,
      bestCarrier: null,
      hardestCarrier: null,
      computedAt: new Date().toISOString(),
    };
  }

  // 2. Get outcomes for these claims
  const claimIds = claims.map((c) => c.id);
  const outcomes = await prisma.claim_outcomes.findMany({
    where: { claimId: { in: claimIds } },
  });
  const outcomeByClaimId = new Map(outcomes.map((o) => [o.claimId, o]));

  // 3. Get supplement counts per claim
  let supplementsByClaimId: Map<string, number> = new Map();
  try {
    const supplements = await prisma.supplements.findMany({
      where: { claim_id: { in: claimIds } },
      select: { claim_id: true },
    });
    for (const s of supplements) {
      if (s.claim_id) {
        supplementsByClaimId.set(s.claim_id, (supplementsByClaimId.get(s.claim_id) || 0) + 1);
      }
    }
  } catch {
    // supplements table may not exist yet
    logger.warn("[CARRIER_PLAYBOOK] Could not fetch supplements — table may not exist");
  }

  // 4. Group claims by carrier
  const carrierMap = new Map<
    string,
    {
      claims: typeof claims;
      outcomes: typeof outcomes;
    }
  >();

  for (const claim of claims) {
    const carrier = normalizeCarrierName(claim.carrier || "Unknown");
    if (!carrierMap.has(carrier)) {
      carrierMap.set(carrier, { claims: [], outcomes: [] });
    }
    const entry = carrierMap.get(carrier)!;
    entry.claims.push(claim);
    const outcome = outcomeByClaimId.get(claim.id);
    if (outcome) entry.outcomes.push(outcome);
  }

  // 5. Build playbook per carrier
  const playbooks: CarrierPlaybook[] = [];

  for (const [carrierName, data] of carrierMap) {
    if (data.claims.length < 1) continue;

    const total = data.claims.length;
    const approvedOutcomes = data.outcomes.filter((o) => o.outcome === "approved");
    const partialOutcomes = data.outcomes.filter((o) => o.outcome === "partial");
    const deniedOutcomes = data.outcomes.filter((o) => o.outcome === "denied");

    const approvedCount = approvedOutcomes.length;
    const partialCount = partialOutcomes.length;
    const deniedCount = deniedOutcomes.length;
    const resolvedTotal = approvedCount + partialCount + deniedCount;

    const approvalRate =
      resolvedTotal > 0 ? Math.round(((approvedCount + partialCount) / resolvedTotal) * 100) : 0;

    // Calculate average days to resolve
    let avgDaysToResolve = 0;
    if (data.outcomes.length > 0) {
      const days = data.outcomes
        .filter((o) => o.resolvedAt)
        .map((o) => {
          const claim = data.claims.find((c) => c.id === o.claimId);
          if (!claim) return 0;
          return Math.round(
            (new Date(o.resolvedAt!).getTime() - new Date(claim.createdAt).getTime()) /
              (1000 * 60 * 60 * 24)
          );
        })
        .filter((d) => d > 0);
      avgDaysToResolve =
        days.length > 0 ? Math.round(days.reduce((s, d) => s + d, 0) / days.length) : 0;
    }

    // Supplement stats
    const supplementCounts = data.claims
      .map((c) => supplementsByClaimId.get(c.id) || 0)
      .filter((n) => n > 0);
    const avgSupplementRounds =
      supplementCounts.length > 0
        ? Math.round((supplementCounts.reduce((s, n) => s + n, 0) / supplementCounts.length) * 10) /
          10
        : 0;

    // Supplement win rate (approved after supplement)
    const claimsWithSupplements = data.claims.filter(
      (c) => (supplementsByClaimId.get(c.id) || 0) > 0
    );
    const supplementedAndApproved = claimsWithSupplements.filter((c) => {
      const outcome = outcomeByClaimId.get(c.id);
      return outcome?.outcome === "approved" || outcome?.outcome === "partial";
    });
    const supplementWinRate =
      claimsWithSupplements.length > 0
        ? Math.round((supplementedAndApproved.length / claimsWithSupplements.length) * 100)
        : 0;

    // Analyze denial reasons
    const denialReasons = deniedOutcomes
      .map((o) => (o.carrierReason as string) || "")
      .filter(Boolean);
    const commonDenialReasons = extractTopReasons(denialReasons);

    // Build behavioral notes
    const { behaviorNotes, preferredStrategy, typicalResponse, keyEvidence } =
      analyzeCarrierBehavior(
        carrierName,
        approvalRate,
        avgDaysToResolve,
        avgSupplementRounds,
        commonDenialReasons
      );

    const playbook: CarrierPlaybook = {
      carrierName,
      totalClaims: total,
      approvedCount,
      partialCount,
      deniedCount,
      approvalRate,
      avgDaysToResolve,
      avgSupplementRounds,
      supplementWinRate,
      commonDenialReasons,
      keyEvidenceNeeded: keyEvidence,
      carrierBehaviorNotes: behaviorNotes,
      preferredStrategy,
      typicalResponse,
    };

    playbooks.push(playbook);

    // Persist to DB
    await persistPlaybook(playbook, orgId);
  }

  // Sort by total claims descending
  playbooks.sort((a, b) => b.totalClaims - a.totalClaims);

  const allApproved = playbooks.reduce((s, p) => s + p.approvedCount + p.partialCount, 0);
  const allResolved = playbooks.reduce(
    (s, p) => s + p.approvedCount + p.partialCount + p.deniedCount,
    0
  );

  const bestCarrier =
    playbooks.length > 0
      ? ([...playbooks].sort((a, b) => b.approvalRate - a.approvalRate)[0]?.carrierName ?? null)
      : null;
  const hardestCarrier =
    playbooks.length > 0
      ? ([...playbooks].sort((a, b) => a.approvalRate - b.approvalRate)[0]?.carrierName ?? null)
      : null;

  logger.info("[CARRIER_PLAYBOOK] Built playbooks", {
    orgId,
    totalCarriers: playbooks.length,
    totalClaims: claims.length,
  });

  return {
    playbooks,
    totalCarriers: playbooks.length,
    overallApprovalRate: allResolved > 0 ? Math.round((allApproved / allResolved) * 100) : 0,
    bestCarrier,
    hardestCarrier,
    computedAt: new Date().toISOString(),
  };
}

/**
 * Get a single carrier's playbook (from DB cache or compute)
 */
export async function getCarrierPlaybook(
  orgId: string,
  carrierName: string
): Promise<CarrierPlaybook | null> {
  const normalized = normalizeCarrierName(carrierName);

  const cached = await prisma.carrier_playbooks.findUnique({
    where: { orgId_carrierName: { orgId, carrierName: normalized } },
  });

  if (cached) {
    return {
      carrierName: cached.carrierName,
      totalClaims: cached.totalClaims,
      approvedCount: cached.approvedCount,
      partialCount: cached.partialCount,
      deniedCount: cached.deniedCount,
      approvalRate: cached.approvalRate ?? 0,
      avgDaysToResolve: cached.avgDaysToResolve ?? 0,
      avgSupplementRounds: cached.avgSupplementRounds ?? 0,
      supplementWinRate: cached.supplementWinRate ?? 0,
      commonDenialReasons: (cached.commonDenialReasons as string[]) ?? [],
      keyEvidenceNeeded: (cached.keyEvidenceNeeded as string[]) ?? [],
      carrierBehaviorNotes: cached.carrierBehaviorNotes ?? "",
      preferredStrategy: cached.preferredStrategy ?? "",
      typicalResponse: cached.typicalResponse ?? "",
    };
  }

  return null;
}

/* ------------------------------------------------------------------ */
/* Persistence                                                         */
/* ------------------------------------------------------------------ */

async function persistPlaybook(playbook: CarrierPlaybook, orgId: string) {
  try {
    await prisma.carrier_playbooks.upsert({
      where: {
        orgId_carrierName: { orgId, carrierName: playbook.carrierName },
      },
      create: {
        id: createId(),
        orgId,
        carrierName: playbook.carrierName,
        totalClaims: playbook.totalClaims,
        approvedCount: playbook.approvedCount,
        partialCount: playbook.partialCount,
        deniedCount: playbook.deniedCount,
        approvalRate: playbook.approvalRate,
        avgDaysToResolve: playbook.avgDaysToResolve,
        avgSupplementRounds: playbook.avgSupplementRounds,
        supplementWinRate: playbook.supplementWinRate,
        commonDenialReasons: playbook.commonDenialReasons,
        keyEvidenceNeeded: playbook.keyEvidenceNeeded,
        carrierBehaviorNotes: playbook.carrierBehaviorNotes,
        preferredStrategy: playbook.preferredStrategy,
        typicalResponse: playbook.typicalResponse,
        sampleSize: playbook.totalClaims,
      },
      update: {
        totalClaims: playbook.totalClaims,
        approvedCount: playbook.approvedCount,
        partialCount: playbook.partialCount,
        deniedCount: playbook.deniedCount,
        approvalRate: playbook.approvalRate,
        avgDaysToResolve: playbook.avgDaysToResolve,
        avgSupplementRounds: playbook.avgSupplementRounds,
        supplementWinRate: playbook.supplementWinRate,
        commonDenialReasons: playbook.commonDenialReasons,
        keyEvidenceNeeded: playbook.keyEvidenceNeeded,
        carrierBehaviorNotes: playbook.carrierBehaviorNotes,
        preferredStrategy: playbook.preferredStrategy,
        typicalResponse: playbook.typicalResponse,
        sampleSize: playbook.totalClaims,
        computedAt: new Date(),
      },
    });
  } catch (err) {
    logger.error("[CARRIER_PLAYBOOK] Persist failed:", err);
  }
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function normalizeCarrierName(name: string): string {
  return (
    name
      .trim()
      .replace(/\s+/g, " ")
      .replace(/(insurance|company|inc|llc|corp|group|mutual|casualty)\b/gi, "")
      .trim()
      .replace(/\s+/g, " ") || name.trim()
  );
}

function extractTopReasons(reasons: string[]): string[] {
  if (reasons.length === 0) return ["No denial data available"];

  // Frequency count
  const freq = new Map<string, number>();
  for (const r of reasons) {
    const key = r.toLowerCase().substring(0, 80);
    freq.set(key, (freq.get(key) || 0) + 1);
  }

  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([reason]) => reason);
}

function analyzeCarrierBehavior(
  carrierName: string,
  approvalRate: number,
  avgDays: number,
  avgRounds: number,
  denialReasons: string[]
): {
  behaviorNotes: string;
  preferredStrategy: string;
  typicalResponse: string;
  keyEvidence: string[];
} {
  const notes: string[] = [];
  const evidence: string[] = [
    "Dated exterior photos with damage documentation",
    "Weather verification report (NOAA-backed)",
  ];

  // Approval rate patterns
  if (approvalRate >= 75) {
    notes.push(`${carrierName} has a strong approval rate (${approvalRate}%).`);
    notes.push("Generally cooperative on well-documented claims.");
  } else if (approvalRate >= 50) {
    notes.push(`${carrierName} has a moderate approval rate (${approvalRate}%).`);
    notes.push("Requires thorough documentation but will approve with proper evidence.");
    evidence.push("Xactimate scope comparison showing missed items");
  } else {
    notes.push(`${carrierName} has a low approval rate (${approvalRate}%).`);
    notes.push("Historically difficult — prepare for multiple supplement rounds.");
    evidence.push("Code compliance documentation (IRC references)");
    evidence.push("Third-party inspection reports");
    evidence.push("Storm graph corroboration data");
  }

  // Speed patterns
  if (avgDays > 60) {
    notes.push(`Average resolution time is slow (${avgDays} days). Plan for delays.`);
  } else if (avgDays > 30) {
    notes.push(`Average resolution in ${avgDays} days — typical timeline.`);
  } else if (avgDays > 0) {
    notes.push(`Resolves quickly (~${avgDays} days). Process efficiently.`);
  }

  // Supplement patterns
  if (avgRounds > 2) {
    notes.push(`Expect ${avgRounds} supplement rounds on average.`);
  }

  // Strategy
  let preferredStrategy = "Standard documentation + professional supplement submission";
  if (approvalRate < 50) {
    preferredStrategy =
      "Front-load with maximum documentation. Include code references, NOAA verification, and collateral evidence upfront. Request field adjuster reinspection if initial denial.";
  } else if (approvalRate < 75) {
    preferredStrategy =
      "Strong initial scope with Xactimate comparison. Include storm graph corroboration data. Follow up within 2 weeks.";
  }

  let typicalResponse = "Standard review process";
  if (denialReasons.some((r) => r.includes("pre-existing") || r.includes("wear"))) {
    typicalResponse =
      "Often cites pre-existing damage or wear/tear — counter with dated photos and storm timeline.";
  } else if (denialReasons.some((r) => r.includes("scope") || r.includes("estimate"))) {
    typicalResponse =
      "Frequently disputes scope — use HOVER measurements and code-backed line items.";
  }

  return {
    behaviorNotes: notes.join(" "),
    preferredStrategy,
    typicalResponse,
    keyEvidence: evidence,
  };
}
