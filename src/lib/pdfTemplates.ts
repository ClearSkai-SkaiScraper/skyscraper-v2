/**
 * PDF Template Rendering with Citation Support
 * Generates HTML for PDF export with automatic footnotes
 */

import type { Citation } from "./citations";

export type DamageBox = {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  score?: number;
};

export type PdfTemplateData = {
  brand?: { logoUrl?: string };
  heading?: string;
  property?: { address?: string };
  photos?: Array<{ url: string; caption?: string; boxes?: DamageBox[] }>;
  ai_summary?: string;
  ai_summary_html?: string;
  notes?: string;
  citations?: Citation[];
  mode?: "inspection" | "insurance" | "retail";
};

/**
 * Render complete PDF HTML with citations
 */
export function renderPdfHtml(mode: string, data: PdfTemplateData): string {
  const {
    brand,
    heading = "Report",
    property,
    photos = [],
    ai_summary = "",
    ai_summary_html = "",
    notes = "",
    citations = [],
  } = data;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
      font-size: 11pt;
      line-height: 1.5;
      color: #1a1a1a;
      padding: 40px;
      max-width: 800px;
      margin: 0 auto;
    }
    
    .header {
      display: flex;
      align-items: center;
      gap: 16px;
      border-bottom: 2px solid #e5e7eb;
      padding-bottom: 16px;
      margin-bottom: 24px;
    }
    
    .logo {
      height: 48px;
      width: auto;
    }
    
    .title {
      font-size: 24pt;
      font-weight: 700;
      color: #111827;
    }
    
    .subtitle {
      color: #6b7280;
      font-size: 12pt;
      margin-top: 4px;
    }
    
    h2 {
      font-size: 16pt;
      font-weight: 600;
      margin-top: 24px;
      margin-bottom: 12px;
      color: #374151;
    }
    
    .summary {
      background: #f9fafb;
      padding: 16px;
      border-radius: 8px;
      white-space: pre-wrap;
      border-left: 4px solid #3b82f6;
      margin-bottom: 16px;
    }
    
    .summary sup.cs-foot {
      font-size: 8pt;
      vertical-align: super;
      color: #3b82f6;
    }
    
    .photos {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
      margin: 16px 0;
    }
    
    figure {
      margin: 0;
      break-inside: avoid;
    }
    
    .photo-wrap {
      position: relative;
      display: inline-block;
      width: 100%;
    }
    
    figure img {
      width: 100%;
      height: auto;
      border-radius: 6px;
      border: 1px solid #e5e7eb;
      display: block;
    }
    
    .damage-box {
      position: absolute;
      border: 2pt solid #ef4444;
      border-radius: 8pt;
      pointer-events: none;
    }
    
    .damage-label {
      position: absolute;
      background: #ef4444;
      color: #fff;
      font-size: 8pt;
      padding: 2pt 4pt;
      border-radius: 4pt;
      white-space: nowrap;
      transform: translateY(-100%);
      margin-top: -2pt;
    }
    
    figcaption {
      font-size: 9pt;
      color: #6b7280;
      margin-top: 4px;
      padding: 0 4px;
    }
    
    .footnotes {
      margin-top: 32px;
      padding-top: 16px;
      border-top: 1px solid #e5e7eb;
    }
    
    .footnotes h2 {
      font-size: 14pt;
      margin-bottom: 12px;
    }
    
    .footnotes ol {
      padding-left: 24px;
    }
    
    .footnotes li {
      margin-bottom: 8px;
      font-size: 9pt;
      color: #4b5563;
    }
    
    .footnote-label {
      font-weight: 600;
      color: #111827;
    }
    
    .footnote-source {
      font-style: italic;
      color: #6b7280;
    }
    
    .footnote-url {
      word-break: break-all;
      color: #3b82f6;
      font-size: 8pt;
      display: block;
      margin-top: 2px;
    }
    
    .footnote-date {
      color: #9ca3af;
      font-size: 8pt;
    }
    
    @media print {
      body { padding: 20px; }
      .header { page-break-after: avoid; }
      figure { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="header">
    ${brand?.logoUrl ? `<img class="logo" src="${brand.logoUrl}" alt="Logo" />` : ""}
    <div>
      <div class="title">${escapeHtml(heading)}</div>
      ${property?.address ? `<div class="subtitle">${escapeHtml(property.address)}</div>` : ""}
    </div>
  </div>

  <h2>Summary</h2>
  <div class="summary">${ai_summary_html || escapeHtml(ai_summary || notes || "No summary available")}</div>

  ${
    photos.length > 0
      ? `
    <h2>Photos</h2>
    <div class="photos">
      ${photos
        .map(
          (p) => `
        <figure>
          <div class="photo-wrap">
            <img src="${p.url}" alt="Inspection photo" crossorigin="anonymous" />
            ${renderDamageBoxes(p.boxes || [])}
          </div>
          ${p.caption ? `<figcaption>${escapeHtml(p.caption)}</figcaption>` : ""}
        </figure>
      `
        )
        .join("")}
    </div>
  `
      : ""
  }

  ${
    citations.length > 0
      ? `
    <div class="footnotes">
      <h2>References</h2>
      <ol>
        ${citations
          .map(
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            (c, i) => `
          <li>
            <span class="footnote-label">${escapeHtml(c.label)}</span>
            ${c.source ? `<span class="footnote-source"> — ${escapeHtml(c.source)}</span>` : ""}
            ${c.url ? `<span class="footnote-url">${escapeHtml(c.url)}</span>` : ""}
            ${c.retrievedAt ? `<span class="footnote-date">(retrieved ${new Date(c.retrievedAt).toLocaleDateString()})</span>` : ""}
          </li>
        `
          )
          .join("")}
      </ol>
    </div>
  `
      : ""
  }
  
  <!-- Ethics tagline & small footer -->
  <div style="margin-top:28px;padding-top:12px;border-top:1px solid #e5e7eb;font-size:9pt;color:#6b7280;display:flex;justify-content:space-between;align-items:center;gap:12px;">
    <div>We document damage — we do not dictate coverage.</div>
    <div style="opacity:0.85;font-variant:small-caps;font-size:8pt;">Integrity-Verified Documentation • Carrier-Preferred Formatting</div>
  </div>
</body>
</html>
`;
}

function renderDamageBoxes(boxes: DamageBox[]): string {
  return boxes
    .map(
      (b) => `
    <div class="damage-box" style="left:${b.x * 100}%; top:${b.y * 100}%; width:${b.w * 100}%; height:${b.h * 100}%;">
      <div class="damage-label">${b.label.replace(/_/g, " ")}</div>
    </div>
  `
    )
    .join("");
}

function escapeHtml(str: string): string {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
