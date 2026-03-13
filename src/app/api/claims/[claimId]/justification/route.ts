/**
 * Justification Report Generator
 * POST /api/claims/[claimId]/justification
 *
 * Pulls claim data + weather + YOLO detections + supplements
 * → GPT-4o justification engine
 * → PDF renderer
 * → Supabase upload
 * → file_assets record
 *
 * Returns the generated PDF URL and structured report data.
 */

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { safeOrgContext } from "@/lib/safeOrgContext";
import { NextRequest, NextResponse } from "next/server";

import {
  generateJustificationReport,
  type JustificationInput,
} from "@/lib/ai/justification-engine";
import { renderJustificationPDF } from "@/lib/pdf/justification-pdf";
import { getStorageClient } from "@/lib/storage/client";

export const dynamic = "force-dynamic";
export const maxDuration = 120; // AI generation + PDF rendering

export async function POST(request: NextRequest, { params }: { params: { claimId: string } }) {
  try {
    // ── Auth ──────────────────────────────────────────────────────────────
    const ctx = await safeOrgContext();
    if (!ctx.ok || !ctx.orgId || !ctx.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { orgId, userId } = ctx;
    const { claimId } = params;

    if (!claimId) {
      return NextResponse.json({ error: "claimId is required" }, { status: 400 });
    }

    logger.info("[JUSTIFICATION] Starting generation", { claimId, orgId });

    // ── 1. Fetch claim data (with related property for address/roof) ────
    const claim = await prisma.claims.findFirst({
      where: { id: claimId, orgId },
      select: {
        id: true,
        claimNumber: true,
        insured_name: true,
        homeownerEmail: true,
        dateOfLoss: true,
        carrier: true,
        policy_number: true,
        damageType: true,
        properties: {
          select: {
            street: true,
            city: true,
            state: true,
            zipCode: true,
            roofType: true,
            roofAge: true,
          },
        },
      },
    });

    if (!claim) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }

    // Normalize claim data into the JustificationInput shape
    const claimInput: JustificationInput["claim"] = {
      id: claim.id,
      claimNumber: claim.claimNumber,
      homeownerName: claim.insured_name ?? null,
      homeownerEmail: claim.homeownerEmail ?? null,
      propertyAddress: claim.properties?.street ?? null,
      city: claim.properties?.city ?? null,
      state: claim.properties?.state ?? null,
      zip: claim.properties?.zipCode ?? null,
      dateOfLoss: claim.dateOfLoss?.toISOString().split("T")[0] ?? null,
      insuranceCarrier: claim.carrier ?? null,
      policyNumber: claim.policy_number ?? null,
      claimType: claim.damageType ?? null,
      roofType: claim.properties?.roofType ?? null,
      roofAge: claim.properties?.roofAge ?? null,
    };

    // ── 2. Fetch weather data ────────────────────────────────────────────
    const weatherReport = await prisma.weather_reports.findFirst({
      where: { claimId },
      orderBy: { createdAt: "desc" },
    });

    let weatherInput: JustificationInput["weather"] = null;
    if (weatherReport) {
      // Extract hail/wind from providerRaw JSON (same pattern as buildClaimContext)
      const rawWeather = weatherReport.providerRaw as Record<string, unknown> | null;

      // Also scan events JSON for per-event hail/wind data
      const eventsJson = (weatherReport.events as Record<string, unknown>[] | null) ?? [];
      let eventHailSize: number | null = null;
      let eventWindSpeed: number | null = null;
      const stormEvents: Array<{ type: string; severity: string; description?: string }> = [];

      for (const ev of eventsJson) {
        if (typeof ev === "object" && ev !== null) {
          if ("hailSize" in ev && ev.hailSize) eventHailSize = Number(ev.hailSize);
          if ("windSpeed" in ev && ev.windSpeed) eventWindSpeed = Number(ev.windSpeed);
          stormEvents.push({
            type: String((ev as Record<string, unknown>).type || "storm"),
            severity: String((ev as Record<string, unknown>).severity || "unknown"),
            description: (ev as Record<string, unknown>).description as string | undefined,
          });
        }
      }

      weatherInput = {
        hailSizeInches: (rawWeather?.maxHailInches as number) ?? eventHailSize ?? null,
        maxWindSpeed:
          (rawWeather?.maxWindGustMph as number) ??
          (rawWeather?.maxSustainedWindMph as number) ??
          eventWindSpeed ??
          null,
        stormEvents,
        weatherNarrative: weatherReport.overallAssessment ?? null,
        source: weatherReport.mode ?? "Weather Report",
      };
    }

    // ── 3. Fetch YOLO detections from analyzed photos ────────────────────
    const photos = await prisma.file_assets.findMany({
      where: {
        orgId,
        claimId,
        category: "photo",
        analyzed_at: { not: null },
      },
      select: {
        metadata: true,
        ai_severity: true,
        ai_damage: true,
      },
    });

    // Aggregate detections across all photos
    const byCategory: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};
    const byComponent: Record<string, number> = {};
    const topDetections: JustificationInput["detections"]["topDetections"] = [];
    let totalDetections = 0;

    for (const photo of photos) {
      const meta = photo.metadata as Record<string, unknown> | null;
      const boxes = (meta?.damageBoxes || []) as Array<{
        label?: string;
        score?: number;
        severity?: string;
        sourceModel?: string;
      }>;

      for (const box of boxes) {
        totalDetections++;
        const label = box.label || "unknown";
        const severity = box.severity || "Medium";

        byCategory[label] = (byCategory[label] || 0) + 1;
        bySeverity[severity] = (bySeverity[severity] || 0) + 1;

        // Derive component from label
        const component = deriveComponent(label);
        byComponent[component] = (byComponent[component] || 0) + 1;

        topDetections.push({
          type: label,
          confidence: box.score || 0,
          severity,
          component,
        });
      }

      // Also use ai_damage tags
      if (photo.ai_damage?.length) {
        for (const tag of photo.ai_damage) {
          byCategory[tag] = (byCategory[tag] || 0) + 1;
          totalDetections++;
        }
      }
    }

    // Sort top detections by confidence
    topDetections.sort((a, b) => b.confidence - a.confidence);

    const detections: JustificationInput["detections"] = {
      totalPhotosAnalyzed: photos.length,
      totalDetections,
      byCategory,
      bySeverity,
      byComponent,
      topDetections: topDetections.slice(0, 15),
    };

    // ── 4. Fetch supplements ─────────────────────────────────────────────
    const supplements = await prisma.claim_supplements.findMany({
      where: { claim_id: claimId },
      select: {
        data: true,
        status: true,
        total_cents: true,
        review_notes: true,
      },
    });

    const supplementInput: JustificationInput["supplements"] = supplements.map((s) => {
      const data = s.data as Record<string, unknown> | null;
      return {
        title: (data?.title as string) || (data?.name as string) || undefined,
        status: s.status || undefined,
        totalAmount: s.total_cents ? Number(s.total_cents) / 100 : undefined,
      };
    });

    // ── 5. Fetch org branding ────────────────────────────────────────────
    const org = await prisma.org.findUnique({
      where: { id: orgId },
      select: { name: true, brandLogoUrl: true },
    });

    // ── 6. Generate justification report via GPT-4o ──────────────────────
    const input: JustificationInput = {
      claim: claimInput,
      weather: weatherInput,
      detections,
      supplements: supplementInput,
      orgName: org?.name || undefined,
      orgLogo: org?.brandLogoUrl || undefined,
    };

    const report = await generateJustificationReport(input);

    logger.info("[JUSTIFICATION] AI report generated", {
      claimId,
      findings: report.damageFindings.length,
      arguments: report.carrierArguments.length,
    });

    // ── 7. Render PDF ────────────────────────────────────────────────────
    const pdfBuffer = renderJustificationPDF({
      report,
      claim: claimInput,
      orgName: org?.name || undefined,
    });

    // ── 8. Upload to Supabase ────────────────────────────────────────────
    const supabase = getStorageClient();
    if (!supabase) {
      throw new Error("Storage not configured");
    }

    const timestamp = Date.now();
    const safeClaimNum = (claim.claimNumber || claimId).replace(/[^a-zA-Z0-9-]/g, "_");
    const storagePath = `${orgId}/justification/${safeClaimNum}_justification_${timestamp}.pdf`;

    const { error: uploadError } = await supabase.storage
      .from("documents")
      .upload(storagePath, pdfBuffer, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      logger.error("[JUSTIFICATION] Upload failed", { error: uploadError.message });
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    const { data: urlData } = supabase.storage.from("documents").getPublicUrl(storagePath);
    const publicUrl = urlData.publicUrl;

    // ── 9. Create file_assets record ─────────────────────────────────────
    const docTitle = `Storm Damage Justification — ${claim.claimNumber || claimId}`;

    await prisma.file_assets.create({
      data: {
        id: crypto.randomUUID(),
        orgId,
        ownerId: userId,
        claimId,
        filename: `${safeClaimNum}_justification_${timestamp}.pdf`,
        mimeType: "application/pdf",
        sizeBytes: pdfBuffer.length,
        storageKey: storagePath,
        bucket: "documents",
        publicUrl,
        category: "document",
        file_type: "JUSTIFICATION",
        source: "ai",
        note: docTitle,
        ai_tags: ["justification", "carrier-ready", "storm-damage"],
        updatedAt: new Date(),
        metadata: {
          reportType: "JUSTIFICATION",
          generatedBy: "ClaimIQ",
          damageFindings: report.damageFindings.length,
          collateralEvidence: report.collateralEvidence.length,
          carrierArguments: report.carrierArguments.length,
          recommendation: report.recommendation,
          detectionSummary: detections,
        },
      },
    });

    logger.info("[JUSTIFICATION] Complete — saved to documents", {
      claimId,
      publicUrl,
      pdfSize: pdfBuffer.length,
    });

    return NextResponse.json({
      success: true,
      pdfUrl: publicUrl,
      report,
      documentTitle: docTitle,
    });
  } catch (error) {
    logger.error("[JUSTIFICATION] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to generate justification report",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function deriveComponent(label: string): string {
  const lc = label.toLowerCase();
  if (
    lc.includes("roof") ||
    lc.includes("shingle") ||
    lc.includes("hail") ||
    lc.includes("granule")
  )
    return "roof";
  if (lc.includes("gutter") || lc.includes("downspout")) return "gutter";
  if (lc.includes("vent") || lc.includes("flashing") || lc.includes("soft metal"))
    return "soft_metals";
  if (lc.includes("ac") || lc.includes("hvac") || lc.includes("condenser")) return "hvac";
  if (lc.includes("window") || lc.includes("screen")) return "window";
  if (lc.includes("siding") || lc.includes("stucco")) return "siding";
  if (lc.includes("door")) return "door";
  if (lc.includes("crack") || lc.includes("foundation")) return "foundation";
  if (lc.includes("water") || lc.includes("mold")) return "interior";
  if (lc.includes("fence") || lc.includes("deck") || lc.includes("mailbox")) return "collateral";
  if (lc.includes("spatter") || lc.includes("directional")) return "directional_evidence";
  return "general";
}
