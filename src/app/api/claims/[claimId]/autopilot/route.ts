/**
 * GET /api/claims/[claimId]/autopilot
 *
 * Returns an AI-powered autopilot resolution plan for the claim.
 * Suggests next actions based on claim status, evidence, and carrier behavior.
 */
import { NextRequest, NextResponse } from "next/server";

import { getOrgClaimOrThrow, OrgScopeError } from "@/lib/auth/orgScope";
import { withAuth } from "@/lib/auth/withAuth";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface AutopilotAction {
  type: "document" | "communicate" | "evidence" | "financial" | "strategic";
  title: string;
  description: string;
  priority: "critical" | "high" | "medium" | "low";
  estimatedMinutes: number;
  completed: boolean;
}

export const GET = withAuth(
  async (req: NextRequest, { orgId }, routeParams: { params: Promise<{ claimId: string }> }) => {
    try {
      const { claimId } = await routeParams.params;
      await getOrgClaimOrThrow(orgId, claimId);

      const claim = await prisma.claims.findUnique({
        where: { id: claimId },
        select: {
          id: true,
          claimNumber: true,
          title: true,
          status: true,
          damageType: true,
          carrier: true,
          dateOfLoss: true,
          insured_name: true,
          policy_number: true,
          adjusterName: true,
          adjusterEmail: true,
          properties: {
            select: { street: true, city: true, state: true },
          },
        },
      });

      if (!claim) {
        return NextResponse.json({ error: "Claim not found" }, { status: 404 });
      }

      // Count existing evidence to build smart recommendations
      const [photosCount, documentsCount, supplementsCount, weatherScansCount] = await Promise.all([
        prisma.completion_photos.count({ where: { claim_id: claimId } }).catch(() => 0),
        prisma.inspections.count({ where: { claimId, orgId } }).catch(() => 0),
        prisma.supplements.count({ where: { claim_id: claimId } }).catch(() => 0),
        prisma.weather_reports.count({ where: { claimId } }).catch(() => 0),
      ]);

      const actions: AutopilotAction[] = [];

      // Critical: Date of Loss
      if (!claim.dateOfLoss) {
        actions.push({
          type: "document",
          title: "Set Date of Loss",
          description:
            "The date of loss is required for weather verification and all carrier communications. Set it in the claim details or run a Quick DOL scan.",
          priority: "critical",
          estimatedMinutes: 2,
          completed: false,
        });
      }

      // Critical: Property address
      if (!claim.properties?.street) {
        actions.push({
          type: "document",
          title: "Add Property Address",
          description:
            "A property address is needed for weather data, mapping, and carrier-ready reports.",
          priority: "critical",
          estimatedMinutes: 2,
          completed: false,
        });
      }

      // High: Photos
      if (photosCount === 0) {
        actions.push({
          type: "evidence",
          title: "Upload Damage Photos",
          description:
            "No photos uploaded yet. Upload photos of all damaged areas for AI-powered detection and carrier submission.",
          priority: "high",
          estimatedMinutes: 10,
          completed: false,
        });
      } else if (photosCount < 5) {
        actions.push({
          type: "evidence",
          title: "Add More Photos",
          description: `Only ${photosCount} photo(s) uploaded. Successful claims typically have 10+ photos covering all damage areas.`,
          priority: "medium",
          estimatedMinutes: 10,
          completed: false,
        });
      } else {
        actions.push({
          type: "evidence",
          title: "Photo documentation complete",
          description: `${photosCount} photos uploaded.`,
          priority: "low",
          estimatedMinutes: 0,
          completed: true,
        });
      }

      // Weather verification
      if (weatherScansCount === 0) {
        actions.push({
          type: "evidence",
          title: "Run Weather Verification",
          description:
            "No weather scans found. Run a Quick DOL scan to verify storm activity near the property.",
          priority: "high",
          estimatedMinutes: 3,
          completed: false,
        });
      } else {
        actions.push({
          type: "evidence",
          title: "Weather verification complete",
          description: `${weatherScansCount} weather scan(s) on file.`,
          priority: "low",
          estimatedMinutes: 0,
          completed: true,
        });
      }

      // Carrier info
      if (!claim.carrier) {
        actions.push({
          type: "communicate",
          title: "Add Insurance Carrier",
          description:
            "Adding the carrier enables carrier-specific playbooks and strategy recommendations.",
          priority: "high",
          estimatedMinutes: 2,
          completed: false,
        });
      }

      // Adjuster contact
      if (!claim.adjusterName) {
        actions.push({
          type: "communicate",
          title: "Add Adjuster Contact",
          description:
            "Add the adjuster's name and contact info to streamline communication and schedule inspections.",
          priority: "medium",
          estimatedMinutes: 3,
          completed: false,
        });
      }

      // Documents
      if (documentsCount === 0) {
        actions.push({
          type: "document",
          title: "Upload Supporting Documents",
          description:
            "Upload the insurance policy, inspection reports, or contractor estimates to strengthen the claim file.",
          priority: "medium",
          estimatedMinutes: 5,
          completed: false,
        });
      }

      // Strategic: Supplement if claim is past initial review
      const activeStatuses = ["inspection_scheduled", "under_review", "supplement_needed"];
      if (activeStatuses.includes(claim.status || "") && supplementsCount === 0) {
        actions.push({
          type: "strategic",
          title: "Prepare Supplement",
          description:
            "Claim is in review. Prepare a supplement with additional damage documentation to maximize recovery.",
          priority: "medium",
          estimatedMinutes: 15,
          completed: false,
        });
      }

      // Sort by priority
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      actions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

      const completedCount = actions.filter((a) => a.completed).length;
      const totalActions = actions.length;
      const progressPercent = Math.round((completedCount / Math.max(totalActions, 1)) * 100);

      return NextResponse.json({
        claimId,
        status: claim.status,
        totalActions,
        completedCount,
        pendingCount: totalActions - completedCount,
        progressPercent,
        estimatedTimeMinutes: actions
          .filter((a) => !a.completed)
          .reduce((sum, a) => sum + a.estimatedMinutes, 0),
        actions,
        nextAction: actions.find((a) => !a.completed) || null,
        summary:
          completedCount === totalActions
            ? "All recommended actions complete. Claim is well-documented."
            : `${totalActions - completedCount} action(s) remaining to strengthen this claim.`,
      });
    } catch (err) {
      if (err instanceof OrgScopeError) {
        return NextResponse.json({ error: err.message }, { status: 403 });
      }
      logger.error("[AUTOPILOT] Error:", err);
      return NextResponse.json({ error: "Failed to generate autopilot plan" }, { status: 500 });
    }
  }
);
