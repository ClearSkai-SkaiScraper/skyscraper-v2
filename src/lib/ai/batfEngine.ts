/**
 * PHASE 43: BATF ENGINE (Before-After Transformation Flow)
 *
 * AI-powered visual transformation system for roof damage analysis.
 * Generates before/after comparisons, damage overlays, severity maps, and presentations.
 *
 * Key Features:
 * - OpenAI Vision API for damage detection
 * - Replicate for AI-generated before/after images
 * - Damage overlay annotation with severity markers
 * - Heatmap generation for damage distribution
 * - Professional PDF presentation generation
 *
 * Architecture:
 * 1. Upload photos → 2. Analyze damage → 3. Generate overlays → 4. Create presentation
 */

import { jsPDF } from "jspdf";
import Replicate from "replicate";
import sharp from "sharp";

import { getOpenAI } from "@/lib/ai/client";
import { fetchBrandingData, type BrandingData } from "@/lib/pdf/brandedHeader";

const openai = getOpenAI();
const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

// ===========================
// TYPE DEFINITIONS
// ===========================

export interface BATFPhoto {
  url: string;
  uploadedAt: Date;
  metadata?: {
    width?: number;
    height?: number;
    format?: string;
    size?: number;
  };
}

export interface DamageAnalysis {
  damageType: string; // "hail_impact" | "wind_damage" | "missing_shingles" | "cracking" | "wear"
  severity: number; // 0-10 scale
  affectedAreas: Array<{
    region: string; // "ridge" | "valley" | "slope" | "edge" | "flashing"
    percentage: number; // 0-100
    description: string;
  }>;
  estimatedImpact: {
    repairCost: number;
    urgency: "low" | "medium" | "high" | "critical";
    recommendation: string;
  };
}

export interface DamageMarker {
  x: number; // Percentage from left (0-100)
  y: number; // Percentage from top (0-100)
  type: string; // "hail" | "crack" | "missing" | "wear"
  severity: number; // 0-10
  label: string;
}

export interface SeverityMapData {
  imageUrl: string; // Heatmap overlay image
  zones: Array<{
    region: string;
    severity: number; // 0-10
    color: string; // Hex color for heatmap
  }>;
}

// ===========================
// 1. DAMAGE DETECTION
// ===========================

/**
 * Analyze roof photos using OpenAI Vision to detect damage patterns
 */
export async function analyzeRoofDamage(
  photoUrls: string[],
  roofType: "shingle" | "tile" | "metal" | "flat"
): Promise<DamageAnalysis> {
  const prompt = `You are an expert roof inspector analyzing ${roofType} roof damage.

Analyze these roof photos and provide a detailed damage assessment in JSON format:

{
  "damageType": "primary damage type (hail_impact, wind_damage, missing_shingles, cracking, wear)",
  "severity": 0-10 scale (0=no damage, 10=total replacement needed),
  "affectedAreas": [
    {
      "region": "ridge|valley|slope|edge|flashing",
      "percentage": 0-100 (% of region affected),
      "description": "detailed findings for this region"
    }
  ],
  "estimatedImpact": {
    "repairCost": estimated dollars,
    "urgency": "low|medium|high|critical",
    "recommendation": "specific action recommendation"
  }
}

Focus on:
- Hail impact marks (bruising, granule loss)
- Wind damage (lifted/missing shingles)
- Structural damage (cracking, delamination)
- Age-related wear vs storm damage
- Code compliance issues`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          ...photoUrls.map((url) => ({
            type: "image_url" as const,
            image_url: { url },
          })),
        ],
      },
    ],
    response_format: { type: "json_object" },
    max_tokens: 2000,
  });

  const result = JSON.parse(response.choices[0].message.content || "{}");
  return result as DamageAnalysis;
}

// ===========================
// 2. DAMAGE OVERLAY GENERATION
// ===========================

/**
 * Generate annotated image with damage markers overlaid
 */
export async function generateDamageOverlay(
  originalPhotoUrl: string,
  analysis: DamageAnalysis
): Promise<{ overlayUrl: string; markers: DamageMarker[] }> {
  // Step 1: Extract damage locations using Vision API
  const markerPrompt = `Analyze this roof photo and identify EXACT pixel coordinates for each damage location.

Return JSON array of damage markers:
[
  {
    "x": 0-100 (percentage from left edge),
    "y": 0-100 (percentage from top edge),
    "type": "hail|crack|missing|wear",
    "severity": 0-10,
    "label": "short description (e.g., '2in hail mark')"
  }
]

Focus on visible damage that needs annotation.`;

  const markerResponse = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: markerPrompt },
          { type: "image_url", image_url: { url: originalPhotoUrl } },
        ],
      },
    ],
    response_format: { type: "json_object" },
    max_tokens: 1500,
  });

  const markers: DamageMarker[] =
    JSON.parse(markerResponse.choices[0].message.content || "[]").markers || [];

  // Step 2: Download and process image with sharp
  const imageResponse = await fetch(originalPhotoUrl);
  const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
  const image = sharp(imageBuffer);
  const metadata = await image.metadata();
  const width = metadata.width || 1920;
  const height = metadata.height || 1080;

  // Step 3: Create SVG overlay with markers
  const svgMarkers = markers
    .map((marker) => {
      const px = (marker.x / 100) * width;
      const py = (marker.y / 100) * height;
      const color = marker.severity > 7 ? "#FF0000" : marker.severity > 4 ? "#FFA500" : "#FFFF00";

      return `
      <circle cx="${px}" cy="${py}" r="15" fill="${color}" fill-opacity="0.6" stroke="#FFF" stroke-width="2"/>
      <text x="${px}" y="${py + 30}" font-size="14" font-weight="bold" fill="#FFF" text-anchor="middle" stroke="#000" stroke-width="0.5">${marker.label}</text>
    `;
    })
    .join("");

  const svgOverlay = `
    <svg width="${width}" height="${height}">
      ${svgMarkers}
    </svg>
  `;

  // Step 4: Composite overlay onto image
  const overlayBuffer = await image
    .composite([
      {
        input: Buffer.from(svgOverlay),
        top: 0,
        left: 0,
      },
    ])
    .jpeg({ quality: 90 })
    .toBuffer();

  // Step 5: Upload to storage (Supabase or S3)
  const overlayUrl = await uploadToStorage(overlayBuffer, "damage-overlay");

  return { overlayUrl, markers };
}

// ===========================
// 3. AI RECONSTRUCTION
// ===========================

/**
 * Generate AI "before" and "after" images using Replicate
 */
export async function generateAIReconstruction(
  damagedPhotoUrl: string,
  roofType: string
): Promise<{ aiBeforeUrl: string; aiAfterUrl: string }> {
  // Generate "perfect before" (remove damage)
  const beforeOutput = (await replicate.run(
    "stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b",
    {
      input: {
        image: damagedPhotoUrl,
        prompt: `pristine ${roofType} roof in perfect condition, brand new installation, no damage, professional photo, high quality`,
        negative_prompt: "damage, wear, cracks, missing shingles, hail marks, stains, debris",
        num_inference_steps: 50,
        guidance_scale: 7.5,
      },
    }
  )) as string[];

  // Generate "reconstructed after" (repaired version)
  const afterOutput = (await replicate.run(
    "stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b",
    {
      input: {
        image: damagedPhotoUrl,
        prompt: `professionally repaired ${roofType} roof, new materials, expert installation, high quality photo`,
        negative_prompt: "damage, old materials, poor installation, mismatched colors",
        num_inference_steps: 50,
        guidance_scale: 7.5,
      },
    }
  )) as string[];

  return {
    aiBeforeUrl: beforeOutput[0],
    aiAfterUrl: afterOutput[0],
  };
}

// ===========================
// 4. SEVERITY MAP GENERATION
// ===========================

/**
 * Generate heatmap showing damage severity distribution
 */
export async function generateSeverityMap(
  originalPhotoUrl: string,
  analysis: DamageAnalysis
): Promise<SeverityMapData> {
  const imageResponse = await fetch(originalPhotoUrl);
  const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
  const image = sharp(imageBuffer);
  const metadata = await image.metadata();
  const width = metadata.width || 1920;
  const height = metadata.height || 1080;

  // Create zone-based heatmap
  const zones = analysis.affectedAreas.map((area) => ({
    region: area.region,
    severity: (area.percentage / 100) * 10, // Convert to 0-10 scale
    color: getHeatmapColor((area.percentage / 100) * 10),
  }));

  // Generate SVG heatmap overlay
  const heatmapSvg = `
    <svg width="${width}" height="${height}">
      <defs>
        <radialGradient id="heatGradient">
          ${zones.map((z, i) => `<stop offset="${(i / zones.length) * 100}%" stop-color="${z.color}" stop-opacity="0.5"/>`).join("")}
        </radialGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#heatGradient)"/>
    </svg>
  `;

  const heatmapBuffer = await image
    .composite([
      {
        input: Buffer.from(heatmapSvg),
        blend: "over",
      },
    ])
    .jpeg({ quality: 90 })
    .toBuffer();

  const imageUrl = await uploadToStorage(heatmapBuffer, "severity-map");

  return { imageUrl, zones };
}

function getHeatmapColor(severity: number): string {
  if (severity >= 8) return "#8B0000"; // Dark red (critical)
  if (severity >= 6) return "#FF0000"; // Red (severe)
  if (severity >= 4) return "#FFA500"; // Orange (moderate)
  if (severity >= 2) return "#FFFF00"; // Yellow (minor)
  return "#00FF00"; // Green (minimal)
}

// ===========================
// 5. PRESENTATION PDF
// ===========================

/**
 * Generate professional PDF presentation with all BATF data
 */
export async function generateBATFPresentation(reportData: {
  leadAddress: string;
  roofType: string;
  beforePhotos: BATFPhoto[];
  afterPhotos?: BATFPhoto[];
  aiBeforeUrl?: string;
  aiAfterUrl?: string;
  damageOverlay?: string;
  severityMap?: string;
  analysis: DamageAnalysis;
  branding?: BrandingData;
}): Promise<Buffer> {
  const doc = new jsPDF({ format: "letter", unit: "in" });
  const pageWidth = 8.5;
  const pageHeight = 11;
  let yPos = 0.5;
  const branding = reportData.branding;

  // PAGE 1: BRANDED COVER
  // ── Brand color bar at top ──
  const brandHex = branding?.brandColor || "#1e40af";
  const hexResult = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(brandHex);
  const [br, bg, bb] = hexResult
    ? [parseInt(hexResult[1], 16), parseInt(hexResult[2], 16), parseInt(hexResult[3], 16)]
    : [30, 64, 175];

  doc.setFillColor(br, bg, bb);
  doc.rect(0, 0, pageWidth, 0.15, "F");

  // ── Header background ──
  doc.setFillColor(248, 250, 252);
  doc.rect(0, 0.15, pageWidth, 1.9, "F");

  let infoStartX = 0.6;
  let infoEndX = pageWidth - 0.6;

  // Logo (left)
  if (branding?.logoUrl) {
    try {
      const logoRes = await fetch(branding.logoUrl);
      if (logoRes.ok) {
        const logoBuffer = await logoRes.arrayBuffer();
        const logoBase64 = Buffer.from(logoBuffer).toString("base64");
        const ct = logoRes.headers.get("content-type") || "";
        const fmt = ct.includes("jpeg") || ct.includes("jpg") ? "JPEG" : "PNG";
        doc.addImage(
          `data:image/${fmt.toLowerCase()};base64,${logoBase64}`,
          fmt,
          0.6,
          0.35,
          1.0,
          1.0
        );
        infoStartX = 1.8;
      }
    } catch {
      /* skip logo */
    }
  }

  // Headshot (right)
  if (branding?.headshotUrl) {
    try {
      const hsRes = await fetch(branding.headshotUrl);
      if (hsRes.ok) {
        const hsBuffer = await hsRes.arrayBuffer();
        const hsBase64 = Buffer.from(hsBuffer).toString("base64");
        const ct = hsRes.headers.get("content-type") || "";
        const fmt = ct.includes("jpeg") || ct.includes("jpg") ? "JPEG" : "PNG";
        doc.addImage(
          `data:image/${fmt.toLowerCase()};base64,${hsBase64}`,
          fmt,
          pageWidth - 1.6,
          0.35,
          1.0,
          1.0
        );
        infoEndX = pageWidth - 1.8;
      }
    } catch {
      /* skip headshot */
    }
  }

  // Company name
  yPos = 0.55;
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(15);
  doc.setFont("helvetica", "bold");
  let companyLine = branding?.companyName || "SkaiScraper";
  if (branding?.companyLicense) companyLine += ` • Lic #${branding.companyLicense}`;
  doc.text(companyLine, infoStartX, yPos);
  yPos += 0.22;

  // Contact line
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  const contacts: string[] = [];
  if (branding?.companyPhone) contacts.push(branding.companyPhone);
  if (branding?.companyEmail) contacts.push(branding.companyEmail);
  if (branding?.companyWebsite) contacts.push(branding.companyWebsite);
  if (contacts.length) {
    doc.text(contacts.join(" • "), infoStartX, yPos);
    yPos += 0.18;
  }

  // Employee info
  if (branding?.employeeName) {
    doc.setFontSize(9);
    doc.setTextColor(51, 65, 85);
    let empLine = branding.employeeName;
    if (branding.employeeTitle) empLine += ` — ${branding.employeeTitle}`;
    doc.text(empLine, infoStartX, yPos);
    yPos += 0.18;
  }

  // ── Report type bar ──
  const barY = 2.05;
  doc.setFillColor(br, bg, bb);
  doc.rect(0, barY, pageWidth, 0.4, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("ROOF DAMAGE ANALYSIS", 0.6, barY + 0.26);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(
    `Generated: ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`,
    pageWidth - 0.6,
    barY + 0.26,
    { align: "right" }
  );

  yPos = 2.8;

  // Property details
  doc.setFontSize(14);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(60, 60, 60);
  doc.text(`Property: ${reportData.leadAddress}`, 4.25, yPos, { align: "center" });
  yPos += 0.3;
  doc.text(`Roof Type: ${reportData.roofType.toUpperCase()}`, 4.25, yPos, { align: "center" });

  // PAGE 2: BEFORE PHOTOS
  doc.addPage();
  yPos = 1;
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("BEFORE PHOTOS", 1, yPos);
  yPos += 0.5;

  for (const photo of reportData.beforePhotos.slice(0, 2)) {
    doc.addImage(photo.url, "JPEG", 1, yPos, 6.5, 4);
    yPos += 4.5;
  }

  // PAGE 3: DAMAGE OVERLAY
  if (reportData.damageOverlay) {
    doc.addPage();
    yPos = 1;
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("DAMAGE ANALYSIS", 1, yPos);
    yPos += 0.5;

    doc.addImage(reportData.damageOverlay, "JPEG", 1, yPos, 6.5, 4);
    yPos += 4.5;

    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(
      `Primary Damage: ${reportData.analysis.damageType.replace("_", " ").toUpperCase()}`,
      1,
      yPos
    );
    yPos += 0.3;
    doc.text(`Severity Score: ${reportData.analysis.severity}/10`, 1, yPos);
    yPos += 0.3;
    doc.text(
      `Urgency Level: ${reportData.analysis.estimatedImpact.urgency.toUpperCase()}`,
      1,
      yPos
    );
  }

  // PAGE 4: SEVERITY MAP
  if (reportData.severityMap) {
    doc.addPage();
    yPos = 1;
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("SEVERITY HEATMAP", 1, yPos);
    yPos += 0.5;

    doc.addImage(reportData.severityMap, "JPEG", 1, yPos, 6.5, 4);
  }

  // PAGE 5: AI RECONSTRUCTION
  if (reportData.aiBeforeUrl && reportData.aiAfterUrl) {
    doc.addPage();
    yPos = 1;
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("AI BEFORE/AFTER COMPARISON", 1, yPos);
    yPos += 0.5;

    doc.setFontSize(12);
    doc.text("Original Condition (AI Generated):", 1, yPos);
    yPos += 0.3;
    doc.addImage(reportData.aiBeforeUrl, "JPEG", 1, yPos, 3, 2);

    doc.text("Repaired Condition (AI Generated):", 4.5, yPos - 0.3);
    doc.addImage(reportData.aiAfterUrl, "JPEG", 4.5, yPos, 3, 2);
  }

  // PAGE 6: RECOMMENDATIONS
  doc.addPage();
  yPos = 1;
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("RECOMMENDATIONS", 1, yPos);
  yPos += 0.5;

  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  const recommendation = doc.splitTextToSize(
    reportData.analysis.estimatedImpact.recommendation,
    6.5
  );
  doc.text(recommendation, 1, yPos);
  yPos += 0.5;

  doc.setFont("helvetica", "bold");
  doc.text(
    `Estimated Repair Cost: $${reportData.analysis.estimatedImpact.repairCost.toLocaleString()}`,
    1,
    yPos
  );

  // ── Footer on all pages ──
  const totalPages = doc.getNumberOfPages();
  for (let pg = 1; pg <= totalPages; pg++) {
    doc.setPage(pg);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(150, 150, 150);
    doc.setDrawColor(226, 232, 240);
    doc.line(0.6, 10.3, 7.9, 10.3);
    doc.text(`Page ${pg} of ${totalPages}`, 4.25, 10.55, { align: "center" });
    doc.text(
      `Generated by ${branding?.companyName || "SkaiScraper"} • ${new Date().toLocaleDateString()}`,
      0.6,
      10.55
    );
    if (pg === totalPages) {
      doc.setFontSize(6);
      doc.setTextColor(180, 80, 80);
      doc.text(
        "⚠ AI can make mistakes — please review the final report carefully before submission.",
        4.25,
        10.75,
        { align: "center" }
      );
    }
  }

  return Buffer.from(doc.output("arraybuffer"));
}

// ===========================
// UTILITY FUNCTIONS
// ===========================

/**
 * Upload image/PDF to storage (mock implementation - replace with Supabase/S3)
 */
async function uploadToStorage(buffer: Buffer, prefix: string): Promise<string> {
  // TODO: Implement actual Supabase storage upload
  // For now, return mock URL
  const filename = `${prefix}-${Date.now()}.jpg`;
  return `https://storage.example.com/batf/${filename}`;
}

/**
 * Full BATF pipeline orchestrator
 */
export async function runBATFPipeline(
  leadId: string,
  orgId: string,
  beforePhotos: BATFPhoto[],
  roofType: "shingle" | "tile" | "metal" | "flat",
  leadAddress: string
): Promise<{
  analysis: DamageAnalysis;
  damageOverlay: { overlayUrl: string; markers: DamageMarker[] };
  aiReconstruction: { aiBeforeUrl: string; aiAfterUrl: string };
  severityMap: SeverityMapData;
  presentationPdf: Buffer;
}> {
  // Step 1: Analyze damage
  const analysis = await analyzeRoofDamage(
    beforePhotos.map((p) => p.url),
    roofType
  );

  // Step 2: Generate damage overlay
  const damageOverlay = await generateDamageOverlay(beforePhotos[0].url, analysis);

  // Step 3: Generate AI reconstruction
  const aiReconstruction = await generateAIReconstruction(beforePhotos[0].url, roofType);

  // Step 4: Generate severity map
  const severityMap = await generateSeverityMap(beforePhotos[0].url, analysis);

  // Step 5: Fetch branding + generate presentation PDF
  const branding = await fetchBrandingData(orgId).catch(() => ({
    companyName: "SkaiScraper",
    brandColor: "#1e40af",
  }));

  const presentationPdf = await generateBATFPresentation({
    leadAddress,
    roofType,
    beforePhotos,
    aiBeforeUrl: aiReconstruction.aiBeforeUrl,
    aiAfterUrl: aiReconstruction.aiAfterUrl,
    damageOverlay: damageOverlay.overlayUrl,
    severityMap: severityMap.imageUrl,
    analysis,
    branding: branding as BrandingData,
  });

  return {
    analysis,
    damageOverlay,
    aiReconstruction,
    severityMap,
    presentationPdf,
  };
}
