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
  updatePhotoCorrelations,
  type PhotoWeatherMatch,
  type StormEvidence,
  type TopWeatherEvent,
} from "./getStormEvidence";

// DOL scoring and recommendations
export { analyzeDOL, validateClaimDOL, type DOLRecommendation } from "./dolRecommendation";

// Photo-weather correlation
export {
  correlateClaimPhotos,
  type CorrelationResult,
  type PhotoCorrelationReport,
} from "./photoCorrelation";

// Storm detection and notifications
export {
  detectStormsNearProperties,
  notifyDOLVerificationNeeded,
  notifyPhotoWeatherMismatch,
  notifyWeatherEvidenceReady,
  sendStormEndedNotification,
  sendStormNotifications,
  type AffectedProperty,
  type DetectedStorm,
  type StormDetectionConfig,
} from "./stormDetectionService";

// Carrier packet attachment rules
export {
  getCarrierPacketAttachments,
  getCarrierSpecificAttachments,
  getDamageReportAttachments,
  getSupplementAttachments,
  type AttachmentResult,
  type AttachmentRule,
  type WeatherAttachment,
} from "./attachmentRules";

// Base scoring utilities
export { pickQuickDOL, scoreEventsForProperty } from "./score";

// Geo utilities
export { bearingDeg, cardinal, geomCentroid, haversineMiles } from "./geo";
