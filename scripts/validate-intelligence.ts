#!/usr/bin/env npx tsx
/**
 * Intelligence Layer — Validation Harness
 *
 * Runs every engine against a set of claim IDs and produces a structured
 * validation report showing scores, labels, and whether thresholds "feel right."
 *
 * Usage:
 *   npx tsx scripts/validate-intelligence.ts                   # uses golden demo claims
 *   npx tsx scripts/validate-intelligence.ts <claimId1> <claimId2>  # uses specific claims
 *   REPORT_FILE=out.json npx tsx scripts/validate-intelligence.ts   # write JSON report
 *
 * Exit codes:
 *   0 — all engines ran, no config drift
 *   1 — one or more engines failed OR tuning-config validation failed
 */

import { PrismaClient } from "@prisma/client";
import {
  INTELLIGENCE_LABELS,
  PACKET_SCORE_CONFIG,
  SIMULATION_CONFIG,
  validateTuningConfig,
} from "../src/lib/intelligence/tuning-config";

const prisma = new PrismaClient();

// ─── Types ───────────────────────────────────────────────────────────────────

interface EngineResult {
  engine: string;
  status: "pass" | "warn" | "fail";
  durationMs: number;
  output: Record<string, unknown>;
  notes: string[];
}

interface ClaimValidation {
  claimId: string;
  claimNumber: string;
  damageType: string;
  carrier: string | null;
  isDemo: boolean;
  engines: EngineResult[];
  overallStatus: "pass" | "warn" | "fail";
}

interface ValidationReport {
  timestamp: string;
  configVersion: string;
  configErrors: string[];
  labelAudit: Record<string, string>;
  claims: ClaimValidation[];
  summary: {
    totalClaims: number;
    pass: number;
    warn: number;
    fail: number;
    engineCoverage: Record<string, { ran: number; passed: number }>;
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function timedRun<T>(fn: () => Promise<T>): Promise<{ result: T; ms: number }> {
  const t0 = performance.now();
  return fn().then((result) => ({ result, ms: Math.round(performance.now() - t0) }));
}

function classifyOutcome(score: number): string {
  if (score >= SIMULATION_CONFIG.outcomes.approvedMin) return "approved";
  if (score >= SIMULATION_CONFIG.outcomes.partialMin) return "partial";
  return "denied";
}

function gradePacketScore(score: number): string {
  if (score >= PACKET_SCORE_CONFIG.grades.A) return "A";
  if (score >= PACKET_SCORE_CONFIG.grades.B) return "B";
  if (score >= PACKET_SCORE_CONFIG.grades.C) return "C";
  if (score >= PACKET_SCORE_CONFIG.grades.D) return "D";
  return "F";
}

// ─── Engine Runners ──────────────────────────────────────────────────────────

async function validateSimulation(claimId: string, orgId: string): Promise<EngineResult> {
  const notes: string[] = [];
  try {
    const { runClaimSimulation } = await import("../src/lib/simulation/claim-simulation-engine");
    const { result, ms } = await timedRun(() => runClaimSimulation(claimId, orgId));

    const outcome = classifyOutcome(result.approvalProbability);
    notes.push(
      `Score: ${result.approvalProbability}, Outcome: ${outcome} (${INTELLIGENCE_LABELS.outcomes[outcome] ?? outcome})`
    );
    notes.push(`Confidence: ${result.confidenceLevel}`);
    notes.push(
      `Positive factors: ${result.positiveFactors.length}, Negative: ${result.negativeFactors.length}`
    );
    notes.push(`Recommendations: ${result.recommendations.length}`);

    if (result.approvalProbability === 0)
      notes.push("⚠️  Score is 0 — engine may not have evidence to work with");
    const scoreValues = Object.values(result.scores);
    if (scoreValues.every((s) => s === 0))
      notes.push("⚠️  All category scores are 0 — no evidence loaded?");

    const status = result.approvalProbability === 0 ? "warn" : "pass";

    return {
      engine: "simulation",
      status,
      durationMs: ms,
      output: {
        approvalProbability: result.approvalProbability,
        predictedOutcome: outcome,
        confidenceLevel: result.confidenceLevel,
        categoryCount: scoreValues.length,
        positiveFactors: result.positiveFactors.length,
        negativeFactors: result.negativeFactors.length,
        recommendations: result.recommendations.length,
      },
      notes,
    };
  } catch (err) {
    notes.push(`❌ ${(err as Error).message}`);
    return { engine: "simulation", status: "fail", durationMs: 0, output: {}, notes };
  }
}

async function validateEvidenceGaps(claimId: string, orgId: string): Promise<EngineResult> {
  const notes: string[] = [];
  try {
    const { analyzeEvidenceGaps } = await import("../src/lib/simulation/evidence-gap-detector");
    const { result, ms } = await timedRun(() => analyzeEvidenceGaps(claimId, orgId));

    notes.push(`Coverage: ${result.coveragePercent}%`);
    notes.push(`Critical gaps: ${result.gaps.filter((g) => g.priority === "high").length}`);
    notes.push(`Total gaps: ${result.gaps.length}`);

    const status = result.coveragePercent === 0 ? "warn" : "pass";
    return {
      engine: "evidence-gaps",
      status,
      durationMs: ms,
      output: {
        coveragePercent: result.coveragePercent,
        gapCount: result.gaps.length,
        highPriority: result.gaps.filter((g) => g.priority === "high").length,
        medPriority: result.gaps.filter((g) => g.priority === "medium").length,
      },
      notes,
    };
  } catch (err) {
    notes.push(`❌ ${(err as Error).message}`);
    return { engine: "evidence-gaps", status: "fail", durationMs: 0, output: {}, notes };
  }
}

async function validateStormGraph(claimId: string, orgId: string): Promise<EngineResult> {
  const notes: string[] = [];
  try {
    const { buildStormGraph } = await import("../src/lib/storm-graph/storm-graph-engine");
    const { result, ms } = await timedRun(() => buildStormGraph(claimId, orgId));

    notes.push(`Clusters: ${result.stormClusters.length}`);
    notes.push(
      `Corroboration: ${result.corroborationScore}% (nearby verified: ${result.nearbyVerifiedDamage})`
    );
    notes.push(`Timeline entries: ${result.timeline.length}`);
    notes.push(`Density: ${result.geographicDensity.radiusMile5} claims within 5mi`);

    return {
      engine: "storm-graph",
      status: "pass",
      durationMs: ms,
      output: {
        clusterCount: result.stormClusters.length,
        corroborationScore: result.corroborationScore,
        nearbyVerifiedDamage: result.nearbyVerifiedDamage,
        timelineEntries: result.timeline.length,
        nearbyClaims: result.geographicDensity.radiusMile5,
      },
      notes,
    };
  } catch (err) {
    notes.push(`❌ ${(err as Error).message}`);
    return { engine: "storm-graph", status: "fail", durationMs: 0, output: {}, notes };
  }
}

async function validateCarrierPlaybook(orgId: string): Promise<EngineResult> {
  const notes: string[] = [];
  try {
    const { buildCarrierPlaybooks } = await import("../src/lib/carrier/playbook-engine");
    const { result, ms } = await timedRun(() => buildCarrierPlaybooks(orgId));

    notes.push(`Carriers analyzed: ${result.totalCarriers}`);
    for (const pb of result.playbooks.slice(0, 3)) {
      notes.push(
        `  → ${pb.carrierName}: ${pb.approvalRate?.toFixed(0) ?? "?"}% approval, ${pb.totalClaims} claims`
      );
    }

    return {
      engine: "carrier-playbook",
      status: result.playbooks.length > 0 ? "pass" : "warn",
      durationMs: ms,
      output: {
        carrierCount: result.totalCarriers,
        overallApprovalRate: result.overallApprovalRate,
      },
      notes,
    };
  } catch (err) {
    notes.push(`❌ ${(err as Error).message}`);
    return { engine: "carrier-playbook", status: "fail", durationMs: 0, output: {}, notes };
  }
}

async function validateStormAlerts(orgId: string): Promise<EngineResult> {
  const notes: string[] = [];
  try {
    const { checkForNewStormAlerts } = await import("../src/lib/storm-alerts/storm-alert-engine");
    const { result, ms } = await timedRun(() => checkForNewStormAlerts(orgId));

    notes.push(`Alerts generated: ${result.alerts.length}`);
    notes.push(`Affected properties: ${result.affectedProperties}`);
    if (result.alerts.length > 0) {
      const critical = result.alerts.filter((a) => a.alertLevel === "critical").length;
      const warning = result.alerts.filter((a) => a.alertLevel === "warning").length;
      notes.push(`  Critical: ${critical}, Warning: ${warning}`);
    }

    return {
      engine: "storm-alerts",
      status: "pass",
      durationMs: ms,
      output: {
        alertCount: result.alerts.length,
        affectedProperties: result.affectedProperties,
      },
      notes,
    };
  } catch (err) {
    notes.push(`❌ ${(err as Error).message}`);
    return { engine: "storm-alerts", status: "fail", durationMs: 0, output: {}, notes };
  }
}

// ─── Tuning Config Validation ────────────────────────────────────────────────

function auditConfig(): { errors: string[]; labelAudit: Record<string, string> } {
  const errors = validateTuningConfig();

  // Audit that all user-facing labels are non-empty
  const labelAudit: Record<string, string> = {
    simulationTitle: INTELLIGENCE_LABELS.simulationTitle,
    packetScoreTitle: INTELLIGENCE_LABELS.packetScoreTitle,
    stormGraphTitle: INTELLIGENCE_LABELS.stormGraphTitle,
    carrierTitle: INTELLIGENCE_LABELS.carrierTitle,
    alertTitle: INTELLIGENCE_LABELS.alertTitle,
    "outcome.approved": INTELLIGENCE_LABELS.outcomes.approved ?? "⚠️ MISSING",
    "outcome.partial": INTELLIGENCE_LABELS.outcomes.partial ?? "⚠️ MISSING",
    "outcome.denied": INTELLIGENCE_LABELS.outcomes.denied ?? "⚠️ MISSING",
    approvalProbability: INTELLIGENCE_LABELS.approvalProbability,
    predictedOutcome: INTELLIGENCE_LABELS.predictedOutcome,
  };

  for (const [key, val] of Object.entries(labelAudit)) {
    if (!val || val.startsWith("⚠️")) {
      errors.push(`Label "${key}" is empty or missing`);
    }
  }

  // Warn on predictive language
  const predictive = /\b(predict|likely|will|guarantee|approval|denied)\b/i;
  for (const [key, val] of Object.entries(labelAudit)) {
    if (predictive.test(val)) {
      errors.push(`Label "${key}" contains potentially predictive language: "${val}"`);
    }
  }

  return { errors, labelAudit };
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n╔═══════════════════════════════════════════════════════════╗");
  console.log("║     SkaiScraper Intelligence — Validation Harness       ║");
  console.log("╚═══════════════════════════════════════════════════════════╝\n");

  // Step 1 — Validate tuning config
  console.log("━━━ Step 1: Tuning Config Validation ━━━━━━━━━━━━━━━━━━━━━");
  const { errors: configErrors, labelAudit } = auditConfig();
  if (configErrors.length === 0) {
    console.log("  ✅ All weights sum correctly");
    console.log("  ✅ All thresholds properly ordered");
    console.log("  ✅ All labels present and non-predictive");
  } else {
    for (const err of configErrors) console.log(`  ❌ ${err}`);
  }
  console.log();

  // Step 2 — Resolve claim IDs
  const argClaimIds = process.argv.slice(2);
  let claims: Array<{
    id: string;
    orgId: string;
    claimNumber: string;
    damageType: string;
    carrier: string | null;
    isDemo: boolean;
  }>;

  if (argClaimIds.length > 0) {
    claims = await prisma.claims.findMany({
      where: { id: { in: argClaimIds } },
      select: {
        id: true,
        orgId: true,
        claimNumber: true,
        damageType: true,
        carrier: true,
        isDemo: true,
      },
    });
    console.log(`━━━ Step 2: Running against ${claims.length} specified claims ━━━━━━━━`);
  } else {
    // Default: grab demo claims, or last 5 claims across all orgs
    claims = await prisma.claims.findMany({
      where: { isDemo: true },
      select: {
        id: true,
        orgId: true,
        claimNumber: true,
        damageType: true,
        carrier: true,
        isDemo: true,
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    });
    if (claims.length === 0) {
      claims = await prisma.claims.findMany({
        select: {
          id: true,
          orgId: true,
          claimNumber: true,
          damageType: true,
          carrier: true,
          isDemo: true,
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      });
    }
    console.log(`━━━ Step 2: Found ${claims.length} claims (demo-first) ━━━━━━━━━━━`);
  }

  if (claims.length === 0) {
    console.log("  ⚠️  No claims found — run seed-intelligence-demo.ts first");
    process.exit(1);
  }

  for (const c of claims) {
    console.log(
      `  ${c.claimNumber} | ${c.damageType} | carrier: ${c.carrier ?? "—"} | demo: ${c.isDemo}`
    );
  }
  console.log();

  // Step 3 — Run engines per claim
  const validations: ClaimValidation[] = [];
  const orgPlaybookRun = new Set<string>();

  for (const claim of claims) {
    console.log(`━━━ Validating: ${claim.claimNumber} ━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    const engines: EngineResult[] = [];

    // Per-claim engines
    const simResult = await validateSimulation(claim.id, claim.orgId);
    engines.push(simResult);
    console.log(
      `  Simulation:     ${simResult.status.toUpperCase().padEnd(4)} (${simResult.durationMs}ms)`
    );

    const gapResult = await validateEvidenceGaps(claim.id, claim.orgId);
    engines.push(gapResult);
    console.log(
      `  Evidence Gaps:  ${gapResult.status.toUpperCase().padEnd(4)} (${gapResult.durationMs}ms)`
    );

    const sgResult = await validateStormGraph(claim.id, claim.orgId);
    engines.push(sgResult);
    console.log(
      `  Storm Graph:    ${sgResult.status.toUpperCase().padEnd(4)} (${sgResult.durationMs}ms)`
    );

    // Per-org engines (only run once per org)
    if (!orgPlaybookRun.has(claim.orgId)) {
      orgPlaybookRun.add(claim.orgId);
      const pbResult = await validateCarrierPlaybook(claim.orgId);
      engines.push(pbResult);
      console.log(
        `  Carrier PB:     ${pbResult.status.toUpperCase().padEnd(4)} (${pbResult.durationMs}ms)`
      );

      const alertResult = await validateStormAlerts(claim.orgId);
      engines.push(alertResult);
      console.log(
        `  Storm Alerts:   ${alertResult.status.toUpperCase().padEnd(4)} (${alertResult.durationMs}ms)`
      );
    }

    const overallStatus = engines.some((e) => e.status === "fail")
      ? "fail"
      : engines.some((e) => e.status === "warn")
        ? "warn"
        : "pass";

    validations.push({
      claimId: claim.id,
      claimNumber: claim.claimNumber,
      damageType: claim.damageType,
      carrier: claim.carrier,
      isDemo: claim.isDemo,
      engines,
      overallStatus,
    });
    console.log();
  }

  // Step 4 — Build summary
  const engineNames = [
    "simulation",
    "evidence-gaps",
    "storm-graph",
    "carrier-playbook",
    "storm-alerts",
  ];
  const engineCoverage: Record<string, { ran: number; passed: number }> = {};
  for (const name of engineNames) {
    const ran = validations.flatMap((v) => v.engines).filter((e) => e.engine === name).length;
    const passed = validations
      .flatMap((v) => v.engines)
      .filter((e) => e.engine === name && e.status === "pass").length;
    engineCoverage[name] = { ran, passed };
  }

  const report: ValidationReport = {
    timestamp: new Date().toISOString(),
    configVersion: SIMULATION_CONFIG.version,
    configErrors,
    labelAudit,
    claims: validations,
    summary: {
      totalClaims: validations.length,
      pass: validations.filter((v) => v.overallStatus === "pass").length,
      warn: validations.filter((v) => v.overallStatus === "warn").length,
      fail: validations.filter((v) => v.overallStatus === "fail").length,
      engineCoverage,
    },
  };

  // Step 5 — Print summary
  console.log("╔═══════════════════════════════════════════════════════════╗");
  console.log("║               Validation Summary                        ║");
  console.log("╠═══════════════════════════════════════════════════════════╣");
  console.log(`║  Claims tested:  ${String(report.summary.totalClaims).padEnd(39)}║`);
  console.log(`║  ✅ Pass:        ${String(report.summary.pass).padEnd(39)}║`);
  console.log(`║  ⚠️  Warn:        ${String(report.summary.warn).padEnd(39)}║`);
  console.log(`║  ❌ Fail:        ${String(report.summary.fail).padEnd(39)}║`);
  console.log("╠═══════════════════════════════════════════════════════════╣");
  for (const [engine, stats] of Object.entries(engineCoverage)) {
    const bar = `${engine.padEnd(20)} ${stats.passed}/${stats.ran} passed`;
    console.log(`║  ${bar.padEnd(55)}║`);
  }
  console.log("╠═══════════════════════════════════════════════════════════╣");
  console.log(`║  Config errors:  ${String(configErrors.length).padEnd(39)}║`);
  console.log("╚═══════════════════════════════════════════════════════════╝\n");

  // Notes per claim
  for (const v of validations) {
    console.log(`── ${v.claimNumber} (${v.overallStatus.toUpperCase()}) ──`);
    for (const e of v.engines) {
      for (const note of e.notes) {
        console.log(`   [${e.engine}] ${note}`);
      }
    }
    console.log();
  }

  // Step 6 — Write JSON report if requested
  if (process.env.REPORT_FILE) {
    const fs = await import("fs/promises");
    await fs.writeFile(process.env.REPORT_FILE, JSON.stringify(report, null, 2));
    console.log(`📄 Report written to ${process.env.REPORT_FILE}`);
  }

  // Exit code
  const hasFailure = configErrors.length > 0 || report.summary.fail > 0;
  await prisma.$disconnect();
  process.exit(hasFailure ? 1 : 0);
}

main().catch(async (e) => {
  console.error("Fatal error:", e);
  await prisma.$disconnect();
  process.exit(1);
});
