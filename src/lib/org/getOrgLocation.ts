/**
 * Get organization location from TradeProfile or Organization
 * Falls back to Phoenix, AZ if no location is set
 */

import { logger } from "@/lib/logger";

export interface OrgLocation {
  lat: number;
  lng: number;
  city: string;
  state: string;
  postalCode: string;
  source: "tradeProfile" | "organization" | "default";
}

const DEFAULT_LOCATION: OrgLocation = {
  lat: 33.4484,
  lng: -112.074,
  city: "Phoenix",
  state: "AZ",
  postalCode: "85001",
  source: "default",
};

export async function getOrgLocation(orgId: string | null | undefined): Promise<OrgLocation> {
  // 🚑 Guard: bail if no orgId
  if (!orgId) {
    logger.warn("[getOrgLocation] No orgId provided, returning default location");
    return DEFAULT_LOCATION;
  }

  try {
    // TODO: Add location fields to TradeProfile or Organization models
    // For now, always return default Phoenix location
    logger.debug("[getOrgLocation] Using default location for orgId:", orgId);
    return DEFAULT_LOCATION;

    /* FUTURE: When location fields are added to schema
    const contractorProfile = await prisma.tradesCompanyMember.findFirst({
      where: { orgId },
      include: {
        tradeProfile: true,
      },
    });

    if (contractorProfile?.tradeProfile) {
      const tp = contractorProfile.tradeProfile;
      if (tp.lat && tp.lng) {
        return {
          lat: tp.lat,
          lng: tp.lng,
          city: tp.city || DEFAULT_LOCATION.city,
          state: tp.state || DEFAULT_LOCATION.state,
          postalCode: tp.postalCode || DEFAULT_LOCATION.postalCode,
          source: "tradeProfile",
        };
      }
    }
    */
  } catch (error) {
    logger.error("[getOrgLocation] Error fetching location:", error);
    return DEFAULT_LOCATION;
  }
}

/**
 * Get location for current user's org
 * Simplified to just return default for now
 */
export async function getCurrentUserLocation(userId: string): Promise<OrgLocation> {
  logger.debug("[getCurrentUserLocation] Returning default location for userId:", userId);
  return DEFAULT_LOCATION;
}
