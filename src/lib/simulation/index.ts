// src/lib/simulation/index.ts — Barrel exports
export { recordSimulationHistory, runClaimSimulation } from "./claim-simulation-engine";
export type {
  ClaimSimulationResult,
  SimulationFactor,
  SimulationRecommendation,
  StormGraphBonus,
} from "./claim-simulation-engine";
export { analyzeEvidenceGaps } from "./evidence-gap-detector";
export type { EvidenceGap, EvidenceGapAnalysis } from "./evidence-gap-detector";
