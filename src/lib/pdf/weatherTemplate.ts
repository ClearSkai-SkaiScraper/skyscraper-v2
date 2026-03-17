/**
 * FREE WEATHER STACK - Puppeteer PDF Template
 * Renders weather verification PDF from HTML
 */

import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";

import { logger } from "@/lib/logger";
import { uploadBufferToFirebase } from "@/lib/storage/firebase-admin";
import type { DOLResult, PropertyContext,ScoredEvent } from "@/types/weather";

interface PDFRenderOptions {
  dol: DOLResult;
  scored: ScoredEvent[];
  property: PropertyContext;
  ai_summary: string;
  citations: string[];
  scan_window: { start_utc: string; end_utc: string };
  orgId?: string;
  userId: string;
  brandingOverride?: {
    orgName?: string;
    logoUrl?: string;
    primaryColor?: string;
  };
}

/**
 * Generate weather verification PDF using Puppeteer
 */
export async function renderWeatherPDF(opts: PDFRenderOptions): Promise<string> {
  const {
    dol,
    scored,
    property,
    ai_summary,
    citations,
    scan_window,
    orgId,
    userId,
    brandingOverride,
  } = opts;

  let browser;

  try {
    // Launch Puppeteer (serverless-compatible)
    const isDev = process.env.NODE_ENV === "development";

    if (isDev) {
      // Local development: Use system Chrome
      browser = await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });
    } else {
      // Production: Use @sparticuz/chromium
      browser = await puppeteer.launch({
        args: chromium.args,
        executablePath: await chromium.executablePath(),
        headless: true,
      });
    }

    const page = await browser.newPage();

    // Generate HTML template
    const html = generateWeatherHTML(opts);

    // Set content and wait for load
    await page.setContent(html, {
      waitUntil: "networkidle0",
      timeout: 30000,
    });

    // Generate PDF buffer
    const pdfBuffer = await page.pdf({
      format: "Letter",
      printBackground: true,
      margin: {
        top: "0.5in",
        right: "0.5in",
        bottom: "0.5in",
        left: "0.5in",
      },
    });

    // Upload to Firebase Storage
    const filename = `weather_verification_${userId}_${Date.now()}.pdf`;
    const firebasePath = orgId
      ? `orgs/${orgId}/weather/${filename}`
      : `users/${userId}/weather/${filename}`;

    const { publicUrl } = await uploadBufferToFirebase(
      firebasePath,
      Buffer.from(pdfBuffer),
      "application/pdf"
    );

    console.log("[PDF] Weather PDF generated", {
      userId,
      orgId,
      fileSize: pdfBuffer.byteLength,
      url: publicUrl,
    });

    return publicUrl;
  } catch (error) {
    logger.error("[PDF] Weather PDF generation failed:", error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * Generate HTML template for weather PDF
 */
function generateWeatherHTML(opts: PDFRenderOptions): string {
  const { dol, scored, property, ai_summary, citations, scan_window, brandingOverride } = opts;

  const topEvents = scored.slice(0, 10); // Use scored events which have the score property

  const orgName = brandingOverride?.orgName || "SkaiScrape";
  const primaryColor = brandingOverride?.primaryColor || "#2563eb";
  const logoUrl =
    brandingOverride?.logoUrl ||
    "https://firebasestorage.googleapis.com/v0/b/your-project.appspot.com/o/logo.png";

  const dateStr = new Date(dol.recommended_date_utc).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Weather Verification Report</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 11pt;
      line-height: 1.6;
      color: #1f2937;
      background: white;
    }
    .header {
      border-bottom: 3px solid ${primaryColor};
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .logo {
      height: 40px;
      margin-bottom: 10px;
    }
    h1 {
      font-size: 24pt;
      font-weight: 700;
      color: ${primaryColor};
      margin-bottom: 8px;
    }
    h2 {
      font-size: 14pt;
      font-weight: 600;
      color: #374151;
      margin-top: 24px;
      margin-bottom: 12px;
      border-bottom: 1px solid #e5e7eb;
      padding-bottom: 4px;
    }
    .summary-box {
      background: #f9fafb;
      border-left: 4px solid ${primaryColor};
      padding: 16px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .property-info {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 20px;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #f3f4f6;
    }
    .info-label {
      font-weight: 600;
      color: #6b7280;
    }
    .info-value {
      color: #1f2937;
      text-align: right;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
      font-size: 10pt;
    }
    th {
      background: #f3f4f6;
      padding: 8px;
      text-align: left;
      font-weight: 600;
      color: #374151;
      border-bottom: 2px solid #d1d5db;
    }
    td {
      padding: 8px;
      border-bottom: 1px solid #e5e7eb;
    }
    tr:hover {
      background: #f9fafb;
    }
    .severity-high {
      color: #dc2626;
      font-weight: 600;
    }
    .severity-medium {
      color: #f59e0b;
      font-weight: 600;
    }
    .severity-low {
      color: #10b981;
    }
    .citations {
      font-size: 9pt;
      color: #6b7280;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
    }
    .citations li {
      margin-bottom: 8px;
    }
    .footer {
      margin-top: 40px;
      text-align: center;
      font-size: 9pt;
      color: #9ca3af;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Weather Verification Report</h1>
    <p style="color: #6b7280; font-size: 12pt;">Generated by ${orgName}</p>
  </div>

  <div class="property-info">
    <div class="info-row">
      <span class="info-label">Property Location:</span>
      <span class="info-value">${property.address || `${property.lat.toFixed(4)}, ${property.lon.toFixed(4)}`}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Recommended Date of Loss:</span>
      <span class="info-value">${dateStr}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Confidence Score:</span>
      <span class="info-value">${(dol.confidence * 100).toFixed(0)}%</span>
    </div>
    <div class="info-row">
      <span class="info-label">Events Scanned:</span>
      <span class="info-value">${dol.total_events_scanned}</span>
    </div>
  </div>

  <div class="summary-box">
    <h2 style="margin-top: 0; border-bottom: none;">AI Impact Summary</h2>
    <p>${ai_summary}</p>
  </div>

  <h2>Severe Weather Events (${dateStr})</h2>
  <table>
    <thead>
      <tr>
        <th>Time (UTC)</th>
        <th>Event Type</th>
        <th>Magnitude</th>
        <th>Distance</th>
        <th>Direction</th>
        <th>Score</th>
      </tr>
    </thead>
    <tbody>
      ${topEvents
        .map((e) => {
          const timeStr = new Date(e.time_utc).toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "UTC",
          });
          const typeLabel = e.type.replace(/_/g, " ").toUpperCase();
          const magStr = e.magnitude
            ? e.type === "hail_report"
              ? `${e.magnitude}"`
              : `${e.magnitude} mph`
            : "—";
          const distStr = `${e.distance_miles.toFixed(1)} mi`;
          const severityClass =
            e.score > 50 ? "severity-high" : e.score > 25 ? "severity-medium" : "severity-low";

          return `
          <tr>
            <td>${timeStr}</td>
            <td>${typeLabel}</td>
            <td class="${severityClass}">${magStr}</td>
            <td>${distStr}</td>
            <td>${e.direction_cardinal}</td>
            <td class="${severityClass}">${e.score.toFixed(0)}</td>
          </tr>
        `;
        })
        .join("")}
    </tbody>
  </table>

  <div class="citations">
    <h2 style="font-size: 11pt;">Data Sources</h2>
    <ul>
      ${citations.map((c) => `<li>${c}</li>`).join("")}
    </ul>
    <p style="margin-top: 12px;">
      Scan Period: ${scan_window.start_utc} to ${scan_window.end_utc}
    </p>
  </div>

  <div class="footer">
    <p>This report was generated automatically by ${orgName}.</p>
    <p>For questions or concerns, please contact your insurance adjuster.</p>
  </div>
</body>
</html>
  `;
}
