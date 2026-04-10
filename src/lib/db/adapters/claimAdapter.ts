/**
 * Claim Adapter
 * Converts Prisma snake_case → Domain camelCase DTOs
 *
 * RULE: React pages, AI engines, PDF builders NEVER receive raw Prisma rows.
 * Everything past the API layer consumes DTOs from this adapter.
 */

import type { claim_supplements, claims, contacts, properties } from "@prisma/client";

// =============================================================================
// Domain DTOs
// =============================================================================

export interface ClaimDTO {
  id: string;
  orgId: string;
  isDemo: boolean;
  propertyId: string;
  projectId?: string;
  claimNumber: string;
  title: string;
  description?: string;
  damageType: string;
  dateOfLoss: Date;
  carrier?: string;
  adjusterName?: string;
  adjusterPhone?: string;
  adjusterEmail?: string;
  status: string;
  priority: string;
  estimatedValue?: number;
  approvedValue?: number;
  deductible?: number;
  assignedTo?: string;
  createdAt: Date;
  updatedAt: Date;

  // Snake_case → camelCase conversions
  exposureCents?: number;
  insured_name?: string;
  lifecycleStage?: string;
  policyNumber?: string;
  adjusterPacketSentAt?: Date;
  homeownerEmail?: string;
  homeownerSummarySentAt?: Date;
  lastContactedAt?: Date;
  catStormEventId?: string;
  clientId?: string;
  archivedAt?: Date;

  // Relations (optional, populated when included)
  property?: PropertyDTO;
  contact?: ContactDTO;
  supplements?: SupplementDTO[];
}

export interface PropertyDTO {
  id: string;
  orgId: string;
  isDemo: boolean;
  contactId: string;
  name: string;
  propertyType: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  yearBuilt?: number;
  squareFootage?: number;
  roofType?: string;
  roofAge?: number;
  carrier?: string;
  policyNumber?: string;
  createdAt: Date;
  updatedAt: Date;

  // Computed
  fullAddress: string;
}

export interface ContactDTO {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  fullName: string;
}

export interface SupplementDTO {
  id: string;
  claimId: string;
  status: string;
  totalCents: number;
  data: Record<string, unknown>;
  submittedAt?: Date;
  reviewedAt?: Date;
  reviewNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// =============================================================================
// Adapter Functions
// =============================================================================

type ClaimRow = claims & {
  properties?: properties | null;
  contacts?: contacts | null;
  claim_supplements?: claim_supplements[];
};

/**
 * Convert a raw Prisma claims row to a ClaimDTO
 */
export function adaptClaim(row: ClaimRow): ClaimDTO {
  return {
    // Direct mappings
    id: row.id,
    orgId: row.orgId,
    isDemo: row.isDemo,
    propertyId: row.propertyId,
    projectId: row.projectId ?? undefined,
    claimNumber: row.claimNumber,
    title: row.title,
    description: row.description ?? undefined,
    damageType: row.damageType,
    dateOfLoss: row.dateOfLoss,
    carrier: row.carrier ?? undefined,
    adjusterName: row.adjusterName ?? undefined,
    adjusterPhone: row.adjusterPhone ?? undefined,
    adjusterEmail: row.adjusterEmail ?? undefined,
    status: row.status,
    priority: row.priority,
    estimatedValue: row.estimatedValue ?? undefined,
    approvedValue: row.approvedValue ?? undefined,
    deductible: row.deductible ?? undefined,
    assignedTo: row.assignedTo ?? undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,

    // Snake_case → camelCase
    exposureCents: row.exposure_cents ?? undefined,
    insured_name: row.insured_name ?? undefined,
    lifecycleStage: row.lifecycle_stage ?? undefined,
    policyNumber: row.policy_number ?? undefined,
    adjusterPacketSentAt: row.adjuster_packet_sent_at ?? undefined,
    homeownerEmail: row.homeownerEmail ?? row.homeowner_email ?? undefined,
    homeownerSummarySentAt: row.homeowner_summary_sent_at ?? undefined,
    lastContactedAt: row.last_contacted_at ?? undefined,
    catStormEventId: row.catStormEventId ?? undefined,
    clientId: row.clientId ?? undefined,
    archivedAt: row.archivedAt ?? undefined,

    // Relations
    property: row.properties ? adaptProperty(row.properties) : undefined,
    contact: row.contacts ? adaptContact(row.contacts) : undefined,
    supplements: row.claim_supplements?.map(adaptSupplement),
  };
}

/**
 * Convert a raw Prisma properties row to a PropertyDTO
 */
export function adaptProperty(row: properties): PropertyDTO {
  return {
    id: row.id,
    orgId: row.orgId,
    isDemo: row.isDemo,
    contactId: row.contactId,
    name: row.name,
    propertyType: row.propertyType,
    street: row.street,
    city: row.city,
    state: row.state,
    zipCode: row.zipCode,
    yearBuilt: row.yearBuilt ?? undefined,
    squareFootage: row.squareFootage ?? undefined,
    roofType: row.roofType ?? undefined,
    roofAge: row.roofAge ?? undefined,
    carrier: row.carrier ?? undefined,
    policyNumber: row.policyNumber ?? undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,

    // Computed
    fullAddress: [row.street, row.city, row.state, row.zipCode].filter(Boolean).join(", "),
  };
}

/**
 * Convert a raw Prisma contacts row to a ContactDTO
 */
export function adaptContact(row: contacts): ContactDTO {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const firstName = (row as any).firstName ?? (row as any).first_name ?? undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lastName = (row as any).lastName ?? (row as any).last_name ?? undefined;

  return {
    id: row.id,
    firstName,
    lastName,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    email: (row as any).email ?? undefined,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    phone: (row as any).phone ?? undefined,
    fullName: [firstName, lastName].filter(Boolean).join(" ") || "Unknown",
  };
}

/**
 * Convert a raw Prisma claim_supplements row to a SupplementDTO
 */
export function adaptSupplement(row: claim_supplements): SupplementDTO {
  return {
    id: row.id,
    claimId: row.claim_id,
    status: row.status,
    totalCents: row.total_cents,
    data: (row.data as Record<string, unknown>) ?? {},
    submittedAt: row.submitted_at ?? undefined,
    reviewedAt: row.reviewed_at ?? undefined,
    reviewNotes: row.review_notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Adapt multiple claims
 */
export function adaptClaims(rows: ClaimRow[]): ClaimDTO[] {
  return rows.map(adaptClaim);
}

/**
 * Adapt multiple supplements
 */
export function adaptSupplements(rows: claim_supplements[]): SupplementDTO[] {
  return rows.map(adaptSupplement);
}
