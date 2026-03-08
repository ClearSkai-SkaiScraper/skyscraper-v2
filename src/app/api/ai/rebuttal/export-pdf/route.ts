export const dynamic = "force-dynamic";
import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";

import { createAiConfig, withAiBilling } from "@/lib/ai/withAiBilling";
import { requireApiAuth, verifyClaimAccess } from "@/lib/auth/apiAuth";
import {
  requireActiveSubscription,
  SubscriptionRequiredError,
} from "@/lib/billing/requireActiveSubscription";
import prisma from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { htmlToPdfBuffer } from "@/lib/reports/pdf-utils";
import { rebuttalExportPdfSchema, validateAIRequest } from "@/lib/validation/aiSchemas";

/**
 * POST /api/ai/rebuttal/export-pdf
 * Generate branded rebuttal PDF with company branding and claim details
 */
async function POST_INNER(req: NextRequest, ctx: { userId: string; orgId: string | null }) {
  try {
    const authResult = await requireApiAuth();
    if (authResult instanceof NextResponse) return authResult;

    const { userId, orgId } = authResult;
    if (!orgId) {
      return NextResponse.json({ error: "Organization required." }, { status: 400 });
    }

    // ── Billing guard ──
    try {
      await requireActiveSubscription(orgId);
    } catch (error) {
      if (error instanceof SubscriptionRequiredError) {
        return NextResponse.json(
          { error: "subscription_required", message: "Active subscription required" },
          { status: 402 }
        );
      }
      throw error;
    }

    // ── Rate limit ──
    const rl = await checkRateLimit(userId, "AI");
    if (!rl.success) {
      return NextResponse.json(
        {
          error: "rate_limit_exceeded",
          message: "Too many requests. Please try again later.",
          retryAfter: rl.reset,
        },
        {
          status: 429,
          headers: { "Retry-After": String(Math.ceil((rl.reset - Date.now()) / 1000)) },
        }
      );
    }

    const body = await req.json();
    const validation = validateAIRequest(rebuttalExportPdfSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error, details: validation.details },
        { status: 400 }
      );
    }
    const { claimId, rebuttalText } = validation.data;

    // Verify claim access
    const accessResult = await verifyClaimAccess(claimId, orgId, userId);
    if (accessResult instanceof NextResponse) return accessResult;

    // Fetch claim and org for branding
    const claim = await prisma.claims.findUnique({
      where: { id: claimId },
      include: {
        properties: {
          select: {
            street: true,
            city: true,
            state: true,
            zipCode: true,
          },
        },
      },
    });

    const org = await prisma.org.findUnique({
      where: { id: orgId },
      select: {
        name: true,
        brandLogoUrl: true,
      },
    });

    const branding = await prisma.org_branding.findFirst({
      where: { orgId },
      select: {
        logoUrl: true,
        colorPrimary: true,
        phone: true,
        email: true,
        website: true,
        license: true,
      },
    });

    if (!claim || !org) {
      return NextResponse.json({ error: "Claim or organization not found" }, { status: 404 });
    }

    // Build address from properties
    const propertyAddress = claim.properties
      ? `${claim.properties.street}, ${claim.properties.city}, ${claim.properties.state} ${claim.properties.zipCode}`
      : "N/A";

    // Merge branding - prefer org_branding, fallback to Org
    const logoUrl = branding?.logoUrl ?? org.brandLogoUrl;
    const primaryColor = branding?.colorPrimary ?? "#1e3a8a";

    // Generate branded HTML
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: Georgia, 'Times New Roman', serif; 
            padding: 60px; 
            line-height: 1.8; 
            color: #1f2937;
            max-width: 900px;
            margin: 0 auto;
          }
          .header { 
            border-bottom: 3px solid ${primaryColor}; 
            padding-bottom: 20px; 
            margin-bottom: 40px;
            display: flex;
            align-items: center;
            justify-content: space-between;
          }
          .logo { max-height: 60px; max-width: 200px; }
          .org-info { text-align: right; font-size: 12px; color: #6b7280; line-height: 1.6; }
          h1 { 
            color: ${primaryColor}; 
            font-size: 24px; 
            margin-bottom: 10px;
            text-align: center;
          }
          .meta { 
            background: #f9fafb; 
            padding: 20px; 
            border-left: 4px solid ${primaryColor}; 
            margin: 24px 0 40px 0;
            font-size: 13px;
          }
          .meta strong { color: #374151; }
          .date {
            text-align: right;
            margin: 30px 0;
            font-size: 14px;
          }
          .address-block {
            margin: 30px 0;
            line-height: 1.8;
          }
          .salutation {
            margin: 30px 0 20px 0;
            font-weight: 600;
          }
          .letter-body { 
            white-space: pre-wrap; 
            font-size: 14px; 
            line-height: 1.9;
            text-align: justify;
          }
          .signature-block {
            margin-top: 60px;
            line-height: 2;
          }
          .footer { 
            margin-top: 80px; 
            padding-top: 20px; 
            border-top: 1px solid #e5e7eb; 
            font-size: 10px; 
            color: #9ca3af; 
            text-align: center;
          }
          .type-badge {
            display: inline-block;
            background: #dbeafe;
            color: #1e40af;
            padding: 6px 12px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 600;
            margin-bottom: 20px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            ${logoUrl ? `<img src="${logoUrl}" alt="${org.name}" class="logo" />` : `<h2 style="margin: 0; font-size: 18px;">${org.name}</h2>`}
          </div>
          <div class="org-info">
            ${branding?.phone ? `${branding.phone}<br/>` : ""}
            ${branding?.email ? `${branding.email}<br/>` : ""}
            ${branding?.website ? `${branding.website}<br/>` : ""}
            ${branding?.license ? `License #${branding.license}` : ""}
          </div>
        </div>

        <div style="text-align: center;">
          <span class="type-badge">Formal Rebuttal Letter</span>
        </div>

        <div class="date">
          ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
        </div>

        <div class="address-block">
          ${claim.carrier || "[Insurance Carrier]"}<br/>
          ${claim.adjusterName ? `Attn: ${claim.adjusterName}<br/>` : ""}
          Claims Department
        </div>

        <div class="meta">
          <strong>RE: Claim Number:</strong> ${claim.claimNumber || claimId}<br/>
          <strong>Property Address:</strong> ${propertyAddress}<br/>
          <strong>Insured:</strong> ${claim.insured_name || "N/A"}<br/>
          <strong>Date of Loss:</strong> ${claim.dateOfLoss ? new Date(claim.dateOfLoss).toLocaleDateString() : "N/A"}
        </div>

        <div class="salutation">
          Dear Claims Representative:
        </div>

        <div class="letter-body">${rebuttalText}</div>

        <div class="signature-block">
          Sincerely,<br/>
          <br/>
          <br/>
          ${org.name}<br/>
          ${claim.insured_name ? `On behalf of ${claim.insured_name}` : ""}
        </div>

        <div class="footer">
          Generated by ${org.name} using SkaiScraper AI • ${new Date().toLocaleDateString()}<br/>
          This is a professional rebuttal document. Please review and customize before sending.
        </div>
      </body>
      </html>
    `;

    // Generate PDF
    const pdfBuffer = await htmlToPdfBuffer(html, { format: "Letter" });

    // Return PDF as download
    return new NextResponse(pdfBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="rebuttal-${claim.claimNumber || claimId}.pdf"`,
        "Content-Length": pdfBuffer.length.toString(),
      },
    });
  } catch (error) {
    logger.error("[Rebuttal Export PDF Error]", error);
    return NextResponse.json({ error: "Failed to export PDF" }, { status: 500 });
  }
}

export const POST = withAiBilling(
  createAiConfig("rebuttal_export", { costPerRequest: 15 }),
  POST_INNER
);
