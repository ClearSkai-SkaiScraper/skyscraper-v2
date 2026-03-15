// src/lib/simulation/index.ts — Barrel exports
export {
  persistSimulation,
  recordSimulationHistory,
  runClaimSimulation,
} from "./claim-simulation-engine";
export type { CategoryScores, ClaimSimulationResult, EvidenceGap } from "./claim-simulation-engine";
export { analyzeEvidenceGaps } from "./evidence-gap-detector";
export type { EvidenceGapAnalysis, ModelGroupGap } from "./evidence-gap-detector";
