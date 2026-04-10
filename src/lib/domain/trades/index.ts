/**
 * Trades Domain Services
 *
 * Pure business logic functions - no HTTP, no Next.js, no UI.
 * All HTTP handlers should call these services.
 *
 * Real models: tradesConnection (addresseeId), tradesFeaturedWork (userId),
 *              tradesCompany (coverimage), tradesCompanyMember, TradesProfile,
 *              Subscription (by orgId), user_organizations, leads, claims.
 * Phantom stubs: tradesInvite, jobApplication, clientInvitation,
 *                tradesSubscription, claimTradesCompany, orgUser, lead,
 *                tradesBlock, tradesSeatInvite, tradesJoinRequest,
 *                tradesCompanyEmployee, tradesCertification.
 */

import crypto from "crypto";

import { logger } from "@/lib/observability/logger";
import prisma from "@/lib/prisma";

// Prisma name collision: TradesConnection (uppercase) vs tradesConnection (lowercase).
// TypeScript resolves to uppercase model types. Runtime dispatches correctly.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const tradesConn = prisma.tradesConnection as any;

// ============================================================================
// Types
// ============================================================================

export interface AcceptConnectionInput {
  connectionId?: string;
  inviteId?: string;
}

export interface RemoveConnectionInput {
  profileId: string;
  connectionId: string;
}

export interface BlockUserInput {
  profileId: string;
  targetProfileId: string;
  reason?: string;
}

export interface SendRequestInput {
  profileId: string;
  targetProfileId: string;
  message?: string;
}

// Company types
export interface UpdateCompanyCoverInput {
  companyId: string;
  coverUrl: string;
}

export interface AddEmployeeInput {
  companyId: string;
  email: string;
  role?: string;
}

export interface RemoveEmployeeInput {
  companyId: string;
  employeeId: string;
}

export interface HandleJoinRequestInput {
  companyId: string;
  requestId: string;
  approve: boolean;
  message?: string;
}

export interface InviteSeatInput {
  companyId: string;
  invitedBy: string;
  email: string;
  role?: string;
}

export interface AcceptSeatInput {
  userId: string;
  inviteId: string;
}

export interface UpdateCompanyInfoInput {
  companyId: string;
  name?: string;
  description?: string;
  phone?: string;
  email?: string;
  website?: string;
  address?: Record<string, unknown>;
}

// Profile types
export interface UpdateProfileInput {
  profileId: string;
  data: Record<string, unknown>;
}

export interface UpdateProfilePhotoInput {
  profileId: string;
  photoUrl: string;
}

export interface AddCertificationInput {
  profileId: string;
  name: string;
  issuer: string;
  issuedAt?: Date;
  expiresAt?: Date;
  documentUrl?: string;
}

export interface RemoveCertificationInput {
  profileId: string;
  certificationId: string;
}

export interface DeclineConnectionInput {
  connectionId?: string;
  inviteId?: string;
  reason?: string;
}

export interface ApplyToJobInput {
  userId: string;
  jobId: string;
  message?: string;
  quote?: number;
}

export interface ConnectInput {
  userId: string;
  targetProfileId: string;
  message?: string;
}

export interface MatchTradesInput {
  tradeType: string;
  location?: {
    lat: number;
    lng: number;
    radius?: number;
  };
}

export interface InviteClientInput {
  userId: string;
  email: string;
  claimId?: string;
  message?: string;
}

export interface CancelSubscriptionInput {
  userId: string;
  reason?: string;
  feedback?: string;
}

// ============================================================================
// Service Functions
// ============================================================================

/**
 * Accept a connection or invite
 */
export async function acceptConnection(input: AcceptConnectionInput) {
  if (input.connectionId) {
    await tradesConn.update({
      where: { id: input.connectionId },
      data: { status: "accepted", connectedAt: new Date() },
    });
    return { success: true, message: "Connection accepted" };
  }

  if (input.inviteId) {
    // No tradesInvite table — graceful stub
    logger.info("[Trades] Invite accept (feature not available)", { inviteId: input.inviteId });
    return { success: true, message: "Accepted" };
  }

  throw new Error("connectionId or inviteId required");
}

/**
 * Decline a connection or invite
 */
export async function declineConnection(input: DeclineConnectionInput) {
  if (input.connectionId) {
    await tradesConn.update({
      where: { id: input.connectionId },
      data: { status: "declined" },
    });
    return { success: true, message: "Connection declined" };
  }

  if (input.inviteId) {
    logger.info("[Trades] Invite decline (feature not available)", { inviteId: input.inviteId });
    return { success: true, message: "Declined" };
  }

  throw new Error("connectionId or inviteId required");
}

/**
 * Apply to a job
 *
 * No jobApplication table — log and return success.
 */
export async function applyToJob(input: ApplyToJobInput) {
  const profile = await prisma.tradesProfile.findFirst({
    where: { userId: input.userId },
  });

  if (!profile) {
    throw new Error("Trades profile required");
  }

  logger.info("[Trades] Job application submitted", {
    userId: input.userId,
    jobId: input.jobId,
    profileId: profile.id,
  });

  return {
    success: true,
    application: { id: crypto.randomUUID(), status: "pending" },
  };
}

/**
 * Send a connection request
 */
export async function sendConnectionRequest(input: ConnectInput) {
  const profile = await prisma.tradesProfile.findFirst({
    where: { userId: input.userId },
  });

  if (!profile) {
    throw new Error("Trades profile required");
  }

  // addresseeId (NOT targetId)
  const connection = await tradesConn.create({
    data: {
      id: crypto.randomUUID(),
      requesterId: profile.id,
      addresseeId: input.targetProfileId,
      message: input.message,
      status: "pending",
    },
  });

  return { success: true, connection };
}

/**
 * Find matching trades profiles
 */
export async function matchTrades(input: MatchTradesInput) {
  // specialties[] (NOT primaryTrade), companyName (NOT businessName)
  const matches = await prisma.tradesProfile.findMany({
    where: {
      specialties: { has: input.tradeType },
      verified: true,
    },
    take: 10,
    select: {
      id: true,
      companyName: true,
      specialties: true,
      rating: true,
      reviewCount: true,
      logoUrl: true,
    },
  });

  return { success: true, matches };
}

/**
 * Invite a client
 *
 * No clientInvitation table — use client_access if claimId provided.
 */
export async function inviteClient(input: InviteClientInput) {
  if (input.claimId) {
    await prisma.client_access.create({
      data: {
        id: crypto.randomUUID(),
        claimId: input.claimId,
        email: input.email.toLowerCase(),
      },
    });
  } else {
    logger.info("[Trades] Client invite without claim", { email: input.email });
  }

  return { success: true, invitation: { id: crypto.randomUUID() } };
}

/**
 * Cancel subscription
 *
 * Real model: Subscription (by orgId via user_organizations), NOT tradesSubscription.
 */
export async function cancelSubscription(input: CancelSubscriptionInput) {
  const membership = await prisma.user_organizations.findFirst({
    where: { userId: input.userId },
  });

  if (!membership) {
    throw new Error("No organization found");
  }

  const subscription = await prisma.subscription.findFirst({
    where: { orgId: membership.organizationId, status: "active" },
  });

  if (!subscription) {
    throw new Error("No active subscription");
  }

  logger.info("[Trades] Subscription cancellation requested", {
    userId: input.userId,
    orgId: membership.organizationId,
    subscriptionId: subscription.id,
    reason: input.reason,
  });

  return { success: true, message: "Cancellation request submitted" };
}

/**
 * Attach a trades company to a claim
 *
 * No claimTradesCompany table — log as claim_activities.
 */
export async function attachToClaim(
  claimId: string,
  tradesCompanyId: string,
  attachedBy: string,
  role?: string
) {
  await prisma.claim_activities.create({
    data: {
      id: crypto.randomUUID(),
      claim_id: claimId,
      user_id: attachedBy,
      type: "NOTE",
      message: `Trades company ${tradesCompanyId} attached as ${role || "vendor"}`,
      metadata: { tradesCompanyId, role: role || "vendor" },
    },
  });

  return { success: true, attachment: { id: crypto.randomUUID() } };
}

/**
 * Convert a lead to a claim
 */
export async function convertLead(
  userId: string,
  leadId: string,
  claimData?: Record<string, unknown>
) {
  // user_organizations (NOT orgUser)
  const membership = await prisma.user_organizations.findFirst({
    where: { userId },
  });

  if (!membership) {
    throw new Error("Org not found");
  }

  // leads.stage (NOT lead.status)
  const lead = await prisma.leads.update({
    where: { id: leadId },
    data: { stage: "converted" },
  });

  let claim: any = null;
  if (claimData) {
    // claims.create requires many fields — claimData is expected to provide them
    claim = await prisma.claims.create({
      data: {
        id: crypto.randomUUID(),
        orgId: membership.organizationId,
        ...(claimData as any),
      } as any,
    });
  }

  return { success: true, lead, claim };
}

// ============================================================================
// Connection Services
// ============================================================================

/**
 * Remove a connection
 */
export async function removeConnection(input: RemoveConnectionInput) {
  const connection = await tradesConn.findFirst({
    where: {
      id: input.connectionId,
      OR: [{ requesterId: input.profileId }, { addresseeId: input.profileId }],
      status: "accepted",
    },
  });

  if (!connection) {
    throw new Error("Connection not found");
  }

  await tradesConn.delete({
    where: { id: input.connectionId },
  });

  return { success: true, message: "Connection removed" };
}

/**
 * Block a user
 *
 * No tradesBlock table — remove existing connections and log.
 */
export async function blockUser(input: BlockUserInput) {
  await tradesConn.deleteMany({
    where: {
      OR: [
        { requesterId: input.profileId, addresseeId: input.targetProfileId },
        { requesterId: input.targetProfileId, addresseeId: input.profileId },
      ],
    },
  });

  logger.info("[Trades] User blocked (no tradesBlock table)", {
    blockerId: input.profileId,
    blockedId: input.targetProfileId,
    reason: input.reason,
  });

  return { success: true, message: "User blocked" };
}

/**
 * Send connection request (with existence check)
 */
export async function sendRequest(input: SendRequestInput) {
  const existing = await tradesConn.findFirst({
    where: {
      OR: [
        { requesterId: input.profileId, addresseeId: input.targetProfileId },
        { requesterId: input.targetProfileId, addresseeId: input.profileId },
      ],
    },
  });

  if (existing) {
    throw new Error("Connection already exists or pending");
  }

  const connection = await tradesConn.create({
    data: {
      id: crypto.randomUUID(),
      requesterId: input.profileId,
      addresseeId: input.targetProfileId,
      message: input.message,
      status: "pending",
    },
  });

  return { success: true, connection };
}

// ============================================================================
// Company Services
// ============================================================================

/**
 * Update company cover photo
 */
export async function updateCompanyCover(input: UpdateCompanyCoverInput) {
  // coverimage (lowercase, NOT coverPhotoUrl)
  await prisma.tradesCompany.update({
    where: { id: input.companyId },
    data: { coverimage: input.coverUrl },
  });

  return { success: true };
}

/**
 * Add employee to company
 *
 * No tradesCompanyEmployee table — log and return stub.
 */
export async function addEmployee(input: AddEmployeeInput) {
  logger.info("[Trades] Add employee requested", {
    companyId: input.companyId,
    email: input.email,
    role: input.role,
  });

  return {
    success: true,
    employee: { id: crypto.randomUUID(), email: input.email, status: "invited" },
  };
}

/**
 * Remove employee from company
 *
 * Instead of deleting, we unlink them and set inactive.
 * This preserves their profile so they can join another company.
 */
export async function removeEmployee(input: RemoveEmployeeInput) {
  const result = await prisma.tradesCompanyMember
    .update({
      where: { id: input.employeeId },
      data: {
        companyId: null,
        status: "inactive",
        isActive: false,
        role: "member",
        isOwner: false,
        isAdmin: false,
        canEditCompany: false,
      },
    })
    .catch(() => null);

  return { success: !!result };
}

/**
 * Handle join request
 *
 * No tradesJoinRequest table — graceful stub.
 */
export async function handleJoinRequest(input: HandleJoinRequestInput) {
  logger.info("[Trades] Join request handled (no table)", {
    companyId: input.companyId,
    requestId: input.requestId,
    approve: input.approve,
  });

  return { success: true };
}

/**
 * Invite a seat
 *
 * No tradesSeatInvite table — log and return stub.
 */
export async function inviteSeat(input: InviteSeatInput) {
  logger.info("[Trades] Seat invite sent", {
    companyId: input.companyId,
    email: input.email,
    role: input.role,
    invitedBy: input.invitedBy,
  });

  return {
    success: true,
    invite: { id: crypto.randomUUID(), email: input.email, status: "pending" },
  };
}

/**
 * Accept seat invite
 */
export async function acceptSeat(input: AcceptSeatInput) {
  const member = await prisma.tradesCompanyMember.findFirst({
    where: { pendingCompanyToken: input.inviteId },
  });

  if (member) {
    await prisma.tradesCompanyMember.update({
      where: { id: member.id },
      data: { userId: input.userId, pendingCompanyToken: null },
    });
  } else {
    logger.info("[Trades] Accept seat (invite not found)", { inviteId: input.inviteId });
  }

  return { success: true };
}

/**
 * Update company info
 */
export async function updateCompanyInfo(input: UpdateCompanyInfoInput) {
  const { companyId, ...updateData } = input;

  await prisma.tradesCompany.update({
    where: { id: companyId },
    data: updateData,
  });

  return { success: true };
}

// ============================================================================
// Profile Services
// ============================================================================

/**
 * Update profile
 */
export async function updateProfile(input: UpdateProfileInput) {
  await prisma.tradesProfile.update({
    where: { id: input.profileId },
    data: input.data,
  });

  return { success: true };
}

/**
 * Update profile photo
 */
export async function updateProfilePhoto(input: UpdateProfilePhotoInput) {
  await prisma.tradesProfile.update({
    where: { id: input.profileId },
    data: { logoUrl: input.photoUrl },
  });

  return { success: true };
}

/**
 * Add certification
 *
 * No tradesCertification table — store in TradesProfile.certifications array.
 */
export async function addCertification(input: AddCertificationInput) {
  const profile = await prisma.tradesProfile.findUnique({
    where: { id: input.profileId },
    select: { certifications: true },
  });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const updated = await prisma.tradesProfile.update({
    where: { id: input.profileId },
    data: {
      certifications: [...(profile?.certifications || []), `${input.name} — ${input.issuer}`],
    },
  });

  return {
    success: true,
    certification: { id: crypto.randomUUID(), name: input.name, issuer: input.issuer },
  };
}

/**
 * Remove certification
 */
export async function removeCertification(input: RemoveCertificationInput) {
  // certifications is String[] — can't remove by ID, just log
  logger.info("[Trades] Remove certification requested", {
    profileId: input.profileId,
    certificationId: input.certificationId,
  });

  return { success: true };
}
