/**
 * Preview Context System
 * Generates virtual data for template previews without creating fake claims
 */

import { currentUser } from "@clerk/nextjs/server";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

interface PreviewOrganization {
  name: string;
  logoUrl: string | null;
  primaryColor: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  email: string;
  license: string;
  website: string;
}

interface PreviewClient {
  name: string;
  email: string;
  phone: string;
  propertyAddress: string;
  city: string;
  state: string;
  zip: string;
}

interface PreviewClaim {
  lossDate: string;
  causeOfLoss: string;
  damageType: string;
  policyNumber: string;
  carrier: string;
  adjusterName: string;
  adjusterEmail: string;
  claimNumber: string;
}

interface PreviewRetailJob {
  jobType: string;
  roofType: string;
  squareFootage: number;
  stories: number;
  yearBuilt: number;
  currentCondition: string;
}

export interface PreviewContext {
  organization: PreviewOrganization;
  client: PreviewClient;
  claim?: PreviewClaim;
  retailJob?: PreviewRetailJob;
  mode: "claim" | "retail";
}

/**
 * Default Skai branding (fallback when user has no org)
 */
const SKAI_DEMO_ORG: PreviewOrganization = {
  name: "Skai Roofing & Restoration",
  logoUrl: null, // Use default logo from public assets
  primaryColor: "#0EA5E9", // Sky blue
  address: "1234 Innovation Drive",
  city: "Phoenix",
  state: "AZ",
  zip: "85001",
  phone: "(602) 555-SKAI",
  email: "info@skairoofing.com",
  license: "ROC 123456",
  website: "www.skairoofing.com",
};

/**
 * Demo client (John Smith) - used in all previews
 */
const DEMO_CLIENT: PreviewClient = {
  name: "John Smith",
  email: "john.smith@email.com",
  phone: "(480) 555-0123",
  propertyAddress: "742 Evergreen Terrace",
  city: "Scottsdale",
  state: "AZ",
  zip: "85251",
};

/**
 * Demo claim data
 */
const DEMO_CLAIM: PreviewClaim = {
  lossDate: "2024-07-15",
  causeOfLoss: "Hail Storm",
  damageType: "Roof Damage - Hail Impact",
  policyNumber: "HO-2024-789456",
  carrier: "American Insurance Co.",
  adjusterName: "Sarah Johnson",
  adjusterEmail: "sjohnson@americanins.com",
  claimNumber: "CLM-2024-123456",
};

/**
 * Demo retail job data
 */
const DEMO_RETAIL_JOB: PreviewRetailJob = {
  jobType: "Full Roof Replacement",
  roofType: "Architectural Shingle",
  squareFootage: 2450,
  stories: 2,
  yearBuilt: 2005,
  currentCondition: "Fair - Normal Wear",
};

/**
 * Get preview context for template rendering
 * - If user has org → use real branding
 * - If no org → fallback to Skai demo branding
 * - Client = always John Smith (demo)
 * - Claim/Job = always demo data
 */
export async function getPreviewContext(
  mode: "claim" | "retail" = "claim"
): Promise<PreviewContext> {
  let organization: PreviewOrganization = SKAI_DEMO_ORG;

  try {
    // Try to get current user and their org
    const user = await currentUser();

    if (user) {
      const dbUser = await prisma.users.findFirst({
        where: { clerkUserId: user.id },
        select: {
          orgId: true,
        },
      });

      if (dbUser?.orgId) {
        const org = await prisma.org.findUnique({
          where: { id: dbUser.orgId },
          select: { name: true, brandLogoUrl: true },
        });

        if (org) {
          organization = {
            ...SKAI_DEMO_ORG,
            name: org.name,
            logoUrl: org.brandLogoUrl ?? SKAI_DEMO_ORG.logoUrl,
          };
        }
      }
    }
  } catch (error) {
    logger.error("[PREVIEW_CONTEXT] Error fetching user org:", error);
    // Fall through to use demo branding
  }

  // Build context based on mode
  const context: PreviewContext = {
    organization,
    client: DEMO_CLIENT,
    mode,
  };

  if (mode === "claim") {
    context.claim = DEMO_CLAIM;
  } else {
    context.retailJob = DEMO_RETAIL_JOB;
  }

  return context;
}

/**
 * Get preview context WITHOUT auth (for public marketplace)
 * Always uses Skai demo branding
 */
export function getPublicPreviewContext(mode: "claim" | "retail" = "claim"): PreviewContext {
  const context: PreviewContext = {
    organization: SKAI_DEMO_ORG,
    client: DEMO_CLIENT,
    mode,
  };

  if (mode === "claim") {
    context.claim = DEMO_CLAIM;
  } else {
    context.retailJob = DEMO_RETAIL_JOB;
  }

  return context;
}
