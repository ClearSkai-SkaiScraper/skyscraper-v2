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

import { getOrgClaimOrThrow, OrgScopeError } from "@/lib/auth/orgScope";
import { withAuth } from "@/lib/auth/withAuth";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export const POST = withAuth(
  async (req: NextRequest, { orgId }, routeParams: { params: Promise<{ claimId: string }> }) => {
    try {
      const { claimId } = await routeParams.params;
      const body = await req.json();
      const { contactId } = body;

      if (!contactId) {
        return NextResponse.json({ error: "contactId is required" }, { status: 400 });
      }

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
                .catch(() => {}); // non-critical
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
