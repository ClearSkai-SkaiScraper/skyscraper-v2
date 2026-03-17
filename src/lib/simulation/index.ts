// src/lib/simulation/index.ts — Barrel exports
export type {
  ClaimSimulationResult,
  SimulationFactor,
  SimulationRecommendation,
  StormGraphBonus,
} from "./claim-simulation-engine";
export { recordSimulationHistory, runClaimSimulation } from "./claim-simulation-engine";
export type { EvidenceGap, EvidenceGapAnalysis } from "./evidence-gap-detector";
export { analyzeEvidenceGaps } from "./evidence-gap-detector";
