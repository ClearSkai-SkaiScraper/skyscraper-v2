/**
 * Damage Analysis Benchmark API
 *
 * POST /api/ai/damage/benchmark
 *
 * Runs the damage analysis pipeline against test images and returns
 * precision/recall metrics. Used for QA and continuous improvement.
 *
 * Admin-only endpoint.
 */

export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";

import { checkFailSafe, estimateMultiPassCost } from "@/lib/ai/damage-confidence";
import { analyzeImage } from "@/lib/ai/openai-vision";
import { withAuth } from "@/lib/auth/withAuth";
import { logger } from "@/lib/logger";

interface BenchmarkResult {
  imageUrl: string;
  label: string;
  findingsCount: number;
  overallSeverity: string;
  overallConfidence: number;
  failSafe: {
    passed: boolean;
    mode: string;
    reliableCount: number;
    unreliableCount: number;
  };
  damageTypes: string[];
  durationMs: number;
  error?: string;
}

export const POST = withAuth(async (req, { userId }) => {
  try {
    const body = await req.json();
    const { imageUrls, model = "gpt-4o" } = body as {
      imageUrls: Array<{ url: string; label?: string; expectedDamageTypes?: string[] }>;
      model?: "gpt-4o" | "gpt-4o-mini";
    };

    if (!imageUrls || imageUrls.length === 0) {
      return NextResponse.json({ error: "imageUrls array required" }, { status: 400 });
    }

    // Estimate cost before running
    const costEstimate = estimateMultiPassCost(imageUrls.length, 1, model);

    logger.info("[BENCHMARK] Starting benchmark run", {
      userId,
      imageCount: imageUrls.length,
      model,
      estimatedCost: costEstimate.totalCost,
    });

    const results: BenchmarkResult[] = [];
    const startTotal = Date.now();

    // Run analysis on each image (sequential to avoid rate limits)
    for (const { url, label, expectedDamageTypes } of imageUrls) {
      const start = Date.now();

      try {
        const report = await analyzeImage(url, {
          model,
          context: "Benchmark analysis — be as comprehensive as possible.",
        });

        const failSafe = checkFailSafe(report);

        const result: BenchmarkResult = {
          imageUrl: url,
          label: label || "unlabeled",
          findingsCount: report.items.length,
          overallSeverity: report.overall_severity,
          overallConfidence: report.overall_confidence,
          failSafe: {
            passed: failSafe.passed,
            mode: failSafe.mode,
            reliableCount: failSafe.reliableFindings.length,
            unreliableCount: failSafe.unreliableFindings.length,
          },
          damageTypes: [...new Set(report.items.map((i) => i.type))],
          durationMs: Date.now() - start,
        };

        // Calculate per-image precision if expected types are provided
        if (expectedDamageTypes && expectedDamageTypes.length > 0) {
          const detected = new Set(report.items.map((i) => i.type as string));
          const expectedSet = new Set(expectedDamageTypes as string[]);

          const truePositives = [...detected].filter((d) => expectedSet.has(d)).length;
          const falsePositives = [...detected].filter((d) => !expectedSet.has(d)).length;
          const falseNegatives = [...expectedSet].filter((e) => !detected.has(e)).length;

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (result as any).metrics = {
            truePositives,
            falsePositives,
            falseNegatives,
            precision:
              truePositives + falsePositives > 0
                ? truePositives / (truePositives + falsePositives)
                : 0,
            recall:
              truePositives + falseNegatives > 0
                ? truePositives / (truePositives + falseNegatives)
                : 0,
            missedTypes: [...expectedSet].filter((e) => !detected.has(e)),
            extraTypes: [...detected].filter((d) => !expectedSet.has(d)),
          };
        }

        results.push(result);
      } catch (error) {
        results.push({
          imageUrl: url,
          label: label || "unlabeled",
          findingsCount: 0,
          overallSeverity: "none",
          overallConfidence: 0,
          failSafe: {
            passed: false,
            mode: "manual_review_required",
            reliableCount: 0,
            unreliableCount: 0,
          },
          damageTypes: [],
          durationMs: Date.now() - start,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // ─── Aggregate metrics ─────────────────────────────────────────────
    const totalDuration = Date.now() - startTotal;
    const successCount = results.filter((r) => !r.error).length;
    const avgFindings =
      successCount > 0 ? results.reduce((sum, r) => sum + r.findingsCount, 0) / successCount : 0;
    const avgConfidence =
      successCount > 0
        ? results.reduce((sum, r) => sum + r.overallConfidence, 0) / successCount
        : 0;
    const failSafeRate =
      successCount > 0 ? results.filter((r) => !r.failSafe.passed).length / successCount : 0;

    // All damage types found across all images
    const allDamageTypes = [...new Set(results.flatMap((r) => r.damageTypes))];

    return NextResponse.json({
      ok: true,
      summary: {
        totalImages: imageUrls.length,
        successfulAnalyses: successCount,
        errors: imageUrls.length - successCount,
        avgFindingsPerImage: Math.round(avgFindings * 10) / 10,
        avgConfidence: Math.round(avgConfidence * 100) / 100,
        failSafeTriggeredRate: Math.round(failSafeRate * 100) / 100,
        allDamageTypesDetected: allDamageTypes,
        totalDurationMs: totalDuration,
        avgDurationPerImage: Math.round(totalDuration / imageUrls.length),
        estimatedCost: costEstimate,
        model,
      },
      results,
    });
  } catch (error) {
    logger.error("[BENCHMARK] Fatal error", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: "Benchmark failed" }, { status: 500 });
  }
});
