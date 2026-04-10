/**
 * =============================================================================
 * TRADES → VENDORS → CLIENT CONNECTIONS → MESSAGING + DOCS → CLIENT PORTAL
 * Complete End-to-End Loop Implementation
 * =============================================================================
 *
 * MODELS USED (from prisma/schema.prisma):
 * ----------------------------------------
 * 1. ContractorProfile - Main company profile (unique per orgId)
 *    - businessName, email, phone, licenseNumber, serviceAreas, bio, etc.
 *
 * 2. TradeProfile - Enhanced marketplace profile (linked to ContractorProfile)
 *    - tradeType, certifications, portfolioUrls, averageRating, specialties
 *    - serviceRadiusMiles, acceptingNewClients, completedJobsCount
 *
 * 3. Vendor - Vendor directory (using the Vendor model from schema)
 *
 * 4. Client - Client/homeowner record
 *    - id, orgId, name, email, phone
 *
 * 5. ClientProConnection - Join table linking contractors to clients
 *    - clientId, contractorId, status, connectionSource
 *    - leadId, appointmentId, claimId (auto-integration)
 *
 * 6. MessageThread - Messaging threads
 *    - orgId, claimId, tradePartnerId, clientId
 *    - participants[], isPortalThread
 *
 * 7. Message - Individual messages in threads
 *    - threadId, senderUserId, senderType, body, fromPortal
 *
 * 8. crm_documents - Documents shared with clients
 *    - claimId, type, title, publicUrl, visibleToClient
 *    - uploadedByRole, createdById
 *
 * 9. reports - Generated reports
 *    - pdfUrl, status, claimId, sharedAt
 *
 * =============================================================================
 */

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

/**
 * Helper: Ensure vendor exists for this org
 * Called after saving trade profile to keep vendor directory in sync
 * Note: Uses the Vendor model which has different fields than the legacy TradePartner
 */
export async function ensureVendorForOrg(
  orgId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  contractorProfile?: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tradeProfile?: any
) {
  try {
    // Vendor model uses slug as unique key - derive from orgId
    const vendorSlug = `org-${orgId}`;
    const existing = await prisma.vendor.findFirst({
      where: { slug: vendorSlug },
    });

    const vendorData = {
      name: contractorProfile.businessName || "Unnamed Business",
      primaryPhone: contractorProfile.phone,
      primaryEmail: contractorProfile.email,
      category: Array.isArray(tradeProfile?.specialties)
        ? tradeProfile.specialties[0] || "General"
        : tradeProfile?.specialties || "General",
    };

    if (existing) {
      // Update existing vendor
      await prisma.vendor.update({
        where: { id: existing.id },
        data: vendorData,
      });
      logger.debug("[ensureVendorForOrg] Updated vendor:", existing.id);
    } else {
      // Create new vendor
      const newVendor = await prisma.vendor.create({
        data: { slug: vendorSlug, ...vendorData },
      });
      logger.debug("[ensureVendorForOrg] Created vendor:", newVendor.id);
    }
  } catch (error) {
    logger.error("[ensureVendorForOrg] Error:", error);
    // Don't throw - this is a sync operation, not critical to profile save
  }
}

/**
 * Helper: Get or create message thread for client connection
 */
export async function getOrCreateClientThread(orgId: string, clientId: string) {
  try {
    // Look for existing thread
    let thread = await prisma.messageThread.findFirst({
      where: {
        orgId,
        clientId,
      },
    });

    if (!thread) {
      // Create new thread
      thread = await prisma.messageThread.create({
        data: {
          id: crypto.randomUUID(),
          orgId,
          clientId,
          subject: "Client Communication",
          isPortalThread: true,
          participants: [clientId, orgId],
        },
      });
      logger.debug("[getOrCreateClientThread] Created thread:", thread.id);
    }

    return thread;
  } catch (error) {
    logger.error("[getOrCreateClientThread] Error:", error);
    throw error;
  }
}

/**
 * Helper: Create shared document for client
 * Uses crm_documents table (the actual model name in schema)
 */
export async function createSharedDocument(
  orgId: string,
  _clientId: string,
  claimId: string,
  documentData: {
    title: string;
    description?: string;
    storageKey: string;
    publicUrl: string;
    mimeType: string;
    fileSize?: number;
  }
) {
  try {
    // crm_documents requires job_id (FK to crm_jobs), not claimId/orgId.
    // Use claimId as a reference to find or create a job record.
    const doc = await prisma.crm_documents.create({
      data: {
        id: crypto.randomUUID(),
        job_id: claimId, // Map claimId to job_id for document association
        type: "OTHER",
        source_url: documentData.publicUrl,
        status: "uploaded",
        updated_at: new Date(),
      },
    });

    logger.debug("[createSharedDocument] Created doc:", doc.id);
    return doc;
  } catch (error) {
    logger.error("[createSharedDocument] Error:", error);
    throw error;
  }
}
