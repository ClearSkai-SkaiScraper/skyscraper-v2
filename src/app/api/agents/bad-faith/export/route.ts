export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

import { requireApiOrg, verifyClaimAccess } from "@/lib/auth/apiAuth";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { htmlToPdfBuffer } from "@/lib/reports/pdf-utils";

/**
 * POST /api/agents/bad-faith/export
 * Export bad faith analysis as a branded PDF
 */
export async function POST(req: NextRequest) {
  try {
    const authResult = await requireApiOrg();
    if (authResult instanceof NextResponse) return authResult;

    const { userId, orgId } = authResult;
    if (!orgId) {
      return NextResponse.json({ error: "Organization required." }, { status: 400 });
    }

    const body = await req.json();
    const { claimId, analysis } = body;

    if (!claimId || !analysis) {
      return NextResponse.json({ error: "claimId and analysis required" }, { status: 400 });
    }

    // Verify claim access
    const accessResult = await verifyClaimAccess(claimId, orgId, userId);
    if (accessResult instanceof NextResponse) return accessResult;

    // Fetch claim and org for branding
    const claim = await prisma.claims.findUnique({
      where: { id: claimId },
      select: {
        claimNumber: true,
        insured_name: true,
        carrier: true,
        policy_number: true,
        dateOfLoss: true,
        properties: {
          select: { street: true, city: true, state: true, zipCode: true },
        },
      },
    });

    const org = await prisma.org.findUnique({
      where: { id: orgId },
      select: { name: true, brandLogoUrl: true },
    });

    const branding = await prisma.org_branding.findFirst({
      where: { orgId },
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

    const primaryColor = branding?.colorPrimary || "#dc2626";
    const logoUrl = branding?.logoUrl || org.brandLogoUrl;

    const getSeverityBadge = (severity: string) => {
      const colors: Record<string, string> = {
        critical: "#dc2626",
        high: "#ea580c",
        medium: "#ca8a04",
        low: "#2563eb",
        none: "#16a34a",
      };
      return `<span style="background: ${colors[severity] || "#6b7280"}; color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px; text-transform: uppercase;">${severity}</span>`;
    };

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: 'Helvetica Neue', Arial, sans-serif; 
            padding: 50px; 
            line-height: 1.6; 
            color: #1f2937;
            font-size: 12px;
          }
          .header { 
            border-bottom: 3px solid ${primaryColor}; 
            padding-bottom: 20px; 
            margin-bottom: 30px;
            display: flex;
            align-items: center;
            justify-content: space-between;
          }
          .logo { max-height: 50px; max-width: 180px; }
          .org-info { text-align: right; font-size: 11px; color: #6b7280; }
          h1 { 
            color: ${primaryColor}; 
            font-size: 22px; 
            margin-bottom: 10px;
          }
          h2 {
            color: #374151;
            font-size: 14px;
            margin: 20px 0 10px;
            padding-bottom: 5px;
            border-bottom: 1px solid #e5e7eb;
          }
          .alert-box {
            background: #fef2f2;
            border: 1px solid #fecaca;
            border-left: 4px solid ${primaryColor};
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
          }
          .alert-box.warning {
            background: #fffbeb;
            border-color: #fde68a;
            border-left-color: #ca8a04;
          }
          .alert-box.success {
            background: #f0fdf4;
            border-color: #bbf7d0;
            border-left-color: #16a34a;
          }
          .claim-info {
            background: #f9fafb;
            padding: 15px;
            border-radius: 6px;
            margin-bottom: 20px;
          }
          .claim-info table {
            width: 100%;
          }
          .claim-info td {
            padding: 4px 10px 4px 0;
          }
          .claim-info .label {
            color: #6b7280;
            font-weight: 500;
          }
          .indicator {
            border: 1px solid #e5e7eb;
            border-radius: 6px;
            padding: 12px;
            margin-bottom: 12px;
          }
          .indicator-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
          }
          .indicator-type {
            font-weight: 600;
            color: #374151;
          }
          .indicator-desc {
            color: #4b5563;
            margin-bottom: 8px;
          }
          .indicator-evidence {
            background: #f3f4f6;
            padding: 8px;
            border-radius: 4px;
            font-size: 11px;
          }
          .indicator-action {
            margin-top: 8px;
            padding: 8px;
            background: #eff6ff;
            border-radius: 4px;
            font-size: 11px;
          }
          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            font-size: 10px;
            color: #9ca3af;
            text-align: center;
          }
          .summary {
            background: #f9fafb;
            padding: 15px;
            border-radius: 6px;
            margin: 20px 0;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            ${logoUrl ? `<img src="${logoUrl}" class="logo" alt="Company Logo" />` : `<h1>${org.name}</h1>`}
          </div>
          <div class="org-info">
            ${branding?.phone ? `<div>${branding.phone}</div>` : ""}
            ${branding?.email ? `<div>${branding.email}</div>` : ""}
            ${branding?.website ? `<div>${branding.website}</div>` : ""}
            ${branding?.license ? `<div>License: ${branding.license}</div>` : ""}
          </div>
        </div>

        <h1>🛡️ Bad Faith Analysis Report</h1>
        <p style="color: #6b7280; margin-bottom: 20px;">Generated: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>

        <div class="claim-info">
          <table>
            <tr>
              <td class="label">Claim Number:</td>
              <td><strong>${claim.claimNumber || "N/A"}</strong></td>
              <td class="label">Carrier:</td>
              <td><strong>${claim.carrier || "N/A"}</strong></td>
            </tr>
            <tr>
              <td class="label">Insured:</td>
              <td>${claim.insured_name || "N/A"}</td>
              <td class="label">Policy #:</td>
              <td>${claim.policy_number || "N/A"}</td>
            </tr>
            <tr>
              <td class="label">Property:</td>
              <td colspan="3">${claim.properties?.street || ""}, ${claim.properties?.city || ""}, ${claim.properties?.state || ""} ${claim.properties?.zipCode || ""}</td>
            </tr>
            <tr>
              <td class="label">Date of Loss:</td>
              <td colspan="3">${claim.dateOfLoss ? new Date(claim.dateOfLoss).toLocaleDateString() : "N/A"}</td>
            </tr>
          </table>
        </div>

        <div class="alert-box ${analysis.overallSeverity === "none" ? "success" : analysis.overallSeverity === "low" || analysis.overallSeverity === "medium" ? "warning" : ""}">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <strong>Overall Assessment:</strong> 
              ${getSeverityBadge(analysis.overallSeverity)}
            </div>
            <div>
              ${analysis.legalActionRecommended ? '<span style="color: #dc2626; font-weight: 600;">⚠️ Legal Action Recommended</span>' : ""}
              ${analysis.attorneyReferralSuggested ? '<span style="color: #ea580c; font-weight: 600;">📋 Attorney Referral Suggested</span>' : ""}
            </div>
          </div>
        </div>

        <div class="summary">
          <h2 style="margin-top: 0; border: none;">Summary</h2>
          <p>${analysis.summary || "No summary available."}</p>
        </div>

        <h2>Bad Faith Indicators (${analysis.indicators?.length || 0})</h2>
        
        ${
          analysis.indicators && analysis.indicators.length > 0
            ? analysis.indicators
                .map(
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  (ind: any, idx: number) => `
          <div class="indicator">
            <div class="indicator-header">
              <span class="indicator-type">${idx + 1}. ${formatIndicatorType(ind.type)}</span>
              ${getSeverityBadge(ind.severity)}
            </div>
            <p class="indicator-desc">${ind.description}</p>
            ${
              ind.evidence && ind.evidence.length > 0
                ? `
            <div class="indicator-evidence">
              <strong>Evidence:</strong>
              <ul style="margin: 5px 0 0 20px;">
                ${ind.evidence.map((e: string) => `<li>${e}</li>`).join("")}
              </ul>
            </div>
            `
                : ""
            }
            ${
              ind.legalBasis
                ? `<div style="margin-top: 8px; font-size: 11px;"><strong>Legal Basis:</strong> ${ind.legalBasis}</div>`
                : ""
            }
            <div class="indicator-action">
              <strong>Recommended Action:</strong> ${ind.recommendedAction}
            </div>
          </div>
        `
                )
                .join("")
            : '<p style="color: #6b7280; padding: 20px; text-align: center;">No bad faith indicators detected.</p>'
        }

        <div class="footer">
          <p>This report is generated for informational purposes and does not constitute legal advice.</p>
          <p>Consult with a licensed attorney for legal matters.</p>
          <p style="margin-top: 10px;">© ${new Date().getFullYear()} ${org.name} | Powered by SkaiScraper</p>
        </div>
      </body>
      </html>
    `;

    function formatIndicatorType(type: string) {
      return type
        .split("_")
        .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
    }

    const pdfBuffer = await htmlToPdfBuffer(html);

    logger.info("[BAD_FAITH_EXPORT_PDF]", { userId, orgId, claimId });

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="bad-faith-analysis-${claimId}.pdf"`,
      },
    });
  } catch (error) {
    logger.error("[BAD_FAITH_EXPORT_ERROR]", error);
    return NextResponse.json({ error: "Failed to export PDF" }, { status: 500 });
  }
}
