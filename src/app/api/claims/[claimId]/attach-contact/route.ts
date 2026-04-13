/**
 * ============================================================================
 * ATTACH CONTACT TO CLAIM — Proxy Route
 * ============================================================================
 *
 * POST /api/claims/[claimId]/attach-contact
 *
 * The Client tab page calls this standalone endpoint.
 * Proxies to the mutate route's "attach_contact" action internally.
 *
 * ============================================================================
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getOrgClaimOrThrow, OrgScopeError } from "@/lib/auth/orgScope";
import { withAuth } from "@/lib/auth/withAuth";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

const AttachContactSchema = z.object({
  contactId: z.string().min(1, "contactId is required"),
});

export const POST = withAuth(
  async (req: NextRequest, { orgId }, routeParams: { params: Promise<{ claimId: string }> }) => {
    try {
      const { claimId } = await routeParams.params;
      const body = await req.json();
      const parsed = AttachContactSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Validation failed", details: parsed.error.flatten() },
          { status: 400 }
        );
      }
      const { contactId } = parsed.data;

      // Verify claim belongs to org
      await getOrgClaimOrThrow(orgId, claimId);

      // Verify contact exists and belongs to org
      // Check CRM Contacts table first, then Client table (from ClientProConnection)
      let contactInfo: { id: string; name: string; email: string | null } | null = null;

      const crmContact = await prisma.contacts.findFirst({
        where: { id: contactId, orgId },
      });

      if (crmContact) {
        contactInfo = {
          id: crmContact.id,
          name:
            `${crmContact.firstName || ""} ${crmContact.lastName || ""}`.trim() ||
            crmContact.email ||
            "Unknown",
          email: crmContact.email,
        };
      } else {
        // Fallback: check Client table (connections from client portal / invites)
        // Client records may not have orgId set (portal clients are org-independent),
        // so first try by id+orgId, then by id alone with ClientProConnection verification.
        const client = await prisma.client.findFirst({
          where: { id: contactId, orgId },
        });

        if (client) {
          contactInfo = {
            id: client.id,
            name:
              client.name ||
              `${client.firstName || ""} ${client.lastName || ""}`.trim() ||
              client.email ||
              "Unknown",
            email: client.email,
          };
        } else {
          // Client may not have orgId — look up by id and verify through ClientProConnection
          const clientNoOrg = await prisma.client.findUnique({
            where: { id: contactId },
            select: {
              id: true,
              name: true,
              firstName: true,
              lastName: true,
              email: true,
              ClientProConnection: {
                select: { contractorId: true },
              },
            },
          });

          if (clientNoOrg) {
            // Verify this client is connected to the pro's company
            const membership = await prisma.tradesCompanyMember.findFirst({
              where: { orgId },
              select: { companyId: true },
            });

            const isConnected =
              !membership?.companyId ||
              clientNoOrg.ClientProConnection.some((c) => c.contractorId === membership.companyId);

            if (isConnected) {
              contactInfo = {
                id: clientNoOrg.id,
                name:
                  clientNoOrg.name ||
                  `${clientNoOrg.firstName || ""} ${clientNoOrg.lastName || ""}`.trim() ||
                  clientNoOrg.email ||
                  "Unknown",
                email: clientNoOrg.email,
              };

              // Also set orgId on the Client record so future lookups work
              await prisma.client
                .update({
                  where: { id: contactId },
                  data: { orgId },
                })
                .catch((e) =>
                  logger.warn("[ATTACH_CONTACT] Client orgId backfill failed", {
                    contactId,
                    error: e?.message,
                  })
                );
            }
          }
        }
      }

      if (!contactInfo) {
        return NextResponse.json({ error: "Contact not found" }, { status: 404 });
      }

      // Update claim with contact
      await prisma.claims.update({
        where: { id: claimId },
        data: { clientId: contactInfo.id },
      });

      // CRITICAL: Also create a client_access record so the client portal can
      // verify access to this claim. Without this, the portal claims list,
      // claim detail, messaging, invoices, and signatures all fail with 403.
      if (contactInfo.email) {
        try {
          const existingAccess = await prisma.client_access.findFirst({
            where: { claimId, email: contactInfo.email },
          });
          if (!existingAccess) {
            await prisma.client_access.create({
              data: {
                id: crypto.randomUUID(),
                claimId,
                email: contactInfo.email,
              },
            });
            logger.info("[attach-contact] Created client_access for portal", {
              claimId,
              email: contactInfo.email,
            });
          }
        } catch (accessErr) {
          // Non-critical — portal access may not work but claim attachment succeeded
          logger.warn("[attach-contact] Failed to create client_access:", accessErr);
        }
      }

      return NextResponse.json({
        success: true,
        message: "Contact attached to claim",
        contact: contactInfo,
      });
    } catch (error) {
      if (error instanceof OrgScopeError) {
        return NextResponse.json({ error: "Claim not found" }, { status: 404 });
      }
      logger.error("[attach-contact] Error:", error);
      return NextResponse.json(
        {
          error: "Failed to attach contact",
        },
        { status: 500 }
      );
    }
  }
);

/**
 * DELETE /api/claims/[claimId]/attach-contact
 *
 * Detaches (disconnects) the currently connected client from a claim.
 * Removes the clientId from the claim and deletes the ClaimClientLink + client_access records.
 */
export const DELETE = withAuth(
  async (
    _req: NextRequest,
    { orgId, userId },
    routeParams: { params: Promise<{ claimId: string }> }
  ) => {
    try {
      const { claimId } = await routeParams.params;

      // Verify claim belongs to org
      await getOrgClaimOrThrow(orgId, claimId);

      // Get the current client info before removing
      const currentClaim = await prisma.claims.findUnique({
        where: { id: claimId },
        select: { clientId: true },
      });

      if (!currentClaim?.clientId) {
        return NextResponse.json(
          { error: "No client is connected to this claim" },
          { status: 400 }
        );
      }

      // Remove clientId from claim
      await prisma.claims.update({
        where: { id: claimId },
        data: { clientId: null },
      });

      // Remove ClaimClientLink records for this claim
      try {
        await prisma.claimClientLink.deleteMany({
          where: { claimId },
        });
      } catch {
        // Table may not exist or no records — non-critical
      }

      // Remove client_access records for this claim
      try {
        await prisma.client_access.deleteMany({
          where: { claimId },
        });
      } catch {
        // Non-critical
      }

      logger.info("[detach-contact] Client detached from claim", {
        claimId,
        orgId,
        userId,
        removedClientId: currentClaim.clientId,
        action: "detach_client",
      });

      return NextResponse.json({
        success: true,
        message: "Client disconnected from claim",
      });
    } catch (error) {
      if (error instanceof OrgScopeError) {
        return NextResponse.json({ error: "Claim not found" }, { status: 404 });
      }
      logger.error("[detach-contact] Error:", error);
      return NextResponse.json({ error: "Failed to detach client" }, { status: 500 });
    }
  }
);
