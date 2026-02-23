/**
 * User Adapter
 * Converts Prisma user models → Domain camelCase DTOs
 */

import type { Org, users } from "@prisma/client";

// =============================================================================
// Domain DTOs
// =============================================================================

export interface UserDTO {
  id: string;
  clerkUserId: string;
  email: string;
  name?: string;
  role: string;
  orgId: string;
  createdAt: Date;
  lastSeenAt: Date;
  headshotUrl?: string;

  // Relations (optional)
  org?: OrgDTO;
}

export interface OrgDTO {
  id: string;
  name: string;
  slug?: string;
  logoUrl?: string;
  primaryColor?: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  planId?: string;
  pricingTier?: string;
  aiCredits: number;
  aiCreditsUsed: number;
  stripeCustomerId?: string;
  trialEndsAt?: Date;
  demoMode: boolean;
  createdAt: Date;
  updatedAt: Date;

  // Computed
  isTrialing: boolean;
}

// =============================================================================
// Adapter Functions
// =============================================================================

type UserRow = users & {
  Org?: Org | null;
};

/** Fields that may be present on Org rows from extended queries (e.g. org_branding join) */
interface OrgExtendedFields {
  slug: string | null;
  logoUrl: string | null;
  primaryColor: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  pricingTier: string | null;
  aiCredits: number;
  aiCreditsUsed: number;
}

/**
 * Convert a raw Prisma users row to DTO
 */
export function adaptUser(row: UserRow): UserDTO {
  return {
    id: row.id,
    clerkUserId: row.clerkUserId,
    email: row.email,
    name: row.name ?? undefined,
    role: row.role,
    orgId: row.orgId,
    createdAt: row.createdAt,
    lastSeenAt: row.lastSeenAt,
    headshotUrl: row.headshot_url ?? undefined,

    // Relations
    org: row.Org ? adaptOrg(row.Org) : undefined,
  };
}

/**
 * Convert a raw Prisma Org row to DTO
 */
export function adaptOrg(row: Org): OrgDTO {
  const r = row as Org & Partial<OrgExtendedFields>;
  const aiCredits = r.aiCredits ?? 0;
  const aiCreditsUsed = r.aiCreditsUsed ?? 0;
  const trialEndsAt = r.trialEndsAt ?? undefined;

  return {
    id: r.id,
    name: r.name,
    slug: r.slug ?? undefined,
    logoUrl: r.logoUrl ?? undefined,
    primaryColor: r.primaryColor ?? undefined,
    email: r.email ?? undefined,
    phone: r.phone ?? undefined,
    website: r.website ?? undefined,
    address: r.address ?? undefined,
    city: r.city ?? undefined,
    state: r.state ?? undefined,
    zipCode: r.zipCode ?? undefined,
    planId: r.planId ?? undefined,
    pricingTier: r.pricingTier ?? undefined,
    aiCredits,
    aiCreditsUsed,
    stripeCustomerId: r.stripeCustomerId ?? undefined,
    trialEndsAt,
    demoMode: r.demoMode ?? false,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,

    // Computed
    isTrialing: trialEndsAt ? new Date(trialEndsAt) > new Date() : false,
  };
}

/**
 * Adapt multiple users
 */
export function adaptUsers(rows: UserRow[]): UserDTO[] {
  return rows.map(adaptUser);
}

/**
 * Adapt multiple orgs
 */
export function adaptOrgs(rows: Org[]): OrgDTO[] {
  return rows.map(adaptOrg);
}
