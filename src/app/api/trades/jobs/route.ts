export const dynamic = "force-dynamic";

/**
 * /api/trades/jobs
 *
 * Contractor view of jobs (claims) they've been assigned to.
 * This is the trades professional's dashboard for viewing and managing
 * their insurance restoration work.
 */

import { NextRequest, NextResponse } from "next/server";

import { withAuth } from "@/lib/auth/withAuth";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

/**
 * GET /api/trades/jobs
 * List all jobs assigned to the current contractor
 *
 * Query params:
 *   status: "assigned" | "in_progress" | "completed" | "all"
 *   page: number
 *   limit: number
 */
export const GET = withAuth(async (request: NextRequest, { userId, orgId }) => {
  try {
    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get("status") || "all";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    // Find the tradesCompanyMember for this user, then get their company
    const member = await prisma.tradesCompanyMember.findFirst({
      where: { userId },
      include: {
        company: {
          select: { id: true, name: true },
        },
      },
    });

    const company = member?.company;
    if (!company) {
      return NextResponse.json({
        ok: true,
        jobs: [],
        count: 0,
        message: "No trades company profile found for this user",
      });
    }

    // Find all assignment events for this company
    const assignmentEvents = await prisma.claim_timeline_events.findMany({
      where: {
        type: { in: ["contractor_assigned", "contractor_accepted", "contractor_completed"] },
        metadata: { path: ["companyId"], equals: company.id },
      },
      orderBy: { occurred_at: "desc" },
    });

    // Group by claimId to get latest status per claim
    const claimStatusMap = new Map<
      string,
      {
        status: string;
        assignedAt: Date;
        role: string;
      }
    >();

    // Also track unassigned claims
    const unassignedClaims = new Set<string>();
    const unassignmentEvents = await prisma.claim_timeline_events.findMany({
      where: {
        type: "contractor_unassigned",
        metadata: { path: ["companyId"], equals: company.id },
      },
    });
    for (const event of unassignmentEvents) {
      unassignedClaims.add(event.claim_id);
    }

    for (const event of assignmentEvents) {
      const claimId = event.claim_id;
      // Skip if unassigned (unless re-assigned after)
      if (unassignedClaims.has(claimId)) {
        const reassigned = assignmentEvents.find(
          (e) =>
            e.claim_id === claimId &&
            e.type === "contractor_assigned" &&
            e.occurred_at >
              (unassignmentEvents.find((u) => u.claim_id === claimId)?.occurred_at || new Date(0))
        );
        if (!reassigned) continue;
      }

      if (!claimStatusMap.has(claimId)) {
        const data = event.metadata as any;
        claimStatusMap.set(claimId, {
          status:
            event.type === "contractor_completed"
              ? "completed"
              : event.type === "contractor_accepted"
                ? "in_progress"
                : "assigned",
          assignedAt: event.occurred_at,
          role: data?.role || "primary_contractor",
        });
      }
    }

    // Filter by status if needed
    let claimIds = Array.from(claimStatusMap.keys());
    if (statusFilter !== "all") {
      claimIds = claimIds.filter((id) => claimStatusMap.get(id)?.status === statusFilter);
    }

    // Paginate claim IDs
    const totalCount = claimIds.length;
    const paginatedClaimIds = claimIds.slice((page - 1) * limit, page * limit);

    // Fetch claim details
    const claims =
      paginatedClaimIds.length > 0
        ? await prisma.claims.findMany({
            where: { id: { in: paginatedClaimIds } },
            include: {
              properties: {
                select: {
                  street: true,
                  city: true,
                  state: true,
                  zipCode: true,
                },
              },
              Org: {
                select: {
                  name: true,
                },
              },
            },
          })
        : [];

    const jobs = claims.map((claim) => {
      const assignment = claimStatusMap.get(claim.id);
      return {
        claimId: claim.id,
        claimNumber: claim.claimNumber,
        title: claim.title,
        damageType: claim.damageType,
        dateOfLoss: claim.dateOfLoss,
        status: claim.status,
        property: claim.properties
          ? {
              address: claim.properties.street,
              city: claim.properties.city,
              state: claim.properties.state,
              zip: claim.properties.zipCode,
            }
          : null,
        paFirm: claim.Org
          ? {
              name: claim.Org.name,
            }
          : null,
        assignment: {
          status: assignment?.status,
          role: assignment?.role,
          assignedAt: assignment?.assignedAt,
        },
      };
    });

    return NextResponse.json({
      ok: true,
      jobs,
      count: totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit),
    });
  } catch (error: unknown) {
    logger.error("[Trades Jobs GET] Error:", error);
    return NextResponse.json({ error: "Failed to list jobs" }, { status: 500 });
  }
});
