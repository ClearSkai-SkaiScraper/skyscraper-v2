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

    // Fetch jobs that are open/available as job board posts
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

    const jobs = openJobs.map((j) => ({
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
    }));

    return NextResponse.json({ success: true, jobs });
  } catch (error) {
    logger.error("[JOB_BOARD] Error:", error);
    // Return empty array rather than crashing so UI renders gracefully
    return NextResponse.json({ success: true, jobs: [] });
  }
}
