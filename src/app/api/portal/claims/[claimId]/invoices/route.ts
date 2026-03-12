/**
 * GET /api/portal/claims/[claimId]/invoices
 *
 * Lists invoices for a claim that the client has access to.
 * Returns contractor_invoices linked via crm_jobs → claims.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

import { isPortalAuthError, requirePortalAuth } from "@/lib/auth/requirePortalAuth";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: Promise<{ claimId: string }> }) {
  try {
    const authResult = await requirePortalAuth();
    if (isPortalAuthError(authResult)) return authResult;
    const { userId, email } = authResult;

    const { claimId } = await params;

    // Verify the client has access to this claim
    const hasAccess = await verifyClaimAccess(claimId, userId, email);
    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Get the claim to find its claim number (crm_jobs links by claim_number)
    const claim = await prisma.claims.findUnique({
      where: { id: claimId },
      select: {
        claimNumber: true,
      },
    });

    if (!claim) {
      return NextResponse.json({ ok: true, invoices: [] });
    }

    // Get invoices linked to this claim through crm_jobs (matched by claim_number)
    const crmJobs = claim.claimNumber
      ? await prisma.crm_jobs.findMany({
          where: { claim_number: claim.claimNumber },
          select: {
            id: true,
            contractor_invoices: {
              select: {
                id: true,
                invoice_no: true,
                items: true,
                totals: true,
                kind: true,
                created_at: true,
              },
              orderBy: { created_at: "desc" },
            },
          },
        })
      : [];

    // Flatten all invoices from crm_jobs
    const invoices: Array<{
      id: string;
      invoiceNumber: string;
      items: any;
      totals: any;
      kind: string;
      createdAt: any;
      jobId: string | null;
    }> = crmJobs.flatMap((job) =>
      job.contractor_invoices.map((inv: any) => ({
        id: inv.id,
        invoiceNumber: inv.invoice_no,
        items: inv.items,
        totals: inv.totals,
        kind: inv.kind,
        createdAt: inv.created_at,
        jobId: job.id,
      }))
    );

    return NextResponse.json({
      ok: true,
      invoices,
    });
  } catch (error) {
    logger.error("[PORTAL_CLAIM_INVOICES]", error);
    return NextResponse.json({ error: "Failed to fetch invoices" }, { status: 500 });
  }
}

async function verifyClaimAccess(
  claimId: string,
  userId: string,
  email: string | null
): Promise<boolean> {
  // Check client_access (email-based)
  if (email) {
    const access = await prisma.client_access.findFirst({
      where: { claimId, email },
    });
    if (access) return true;
  }

  // Check ClaimClientLink (userId-based)
  const client = await prisma.client.findFirst({
    where: { OR: [{ userId }, ...(email ? [{ email }] : [])] },
    select: { id: true },
  });

  if (client) {
    const link = await prisma.claimClientLink.findFirst({
      where: {
        claimId,
        OR: [{ clientUserId: client.id }, ...(email ? [{ clientEmail: email }] : [])],
        status: "ACCEPTED",
      },
    });
    if (link) return true;
  }

  return false;
}
