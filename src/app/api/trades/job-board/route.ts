/**
 * GET /api/trades/job-board
 *
 * Returns job board posts for the trades network.
 * Wires up the Job Board page (/trades/jobs).
 */

export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { safeOrgContext } from "@/lib/safeOrgContext";

export async function GET() {
  try {
    const ctx = await safeOrgContext();
    if (!ctx.ok || !ctx.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch org's own jobs that are open/available
    const openJobs = await prisma.jobs.findMany({
      where: {
        orgId: ctx.orgId,
        status: { in: ["pending", "scheduled", "open"] },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        Org: { select: { name: true } },
        properties: { select: { street: true, city: true, state: true } },
      },
    });

    const jobs: Array<{
      id: string;
      title: string;
      description: string;
      tradeType: string;
      location: string;
      status: string;
      budget: unknown;
      postedBy: string;
      createdAt: Date;
      urgency: string;
      source: string;
    }> = openJobs.map((j) => ({
      id: j.id,
      title: j.title || "Untitled Job",
      description: j.description || "",
      tradeType: j.jobType || "General",
      location: [j.properties?.city, j.properties?.state].filter(Boolean).join(", ") || "Unknown",
      status: j.status,
      budget: j.estimatedCost,
      postedBy: j.Org?.name || "Unknown",
      createdAt: j.createdAt,
      urgency: j.priority || "normal",
      source: "internal",
    }));

    // Also fetch public client work requests (cross-org job board)
    // These are jobs posted by clients without a specific pro target
    try {
      const publicRequests = await prisma.clientWorkRequest.findMany({
        where: {
          targetProId: null,
          status: { in: ["pending", "submitted"] },
        },
        orderBy: { createdAt: "desc" },
        take: 30,
        include: {
          Client: { select: { name: true, city: true, state: true } },
        },
      });

      for (const wr of publicRequests) {
        jobs.push({
          id: wr.id,
          title: wr.title || "Client Work Request",
          description: wr.description?.slice(0, 200) || "",
          tradeType: wr.category || "General",
          location:
            [wr.Client?.city, wr.Client?.state].filter(Boolean).join(", ") ||
            "Location not specified",
          status: wr.status,
          budget: wr.budget || null,
          postedBy: wr.Client?.name ? wr.Client.name.split(" ")[0] : "Client",
          createdAt: wr.createdAt,
          urgency:
            wr.urgency === "emergency" ? "high" : wr.urgency === "soon" ? "medium" : "normal",
          source: "client_request",
        });
      }
    } catch (e) {
      // ClientWorkRequest table may not exist in all envs — non-fatal
      logger.warn("[JOB_BOARD] ClientWorkRequest query error:", e);
    }

    // Sort all jobs by createdAt descending
    jobs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({ success: true, jobs });
  } catch (error) {
    logger.error("[JOB_BOARD] Error:", error);
    // Return empty array rather than crashing so UI renders gracefully
    return NextResponse.json({ success: true, jobs: [] });
  }
}
