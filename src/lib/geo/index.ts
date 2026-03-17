/**
 * Geographic Utilities — Barrel Export
 */
export type {
  GeoPoint,
  NearbyClaimResult,
  NearbyImpactResult,
  NearbyPropertyResult,
} from "./queries";
export {
  boundingBox,
  findNearbyClaims,
  findNearbyImpacts,
  findNearbyProperties,
  getClaimLocation,
  haversineDistance,
} from "./queries";
