/**
 * ============================================================================
 * UNIFIED FINAL PAYOUT ACTIONS HANDLER
 * ============================================================================
 *
 * POST /api/claims/[claimId]/final-payout/actions
 *
 * Consolidates ALL final payout operations into a single action-based endpoint.
 *
 * SUPPORTED ACTIONS:
 *   - generate_packet: Generate payout packet PDF
 *   - save_certificate: Save completion certificate
 *   - send_certificate: Email certificate to client
 *   - capture_signature: Capture digital signature
 *   - submit: Submit for final payment
 *
 * REPLACES:
 *   - /api/claims/[claimId]/final-payout/generate-packet
 *   - /api/claims/[claimId]/final-payout/save-certificate
 *   - /api/claims/[claimId]/final-payout/send-certificate
 *   - /api/claims/[claimId]/final-payout/signature
 *   - /api/claims/[claimId]/final-payout/submit
 *
 * KEEPS SEPARATE:
 *   - /api/claims/[claimId]/final-payout (GET/PATCH for data retrieval/update)
 *
 * ============================================================================
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getOrgClaimOrThrow, OrgScopeError } from "@/lib/auth/orgScope";
import { isAuthError, requireAuth } from "@/lib/auth/requireAuth";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ─────────────────────────────────────────────────────────────────────────────
// SCHEMAS
// ─────────────────────────────────────────────────────────────────────────────

const actionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("generate_packet"),
    includePhotos: z.boolean().optional().default(true),
    includeSupplements: z.boolean().optional().default(true),
  }),
  z.object({
    action: z.literal("save_certificate"),
    certificateData: z.object({
      completionDate: z.string(),
      notes: z.string().optional(),
    }),
  }),
  z.object({
    action: z.literal("send_certificate"),
    recipientEmail: z.string().email(),
    recipientName: z.string().optional(),
    message: z.string().optional(),
  }),
  z.object({
    action: z.literal("capture_signature"),
    signatureData: z.string(), // Base64 encoded signature
    signerName: z.string(),
    signerRole: z.enum(["homeowner", "contractor", "adjuster"]),
  }),
  z.object({
    action: z.literal("submit"),
    confirmationChecks: z.object({
      workCompleted: z.boolean(),
      documentsUploaded: z.boolean(),
      invoiceGenerated: z.boolean(),
    }),
  }),
]);

type ActionPayload = z.infer<typeof actionSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// MAIN HANDLER
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest, { params }: { params: Promise<{ claimId: string }> }) {
  try {
    // Auth
    const auth = await requireAuth();
    if (isAuthError(auth)) return auth;
    const { orgId, userId } = auth;

    const { claimId } = await params;

    // Verify claim belongs to org
    await getOrgClaimOrThrow(orgId, claimId);

    // Parse and validate body
    const body = await req.json();
    const parsed = actionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const payload = parsed.data;

    // Route to action handler
    switch (payload.action) {
      case "generate_packet":
        return handleGeneratePacket(claimId, orgId, payload);

      case "save_certificate":
        return handleSaveCertificate(claimId, orgId, userId, payload);

      case "send_certificate":
        return handleSendCertificate(claimId, orgId, payload);

      case "capture_signature":
        return handleCaptureSignature(claimId, orgId, userId, payload);

      case "submit":
        return handleSubmit(claimId, orgId, userId, payload);

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (error) {
    if (error instanceof OrgScopeError) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }
    logger.error("[Final Payout Actions] Error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ACTION HANDLERS
// ─────────────────────────────────────────────────────────────────────────────

async function handleGeneratePacket(
  claimId: string,
  orgId: string,
  payload: Extract<ActionPayload, { action: "generate_packet" }>
) {
  // Get claim data
  const claim = await prisma.claims.findUnique({
    where: { id: claimId, orgId },
    include: {
      properties: true,
      depreciation_items: true,
      supplements: payload.includeSupplements
        ? {
            where: { status: { not: "deleted" } },
          }
        : false,
    },
  });

  if (!claim) {
    return NextResponse.json({ error: "Claim not found" }, { status: 404 });
  }

  // Generate packet using existing generator
  try {
    const { generateFinalPayoutPacket } = await import("@/lib/claims/generators/finalPayoutPacket");
    const packet = await generateFinalPayoutPacket(claimId, {
      includePhotos: payload.includePhotos,
      includeSupplements: payload.includeSupplements,
    });

    // Convert PDF bytes to base64 for client download
    let pdfBase64: string | null = null;
    if (packet.pdfBytes) {
      const buffer = Buffer.from(packet.pdfBytes);
      pdfBase64 = buffer.toString("base64");
    }

    return NextResponse.json({
      success: true,
      packet: {
        id: packet.id,
        url: packet.url || null,
        pdfBase64,
        generatedAt: packet.generatedAt.toISOString(),
        totalPayout: packet.totalPayout,
        breakdown: packet.breakdown,
      },
    });
  } catch (error) {
    logger.error("[generate_packet] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to generate packet",
      },
      { status: 500 }
    );
  }
}

async function handleSaveCertificate(
  claimId: string,
  orgId: string,
  userId: string,
  payload: Extract<ActionPayload, { action: "save_certificate" }>
) {
  // Update depreciation tracker with certificate data
  const tracker = await prisma.depreciation_trackers.upsert({
    where: { claim_id: claimId },
    update: {
      certificate_date: new Date(payload.certificateData.completionDate),
      certificate_notes: payload.certificateData.notes,
      updated_at: new Date(),
    },
    create: {
      id: (await import("@paralleldrive/cuid2")).createId(),
      claim_id: claimId,
      org_id: orgId,
      total_depreciation: 0,
      status: "work_completed",
      certificate_date: new Date(payload.certificateData.completionDate),
      certificate_notes: payload.certificateData.notes,
      updated_at: new Date(),
    },
  });

  return NextResponse.json({
    success: true,
    certificate: {
      savedAt: new Date().toISOString(),
      completionDate: payload.certificateData.completionDate,
    },
  });
}

async function handleSendCertificate(
  claimId: string,
  orgId: string,
  payload: Extract<ActionPayload, { action: "send_certificate" }>
) {
  // Get claim and org branding
  const claim = await prisma.claims.findUnique({
    where: { id: claimId },
    select: { claimNumber: true },
  });

  const branding = await prisma.org_branding.findFirst({
    where: { orgId },
    select: { companyName: true },
  });

  // Send email
  const { sendEmail, TEMPLATES } = await import("@/lib/email/resend");

  await sendEmail({
    to: payload.recipientEmail,
    subject: "Completion Certificate",
    html: `<div><h2>Completion Certificate</h2><p>Dear ${payload.recipientName || "there"},</p><p>Your completion certificate for claim ${claim?.claimNumber || claimId} is ready.</p>${payload.message ? `<p>${payload.message}</p>` : ""}<p>— ${branding?.companyName || "SkaiScraper"}</p></div>`,
  });

  return NextResponse.json({
    success: true,
    sentTo: payload.recipientEmail,
    sentAt: new Date().toISOString(),
  });
}

async function handleCaptureSignature(
  claimId: string,
  orgId: string,
  userId: string,
  payload: Extract<ActionPayload, { action: "capture_signature" }>
) {
  // Build signature fields based on signer role
  const sigFields: Record<string, unknown> = {
    [`${payload.signerRole}_signature`]: payload.signatureData,
    [`${payload.signerRole}_name`]: payload.signerName,
    [`${payload.signerRole}_signed_at`]: new Date(),
  };

  // Store signature in depreciation tracker
  const tracker = await prisma.depreciation_trackers.upsert({
    where: { claim_id: claimId },
    update: {
      ...sigFields,
      updated_at: new Date(),
    } as any, // Dynamic field names require cast
    create: {
      id: (await import("@paralleldrive/cuid2")).createId(),
      claim_id: claimId,
      org_id: orgId,
      total_depreciation: 0,
      status: "docs_uploaded",
      ...sigFields,
      updated_at: new Date(),
    } as any, // Dynamic field names require cast
  });

  return NextResponse.json({
    success: true,
    signature: {
      role: payload.signerRole,
      name: payload.signerName,
      capturedAt: new Date().toISOString(),
    },
  });
}

async function handleSubmit(
  claimId: string,
  orgId: string,
  userId: string,
  payload: Extract<ActionPayload, { action: "submit" }>
) {
  const { confirmationChecks } = payload;

  // Validate all checks passed
  if (
    !confirmationChecks.workCompleted ||
    !confirmationChecks.documentsUploaded ||
    !confirmationChecks.invoiceGenerated
  ) {
    return NextResponse.json(
      { error: "All confirmation checks must be completed before submission" },
      { status: 400 }
    );
  }

  // Update tracker status
  const tracker = await prisma.depreciation_trackers.upsert({
    where: { claim_id: claimId },
    update: {
      status: "submitted",
      submitted_at: new Date(),
      submitted_by: userId,
      updated_at: new Date(),
    },
    create: {
      id: (await import("@paralleldrive/cuid2")).createId(),
      claim_id: claimId,
      org_id: orgId,
      total_depreciation: 0,
      status: "submitted",
      submitted_at: new Date(),
      submitted_by: userId,
      updated_at: new Date(),
    },
  });

  // Update claim status
  await prisma.claims.update({
    where: { id: claimId },
    data: {
      lifecycle_stage: "DEPRECIATION",
    },
  });

  // Send webhook notification
  try {
    const { WebhookService } = await import("@/lib/webhook-service");
    await WebhookService.sendClaimUpdated(claimId, { status: "submitted_for_payout" }, orgId);
  } catch {}

  return NextResponse.json({
    success: true,
    submission: {
      status: "submitted",
      submittedAt: new Date().toISOString(),
      submittedBy: userId,
    },
  });
}
