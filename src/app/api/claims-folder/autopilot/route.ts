export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * ClaimIQ™ Autopilot API
 *
 * POST /api/claims-folder/autopilot
 *   body: { claimId, mode: "plan" | "execute" | "execute-one" }
 *
 * - plan:        Returns the full autopilot plan (what it would fix)
 * - execute:     Runs ALL autonomous actions sequentially
 * - execute-one: Runs a single action by field key
 */

import { type NextRequest,NextResponse } from "next/server";
import { z } from "zod";

import { getOrgClaimOrThrow, OrgScopeError } from "@/lib/auth/orgScope";
import { isAuthError, requireAuth } from "@/lib/auth/requireAuth";
import { assessClaimReadiness } from "@/lib/claimiq/assembly-engine";
import {
  type AutopilotResult,
  buildAutopilotPlan,
  executeAutopilotAction,
} from "@/lib/claimiq/autopilot";
import { logger } from "@/lib/logger";

const RequestSchema = z.object({
  claimId: z.string().min(1),
  mode: z.enum(["plan", "execute", "execute-one"]),
  /** For execute-one: which field to fix */
  field: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (isAuthError(auth)) return auth;
    const { orgId, userId } = auth;

    const body = await request.json();
    const parsed = RequestSchema.parse(body);
    const { claimId, mode, field } = parsed;

    // Org scope check
    await getOrgClaimOrThrow(orgId, claimId);

    // Get current readiness to know what's missing
    const readiness = await assessClaimReadiness(claimId, orgId);

    // Collect ALL missing items across all sections
    const allMissing: string[] = [];
    for (const section of readiness.sections) {
      for (const item of section.missingItems) {
        if (!allMissing.includes(item)) {
          allMissing.push(item);
        }
      }
    }

    // Build the autopilot plan
    const plan = buildAutopilotPlan(claimId, allMissing);

    logger.info("[AUTOPILOT_API]", {
      claimId,
      mode,
      totalActions: plan.totalActions,
      autonomousActions: plan.autonomousActions,
    });

    // ── Mode: Plan ─────────────────────────────────────────────────────────
    if (mode === "plan") {
      return NextResponse.json({
        success: true,
        plan,
        readiness: {
          score: readiness.overallScore,
          grade: readiness.overallGrade,
          readySections: readiness.readySections,
          totalSections: readiness.sections.length,
        },
      });
    }

    // ── Mode: Execute One ──────────────────────────────────────────────────
    if (mode === "execute-one") {
      if (!field) {
        return NextResponse.json(
          { success: false, error: "field is required for execute-one mode" },
          { status: 400 }
        );
      }

      const action = plan.actions.find((a) => a.field === field);
      if (!action) {
        return NextResponse.json(
          { success: false, error: `No action found for field: ${field}` },
          { status: 404 }
        );
      }

      if (!action.autonomous) {
        return NextResponse.json({
          success: true,
          result: {
            field: action.field,
            action: action.action,
            success: true,
            message: `User action required: ${action.description}`,
            durationMs: 0,
            route: action.route,
          },
        });
      }

      const cookies = request.headers.get("cookie") || "";
      const result = await executeAutopilotAction(action, { claimId, orgId, cookies });

      // Re-assess readiness after the action
      const updatedReadiness = await assessClaimReadiness(claimId, orgId);

      return NextResponse.json({
        success: result.success,
        result,
        readiness: {
          score: updatedReadiness.overallScore,
          grade: updatedReadiness.overallGrade,
          readySections: updatedReadiness.readySections,
          totalSections: updatedReadiness.sections.length,
          delta: updatedReadiness.overallScore - readiness.overallScore,
        },
      });
    }

    // ── Mode: Execute All ──────────────────────────────────────────────────
    if (mode === "execute") {
      const autonomousActions = plan.actions.filter((a) => a.autonomous);
      const results: AutopilotResult[] = [];

      const cookies = request.headers.get("cookie") || "";
      for (const action of autonomousActions) {
        try {
          const result = await executeAutopilotAction(action, { claimId, orgId, cookies });
          results.push(result);

          // If this was a critical data fetch (weather, photos), pause briefly
          // to let DB writes settle before the next action
          if (["weather_report", "analyzed_photos"].includes(action.field)) {
            await new Promise((r) => setTimeout(r, 1000));
          }
        } catch (err) {
          results.push({
            field: action.field,
            action: action.action,
            success: false,
            message: err instanceof Error ? err.message : "Execution error",
            durationMs: 0,
          });
        }
      }

      // Final readiness assessment
      const finalReadiness = await assessClaimReadiness(claimId, orgId);

      const successCount = results.filter((r) => r.success).length;
      const totalDuration = results.reduce((sum, r) => sum + r.durationMs, 0);

      logger.info("[AUTOPILOT_COMPLETE]", {
        claimId,
        succeeded: successCount,
        failed: results.length - successCount,
        totalDuration: `${totalDuration}ms`,
        scoreImprovement: finalReadiness.overallScore - readiness.overallScore,
      });

      return NextResponse.json({
        success: true,
        results,
        summary: {
          executed: results.length,
          succeeded: successCount,
          failed: results.length - successCount,
          totalDurationMs: totalDuration,
          promptActionsRemaining: plan.promptActions,
        },
        readiness: {
          before: { score: readiness.overallScore, grade: readiness.overallGrade },
          after: {
            score: finalReadiness.overallScore,
            grade: finalReadiness.overallGrade,
          },
          delta: finalReadiness.overallScore - readiness.overallScore,
          readySections: finalReadiness.readySections,
          totalSections: finalReadiness.sections.length,
        },
      });
    }

    return NextResponse.json({ success: false, error: "Invalid mode" }, { status: 400 });
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
    logger.error("[AUTOPILOT_ERROR]", err);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
