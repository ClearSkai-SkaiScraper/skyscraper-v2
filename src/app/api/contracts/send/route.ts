import { NextResponse } from "next/server";
import { Resend } from "resend";
import { z } from "zod";

import { APP_URL } from "@/lib/env";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { safeOrgContext } from "@/lib/safeOrgContext";
import { createId } from "@paralleldrive/cuid2";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const sendContractSchema = z.object({
  clientEmail: z.string().email(),
  clientName: z.string().min(1),
  contractType: z.enum(["insurance_claim", "retail", "bid_sales", "warranty", "upgrade", "other"]),
  documentUrl: z.string().optional(),
  signatureDataUrl: z.string().optional(),
  linkedClaimId: z.string().nullable().optional(),
  linkedJobId: z.string().nullable().optional(),
  notes: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const { status, orgId, userId } = await safeOrgContext();
    if (status !== "ok" || !orgId || !userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validated = sendContractSchema.parse(body);

    // Create signing token for client
    const signingToken = createId();
    const contractId = createId();

    // Get org info for branding
    const org = await prisma.org.findUnique({
      where: { id: orgId },
      select: { name: true, brandLogoUrl: true },
    });

    // TODO: Once contracts table is created via migration, store contract record here
    // For now, we send the email and log the action
    logger.info("[CONTRACTS_SEND] Contract request initiated", {
      contractId,
      clientEmail: validated.clientEmail,
      contractType: validated.contractType,
      linkedClaimId: validated.linkedClaimId,
      linkedJobId: validated.linkedJobId,
      orgId,
      userId,
    });

    // Send email via Resend
    const baseUrl = APP_URL;
    const signUrl = `${baseUrl}/portal/contracts/sign/${contractId}?token=${signingToken}`;

    const resend = new Resend(process.env.RESEND_API_KEY);
    const emailResult = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "noreply@skaiscrape.com",
      to: validated.clientEmail,
      subject: `Contract from ${org?.name || "SkaiScraper"} - Signature Required`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .logo { max-height: 60px; }
            .button { display: inline-block; background: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
            .button:hover { background: #1d4ed8; }
            .footer { margin-top: 40px; text-align: center; color: #666; font-size: 12px; }
            .note { background: #f8fafc; padding: 16px; border-radius: 8px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              ${org?.brandLogoUrl ? `<img src="${org.brandLogoUrl}" alt="${org?.name}" class="logo" />` : `<h2>${org?.name || "SkaiScraper"}</h2>`}
            </div>
            
            <p>Hi ${validated.clientName},</p>
            
            <p>${org?.name || "Your contractor"} has sent you a contract that requires your signature.</p>
            
            ${validated.notes ? `<div class="note"><strong>Note from contractor:</strong><br/>${validated.notes}</div>` : ""}
            
            <p style="text-align: center;">
              <a href="${signUrl}" class="button">Review & Sign Contract</a>
            </p>
            
            <p>This link will expire in 7 days. If you have any questions, please contact ${org?.name || "your contractor"} directly.</p>
            
            <div class="footer">
              <p>Sent via SkaiScraper Contract Management</p>
              <p>If you did not expect this email, please ignore it.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    logger.info("[CONTRACTS_SEND] Email sent successfully", {
      contractId,
      clientEmail: validated.clientEmail,
      orgId,
      emailId: emailResult.data?.id,
    });

    return NextResponse.json({
      success: true,
      contractId,
      message: `Contract sent to ${validated.clientEmail}`,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }

    logger.error("[CONTRACTS_SEND] Error:", error);
    return NextResponse.json({ error: "Failed to send contract" }, { status: 500 });
  }
}
