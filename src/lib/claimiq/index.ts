/**
 * ClaimIQ™ — Module Exports
 *
 * Clean barrel file for all ClaimIQ engine modules.
 */

// Core engine
export type {
  ClaimIQReadiness,
  ScoreImpactItem,
  SectionReadiness,
  SectionStatus,
} from "./assembly-engine";
export { assessClaimReadiness, predictScoreImpacts } from "./assembly-engine";

// Autopilot
export type {
  AutopilotAction,
  AutopilotPlan,
  AutopilotResolution,
  AutopilotResult,
} from "./autopilot";
export { buildAutopilotPlan, executeAutopilotAction } from "./autopilot";

// Readiness hooks
export type { ReadinessChangeEvent, ReadinessChangeType } from "./readiness-hooks";
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

// Analytics
export type { ReadinessAnalytics } from "./analytics";
export { computeReadinessAnalytics } from "./analytics";
