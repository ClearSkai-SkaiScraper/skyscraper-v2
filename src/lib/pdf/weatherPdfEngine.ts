// lib/pdf/weatherPdfEngine.ts
// 🔥 WEATHER PDF ENGINE — CARRIER-GRADE, COURT-READY METEOROLOGICAL REPORTS
// Built with pdf-lib for bulletproof, serverless-safe PDF generation

import { PDFDocument, PDFFont, PDFPage, rgb, StandardFonts } from "pdf-lib";

interface WeatherPacket {
  title?: string;
  subtitle?: string;
  dateOfLoss?: string;
  address?: string;
  severity?: string;
  confidence?: string;
  stormSummary?: string;
  hail?: {
    detected?: boolean;
    maxSize?: string;
    probability?: string;
    swathData?: string;
    impactAnalysis?: string;
  };
  wind?: {
    detected?: boolean;
    maxGust?: string;
    sustained?: string;
    structuralRisk?: string;
    roofVulnerability?: string;
  };
  rain?: {
    detected?: boolean;
    totalPrecip?: string;
    intensity?: string;
    floodRisk?: string;
    drainageImpact?: string;
  };
  radar?: {
    summary?: string;
    reflectivity?: string;
    velocity?: string;
    events?: string[];
  };
  iceSnow?: {
    detected?: boolean;
    accumulation?: string;
    freezeDays?: string;
    structuralLoad?: string;
  };
  timeline?: string | string[];
  codeReferences?: {
    roofing?: string;
    wind?: string;
    drainage?: string;
    ice?: string;
  };
  warrantyAnalysis?: string;
  conclusions?: string | string[];
  componentAnalysis?: {
    shingles?: string;
    underlayment?: string;
    flashing?: string;
    ventilation?: string;
    gutters?: string;
  };
  litigationNotes?: string[];
  expertOpinion?: string;
}

interface PDFContext {
  page: PDFPage;
  font: PDFFont;
  bold: PDFFont;
  y: number;
  pdf: PDFDocument;
}

const COLORS = {
  primary: rgb(0.2, 0.2, 0.7), // Deep blue
  secondary: rgb(0.1, 0.1, 0.5), // Darker blue
  text: rgb(0, 0, 0), // Black
  gray: rgb(0.4, 0.4, 0.4), // Gray
  red: rgb(0.8, 0.1, 0.1), // Red for warnings
  green: rgb(0.1, 0.6, 0.1), // Green for positive
};

const SPACING = {
  headerGap: 28,
  sectionGap: 25,
  textGap: 18,
  lineHeight: 14,
  paragraphGap: 6,
};

const SIZES = {
  title: 20,
  subtitle: 12,
  section: 14,
  body: 11,
  small: 9,
};

const MARGINS = {
  left: 40,
  right: 40,
  top: 750,
  bottom: 60,
};

/**
 * Main PDF generation function
 * Converts weather packet JSON into professional, printable PDF
 */
export async function buildWeatherPDF(packet: WeatherPacket): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  let page = pdf.addPage([612, 792]); // Letter size (8.5x11)
  let y = MARGINS.top;

  const ctx: PDFContext = { page, font, bold, y, pdf };

  // HEADER SECTION
  ctx.y = drawHeader(ctx, packet);

  // METADATA SECTION
  ctx.y = drawMetadata(ctx, packet);

  // STORM SUMMARY
  if (packet.stormSummary) {
    ctx.y = drawSection(ctx, "Storm Summary", packet.stormSummary);
  }

  // HAIL ANALYSIS
  if (packet.hail?.detected) {
    const hailText = formatHailSection(packet.hail);
    ctx.y = drawSection(ctx, "Hail Analysis", hailText);
  }

  // WIND ANALYSIS
  if (packet.wind?.detected) {
    const windText = formatWindSection(packet.wind);
    ctx.y = drawSection(ctx, "Wind Analysis", windText);
  }

  // RAINFALL ANALYSIS
  if (packet.rain?.detected) {
    const rainText = formatRainSection(packet.rain);
    ctx.y = drawSection(ctx, "Rainfall Analysis", rainText);
  }

  // RADAR INTERPRETATION
  if (packet.radar?.summary) {
    const radarText = formatRadarSection(packet.radar);
    ctx.y = drawSection(ctx, "Radar Interpretation", radarText);
  }

  // ICE & SNOW FACTORS
  if (packet.iceSnow?.detected) {
    const iceText = formatIceSnowSection(packet.iceSnow);
    ctx.y = drawSection(ctx, "Ice & Snow Factors", iceText);
  }

  // STORM TIMELINE
  if (packet.timeline) {
    const timelineText = Array.isArray(packet.timeline)
      ? packet.timeline.join("\n")
      : packet.timeline;
    ctx.y = drawSection(ctx, "Storm Timeline", timelineText);
  }

  // BUILDING CODE REFERENCES
  if (packet.codeReferences) {
    const codeText = formatCodeReferences(packet.codeReferences);
    ctx.y = drawSection(ctx, "Building Code References", codeText);
  }

  // COMPONENT ANALYSIS (PA/Forensic packets)
  if (packet.componentAnalysis) {
    const componentText = formatComponentAnalysis(packet.componentAnalysis);
    ctx.y = drawSection(ctx, "Component Damage Analysis", componentText);
  }

  // WARRANTY ANALYSIS
  if (packet.warrantyAnalysis) {
    ctx.y = drawSection(ctx, "Warranty Analysis", packet.warrantyAnalysis);
  }

  // LITIGATION NOTES (PA packets)
  if (packet.litigationNotes && packet.litigationNotes.length > 0) {
    const litigationText = packet.litigationNotes
      .map((note, i) => `${i + 1}. ${note}`)
      .join("\n\n");
    ctx.y = drawSection(ctx, "Litigation Support Notes", litigationText);
  }

  // EXPERT OPINION (PA packets)
  if (packet.expertOpinion) {
    ctx.y = drawSection(ctx, "Expert Opinion", packet.expertOpinion);
  }

  // CONCLUSIONS
  if (packet.conclusions) {
    const conclusionText = Array.isArray(packet.conclusions)
      ? packet.conclusions.map((c, i) => `${i + 1}. ${c}`).join("\n\n")
      : packet.conclusions;
    ctx.y = drawSection(ctx, "Conclusions", conclusionText);
  }

  // FOOTER
  drawFooter(ctx.page, ctx.font);

  const pdfBytes = await pdf.save();
  return pdfBytes;
}

/**
 * Draw header with title and subtitle
 */
function drawHeader(ctx: PDFContext, packet: WeatherPacket): number {
  const { page, bold, font } = ctx;
  let y = ctx.y;

  // Title
  page.drawText(packet.title || "Weather Intelligence Report", {
    x: MARGINS.left,
    y,
    size: SIZES.title,
    font: bold,
    color: COLORS.primary,
  });

  y -= SPACING.headerGap;

  // Subtitle
  if (packet.subtitle) {
    page.drawText(packet.subtitle, {
      x: MARGINS.left,
      y,
      size: SIZES.subtitle,
      font,
      color: COLORS.text,
    });
    y -= SPACING.headerGap;
  }

  return y;
}

/**
 * Draw metadata (address, date, severity, confidence)
 */
function drawMetadata(ctx: PDFContext, packet: WeatherPacket): number {
  const { page, font, bold: _bold } = ctx;
  let y = ctx.y - 20;

  const metadata: string[] = [];
  if (packet.address) metadata.push(`Location: ${packet.address}`);
  if (packet.dateOfLoss) metadata.push(`Date of Loss: ${packet.dateOfLoss}`);
  if (packet.severity) metadata.push(`Severity: ${packet.severity}`);
  if (packet.confidence) metadata.push(`Confidence: ${packet.confidence}`);

  metadata.forEach((line) => {
    page.drawText(line, {
      x: MARGINS.left,
      y,
      size: SIZES.small,
      font,
      color: COLORS.gray,
    });
    y -= 12;
  });

  return y - 20;
}

/**
 * Draw section with title and content
 */
function drawSection(ctx: PDFContext, title: string, content: string): number {
  let y = ctx.y;

  // Check if we need a new page
  if (y < MARGINS.bottom + 100) {
    ctx.page = ctx.pdf.addPage([612, 792]);
    y = MARGINS.top;
  }

  // Section title
  ctx.page.drawText(title, {
    x: MARGINS.left,
    y,
    size: SIZES.section,
    font: ctx.bold,
    color: COLORS.secondary,
  });

  y -= SPACING.textGap;

  // Section content (wrapped)
  const lines = wrapText(content, 70);
  for (const line of lines) {
    // New page if needed
    if (y < MARGINS.bottom) {
      ctx.page = ctx.pdf.addPage([612, 792]);
      y = MARGINS.top;
    }

    ctx.page.drawText(line, {
      x: MARGINS.left,
      y,
      size: SIZES.body,
      font: ctx.font,
      color: COLORS.text,
    });
    y -= SPACING.lineHeight;
  }

  return y - SPACING.paragraphGap;
}

/**
 * Draw footer with page number and branding
 */
function drawFooter(page: PDFPage, font: PDFFont): void {
  const footerText = "Generated by SkaiScraper Weather Intelligence";
  const textWidth = font.widthOfTextAtSize(footerText, SIZES.small);

  page.drawText(footerText, {
    x: (612 - textWidth) / 2,
    y: 30,
    size: SIZES.small,
    font,
    color: COLORS.gray,
  });
}

/**
 * Format hail section
 */
function formatHailSection(hail: WeatherPacket["hail"]): string {
  const parts: string[] = [];
  if (hail?.maxSize) parts.push(`Maximum Hail Size: ${hail.maxSize}`);
  if (hail?.probability) parts.push(`Probability: ${hail.probability}`);
  if (hail?.swathData) parts.push(`Swath Data: ${hail.swathData}`);
  if (hail?.impactAnalysis) parts.push(`Impact Analysis: ${hail.impactAnalysis}`);
  return parts.join("\n\n");
}

/**
 * Format wind section
 */
function formatWindSection(wind: WeatherPacket["wind"]): string {
  const parts: string[] = [];
  if (wind?.maxGust) parts.push(`Maximum Gust: ${wind.maxGust}`);
  if (wind?.sustained) parts.push(`Sustained Winds: ${wind.sustained}`);
  if (wind?.structuralRisk) parts.push(`Structural Risk: ${wind.structuralRisk}`);
  if (wind?.roofVulnerability) parts.push(`Roof Vulnerability: ${wind.roofVulnerability}`);
  return parts.join("\n\n");
}

/**
 * Format rain section
 */
function formatRainSection(rain: WeatherPacket["rain"]): string {
  const parts: string[] = [];
  if (rain?.totalPrecip) parts.push(`Total Precipitation: ${rain.totalPrecip}`);
  if (rain?.intensity) parts.push(`Intensity: ${rain.intensity}`);
  if (rain?.floodRisk) parts.push(`Flood Risk: ${rain.floodRisk}`);
  if (rain?.drainageImpact) parts.push(`Drainage Impact: ${rain.drainageImpact}`);
  return parts.join("\n\n");
}

/**
 * Format radar section
 */
function formatRadarSection(radar: WeatherPacket["radar"]): string {
  const parts: string[] = [];
  if (radar?.summary) parts.push(`Summary: ${radar.summary}`);
  if (radar?.reflectivity) parts.push(`Reflectivity: ${radar.reflectivity}`);
  if (radar?.velocity) parts.push(`Velocity: ${radar.velocity}`);
  if (radar?.events && radar.events.length > 0) {
    parts.push(`Events:\n${radar.events.join("\n")}`);
  }
  return parts.join("\n\n");
}

/**
 * Format ice/snow section
 */
function formatIceSnowSection(iceSnow: WeatherPacket["iceSnow"]): string {
  const parts: string[] = [];
  if (iceSnow?.accumulation) parts.push(`Accumulation: ${iceSnow.accumulation}`);
  if (iceSnow?.freezeDays) parts.push(`Freeze Days: ${iceSnow.freezeDays}`);
  if (iceSnow?.structuralLoad) parts.push(`Structural Load: ${iceSnow.structuralLoad}`);
  return parts.join("\n\n");
}

/**
 * Format building code references
 */
function formatCodeReferences(codes: WeatherPacket["codeReferences"]): string {
  const parts: string[] = [];
  if (codes?.roofing) parts.push(`Roofing: ${codes.roofing}`);
  if (codes?.wind) parts.push(`Wind: ${codes.wind}`);
  if (codes?.drainage) parts.push(`Drainage: ${codes.drainage}`);
  if (codes?.ice) parts.push(`Ice Barrier: ${codes.ice}`);
  return parts.join("\n\n");
}

/**
 * Format component analysis
 */
function formatComponentAnalysis(components: WeatherPacket["componentAnalysis"]): string {
  const parts: string[] = [];
  if (components?.shingles) parts.push(`Shingles: ${components.shingles}`);
  if (components?.underlayment) parts.push(`Underlayment: ${components.underlayment}`);
  if (components?.flashing) parts.push(`Flashing: ${components.flashing}`);
  if (components?.ventilation) parts.push(`Ventilation: ${components.ventilation}`);
  if (components?.gutters) parts.push(`Gutters: ${components.gutters}`);
  return parts.join("\n\n");
}

/**
 * Simple word-wrap function
 * Wraps text to specified character width
 */
function wrapText(text: string, width: number): string[] {
  if (!text) return [];

  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";

  for (const word of words) {
    // Handle newlines within text
    if (word.includes("\n")) {
      const splitWords = word.split("\n");
      splitWords.forEach((part, i) => {
        if (i > 0) {
          lines.push(line.trim());
          line = "";
        }
        if ((line + part).length > width) {
          lines.push(line.trim());
          line = part + " ";
        } else {
          line += part + " ";
        }
      });
    } else {
      if ((line + word).length > width) {
        lines.push(line.trim());
        line = word + " ";
      } else {
        line += word + " ";
      }
    }
  }

  if (line.trim().length > 0) {
    lines.push(line.trim());
  }

  return lines;
}
