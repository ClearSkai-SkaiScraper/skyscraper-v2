export const dynamic = "force-dynamic";
import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";

import { requireApiOrg, verifyClaimAccess } from "@/lib/auth/apiAuth";
import {
  requireActiveSubscription,
  SubscriptionRequiredError,
} from "@/lib/billing/requireActiveSubscription";
import prisma from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { htmlToPdfBuffer } from "@/lib/reports/pdf-utils";
import { supplementExportPdfSchema, validateAIRequest } from "@/lib/validation/aiSchemas";

/**
 * POST /api/ai/supplement/export-pdf
 * Generate branded supplement PDF with company branding and claim details
 */
export async function POST(req: NextRequest) {
  try {
    const authResult = await requireApiOrg();
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

    // ── Zod validation ──
    const validation = validateAIRequest(supplementExportPdfSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error, details: validation.details },
        { status: 422 }
      );
    }

    const { claimId, items, total } = validation.data;

    // Verify claim access
    const accessResult = await verifyClaimAccess(claimId, orgId, userId);
    if (accessResult instanceof NextResponse) return accessResult;

    // Fetch claim and org for branding
    const claim = await prisma.claims.findUnique({
      where: { id: claimId },
      select: {
        claimNumber: true,
        insured_name: true,
        homeowner_email: true,
        dateOfLoss: true,
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

    // Fetch org branding for additional details
    const branding = await prisma.org_branding.findFirst({
      where: { orgId: orgId },
      select: {
        colorPrimary: true,
        phone: true,
        email: true,
        website: true,
        license: true,
        logoUrl: true,
      },
    });

    if (!claim || !org) {
      return NextResponse.json({ error: "Claim or organization not found" }, { status: 404 });
    }

    // Generate branded HTML
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: 'Helvetica Neue', Arial, sans-serif; 
            padding: 60px; 
            line-height: 1.6; 
            color: #1f2937;
          }
          .header { 
            border-bottom: 3px solid ${branding?.colorPrimary || "#3b82f6"}; 
            padding-bottom: 20px; 
            margin-bottom: 30px;
            display: flex;
            align-items: center;
            justify-content: space-between;
          }
          .logo { max-height: 60px; max-width: 200px; }
          .org-info { text-align: right; font-size: 12px; color: #6b7280; }
          h1 { 
            color: ${branding?.colorPrimary || "#1e3a8a"}; 
            font-size: 28px; 
            margin-bottom: 10px;
          }
          .meta { 
            background: #f9fafb; 
            padding: 20px; 
            border-left: 4px solid ${branding?.colorPrimary || "#3b82f6"}; 
            margin: 24px 0;
            font-size: 14px;
          }
          .meta strong { color: #374151; }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 30px 0;
          }
          th {
            background: ${branding?.colorPrimary || "#3b82f6"};
            color: white;
            padding: 12px;
            text-align: left;
            font-weight: 600;
          }
          td {
            padding: 12px;
            border-bottom: 1px solid #e5e7eb;
          }
          tr:hover { background: #f9fafb; }
          .total-row {
            background: #f3f4f6;
            font-weight: bold;
            font-size: 16px;
          }
          .footer { 
            margin-top: 60px; 
            padding-top: 20px; 
            border-top: 1px solid #e5e7eb; 
            font-size: 11px; 
            color: #9ca3af; 
            text-align: center;
          }
          .type-badge {
            display: inline-block;
            background: #dbeafe;
            color: #1e40af;
            padding: 6px 12px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 600;
            margin-bottom: 15px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            ${branding?.logoUrl || org.brandLogoUrl ? `<img src="${branding?.logoUrl || org.brandLogoUrl}" alt="${org.name}" class="logo" />` : `<h2 style="margin: 0;">${org.name}</h2>`}
          </div>
          <div class="org-info">
            ${branding?.phone ? `<div>📞 ${branding.phone}</div>` : ""}
            ${branding?.email ? `<div>✉️ ${branding.email}</div>` : ""}
            ${branding?.website ? `<div>🌐 ${branding.website}</div>` : ""}
            ${branding?.license ? `<div>License: ${branding.license}</div>` : ""}
          </div>
        </div>

        <span class="type-badge">SUPPLEMENT</span>
        <h1>Claim Supplement</h1>

        <div class="meta">
          <strong>Claim Number:</strong> ${claim.claimNumber || claimId}<br/>
          <strong>Property:</strong> ${claim.properties ? `${claim.properties.street}, ${claim.properties.city}, ${claim.properties.state} ${claim.properties.zipCode}` : "N/A"}<br/>
          <strong>Homeowner:</strong> ${claim.insured_name || "N/A"}<br/>
          ${claim.homeowner_email ? `<strong>Email:</strong> ${claim.homeowner_email}<br/>` : ""}
          <strong>Date of Loss:</strong> ${claim.dateOfLoss ? new Date(claim.dateOfLoss).toLocaleDateString() : "N/A"}<br/>
          <strong>Generated:</strong> ${new Date().toLocaleString()}
        </div>

        <h2 style="margin-top: 30px; color: #374151;">Supplemental Line Items</h2>
        
        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th style="text-align: right; width: 100px;">Quantity</th>
              <th style="text-align: right; width: 120px;">Unit Price</th>
              <th style="text-align: right; width: 120px;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${items
              .map(
                (item: any) => `
              <tr>
                <td>${item.description}</td>
                <td style="text-align: right;">${item.quantity}</td>
                <td style="text-align: right;">$${item.unitPrice.toFixed(2)}</td>
                <td style="text-align: right;">$${(item.quantity * item.unitPrice).toFixed(2)}</td>
              </tr>
            `
              )
              .join("")}
            <tr class="total-row">
              <td colspan="3" style="text-align: right;">Supplement Total:</td>
              <td style="text-align: right;">$${(total || 0).toFixed(2)}</td>
            </tr>
          </tbody>
        </table>

        <div class="footer">
          Generated by ${org.name} using SkaiScraper AI • ${new Date().toLocaleDateString()}<br/>
          This supplement is subject to review and approval by the insurance carrier.
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
        "Content-Disposition": `attachment; filename="supplement-${claim.claimNumber || claimId}.pdf"`,
        "Content-Length": pdfBuffer.length.toString(),
      },
    });
  } catch (error) {
    logger.error("[Supplement Export PDF Error]", error);
    return NextResponse.json({ error: "Failed to export PDF" }, { status: 500 });
  }
}
