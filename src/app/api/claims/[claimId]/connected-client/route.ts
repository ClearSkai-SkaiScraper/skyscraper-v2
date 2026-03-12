/**
 * GET /api/claims/[claimId]/connected-client
 *
 * Returns the connected client info for a claim.
 * Checks BOTH the Client table (portal users) and the CRM contacts table.
 * This is the single source of truth for "who is connected to this claim?"
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

import { getOrgClaimOrThrow, OrgScopeError } from "@/lib/auth/orgScope";
import { withAuth } from "@/lib/auth/withAuth";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export const GET = withAuth(
  async (_req: NextRequest, { orgId }, routeParams: { params: Promise<{ claimId: string }> }) => {
    try {
      const { claimId } = await routeParams.params;

      // Verify claim belongs to org
      const claim = await getOrgClaimOrThrow(orgId, claimId);

      const clientId = (claim as any).clientId;

      // ── Try 0: Check ClaimClientLink first (invite-based connections never set clientId) ──
      if (!clientId) {
        const link = await prisma.claimClientLink.findFirst({
          where: { claimId, status: "CONNECTED" },
          select: {
            clientEmail: true,
            clientName: true,
            clientUserId: true,
          },
        });

        if (link) {
          // If we have a userId from the link, look up the Client record
          if (link.clientUserId) {
            const linkedClient = await prisma.client.findFirst({
              where: { userId: link.clientUserId },
              select: {
                id: true,
                name: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
              },
            });

            if (linkedClient) {
              return NextResponse.json({
                client: {
                  id: linkedClient.id,
                  firstName: linkedClient.firstName,
                  lastName: linkedClient.lastName,
                  name:
                    linkedClient.name ||
                    `${linkedClient.firstName || ""} ${linkedClient.lastName || ""}`.trim() ||
                    linkedClient.email ||
                    "Unknown",
                  email: linkedClient.email,
                  phone: linkedClient.phone,
                },
                source: "claim-link",
              });
            }
          }

          // Fall back to just the link info
          return NextResponse.json({
            client: {
              id: link.clientUserId || "link",
              firstName: link.clientName?.split(" ")[0] || null,
              lastName: link.clientName?.split(" ").slice(1).join(" ") || null,
              name: link.clientName || link.clientEmail,
              email: link.clientEmail,
              phone: null,
            },
            source: "claim-link",
          });
        }

        return NextResponse.json({ client: null, source: "none" });
      }

      // ── Try 1: Check CRM Contacts table ──
      const crmContact = await prisma.contacts.findFirst({
        where: { id: clientId, orgId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
        },
      });

      if (crmContact) {
        return NextResponse.json({
          client: {
            id: crmContact.id,
            firstName: crmContact.firstName,
            lastName: crmContact.lastName,
            name:
              `${crmContact.firstName || ""} ${crmContact.lastName || ""}`.trim() ||
              crmContact.email ||
              "Unknown",
            email: crmContact.email,
            phone: crmContact.phone,
          },
          source: "contacts",
        });
      }

      // ── Try 2: Check Client table (portal users) ──
      const client = await prisma.client.findUnique({
        where: { id: clientId },
        select: {
          id: true,
          name: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
        },
      });

      if (client) {
        const clientName =
          client.name ||
          `${client.firstName || ""} ${client.lastName || ""}`.trim() ||
          client.email ||
          "Unknown";

        return NextResponse.json({
          client: {
            id: client.id,
            firstName: client.firstName,
            lastName: client.lastName,
            name: clientName,
            email: client.email,
            phone: client.phone,
          },
          source: "client",
        });
      }

      // Nothing found (ClaimClientLink already checked in Try 0 above)
      return NextResponse.json({ client: null, source: "none" });
    } catch (error) {
      if (error instanceof OrgScopeError) {
        return NextResponse.json({ error: "Claim not found" }, { status: 404 });
      }
      logger.error("[connected-client] Error:", error);
      return NextResponse.json({ error: "Failed to fetch connected client" }, { status: 500 });
    }
  }
);
