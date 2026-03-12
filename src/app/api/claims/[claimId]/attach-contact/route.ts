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
