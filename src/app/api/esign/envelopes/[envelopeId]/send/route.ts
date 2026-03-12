/**
 * POST /api/esign/envelopes/[id]/send
 *
 * Send an envelope to the designated signer
 * Uses the actual SignatureEnvelope schema with single signer info
 */

import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";

import { isAuthError, requireAuth } from "@/lib/auth/requireAuth";
import { sendEmail } from "@/lib/email/resend";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Build the HTML email for a signature request
 */
function buildSignatureRequestEmail(params: {
  documentName: string;
  signerName: string;
  signUrl: string;
  senderOrgName?: string;
}) {
  const { documentName, signerName, signUrl, senderOrgName } = params;
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Signature Requested</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; border-bottom: 1px solid #e5e5e5;">
              <h1 style="margin: 0; color: #1a1a1a; font-size: 24px; font-weight: 600;">
                ✍️ Signature Requested
              </h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 30px 40px;">
              <p style="margin: 0 0 16px; color: #333; font-size: 16px;">
                Hi ${signerName},
              </p>
              <p style="margin: 0 0 16px; color: #333; font-size: 16px;">
                ${senderOrgName ? `<strong>${senderOrgName}</strong> has` : "You have"} been sent a document that requires your signature:
              </p>
              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 24px 0;">
                <p style="margin: 0; font-weight: 600; color: #1a1a1a; font-size: 18px;">
                  📄 ${documentName}
                </p>
              </div>
              <p style="margin: 0 0 24px; color: #333; font-size: 16px;">
                Please review and sign the document by clicking the button below:
              </p>
              <div style="text-align: center; margin: 32px 0;">
                <a href="${signUrl}" style="background: #2563eb; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px;">
                  Review &amp; Sign Document
                </a>
              </div>
              <p style="margin: 24px 0 0; color: #666; font-size: 14px;">
                If the button doesn't work, copy and paste this link into your browser:
              </p>
              <p style="margin: 4px 0 0; color: #2563eb; font-size: 13px; word-break: break-all;">
                ${signUrl}
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 20px 40px; text-align: center; border-top: 1px solid #e5e5e5; background: #fafafa; border-radius: 0 0 8px 8px;">
              <p style="margin: 0; color: #999; font-size: 12px;">
                This is an automated message from SkaiScraper. If you did not expect this document, please disregard this email.
              </p>
              <p style="margin: 8px 0 0; color: #999; font-size: 12px;">
                © ${new Date().getFullYear()} SkaiScraper. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ envelopeId: string }> }
) {
  try {
    const auth = await requireAuth();
    if (isAuthError(auth)) return auth;
    const { orgId } = auth;

    const { envelopeId } = await params;

    // Get envelope
    const envelope = await prisma.signatureEnvelope.findUnique({
      where: { id: envelopeId },
    });

    if (!envelope) {
      return NextResponse.json({ ok: false, message: "Envelope not found" }, { status: 404 });
    }

    // Org isolation: verify linked claim belongs to this org
    // If no claimId, we cannot verify tenant — block access
    if (!envelope.claimId) {
      return NextResponse.json(
        { ok: false, message: "Envelope has no linked claim" },
        { status: 400 }
      );
    }
    const claim = await prisma.claims.findFirst({
      where: { id: envelope.claimId, orgId },
      select: { id: true },
    });
    if (!claim) {
      return NextResponse.json({ ok: false, message: "Envelope not found" }, { status: 404 });
    }

    // Check if envelope has signer info
    if (!envelope.signerEmail) {
      return NextResponse.json(
        { ok: false, message: "No signer email configured" },
        { status: 400 }
      );
    }

    // Update envelope status to sent
    await prisma.signatureEnvelope.update({
      where: { id: envelopeId },
      data: {
        status: "sent",
        sentAt: new Date(),
      },
    });

    // ── Send signature request email via Resend ──
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://skaiscrape.com";
    const signUrl = `${appUrl}/esign/sign/${envelopeId}`;

    // Resolve org name for email branding
    let orgName: string | undefined;
    if (orgId) {
      const org = await prisma.org.findUnique({
        where: { id: orgId },
        select: { name: true },
      });
      orgName = org?.name ?? undefined;
    }

    try {
      await sendEmail({
        to: envelope.signerEmail,
        subject: `${orgName || "SkaiScraper"} — Please sign: ${envelope.documentName || "Document"}`,
        html: buildSignatureRequestEmail({
          documentName: envelope.documentName || "Document",
          signerName: envelope.signerName || envelope.signerEmail,
          signUrl,
          senderOrgName: orgName,
        }),
      });
      logger.info(`[ESIGN] ✅ Signature request email sent to ${envelope.signerEmail}`, {
        envelopeId,
        orgId,
      });
    } catch (emailError) {
      // Don't fail the whole operation if email fails — envelope is already marked sent
      logger.error(`[ESIGN] ❌ Failed to send email to ${envelope.signerEmail}`, emailError);
    }

    return NextResponse.json({
      ok: true,
      message: "Envelope sent successfully",
      envelope: {
        id: envelope.id,
        status: "sent",
        signerEmail: envelope.signerEmail,
        sentAt: new Date(),
      },
    });
  } catch (error) {
    logger.error("[ENVELOPE_SEND_ERROR]", error);
    return NextResponse.json({ ok: false, message: "Failed to send" }, { status: 500 });
  }
}
