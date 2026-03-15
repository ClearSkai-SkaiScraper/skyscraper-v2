/**
 * Geographic Utilities — Barrel Export
 */
export {
  boundingBox,
  findNearbyClaims,
  findNearbyImpacts,
  findNearbyProperties,
  getClaimLocation,
  haversineDistance,
} from "./queries";
export type {
  GeoPoint,
  NearbyClaimResult,
  NearbyImpactResult,
  NearbyPropertyResult,
} from "./queries";
