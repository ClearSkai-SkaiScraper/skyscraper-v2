export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * POST /api/portal/esign/[claimId]
 *
 * E-signature endpoint for the client portal.
 * Records the client's electronic signature on a claim document.
 */

import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ claimId: string }> }) {
  try {
    // eslint-disable-next-line @typescript-eslint/await-thenable
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await currentUser();
    const email = user?.emailAddresses?.[0]?.emailAddress;
    const name = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "Client";

    if (!email) {
      return NextResponse.json({ error: "No email found" }, { status: 400 });
    }

    const { claimId } = await params;

    // Verify access through property → contact email
    const accessCheck = await prisma.$queryRaw<
      { id: string; orgId: string; signingStatus: string | null }[]
    >`
      SELECT cl.id, cl."orgId", cl."signingStatus"
      FROM claims cl
      JOIN properties p ON p.id = cl."propertyId"
      JOIN contacts c ON c.id = p."contactId"
      WHERE cl.id = ${claimId}
        AND LOWER(c.email) = LOWER(${email})
      LIMIT 1
    `;

    if (!accessCheck.length) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }

    const claim = accessCheck[0];

    if (claim.signingStatus === "signed") {
      return NextResponse.json({ error: "This document has already been signed" }, { status: 409 });
    }

    const esignSchema = z.object({
      signature: z.string().min(1, "Signature data required").max(500_000),
      documentId: z.string().optional(),
      ipAddress: z.string().ip().optional(),
    });

    const body = await req.json();
    const parsed = esignSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { signature, documentId, ipAddress } = parsed.data;

    // Record the e-signature
    const clientIp = ipAddress || req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";

    // Update claim signing status
    await prisma.claims.update({
      where: { id: claimId },
      data: {
        signingStatus: "signed",
        signedAt: new Date(),
        signedBy: name,
        signedByEmail: email,
        signatureIp: clientIp,
      } as any,
    });

    // Store signature record for audit trail
    try {
      await prisma.$executeRaw`
        INSERT INTO esignatures (id, "claimId", "orgId", "signerName", "signerEmail", "signatureData", "ipAddress", "userAgent", "signedAt")
        VALUES (
          ${`esig_${Date.now()}`},
          ${claimId},
          ${claim.orgId},
          ${name},
          ${email},
          ${signature},
          ${clientIp},
          ${req.headers.get("user-agent") || "unknown"},
          NOW()
        )
      `;
    } catch {
      // esignatures table may not exist — the claim update above is the primary record
      logger.warn(
        "[PORTAL_ESIGN] esignatures table not available, signature recorded on claim only"
      );
    }

    logger.info("[PORTAL_ESIGN]", { claimId, signer: email, ip: clientIp });

    return NextResponse.json({
      success: true,
      signedAt: new Date().toISOString(),
      signedBy: name,
    });
  } catch (error) {
    logger.error("[PORTAL_ESIGN] Error:", error);
    return NextResponse.json({ error: "Failed to record signature" }, { status: 500 });
  }
}
