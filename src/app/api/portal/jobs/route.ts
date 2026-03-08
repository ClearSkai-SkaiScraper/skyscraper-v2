export const dynamic = "force-dynamic";

/**
 * Client Job Management API
 *
 * Handles CRUD operations for client job postings
 * Powers the "My Jobs" section of the client portal
 *
 * UPDATED: Now uses ClientJob model with fallback to claims for backwards compatibility
 */

import { logger } from "@/lib/logger";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { getClientFromAuth } from "@/lib/portal/getClientFromAuth";
import prisma from "@/lib/prisma";

// Helper to check if ClientJob table exists and is usable
async function useClientJobModel(): Promise<boolean> {
  try {
    // Try to query the ClientJob model
    await prisma.clientJob.findFirst({ take: 1 });
    return true;
  } catch {
    // Model doesn't exist or error - fall back to claims
    return false;
  }
}

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const client = await getClientFromAuth();
    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    // Get query parameters
    const url = new URL(req.url);
    const status = url.searchParams.get("status");
    const jobType = url.searchParams.get("type");
    const tradeType = url.searchParams.get("tradeType");
    const limit = parseInt(url.searchParams.get("limit") || "50");
    const offset = parseInt(url.searchParams.get("offset") || "0");

    // Try new ClientJob model first
    const useNewModel = await useClientJobModel();

    if (useNewModel) {
      // Use new ClientJob model
      const where: any = {
        clientId: client.id,
      };

      if (status) {
        where.status = status;
      }
      if (jobType) {
        where.type = jobType;
      }
      if (tradeType) {
        where.tradeType = tradeType;
      }

      const jobs = await prisma.clientJob.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
        include: {
          tradesCompany: {
            select: {
              id: true,
              name: true,
              logo: true,
            },
          },
          tradesCompanyMember: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatar: true,
              companyName: true,
            },
          },
        },
      });

      const total = await prisma.clientJob.count({ where });

      const formattedJobs = (jobs as any[]).map((job) => ({
        id: job.id,
        type: job.type,
        title: job.title,
        description: job.description,
        status: job.status,
        progress: job.progress,
        stage: job.stage,
        tradeType: job.tradeType,
        urgency: job.urgency,
        location: [job.propertyAddress, job.propertyCity, job.propertyState]
          .filter(Boolean)
          .join(", "),
        budget: job.estimatedBudget,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
        contractor: job.tradesCompanyMember
          ? {
              id: job.tradesCompanyMember.id,
              name: `${job.tradesCompanyMember.firstName || ""} ${job.tradesCompanyMember.lastName || ""}`.trim(),
              companyName: job.tradesCompanyMember.companyName || job.tradesCompany?.name,
              avatar: job.tradesCompanyMember.avatar,
            }
          : job.tradesCompany
            ? {
                id: job.tradesCompany.id,
                name: job.tradesCompany.name,
                companyName: job.tradesCompany.name,
                avatar: job.tradesCompany.logo,
              }
            : null,
        // Claim-specific fields
        claimNumber: job.claimNumber,
        insuranceCompany: job.insuranceCompany,
      }));

      return NextResponse.json({
        jobs: formattedJobs,
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
        source: "ClientJob",
      });
    }

    // FALLBACK: Use claims as jobs (legacy support)
    const where: any = {
      contactId: client.id,
    };

    if (status) {
      where.status = status;
    }

    if (tradeType) {
      where.damageType = tradeType;
    }

    // Query claims as jobs for the client
    const jobs = await prisma.claims.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
      select: {
        id: true,
        claimNumber: true,
        title: true,
        description: true,
        status: true,
        damageType: true,
        estimatedValue: true,
        createdAt: true,
        updatedAt: true,
        properties: {
          select: {
            street: true,
            city: true,
            state: true,
          },
        },
      },
    });

    const total = await prisma.claims.count({ where });

    // Transform claims to job format
    const formattedJobs = jobs.map((claim) => ({
      id: claim.id,
      type: "CLAIM",
      title: claim.title || `Job #${claim.claimNumber}`,
      description: claim.description,
      status: claim.status,
      tradeType: claim.damageType,
      location: claim.properties
        ? `${claim.properties.street}, ${claim.properties.city}, ${claim.properties.state}`.trim()
        : null,
      budget: claim.estimatedValue,
      createdAt: claim.createdAt,
      updatedAt: claim.updatedAt,
      claimNumber: claim.claimNumber,
      contractor: null,
    }));

    return NextResponse.json({
      jobs: formattedJobs,
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
      source: "claims_legacy",
    });
  } catch (error) {
    logger.error("[api/portal/jobs GET] Error:", error);
    return NextResponse.json({ error: "Failed to fetch jobs" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const client = await getClientFromAuth();
    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const body = await req.json();

    // Validate required fields
    if (!body.title?.trim()) {
      return NextResponse.json({ error: "Job title is required" }, { status: 400 });
    }

    // Try new ClientJob model first
    const useNewModel = await useClientJobModel();

    if (useNewModel) {
      // Create using new ClientJob model
      const job = await prisma.clientJob.create({
        data: {
          id: crypto.randomUUID(),
          clientId: client.id,
          type: body.type || "JOB",
          title: body.title.trim(),
          description: body.description?.trim() || null,
          tradeType: body.tradeType || null,
          urgency: body.urgency || "normal",
          status: "new",
          stage: "intake",
          progress: 0,
          propertyAddress: body.address || null,
          propertyCity: body.city || null,
          propertyState: body.state || null,
          propertyZip: body.zip || null,
          estimatedBudget: body.budget ? parseFloat(body.budget) : null,
          // Claim fields if type is CLAIM
          claimNumber: body.claimNumber || null,
          insuranceCompany: body.insuranceCompany || null,
          adjusterName: body.adjusterName || null,
          adjusterPhone: body.adjusterPhone || null,
        },
      });

      // Log status transition
      await prisma.statusTransition.create({
        data: {
          id: crypto.randomUUID(),
          entityType: "ClientJob",
          entityId: job.id,
          fromStatus: null,
          toStatus: "new",
          userId: userId,
          userName: client.name || client.email,
          userRole: "client",
          reason: "Job created",
        },
      });

      // Log analytics event
      await prisma.analyticsEvent.create({
        data: {
          id: crypto.randomUUID(),
          event: "job.created",
          category: "job",
          userId: userId,
          clientId: client.id,
          jobId: job.id,
          properties: {
            type: job.type,
            tradeType: job.tradeType,
          },
        },
      });

      logger.debug(`[api/portal/jobs POST] Created ClientJob: ${job.id} for client: ${client.id}`);

      return NextResponse.json(
        {
          job: {
            id: job.id,
            type: job.type,
            title: job.title,
            description: job.description,
            status: job.status,
            stage: job.stage,
            tradeType: job.tradeType,
            location: [job.propertyAddress, job.propertyCity, job.propertyState]
              .filter(Boolean)
              .join(", "),
            budget: job.estimatedBudget,
            createdAt: job.createdAt,
            contractor: null,
          },
          source: "ClientJob",
        },
        { status: 201 }
      );
    }

    // FALLBACK: Create using claims (legacy)
    const { nanoid } = await import("nanoid");
    const jobId = nanoid();
    const claimNumber = `JOB-${Date.now().toString(36).toUpperCase()}`;

    // First create property record
    const property = await prisma.properties.create({
      data: {
        id: nanoid(),
        orgId: client.orgId || "client-jobs",
        contactId: client.id,
        name: body.title.trim(),
        propertyType: "residential",
        street: body.address || "TBD",
        city: body.city || "",
        state: body.state || "",
        zipCode: body.zip || "",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    const job = await prisma.claims.create({
      data: {
        id: jobId,
        orgId: client.orgId || "client-jobs",
        claimNumber,
        title: body.title.trim(),
        description: body.description?.trim() || null,
        damageType: body.tradeType || "GENERAL",
        dateOfLoss: new Date(),
        status: body.status === "active" ? "OPEN" : "INTAKE",
        propertyId: property.id,
        estimatedValue: body.budget ? parseInt(body.budget) : null,
        priority: body.urgency === "urgent" ? "high" : "medium",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    logger.debug(`[api/portal/jobs POST] Created claim-job: ${job.id} for client: ${client.id}`);

    return NextResponse.json(
      {
        job: {
          id: job.id,
          type: "JOB",
          title: job.title,
          description: job.description,
          status: job.status,
          tradeType: body.tradeType,
          location: `${property.street}, ${property.city}, ${property.state}`.trim(),
          budget: job.estimatedValue,
          createdAt: job.createdAt,
          contractor: null,
        },
        source: "claims_legacy",
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error("[api/portal/jobs POST] Error:", error);
    return NextResponse.json({ error: "Failed to create job" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const client = await getClientFromAuth();
    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const body = await req.json();
    const { jobId, ...updateData } = body;

    if (!jobId) {
      return NextResponse.json({ error: "Job ID is required" }, { status: 400 });
    }

    // Verify the client has access to this claim via claimClientLink
    const hasAccess = await prisma.claimClientLink.findFirst({
      where: {
        claimId: jobId,
        clientUserId: client.id,
      },
    });

    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied to this job" }, { status: 403 });
    }

    // Update the claim/job in database
    const job = await prisma.claims.update({
      where: {
        id: jobId,
      },
      data: {
        title: updateData.title?.trim() || undefined,
        description: updateData.description?.trim() || undefined,
        damageType: updateData.tradeType || undefined,
        status:
          updateData.status === "active"
            ? "OPEN"
            : updateData.status === "cancelled"
              ? "CLOSED"
              : undefined,
        estimatedValue: updateData.budget ? parseInt(updateData.budget) : undefined,
        priority:
          updateData.urgency === "urgent"
            ? "high"
            : updateData.urgency === "normal"
              ? "medium"
              : undefined,
        updatedAt: new Date(),
      },
      include: {
        properties: {
          select: { street: true, city: true, state: true },
        },
      },
    });

    logger.debug(`[api/portal/jobs PATCH] Updated job: ${jobId} for client: ${client.id}`);

    return NextResponse.json({
      job: {
        id: job.id,
        title: job.title,
        description: job.description,
        status: job.status,
        tradeType: job.damageType,
        location: job.properties
          ? `${job.properties.street}, ${job.properties.city}, ${job.properties.state}`
          : null,
        budget: job.estimatedValue,
        updatedAt: job.updatedAt,
        invitations: [],
      },
    });
  } catch (error) {
    logger.error("[api/portal/jobs PATCH] Error:", error);
    return NextResponse.json({ error: "Failed to update job" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const client = await getClientFromAuth();
    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const url = new URL(req.url);
    const jobId = url.searchParams.get("jobId");

    if (!jobId) {
      return NextResponse.json({ error: "Job ID is required" }, { status: 400 });
    }

    // Verify the client has access to this claim via claimClientLink
    const hasAccess = await prisma.claimClientLink.findFirst({
      where: {
        claimId: jobId,
        clientUserId: client.id,
      },
    });

    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied to this job" }, { status: 403 });
    }

    // Soft delete by changing status to CLOSED
    await prisma.claims.update({
      where: {
        id: jobId,
      },
      data: {
        status: "CLOSED",
        updatedAt: new Date(),
      },
    });

    logger.debug(`[api/portal/jobs DELETE] Deleted job: ${jobId} for client: ${client.id}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("[api/portal/jobs DELETE] Error:", error);
    return NextResponse.json({ error: "Failed to delete job" }, { status: 500 });
  }
}
