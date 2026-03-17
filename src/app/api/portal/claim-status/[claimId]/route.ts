export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/portal/claim-status/[claimId]
 *
 * Returns claim status + timeline for the client portal.
 * Client users can only see their own claims (scoped by contactId).
 */

import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: Promise<{ claimId: string }> }) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await currentUser();
    const email = user?.emailAddresses?.[0]?.emailAddress;

    if (!email) {
      return NextResponse.json({ error: "No email found" }, { status: 400 });
    }

    const { claimId } = await params;

    // Find the claim and verify client access through property → contact email
    const accessCheck = await prisma.$queryRaw<{ id: string }[]>`
      SELECT cl.id FROM claims cl
      JOIN properties p ON p.id = cl."propertyId"
      JOIN contacts c ON c.id = p."contactId"
      WHERE cl.id = ${claimId}
        AND LOWER(c.email) = LOWER(${email})
      LIMIT 1
    `;

    if (!accessCheck.length) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }

    const claim = await prisma.claims.findUnique({
      where: { id: claimId },
      select: {
        id: true,
        title: true,
        claimNumber: true,
        status: true,
        signingStatus: true,
        carrier: true,
        damageType: true,
        dateOfLoss: true,
        insured_name: true,
        description: true,
        createdAt: true,
        updatedAt: true,
        propertyId: true,
      },
    });

    if (!claim) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }

    // Fetch property address separately
    const property = claim.propertyId
      ? await prisma.properties.findUnique({
          where: { id: claim.propertyId },
          select: { street: true, city: true, state: true, zipCode: true },
        })
      : null;

    // Build a simple timeline from claim data
    const timeline: { date: Date | null; event: string; status: string }[] = [
      { date: claim.createdAt, event: "Claim created", status: "complete" },
    ];

    if (claim.status === "inspection_scheduled" || claim.status !== "new") {
      timeline.push({
        date: claim.updatedAt,
        event: "Inspection scheduled",
        status: "complete",
      });
    }

    if (["estimate_sent", "approved", "in_progress", "completed"].includes(claim.status || "")) {
      timeline.push({
        date: claim.updatedAt,
        event: "Estimate prepared",
        status: "complete",
      });
    }

    if (["approved", "in_progress", "completed"].includes(claim.status || "")) {
      timeline.push({
        date: claim.updatedAt,
        event: "Work approved",
        status: "complete",
      });
    }

    if (claim.status === "in_progress") {
      timeline.push({
        date: null as unknown as Date,
        event: "Work in progress",
        status: "current",
      });
    }

    if (claim.status === "completed") {
      timeline.push({
        date: claim.updatedAt,
        event: "Work completed",
        status: "complete",
      });
    }

    return NextResponse.json({
      claim: {
        ...claim,
        property,
      },
      timeline,
    });
  } catch (error) {
    logger.error("[PORTAL_CLAIM_STATUS] Error:", error);
    return NextResponse.json({ error: "Failed to fetch claim" }, { status: 500 });
  }
}
