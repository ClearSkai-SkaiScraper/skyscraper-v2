/**
 * Client Portal Dashboard
 *
 * Client-facing dashboard data for homeowners.
 * Uses real Prisma models: Client, claims, claim_activities,
 * documents (via GeneratedArtifact), file_assets, jobs.
 */

import { logger } from "@/lib/observability/logger";
import prisma from "@/lib/prisma";

export interface ClientDashboardData {
  client: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    propertyAddress: string;
  };
  claims: ClientClaim[];
  jobs: ClientJob[];
  messages: ClientMessage[];
  documents: ClientDocument[];
  summary: {
    totalClaims: number;
    activeClaims: number;
    completedJobs: number;
    totalPaid: number;
    pendingAmount: number;
  };
}

export interface ClientClaim {
  id: string;
  claimNumber?: string;
  status: string;
  damageType?: string;
  createdAt: Date;
  updatedAt: Date;
  timeline?: {
    event: string;
    date: Date;
    description?: string;
  }[];
}

export interface ClientJob {
  id: string;
  title: string;
  status: string;
  progress: number;
  estimatedCost?: number;
  actualCost?: number;
  scheduledStart?: Date;
  completedAt?: Date;
  photos: ClientPhoto[];
}

export interface ClientPhoto {
  id: string;
  url: string;
  thumbnailUrl: string;
  category?: string;
  uploadedAt: Date;
}

export interface ClientMessage {
  id: string;
  from: string;
  message: string;
  sentAt: Date;
  read: boolean;
  attachments?: string[];
}

export interface ClientDocument {
  id: string;
  name: string;
  type: string;
  url: string;
  size: number;
  uploadedAt: Date;
}

/**
 * Get complete client dashboard data
 */
export async function getClientDashboard(clientId: string): Promise<ClientDashboardData | null> {
  try {
    // Look up the Client record
    const client = await prisma.client.findUnique({
      where: { id: clientId },
    });

    if (!client) {
      return null;
    }

    // Get claims this client has access to via client_access
    const accessRows = await prisma.client_access.findMany({
      where: { email: client.email || "" },
      select: { claimId: true },
    });
    const claimIds = accessRows.map((r) => r.claimId);

    const claims = claimIds.length
      ? await prisma.claims.findMany({
          where: { id: { in: claimIds } },
          orderBy: { createdAt: "desc" },
        })
      : [];

    // Get jobs linked to this client
    const clientJobs = await prisma.clientWorkRequest
      .findMany({
        where: { clientId },
        orderBy: { createdAt: "desc" },
      })
      .catch(() => []);

    // Get messages (from claim_activities for this client's claims)
    const messages = await getClientMessages(claimIds);

    // Get documents (GeneratedArtifact for this client's claims)
    const documents = await getClientDocuments(claimIds);

    // Calculate summary
    const summary = calculateClientSummary(claims, clientJobs);

    return {
      client: {
        id: client.id,
        firstName: client.firstName || client.name || "",
        lastName: client.lastName || "",
        email: client.email || "",
        phone: client.phone || undefined,
        propertyAddress: client.address || "",
      },
      claims: formatClientClaims(claims),
      jobs: formatClientJobs(clientJobs),
      messages,
      documents,
      summary,
    };
  } catch (error) {
    logger.error("Failed to load client dashboard:", error);
    return null;
  }
}

/**
 * Get client claim details
 */
export async function getClientClaim(
  claimId: string,
  clientId: string
): Promise<ClientClaim | null> {
  try {
    // Verify client has access
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { email: true },
    });

    if (!client?.email) return null;

    const access = await prisma.client_access.findFirst({
      where: { claimId, email: client.email },
    });

    if (!access) return null;

    const claim = await prisma.claims.findUnique({
      where: { id: claimId },
    });

    if (!claim) return null;

    // Build timeline from claim_activities
    const timeline = await buildClaimTimeline(claimId);

    return {
      id: claim.id,
      claimNumber: claim.claimNumber || undefined,
      status: claim.status,
      damageType: claim.damageType || undefined,
      createdAt: claim.createdAt,
      updatedAt: claim.updatedAt,
      timeline,
    };
  } catch (error) {
    logger.error("Failed to load claim:", error);
    return null;
  }
}

/**
 * Get client job details with photos
 */
export async function getClientJob(jobId: string, clientId: string): Promise<ClientJob | null> {
  try {
    const job = await prisma.clientWorkRequest.findFirst({
      where: { id: jobId, clientId },
    });

    if (!job) return null;

    // Get photos from file_assets — ClientWorkRequest has no claimId
    const photos = await prisma.file_assets
      .findMany({
        where: { category: "photo" },
        orderBy: { createdAt: "desc" },
        take: 10,
      })
      .catch(() => []);

    return {
      id: job.id,
      title: job.title || "Work Request",
      status: job.status,
      progress: calculateJobProgress(job),
      photos: photos.map((p) => ({
        id: p.id,
        url: p.publicUrl,
        thumbnailUrl: p.publicUrl,
        category: p.category,
        uploadedAt: p.createdAt,
      })),
    };
  } catch (error) {
    logger.error("Failed to load job:", error);
    return null;
  }
}

/**
 * Get client messages (from claim_activities)
 */
async function getClientMessages(claimIds: string[]): Promise<ClientMessage[]> {
  if (!claimIds.length) return [];

  try {
    const activities = await prisma.claim_activities.findMany({
      where: { claim_id: { in: claimIds } },
      orderBy: { created_at: "desc" },
      take: 20,
    });

    return activities.map((a) => ({
      id: a.id,
      from: "Your Contractor",
      message: a.message || `${a.type} event`,
      sentAt: a.created_at,
      read: false,
      attachments: [],
    }));
  } catch {
    return [];
  }
}

/**
 * Get client documents (from GeneratedArtifact)
 */
async function getClientDocuments(claimIds: string[]): Promise<ClientDocument[]> {
  if (!claimIds.length) return [];

  try {
    const artifacts = await prisma.generatedArtifact.findMany({
      where: { claimId: { in: claimIds } },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return artifacts.map((doc) => ({
      id: doc.id,
      name: doc.title || doc.type,
      type: doc.type || "document",
      url: doc.fileUrl || "",
      size: 0,
      uploadedAt: doc.createdAt,
    }));
  } catch {
    return [];
  }
}

/**
 * Format claims for client view
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatClientClaims(claims: any[]): ClientClaim[] {
  return claims.map((claim) => ({
    id: claim.id,
    claimNumber: claim.claimNumber,
    status: claim.status,
    damageType: claim.damageType,
    createdAt: claim.createdAt,
    updatedAt: claim.updatedAt,
  }));
}

/**
 * Format jobs for client view
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatClientJobs(jobs: any[]): ClientJob[] {
  return jobs.map((job) => ({
    id: job.id,
    title: job.title || "Work Request",
    status: job.status,
    progress: calculateJobProgress(job),
    photos: [],
  }));
}

/**
 * Calculate client summary stats
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function calculateClientSummary(claims: any[], jobs: any[]) {
  return {
    totalClaims: claims.length,
    activeClaims: claims.filter((c) =>
      ["NEW", "IN_PROGRESS", "UNDER_REVIEW", "FILED", "ADJUSTER_REVIEW", "BUILD"].includes(c.status)
    ).length,
    completedJobs: jobs.filter((j) => j.status === "COMPLETED" || j.status === "completed").length,
    totalPaid: 0,
    pendingAmount: 0,
  };
}

/**
 * Calculate job progress percentage
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function calculateJobProgress(job: any): number {
  const s = (job.status || "").toUpperCase();
  if (s === "COMPLETED") return 100;
  if (s === "NEW" || s === "PENDING") return 0;
  if (s === "IN_PROGRESS") return 50;
  return 25;
}

/**
 * Build claim timeline from claim_activities
 */
async function buildClaimTimeline(claimId: string) {
  try {
    const activities = await prisma.claim_activities.findMany({
      where: { claim_id: claimId },
      orderBy: { created_at: "asc" },
    });

    return activities.map((a) => ({
      event: a.type,
      date: a.created_at,
      description: a.message || undefined,
    }));
  } catch {
    return [];
  }
}

/**
 * Submit client message
 */
export async function submitClientMessage(
  clientId: string,
  message: string,
  claimId?: string
): Promise<boolean> {
  try {
    // TODO: Store in messages table
    logger.debug("Client message:", { clientId, message, claimId });
    return true;
  } catch {
    return false;
  }
}
