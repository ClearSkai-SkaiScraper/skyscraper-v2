import {
  claims as ClaimModel,
  contacts as ContactModel,
  properties as PropertyModel,
} from "@prisma/client";

import prisma from "@/lib/prisma";

// --- 1. COMPATIBILITY TYPE DEFINITION ---

/**
 * The `ClaimCompat` type is a compatibility layer that translates the current
 * Prisma schema into the shape expected by the legacy Claims UI components.
 *
 * It manually maps fields from the `claims`, `properties`, and `contacts`
 * models to the old field names that the UI still uses (e.g., `insured_name`).
 * This avoids having to rewrite the entire UI at once.
 *
 * - `insured_name` is derived from the associated property's contact.
 * - `homeownerEmail` and `homeownerPhone` also come from the property's contact.
 * - `policyNumber` and `carrier` come from the property record.
 * - `coverPhotoUrl` is hardcoded to null as the old `claim_uploads` table is gone.
 *
 * This type should be used by all Claims pages and components.
 */
export type ClaimCompat = ClaimModel & {
  insured_name: string;
  homeownerEmail: string | null;
  homeownerPhone: string | null;
  policyNumber: string | null;
  carrier: string | null;
  coverPhotoUrl: string | null;
  propertyAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };
};

// --- 2. PRISMA SELECTORS ---

/**
 * `claimSelectLite` includes the minimal set of relations needed for the
 * main claims list view. It fetches the `properties` and its related `contacts`
 * to build the `ClaimCompat` type.
 */
export const claimSelectLite = {
  include: {
    properties: {
      include: {
        contacts: true,
      },
    },
  },
};

/**
 * `claimSelectForWorkspace` is a more comprehensive selector for the main
 * claim workspace view, including additional relations.
 *
 * NOTE: This currently mirrors `claimSelectLite` but can be expanded as
 * more relations are safely added back.
 */
export const claimSelectForWorkspace = claimSelectLite;

// --- 3. DATA TRANSFORMATION LOGIC ---

type ClaimWithRelations = ClaimModel & {
  properties: PropertyModel & {
    contacts: ContactModel;
  };
};

/**
 * `toClaimCompat` is the core mapping function. It takes a claim object
 * fetched with the required relations and transforms it into the `ClaimCompat`
 * shape that the UI expects.
 *
 * @param claim - The claim object from Prisma.
 * @returns A `ClaimCompat` object.
 */
export function toClaimCompat(claim: ClaimWithRelations): ClaimCompat {
  const { properties, ...restOfClaim } = claim;
  const contact = properties.contacts;

  const insured_name = `${contact.firstName} ${contact.lastName}`;

  return {
    ...restOfClaim,
    insured_name,
    homeownerEmail: contact.email,
    homeownerPhone: contact.phone,
    policyNumber: properties.policyNumber,
    carrier: properties.carrier,
    coverPhotoUrl: null, // Hardcoded as legacy `claim_uploads` is gone
    propertyAddress: {
      street: properties.street,
      city: properties.city,
      state: properties.state,
      zipCode: properties.zipCode,
    },
  };
}

// --- 4. DATA ACCESS FUNCTIONS ---

/**
 * Fetches a single claim by its ID and transforms it into a `ClaimCompat` object.
 * This should be the primary way to load a claim for any UI view.
 *
 * @param claimId - The ID of the claim to fetch.
 * @returns A `ClaimCompat` object or `null` if not found.
 */
export async function getClaimCompatById({
  claimId,
  orgId,
}: {
  claimId: string;
  orgId: string;
}): Promise<ClaimCompat | null> {
  const claim = await prisma.claims.findFirst({
    where: { id: claimId, orgId },
    ...claimSelectForWorkspace,
  });

  if (!claim) {
    return null;
  }

  return toClaimCompat(claim as ClaimWithRelations);
}

/**
 * Fetches all claims for a given organization and transforms them into an
 * array of `ClaimCompat` objects.
 *
 * @param orgId - The ID of the organization.
 * @returns An array of `ClaimCompat` objects.
 */
export async function getClaimsCompatByOrgId(orgId: string): Promise<ClaimCompat[]> {
  const claims = await prisma.claims.findMany({
    where: { orgId },
    ...claimSelectLite,
    orderBy: {
      createdAt: "desc",
    },
  });

  return claims.map((claim) => toClaimCompat(claim as ClaimWithRelations));
}
