/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call */
/**
 * PDF Generation Functions for Reports
 * Quick implementation using existing Puppeteer infrastructure
 * TODO: Migrate to @react-pdf/renderer (see PDF_STANDARDIZATION_PLAN.md)
 */

import { htmlToPdfBuffer, uploadReport } from "./pdf-utils";
import type { DepreciationReportPayload } from "./types";

/**
 * Generate Depreciation Package PDF
 * Creates invoice, lien waiver, certificate bundle
 */
export async function generateDepreciationPDF(
  payload: DepreciationReportPayload
): Promise<{ url: string; storageKey: string }> {
  const html = generateDepreciationHTML(payload);
  const pdfBuffer = await htmlToPdfBuffer(html, { format: "Letter" });

  const filename = `depreciation-${payload.claim.claimNumber}-${Date.now()}.pdf`;
  const key = `reports/depreciation/${filename}`;
  const url = await uploadReport({
    bucket: "reports",
    key,
    buffer: pdfBuffer,
    retries: 2,
  });

  return { url, storageKey: key };
}

/**
 * Generate Supplement Request PDF
 */
export async function generateSupplementPDF(
  claimData: any,
  supplementItems: any[]
): Promise<{ url: string; storageKey: string }> {
  const html = generateSupplementHTML(claimData, supplementItems);
  const pdfBuffer = await htmlToPdfBuffer(html, { format: "Letter" });

  const filename = `supplement-${claimData.claimNumber}-${Date.now()}.pdf`;
  const key = `reports/supplement/${filename}`;
  const url = await uploadReport({
    bucket: "reports",
    key,
    buffer: pdfBuffer,
    retries: 2,
  });

  return { url, storageKey: key };
}

/**
 * Generate Completion Certificate PDF
 */
export async function generateCertificatePDF(
  claimData: any,
  completionData: any
): Promise<{ url: string; storageKey: string }> {
  const html = generateCertificateHTML(claimData, completionData);
  const pdfBuffer = await htmlToPdfBuffer(html, { format: "Letter" });

  const filename = `certificate-${claimData.claimNumber}-${Date.now()}.pdf`;
  const key = `reports/certificate/${filename}`;
  const url = await uploadReport({
    bucket: "reports",
    key,
    buffer: pdfBuffer,
    retries: 2,
  });

  return { url, storageKey: key };
}

// ============================================================================
// HTML TEMPLATES
// ============================================================================

function generateDepreciationHTML(payload: DepreciationReportPayload): string {
  const { claim, branding, financials } = payload;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 40px;
      color: #333;
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 3px solid ${branding?.colorPrimary || "#117CFF"};
    }
    .logo {
      max-width: 200px;
      margin-bottom: 20px;
    }
    h1 {
      color: ${branding?.colorPrimary || "#117CFF"};
      margin: 0;
    }
    .company-info {
      font-size: 12px;
      color: #666;
      margin-top: 10px;
    }
    .section {
      margin: 30px 0;
    }
    .section-title {
      background: ${branding?.colorPrimary || "#117CFF"};
      color: white;
      padding: 10px;
      font-size: 18px;
      font-weight: bold;
      margin-bottom: 15px;
    }
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
      margin-bottom: 20px;
    }
    .info-item {
      padding: 10px;
      background: #f5f5f5;
      border-left: 4px solid ${branding?.colorAccent || "#FFC838"};
    }
    .info-label {
      font-weight: bold;
      color: #666;
      font-size: 12px;
    }
    .info-value {
      font-size: 16px;
      color: #333;
      margin-top: 5px;
    }
    .financial-table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    .financial-table th {
      background: #f0f0f0;
      padding: 12px;
      text-align: left;
      font-weight: bold;
      border-bottom: 2px solid #ddd;
    }
    .financial-table td {
      padding: 10px 12px;
      border-bottom: 1px solid #eee;
    }
    .financial-total {
      font-weight: bold;
      font-size: 18px;
      background: #f9f9f9;
    }
    .footer {
      margin-top: 50px;
      padding-top: 20px;
      border-top: 2px solid #ddd;
      text-align: center;
      font-size: 12px;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="header">
    ${branding?.logoUrl ? `<img src="${branding.logoUrl}" class="logo" alt="Company Logo">` : ""}
    <h1>Depreciation Release Package</h1>
    <div class="company-info">
      ${branding?.companyName || ""}
      ${branding?.license ? ` • License: ${branding.license}` : ""}
      ${branding?.phone ? ` • ${branding.phone}` : ""}
    </div>
  </div>

  <div class="section">
    <div class="section-title">Claim Information</div>
    <div class="info-grid">
      <div class="info-item">
        <div class="info-label">Claim Number</div>
        <div class="info-value">${claim.claimNumber || "N/A"}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Property Address</div>
        <div class="info-value">${claim.address || "N/A"}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Loss Date</div>
        <div class="info-value">${claim.lossDate ? new Date(claim.lossDate).toLocaleDateString() : "N/A"}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Peril</div>
        <div class="info-value">${claim.peril || "N/A"}</div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Financial Summary</div>
    <table class="financial-table">
      <tr>
        <th>Description</th>
        <th style="text-align: right;">Amount</th>
      </tr>
      <tr>
        <td>Total Approved Amount (RCV)</td>
        <td style="text-align: right;">$${(financials.rcv || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
      </tr>
      <tr>
        <td>Initial Payment (ACV)</td>
        <td style="text-align: right;">$${(financials.acv || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
      </tr>
      <tr>
        <td>Deductible</td>
        <td style="text-align: right;">-$${(financials.deductible || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
      </tr>
      <tr>
        <td>Depreciation Withheld</td>
        <td style="text-align: right;">$${(financials.depreciation || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
      </tr>
      ${
        (financials.supplementsTotal ?? 0) > 0
          ? `
      <tr>
        <td>Approved Supplements</td>
        <td style="text-align: right;">$${(financials.supplementsTotal || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
      </tr>
      `
          : ""
      }
      <tr class="financial-total">
        <td><strong>Total Due to Contractor</strong></td>
        <td style="text-align: right;"><strong>$${(financials.totalDue || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}</strong></td>
      </tr>
    </table>
  </div>

  ${
    payload.notesToCarrier
      ? `
  <div class="section">
    <div class="section-title">Notes to Carrier</div>
    <div style="padding: 15px; background: #f9f9f9; border-left: 4px solid ${branding?.colorAccent || "#FFC838"};">
      ${payload.notesToCarrier}
    </div>
  </div>
  `
      : ""
  }

  <div class="footer">
    <p>This depreciation release package confirms completion of repairs and requests final payment.</p>
    <p>Generated on ${new Date().toLocaleDateString()} by ${branding?.companyName || "SkaiScraper"}</p>
    ${branding?.website ? `<p>${branding.website}</p>` : ""}
  </div>
</body>
</html>
  `;
}

function generateSupplementHTML(claimData: any, supplementItems: any[]): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; }
    h1 { color: #117CFF; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background: #f0f0f0; }
  </style>
</head>
<body>
  <h1>Supplement Request</h1>
  <p><strong>Claim:</strong> ${claimData.claimNumber || "N/A"}</p>
  <p><strong>Address:</strong> ${claimData.address || "N/A"}</p>
  <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
  
  <h2>Additional Items</h2>
  <table>
    <tr>
      <th>Item</th>
      <th>Description</th>
      <th>Amount</th>
    </tr>
    ${supplementItems
      .map(
        (item, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${item.description || "Additional Work"}</td>
        <td>$${(item.amount || 0).toFixed(2)}</td>
      </tr>
    `
      )
      .join("")}
  </table>
  
  <p><strong>Total Supplement Amount:</strong> $${supplementItems.reduce((sum, item) => sum + (item.amount || 0), 0).toFixed(2)}</p>
</body>
</html>
  `;
}

function generateCertificateHTML(claimData: any, completionData: any): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; text-align: center; }
    h1 { color: #117CFF; font-size: 36px; margin-bottom: 30px; }
    .certificate-box { border: 5px solid #117CFF; padding: 40px; margin: 20px 0; }
    p { font-size: 18px; line-height: 1.6; }
  </style>
</head>
<body>
  <h1>Certificate of Completion</h1>
  <div class="certificate-box">
    <p><strong>This certifies that repairs have been completed for:</strong></p>
    <p style="font-size: 24px; margin: 20px 0;"><strong>${claimData.address || "Property Address"}</strong></p>
    <p><strong>Claim Number:</strong> ${claimData.claimNumber || "N/A"}</p>
    <p><strong>Completion Date:</strong> ${completionData.completionDate ? new Date(completionData.completionDate).toLocaleDateString() : new Date().toLocaleDateString()}</p>
    <p style="margin-top: 40px;">All work has been completed to industry standards and per the approved scope of work.</p>
  </div>
</body>
</html>
  `;
}
