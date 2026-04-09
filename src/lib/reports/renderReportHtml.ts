/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call */
/**
 * PREMIUM PDF RENDERER
 *
 * Single source of truth for PDF HTML generation.
 * Produces professional, branded reports with:
 * - Cover page with logo and branding
 * - Header/footer on every page
 * - Consistent typography and spacing
 * - Photo grids (2x2 layout)
 * - Section-based layout
 * - A4/Letter sizing compatible
 */

import type { ReportContext } from "./reportContext.schema";

export interface ComposeResult {
  executiveSummary?: string;
  damageAssessment?: string;
  weatherAnalysis?: string;
  scopeComparison?: string;
  photoDocumentation?: string;
  recommendations?: string;
  carrierStrategy?: string;
}

export interface RenderOptions {
  pageSize?: "letter" | "a4";
  showPageNumbers?: boolean;
}

/**
 * Render a professional PDF report as HTML string
 */
export function renderReportHtml(
  context: ReportContext,
  composed: ComposeResult,
  options: RenderOptions = {}
): string {
  const { pageSize = "letter", showPageNumbers = true } = options;

  // Extract data
  const { company, claim, property, weather, media, notes, findings, template } = context;
  const photos = media?.photos || [];
  const _hasWeather = !!weather;

  const templateTitle = template?.name ?? "Report";
  const templateCategory = template?.category ?? "Professional Report";

  // Page dimensions
  const pageWidth = pageSize === "a4" ? "210mm" : "8.5in";
  const pageHeight = pageSize === "a4" ? "297mm" : "11in";

  // Header/footer text from org branding
  const headerText = company.pdfHeaderText || company.name;
  const footerText = company.pdfFooterText || `© ${new Date().getFullYear()} ${company.name}`;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(templateTitle)} - ${escapeHtml(claim.claimNumber)}</title>
  <style>
    /* Reset and base styles */
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    html, body {
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      font-size: 11pt;
      line-height: 1.6;
      color: #1a1a1a;
      background: white;
    }

    /* Page setup */
    @page {
      size: ${pageWidth} ${pageHeight};
      margin: 0.5in;
    }

    .page {
      page-break-after: always;
      position: relative;
      min-height: calc(${pageHeight} - 1in);
    }

    .page:last-child {
      page-break-after: auto;
    }

    /* Header and Footer */
    .header {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      height: 0.4in;
      padding: 0 0.5in;
      border-bottom: 2px solid #e5e7eb;
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 9pt;
      color: #6b7280;
      background: white;
      z-index: 1000;
    }

    .footer {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      height: 0.4in;
      padding: 0 0.5in;
      border-top: 1px solid #e5e7eb;
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 8pt;
      color: #9ca3af;
      background: white;
      z-index: 1000;
    }

    .page-number::after {
      content: counter(page);
    }

    /* Cover page */
    .cover {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: calc(${pageHeight} - 1in);
      text-align: center;
      padding: 2in 1in;
    }

    .cover-logo {
      max-width: 300px;
      max-height: 120px;
      margin-bottom: 2in;
      object-fit: contain;
    }

    .cover-title {
      font-size: 32pt;
      font-weight: 700;
      color: #111827;
      margin-bottom: 0.5in;
      line-height: 1.2;
    }

    .cover-subtitle {
      font-size: 18pt;
      color: #6b7280;
      margin-bottom: 0.25in;
    }

    .cover-claim-info {
      font-size: 14pt;
      color: #374151;
      margin-top: 1in;
      line-height: 1.8;
    }

    .cover-meta {
      margin-top: 0.5in;
      font-size: 11pt;
      color: #9ca3af;
    }

    /* Content pages */
    .content {
      padding-top: 0.6in;
      padding-bottom: 0.6in;
    }

    /* Typography */
    h1 {
      font-size: 24pt;
      font-weight: 700;
      color: #111827;
      margin-bottom: 0.3in;
      margin-top: 0.5in;
      border-bottom: 3px solid #2563eb;
      padding-bottom: 0.1in;
    }

    h1:first-child {
      margin-top: 0;
    }

    h2 {
      font-size: 18pt;
      font-weight: 600;
      color: #1f2937;
      margin-top: 0.4in;
      margin-bottom: 0.2in;
    }

    h3 {
      font-size: 14pt;
      font-weight: 600;
      color: #374151;
      margin-top: 0.3in;
      margin-bottom: 0.15in;
    }

    p {
      margin-bottom: 0.15in;
      text-align: justify;
    }

    /* Info boxes */
    .info-box {
      background: #f3f4f6;
      border-left: 4px solid #2563eb;
      padding: 0.2in;
      margin: 0.2in 0;
      border-radius: 4px;
    }

    .info-box-label {
      font-weight: 600;
      color: #1f2937;
      margin-bottom: 0.05in;
    }

    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.15in;
      margin: 0.2in 0;
    }

    .info-item {
      padding: 0.1in;
      background: #f9fafb;
      border-radius: 4px;
    }

    .info-item-label {
      font-size: 9pt;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 0.05in;
    }

    .info-item-value {
      font-size: 11pt;
      color: #111827;
      font-weight: 500;
    }

    /* Photo grids */
    .photo-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 0.15in;
      margin: 0.2in 0;
      page-break-inside: avoid;
    }

    .photo-item {
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      overflow: hidden;
      page-break-inside: avoid;
    }

    .photo-item img {
      width: 100%;
      height: 2.5in;
      object-fit: cover;
      display: block;
    }

    .photo-caption {
      padding: 0.1in;
      font-size: 9pt;
      color: #374151;
      background: white;
      border-top: 1px solid #e5e7eb;
    }

    .photo-caption-title {
      font-weight: 600;
      color: #111827;
      margin-bottom: 0.03in;
    }

    .photo-caption-meta {
      font-size: 8pt;
      color: #9ca3af;
    }

    /* Lists */
    ul, ol {
      margin-left: 0.3in;
      margin-bottom: 0.15in;
    }

    li {
      margin-bottom: 0.08in;
    }

    /* Tables */
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 0.2in 0;
      font-size: 10pt;
    }

    thead {
      background: #f3f4f6;
      border-bottom: 2px solid #2563eb;
    }

    th {
      padding: 0.1in;
      text-align: left;
      font-weight: 600;
      color: #1f2937;
    }

    td {
      padding: 0.08in 0.1in;
      border-bottom: 1px solid #e5e7eb;
    }

    tbody tr:hover {
      background: #f9fafb;
    }

    /* Weather section */
    .weather-summary {
      background: linear-gradient(135deg, #dbeafe 0%, #e0f2fe 100%);
      border: 2px solid #3b82f6;
      border-radius: 8px;
      padding: 0.2in;
      margin: 0.2in 0;
    }

    .weather-summary h3 {
      color: #117CFF;
      margin-top: 0;
    }

    /* Findings and notes */
    .finding-item, .note-item {
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      padding: 0.15in;
      margin-bottom: 0.15in;
      page-break-inside: avoid;
    }

    .finding-item {
      border-left: 4px solid #dc2626;
    }

    .note-item {
      border-left: 4px solid #2563eb;
    }

    .item-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-bottom: 0.08in;
    }

    .item-title {
      font-weight: 600;
      color: #111827;
      font-size: 11pt;
    }

    .item-date {
      font-size: 9pt;
      color: #9ca3af;
    }

    .item-body {
      color: #374151;
      font-size: 10pt;
    }

    /* Utility classes */
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .text-muted { color: #6b7280; }
    .font-bold { font-weight: 700; }
    .mb-small { margin-bottom: 0.1in; }
    .mb-medium { margin-bottom: 0.2in; }
    .mb-large { margin-bottom: 0.4in; }

    /* Prevent page breaks */
    .no-break {
      page-break-inside: avoid;
    }
  </style>
</head>
<body>
  <!-- Header (appears on all pages except cover) -->
  <div class="header">
    <span>${escapeHtml(headerText)}</span>
    <span>${escapeHtml(claim.claimNumber)}</span>
  </div>

  <!-- Footer (appears on all pages except cover) -->
  <div class="footer">
    <span>${escapeHtml(footerText)}</span>
    ${showPageNumbers ? '<span class="page-number">Page </span>' : ""}
  </div>

  <!-- COVER PAGE -->
  <div class="page cover">
    ${company.logo ? `<img src="${escapeHtml(company.logo)}" alt="${escapeHtml(company.name)}" class="cover-logo">` : ""}
    
    <h1 class="cover-title">${escapeHtml(templateTitle)}</h1>
    <p class="cover-subtitle">${escapeHtml(templateCategory)}</p>
    
    <div class="cover-claim-info">
      <div><strong>Property:</strong> ${escapeHtml(property.address ?? "N/A")}</div>
      <div><strong>Insured:</strong> ${escapeHtml(claim.insured_name || "N/A")}</div>
      <div><strong>Claim Number:</strong> ${escapeHtml(claim.claimNumber)}</div>
      ${claim.lossDate ? `<div><strong>Date of Loss:</strong> ${formatDate(claim.lossDate)}</div>` : ""}
    </div>
    
    <div class="cover-meta">
      Report Generated: ${formatDate(context.generatedAt)}
    </div>
  </div>

  <!-- CLAIM SUMMARY PAGE -->
  <div class="page content">
    <h1>Claim Summary</h1>
    
    <div class="info-grid">
      <div class="info-item">
        <div class="info-item-label">Claim Number</div>
        <div class="info-item-value">${escapeHtml(claim.claimNumber)}</div>
      </div>
      
      <div class="info-item">
        <div class="info-item-label">Insured Name</div>
        <div class="info-item-value">${escapeHtml(claim.insured_name || "N/A")}</div>
      </div>
      
      ${
        claim.lossDate
          ? `
      <div class="info-item">
        <div class="info-item-label">Date of Loss</div>
        <div class="info-item-value">${formatDate(claim.lossDate)}</div>
      </div>
      `
          : ""
      }
      
      ${
        claim.policyNumber
          ? `
      <div class="info-item">
        <div class="info-item-label">Policy Number</div>
        <div class="info-item-value">${escapeHtml(claim.policyNumber)}</div>
      </div>
      `
          : ""
      }
      
      <div class="info-item">
        <div class="info-item-label">Property Address</div>
        <div class="info-item-value">${escapeHtml(property.address ?? "N/A")}</div>
      </div>
    </div>
  </div>

  ${renderExecutiveSummary(composed.executiveSummary)}
  ${renderDamageAssessment(composed.damageAssessment, findings)}
  ${renderWeatherAnalysis(composed.weatherAnalysis, weather)}
  ${renderScopeComparison(composed.scopeComparison, context)}
  ${renderPhotoDocumentation(composed.photoDocumentation, photos)}
  ${renderNotes(notes)}
  ${renderRecommendations(composed.recommendations)}
  ${renderCarrierStrategy(composed.carrierStrategy)}

</body>
</html>
  `.trim();
}

/**
 * Section renderers
 */

function renderExecutiveSummary(content?: string): string {
  if (!content) return "";

  return `
  <div class="page content">
    <h1>Executive Summary</h1>
    ${formatContent(content)}
  </div>
  `;
}

function renderDamageAssessment(content?: string, findings: any[] = []): string {
  if (!content && findings.length === 0) return "";

  return `
  <div class="page content">
    <h1>Damage Assessment</h1>
    
    ${content ? formatContent(content) : ""}
    
    ${
      findings.length > 0
        ? `
      <h2>Inspection Findings</h2>
      ${findings
        .map(
          (finding) => `
        <div class="finding-item no-break">
          <div class="item-header">
            <span class="item-title">${escapeHtml(finding.title || "Finding")}</span>
            ${finding.createdAt ? `<span class="item-date">${formatDate(finding.createdAt)}</span>` : ""}
          </div>
          <div class="item-body">
            ${escapeHtml(finding.description || "")}
            ${finding.severity ? `<div class="mb-small"><strong>Severity:</strong> ${escapeHtml(finding.severity)}</div>` : ""}
            ${finding.location ? `<div><strong>Location:</strong> ${escapeHtml(finding.location)}</div>` : ""}
          </div>
        </div>
      `
        )
        .join("")}
    `
        : ""
    }
  </div>
  `;
}

function renderWeatherAnalysis(content?: string, weather?: any): string {
  if (!content && !weather) return "";

  return `
  <div class="page content">
    <h1>Weather Analysis</h1>
    
    ${
      weather
        ? `
      <div class="weather-summary no-break">
        <h3>Weather Conditions at Time of Loss</h3>
        ${weather.date ? `<p><strong>Date:</strong> ${formatDate(weather.date)}</p>` : ""}
        ${weather.conditions ? `<p><strong>Conditions:</strong> ${escapeHtml(weather.conditions)}</p>` : ""}
        ${weather.temperature ? `<p><strong>Temperature:</strong> ${weather.temperature}°F</p>` : ""}
        ${weather.windSpeed ? `<p><strong>Wind Speed:</strong> ${weather.windSpeed} mph</p>` : ""}
        ${weather.precipitation ? `<p><strong>Precipitation:</strong> ${weather.precipitation} inches</p>` : ""}
        ${weather.summary ? `<p class="mb-small">${escapeHtml(weather.summary)}</p>` : ""}
      </div>
    `
        : ""
    }
    
    ${content ? formatContent(content) : ""}
  </div>
  `;
}

function renderScopeComparison(content?: string, context?: any): string {
  if (!content) return "";

  return `
  <div class="page content">
    <h1>Scope Comparison</h1>
    ${formatContent(content)}
    
    ${
      context?.scopes
        ? `
      <h2>Scope Details</h2>
      ${renderScopeTable(context.scopes)}
    `
        : ""
    }
  </div>
  `;
}

function renderScopeTable(scopes: any): string {
  if (!scopes.carrier && !scopes.adjuster && !scopes.contractor) return "";

  return `
    <table>
      <thead>
        <tr>
          <th>Source</th>
          <th>Total Estimate</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        ${
          scopes.carrier
            ? `
          <tr>
            <td><strong>Carrier Scope</strong></td>
            <td>${scopes.carrier.total ? `$${formatNumber(scopes.carrier.total)}` : "N/A"}</td>
            <td>${escapeHtml(scopes.carrier.status || "N/A")}</td>
          </tr>
        `
            : ""
        }
        ${
          scopes.adjuster
            ? `
          <tr>
            <td><strong>Adjuster Scope</strong></td>
            <td>${scopes.adjuster.total ? `$${formatNumber(scopes.adjuster.total)}` : "N/A"}</td>
            <td>${escapeHtml(scopes.adjuster.status || "N/A")}</td>
          </tr>
        `
            : ""
        }
        ${
          scopes.contractor
            ? `
          <tr>
            <td><strong>Contractor Scope</strong></td>
            <td>${scopes.contractor.total ? `$${formatNumber(scopes.contractor.total)}` : "N/A"}</td>
            <td>${escapeHtml(scopes.contractor.status || "N/A")}</td>
          </tr>
        `
            : ""
        }
      </tbody>
    </table>
  `;
}

function renderPhotoDocumentation(content?: string, photos: any[] = []): string {
  if (!content && photos.length === 0) return "";

  // Split photos into groups of 4 for 2x2 grids
  const photoGroups: any[][] = [];
  for (let i = 0; i < photos.length; i += 4) {
    photoGroups.push(photos.slice(i, i + 4));
  }

  return `
  <div class="page content">
    <h1>Photo Documentation</h1>
    
    ${content ? formatContent(content) : ""}
    
    ${photoGroups
      .map(
        (group) => `
      <div class="photo-grid">
        ${group
          .map(
            (photo) => `
          <div class="photo-item">
            <img src="${escapeHtml(photo.url)}" alt="${escapeHtml(photo.description || "Photo")}">
            <div class="photo-caption">
              <div class="photo-caption-title">${escapeHtml(photo.description || "Inspection Photo")}</div>
              <div class="photo-caption-meta">
                ${photo.takenAt ? formatDate(photo.takenAt) : ""}
                ${photo.location ? ` • ${escapeHtml(photo.location)}` : ""}
              </div>
            </div>
          </div>
        `
          )
          .join("")}
      </div>
    `
      )
      .join("")}
    
    ${
      photos.length > 0
        ? `
      <p class="text-muted text-center mb-medium">
        Total Photos: ${photos.length}
      </p>
    `
        : ""
    }
  </div>
  `;
}

function renderNotes(notes: any[] = []): string {
  if (notes.length === 0) return "";

  return `
  <div class="page content">
    <h1>Inspector Notes</h1>
    
    ${notes
      .map(
        (note) => `
      <div class="note-item no-break">
        <div class="item-header">
          <span class="item-title">${escapeHtml(note.title || "Note")}</span>
          ${note.createdAt ? `<span class="item-date">${formatDate(note.createdAt)}</span>` : ""}
        </div>
        <div class="item-body">
          ${escapeHtml(note.content || "")}
          ${note.author ? `<div class="text-muted">— ${escapeHtml(note.author)}</div>` : ""}
        </div>
      </div>
    `
      )
      .join("")}
  </div>
  `;
}

function renderRecommendations(content?: string): string {
  if (!content) return "";

  return `
  <div class="page content">
    <h1>Recommendations</h1>
    ${formatContent(content)}
  </div>
  `;
}

function renderCarrierStrategy(content?: string): string {
  if (!content) return "";

  return `
  <div class="page content">
    <h1>Carrier Strategy</h1>
    ${formatContent(content)}
  </div>
  `;
}

/**
 * Utility functions
 */

function escapeHtml(text: string): string {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatDate(dateInput: string | Date): string {
  try {
    const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(date);
  } catch {
    return String(dateInput);
  }
}

function formatNumber(num: number): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

function formatContent(content: string): string {
  if (!content) return "";

  // Convert markdown-like formatting to HTML
  // Split into paragraphs and wrap each
  const paragraphs = content.split("\n\n").filter((p) => p.trim());

  return paragraphs
    .map((para) => {
      // Check if it's a heading
      if (para.startsWith("### ")) {
        return `<h3>${escapeHtml(para.replace(/^### /, ""))}</h3>`;
      }
      if (para.startsWith("## ")) {
        return `<h2>${escapeHtml(para.replace(/^## /, ""))}</h2>`;
      }

      // Check if it's a list
      if (para.includes("\n- ") || para.startsWith("- ")) {
        const items = para.split("\n").filter((line) => line.trim().startsWith("- "));
        return `<ul>${items.map((item) => `<li>${escapeHtml(item.replace(/^- /, ""))}</li>`).join("")}</ul>`;
      }

      // Regular paragraph
      return `<p>${escapeHtml(para)}</p>`;
    })
    .join("\n");
}
