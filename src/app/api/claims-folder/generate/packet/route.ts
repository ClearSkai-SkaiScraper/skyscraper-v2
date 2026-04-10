export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Threshold Packet Generation API
 *
 * POST /api/claims-folder/generate/packet
 *   body: { claimId, mode, threshold?, sectionKeys? }
 *
 * Modes:
 *   - "ready-only"    — Generate only sections that are ready (≥75% complete)
 *   - "threshold"     — Generate when overall score meets minimum threshold
 *   - "selected"      — Generate specific sections by key
 *   - "all"           — Force-generate all sections (existing behavior)
 */

import { createId } from "@paralleldrive/cuid2";
import { type NextRequest,NextResponse } from "next/server";
import { z } from "zod";

import { getOrgClaimOrThrow, OrgScopeError } from "@/lib/auth/orgScope";
import { isAuthError, requireAuth } from "@/lib/auth/requireAuth";
import { assessClaimReadiness } from "@/lib/claimiq/assembly-engine";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

const RequestSchema = z.object({
  claimId: z.string().min(1),
  mode: z.enum(["ready-only", "threshold", "selected", "all"]),
  /** For threshold mode: minimum overall score (0-100) */
  threshold: z.number().min(0).max(100).optional().default(60),
  /** For selected mode: which sections to generate */
  sectionKeys: z.array(z.string()).optional(),
  /** Export format */
  format: z.enum(["pdf", "zip", "json"]).optional().default("pdf"),
});

/** Sections that can be auto-generated */
const GENERATABLE_SECTIONS: Record<string, { endpoint: string; label: string }> = {
  "executive-summary": {
    endpoint: "/api/claims-folder/generate/executive-summary",
    label: "Executive Summary",
  },
  "weather-cause": {
    endpoint: "/api/claims-folder/generate/cause-of-loss",
    label: "Weather / Cause of Loss",
  },
  "repair-justification": {
    endpoint: "/api/claims-folder/generate/repair-justification",
    label: "Repair Justification",
  },
  "adjuster-cover-letter": {
    endpoint: "/api/claims-folder/generate/cover-letter",
    label: "Adjuster Cover Letter",
  },
};

interface GenerationResult {
  sectionKey: string;
  label: string;
  success: boolean;
  error?: string;
  durationMs: number;
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (isAuthError(auth)) return auth;
    const { orgId, userId } = auth;

    const body = await request.json();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { claimId, mode, threshold, sectionKeys, format } = RequestSchema.parse(body);

    // Org scope check
    await getOrgClaimOrThrow(orgId, claimId);

    // Get current readiness
    const readiness = await assessClaimReadiness(claimId, orgId);

    logger.info("[PACKET_GEN]", {
      claimId,
      mode,
      threshold,
      overallScore: readiness.overallScore,
      readySections: readiness.readySections,
    });

    // ── Determine which sections to generate ─────────────────────────────
    let sectionsToGenerate: string[] = [];

    switch (mode) {
      case "ready-only":
        // Only sections with completeness ≥ 75% or status === "ready"
        sectionsToGenerate = readiness.sections
          .filter((s) => s.completeness >= 75 || s.status === "ready")
          .filter((s) => s.canAutoGenerate)
          .map((s) => s.key);
        break;

      case "threshold":
        // Only generate if overall score meets threshold
        if (readiness.overallScore < (threshold || 60)) {
          return NextResponse.json(
            {
              success: false,
              error: `Claim readiness score (${readiness.overallScore}%) is below the minimum threshold (${threshold}%). Fix missing data first.`,
              readiness: {
                score: readiness.overallScore,
                grade: readiness.overallGrade,
                threshold,
                gap: (threshold || 60) - readiness.overallScore,
              },
              suggestedActions: readiness.topActions,
            },
            { status: 422 }
          );
        }
        // All generatable sections
        sectionsToGenerate = readiness.sections.filter((s) => s.canAutoGenerate).map((s) => s.key);
        break;

      case "selected":
        if (!sectionKeys || sectionKeys.length === 0) {
          return NextResponse.json(
            { success: false, error: "sectionKeys required for selected mode" },
            { status: 400 }
          );
        }
        sectionsToGenerate = sectionKeys;
        break;

      case "all":
        sectionsToGenerate = readiness.sections.filter((s) => s.canAutoGenerate).map((s) => s.key);
        break;
    }

    // Filter to only sections with dedicated generators
    const generatableSections = sectionsToGenerate.filter((key) => GENERATABLE_SECTIONS[key]);

    if (generatableSections.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No sections eligible for generation",
        generated: 0,
        readiness: {
          score: readiness.overallScore,
          grade: readiness.overallGrade,
        },
      });
    }

    // ── Generate sections sequentially ───────────────────────────────────
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const results: GenerationResult[] = [];

    for (const sectionKey of generatableSections) {
      const gen = GENERATABLE_SECTIONS[sectionKey];
      const start = Date.now();

      try {
        const res = await fetch(`${baseUrl}${gen.endpoint}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: request.headers.get("cookie") || "",
          },
          body: JSON.stringify({ claimId }),
        });

        const elapsed = Date.now() - start;

        if (res.ok) {
          results.push({
            sectionKey,
            label: gen.label,
            success: true,
            durationMs: elapsed,
          });
          logger.info("[PACKET_GEN] Section complete", { sectionKey, elapsed });
        } else {
          const errText = await res.text().catch(() => "Unknown error");
          results.push({
            sectionKey,
            label: gen.label,
            success: false,
            error: errText.slice(0, 200),
            durationMs: elapsed,
          });
        }
      } catch (err) {
        results.push({
          sectionKey,
          label: gen.label,
          success: false,
          error: err instanceof Error ? err.message : "Unknown error",
          durationMs: Date.now() - start,
        });
      }
    }

    // Re-assess after generation
    const finalReadiness = await assessClaimReadiness(claimId, orgId);
    const successCount = results.filter((r) => r.success).length;
    const totalDuration = results.reduce((sum, r) => sum + r.durationMs, 0);

    // ── Record packet version ────────────────────────────────────────────
    const versionId = createId();
    const versionNumber =
      (await prisma.claim_activities.count({
        where: {
          claim_id: claimId,
          type: "NOTE",
          message: { startsWith: "[ClaimIQ Packet]" },
        },
      })) + 1;

    await prisma.claim_activities.create({
      data: {
        id: versionId,
        claim_id: claimId,
        user_id: userId,
        type: "NOTE",
        message: `[ClaimIQ Packet] v${versionNumber} — ${successCount} sections generated (${mode} mode, score: ${readiness.overallScore}→${finalReadiness.overallScore})`,
        metadata: {
          _type: "packet_version",
          version: versionNumber,
          mode,
          threshold: threshold || null,
          sections: results.map((r) => ({
            key: r.sectionKey,
            label: r.label,
            success: r.success,
            durationMs: r.durationMs,
          })),
          scoreBefore: readiness.overallScore,
          scoreAfter: finalReadiness.overallScore,
          totalDurationMs: totalDuration,
        },
      },
    });

    logger.info("[PACKET_GEN_COMPLETE]", {
      claimId,
      mode,
      generated: successCount,
      failed: results.length - successCount,
      totalDuration: `${totalDuration}ms`,
    });

    return NextResponse.json({
      success: true,
      mode,
      results,
      version: {
        id: versionId,
        number: versionNumber,
      },
      summary: {
        generated: successCount,
        failed: results.length - successCount,
        totalDurationMs: totalDuration,
        skippedSections: sectionsToGenerate.length - generatableSections.length,
      },
      readiness: {
        before: {
          score: readiness.overallScore,
          grade: readiness.overallGrade,
        },
        after: {
          score: finalReadiness.overallScore,
          grade: finalReadiness.overallGrade,
        },
        delta: finalReadiness.overallScore - readiness.overallScore,
      },
    });
  } catch (err) {
    if (err instanceof OrgScopeError) {
      return NextResponse.json(
        { success: false, error: "Claim not found or access denied" },
        { status: 403 }
      );
    }
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "Invalid request", details: err.issues },
        { status: 400 }
      );
    }
    logger.error("[PACKET_GEN_ERROR]", err);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

/**
 * GET /api/claims-folder/generate/packet?claimId=xxx
 *
 * Returns packet version history for a claim.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (isAuthError(auth)) return auth;
    const { orgId } = auth;

    const claimId = request.nextUrl.searchParams.get("claimId");
    if (!claimId) {
      return NextResponse.json({ error: "claimId query param required" }, { status: 400 });
    }

    await getOrgClaimOrThrow(orgId, claimId);

    const versions = await prisma.claim_activities.findMany({
      where: {
        claim_id: claimId,
        type: "NOTE",
        message: { startsWith: "[ClaimIQ Packet]" },
      },
      orderBy: { created_at: "desc" },
      take: 20,
    });

    return NextResponse.json({
      claimId,
      versions: versions.map((v) => ({
        id: v.id,
        version: (v.metadata as Record<string, unknown>)?.version ?? null,
        mode: (v.metadata as Record<string, unknown>)?.mode ?? null,
        scoreBefore: (v.metadata as Record<string, unknown>)?.scoreBefore ?? null,
        scoreAfter: (v.metadata as Record<string, unknown>)?.scoreAfter ?? null,
        sections: (v.metadata as Record<string, unknown>)?.sections ?? [],
        message: v.message,
        createdAt: v.created_at,
      })),
    });
  } catch (err) {
    if (err instanceof OrgScopeError) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
    logger.error("[PACKET_VERSIONS_ERROR]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
