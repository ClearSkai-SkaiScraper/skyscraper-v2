/**
 * ClaimIQ™ — Module Exports
 *
 * Clean barrel file for all ClaimIQ engine modules.
 */

// Core engine
export { assessClaimReadiness, predictScoreImpacts } from "./assembly-engine";
export type {
  ClaimIQReadiness,
  ScoreImpactItem,
  SectionReadiness,
  SectionStatus,
} from "./assembly-engine";

// Autopilot
export { buildAutopilotPlan, executeAutopilotAction } from "./autopilot";
export type {
  AutopilotAction,
  AutopilotPlan,
  AutopilotResolution,
  AutopilotResult,
} from "./autopilot";

// Readiness hooks
export {
  getRecentReadinessEvents,
  onClaimDataChanged,
  onClaimUpdated,
  onContactUpdated,
  onDocumentUploaded,
  onEstimateAdded,
  onPhotosAnalyzed,
  onPhotosUploaded,
  onSectionGenerated,
  onWeatherVerified,
} from "./readiness-hooks";
export type { ReadinessChangeEvent, ReadinessChangeType } from "./readiness-hooks";

// Analytics
export { computeReadinessAnalytics } from "./analytics";
export type { ReadinessAnalytics } from "./analytics";
