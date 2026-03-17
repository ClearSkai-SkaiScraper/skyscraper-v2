export const dynamic = "force-dynamic";

/**
 * Job Detail API - Get full job details with contractor info
 */

import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: { jobId: string } }) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { jobId } = params;

    // Find client
    const client = await prisma.client.findFirst({
      where: { userId },
    });

    if (!client) {
      return NextResponse.json({ error: "Client profile not found" }, { status: 404 });
    }

    // Get job with contractor info
    const job = await prisma.clientWorkRequest.findFirst({
      where: {
        id: jobId,
        clientId: client.id,
      },
      include: {
        tradesCompany: {
          select: {
            id: true,
            name: true,
            logo: true,
            phone: true,
            email: true,
          },
        },
      },
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // Calculate progress based on status
    let progress = 0;
    switch (job.status?.toLowerCase()) {
      case "pending":
        progress = 10;
        break;
      case "in_progress":
      case "active":
        progress = 50;
        break;
      case "completed":
        progress = 100;
        break;
      default:
        progress = 0;
    }

    const jobData = {
      id: job.id,
      title: job.title,
      description: job.description,
      status: job.status || "pending",
      progress,
      createdAt: job.createdAt?.toISOString(),
      updatedAt: job.updatedAt?.toISOString(),
      tradeType: job.category,
      urgency: job.urgency,
      contractor: job.tradesCompany
        ? {
            id: job.tradesCompany.id,
            name: job.tradesCompany.name,
            companyName: job.tradesCompany.name,
            avatar: job.tradesCompany.logo,
            phone: job.tradesCompany.phone,
            email: job.tradesCompany.email,
          }
        : null,
    };

    return NextResponse.json({ job: jobData });
  } catch (error) {
    logger.error("[Job Detail] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
