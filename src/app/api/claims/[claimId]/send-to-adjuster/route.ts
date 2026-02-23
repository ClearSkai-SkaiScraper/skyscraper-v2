export const dynamic = "force-dynamic";
import { logger } from "@/lib/observability/logger";
import { NextResponse } from "next/server";
import { Resend } from "resend";

import { isAuthError, requireAuth } from "@/lib/auth/requireAuth";
import prisma from "@/lib/prisma";

let _resend: Resend | null = null;

function getResend() {
  if (!_resend && process.env.RESEND_API_KEY) {
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

export async function POST(req: Request, { params }: { params: { claimId: string } }) {
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth;
  const { orgId, userId } = auth;

  try {
    const { adjusterEmail, includeDepreciation, includeSupplement, message } = await req.json();
    const claimId = params.claimId;

    // Fetch claim — org-scoped
    const claim = await prisma.claims.findFirst({
      where: { id: claimId, orgId },
      include: {
        properties: true,
      },
    });

    if (!claim) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }

    const recipientEmail = adjusterEmail || claim.adjusterEmail;
    if (!recipientEmail) {
      return NextResponse.json({ error: "No adjuster email provided" }, { status: 400 });
    }

    // Email sent with claim details
    // For PDF attachments, use /api/reports/email which supports attachments
    // Or integrate with /api/reports/[reportId]/save for PDF generation
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Claim Documents - ${claim.claimNumber}</h2>
        <p>Hello,</p>
        <p>Please find the requested claim documents for the following property:</p>
        <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>Claim Number:</strong> ${claim.claimNumber}</p>
          <p style="margin: 5px 0;"><strong>Property:</strong> ${claim.properties?.street}</p>
          <p style="margin: 5px 0;"><strong>Date of Loss:</strong> ${new Date(claim.dateOfLoss).toLocaleDateString()}</p>
          <p style="margin: 5px 0;"><strong>Carrier:</strong> ${claim.carrier || "N/A"}</p>
        </div>
        ${message ? `<p><strong>Additional Notes:</strong></p><p>${message}</p>` : ""}
        <p style="margin-top: 30px; color: #666; font-size: 12px;">
          This email was sent from SkaiScraper - Roofing Claims Management Platform
        </p>
      </div>
    `;

    const resendClient = getResend();
    if (!resendClient) {
      return NextResponse.json({ error: "Email service not configured" }, { status: 503 });
    }

    await resendClient.emails.send({
      from: "SkaiScraper Claims <claims@skaiscrape.com>",
      to: recipientEmail,
      subject: `Claim Documents - ${claim.claimNumber}`,
      html: emailHtml,
    });

    // Log activity
    await prisma.claim_activities.create({
      data: {
        id: crypto.randomUUID(),
        claim_id: claimId,
        user_id: userId,
        type: "NOTE",
        message: `Documents Sent to Adjuster: ${recipientEmail}`,
        metadata: {
          recipient: recipientEmail,
          includeDepreciation,
          includeSupplement,
        },
      },
    });

    return NextResponse.json({
      success: true,
      description: `Documents sent to ${recipientEmail}`,
    });
  } catch (error) {
    logger.error("[Send to Adjuster] Error:", error);
    return NextResponse.json(
      { error: "Failed to send email", details: "Internal server error" },
      { status: 500 }
    );
  }
}
