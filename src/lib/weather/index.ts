/**
 * Weather Intelligence Module
 *
 * Central export for all weather-related utilities:
 * - Storm Evidence Adapter
 * - DOL Scoring & Recommendation
 * - Photo-Weather Correlation
 * - Storm Detection Notifications
 * - Carrier Packet Attachments
 */

// Core evidence adapter
export {
  createStormEvidence,
  getStormEvidence,
  type PhotoWeatherMatch,
  type StormEvidence,
  type TopWeatherEvent,
  updatePhotoCorrelations,
} from "./getStormEvidence";

// DOL scoring and recommendations
export { analyzeDOL, type DOLRecommendation,validateClaimDOL } from "./dolRecommendation";

// Photo-weather correlation
export {
  correlateClaimPhotos,
  type CorrelationResult,
  type PhotoCorrelationReport,
} from "./photoCorrelation";

// Storm detection and notifications
export {
  type AffectedProperty,
  type DetectedStorm,
  detectStormsNearProperties,
  notifyDOLVerificationNeeded,
  notifyPhotoWeatherMismatch,
  notifyWeatherEvidenceReady,
  sendStormEndedNotification,
  sendStormNotifications,
  type StormDetectionConfig,
} from "./stormDetectionService";

// Carrier packet attachment rules
export {
  type AttachmentResult,
  type AttachmentRule,
  getCarrierPacketAttachments,
  getCarrierSpecificAttachments,
  getDamageReportAttachments,
  getSupplementAttachments,
  type WeatherAttachment,
} from "./attachmentRules";

// Base scoring utilities
export { pickQuickDOL, scoreEventsForProperty } from "./score";

// Geo utilities
export { bearingDeg, cardinal, geomCentroid, haversineMiles } from "./geo";
