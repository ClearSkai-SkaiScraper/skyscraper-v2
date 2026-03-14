export const dynamic = "force-dynamic";
/**
 * Archive API
 * POST /api/archive - Archive an item (lead, claim, project)
 * GET /api/archive - Get archived items with cold storage billing check
 */

import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";

import prisma from "@/lib/prisma";
import { safeOrgContext } from "@/lib/safeOrgContext";

// Archive an item
export async function POST(req: NextRequest) {
  try {
    const ctx = await safeOrgContext();
    if (ctx.status !== "ok" || !ctx.userId) {
      return NextResponse.json({ error: ctx.reason || "Unauthorized" }, { status: 401 });
    }
    const { userId, orgId } = ctx;
    if (!orgId) {
      return NextResponse.json({ error: "Organization required" }, { status: 403 });
    }

    const body = await req.json();
    const { itemId, itemType } = body;

    if (!itemId || !itemType) {
      return NextResponse.json({ error: "itemId and itemType are required" }, { status: 400 });
    }

    const now = new Date();

    logger.debug(`[Archive] Archiving ${itemType} ${itemId}`);

    if (itemType === "lead") {
      await prisma.leads.update({
        where: { id: itemId, orgId },
        data: {
          archivedAt: now,
          updatedAt: now,
        },
      });
    } else if (itemType === "claim") {
      await prisma.claims.update({
        where: { id: itemId, orgId },
        data: {
          archivedAt: now,
          updatedAt: now,
        },
      });
    } else if (itemType === "project") {
      await prisma.projects.update({
        where: { id: itemId, orgId },
        data: {
          archivedAt: now,
          updatedAt: now,
        },
      });
    } else {
      return NextResponse.json({ error: "Invalid itemType" }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: `${itemType} archived successfully`,
      archivedAt: now.toISOString(),
    });
  } catch (error) {
    logger.error("[Archive] Error:", error);
    return NextResponse.json(
      { error: "Failed to archive", details: "Internal server error" },
      { status: 500 }
    );
  }
}

// Get archived items
export async function GET(req: NextRequest) {
  try {
    const ctx = await safeOrgContext();
    if (ctx.status !== "ok" || !ctx.userId || !ctx.orgId) {
      return NextResponse.json({ error: ctx.reason || "Unauthorized" }, { status: 401 });
    }
    const { userId, orgId } = ctx;

    const searchParams = req.nextUrl.searchParams;
    const type = searchParams.get("type"); // lead, claim, project, or all
    const includeColdStorage = searchParams.get("includeColdStorage") === "true";

    // Check if org has cold storage subscription
    const org = await prisma.org.findUnique({
      where: { id: orgId },
      select: {
        id: true,
        // Check for cold storage add-on (we'll add this field)
      },
    });

    // Calculate 30-day cutoff for free archive access
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Build archive items
    const archiveItems: any[] = [];

    // Get archived leads
    if (!type || type === "lead" || type === "all") {
      const archivedLeads = await prisma.leads.findMany({
        where: {
          orgId,
          archivedAt: { not: null },
          // If not including cold storage, only show last 30 days
          ...(includeColdStorage ? {} : { archivedAt: { gte: thirtyDaysAgo } }),
        },
        include: {
          contacts: {
            select: { firstName: true, lastName: true },
          },
        },
        orderBy: { archivedAt: "desc" },
        take: 100,
      });

      archiveItems.push(
        ...archivedLeads.map((lead) => ({
          id: lead.id,
          type: "lead",
          title: lead.title,
          contactName: lead.contacts
            ? `${lead.contacts.firstName} ${lead.contacts.lastName}`
            : null,
          value: lead.value,
          archivedAt: lead.archivedAt,
          isColdStorage: lead.archivedAt && lead.archivedAt < thirtyDaysAgo,
        }))
      );
    }

    // Get archived claims
    if (!type || type === "claim" || type === "all") {
      const archivedClaims = await prisma.claims.findMany({
        where: {
          orgId,
          archivedAt: { not: null },
          ...(includeColdStorage ? {} : { archivedAt: { gte: thirtyDaysAgo } }),
        },
        orderBy: { archivedAt: "desc" },
        take: 100,
      });

      archiveItems.push(
        ...archivedClaims.map((claim) => ({
          id: claim.id,
          type: "claim",
          title: claim.title,
          claimNumber: claim.claimNumber,
          carrier: claim.carrier,
          value: claim.estimatedValue,
          archivedAt: claim.archivedAt,
          isColdStorage: claim.archivedAt && claim.archivedAt < thirtyDaysAgo,
        }))
      );
    }

    // Get archived projects
    if (!type || type === "project" || type === "all") {
      const archivedProjects = await prisma.projects.findMany({
        where: {
          orgId,
          archivedAt: { not: null },
          ...(includeColdStorage ? {} : { archivedAt: { gte: thirtyDaysAgo } }),
        },
        orderBy: { archivedAt: "desc" },
        take: 100,
      });

      archiveItems.push(
        ...archivedProjects.map((project) => ({
          id: project.id,
          type: "project",
          title: project.title,
          jobNumber: project.jobNumber,
          value: project.valueEstimate,
          archivedAt: project.archivedAt,
          isColdStorage: project.archivedAt && project.archivedAt < thirtyDaysAgo,
        }))
      );
    }

    // Sort by archivedAt
    archiveItems.sort((a, b) => {
      const aDate = new Date(a.archivedAt || 0);
      const bDate = new Date(b.archivedAt || 0);
      return bDate.getTime() - aDate.getTime();
    });

    // Count cold storage items
    const coldStorageCount = archiveItems.filter((item) => item.isColdStorage).length;

    return NextResponse.json({
      items: archiveItems,
      meta: {
        total: archiveItems.length,
        coldStorageCount,
        hasColdStorageAccess: includeColdStorage, // NOTE: Check subscription tier for cold storage access
        coldStoragePrice: 7.99,
      },
    });
  } catch (error) {
    logger.error("[Archive GET] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch archive", details: "Internal server error" },
      { status: 500 }
    );
  }
}

// Restore an item from archive
export async function DELETE(req: NextRequest) {
  try {
    const ctx = await safeOrgContext();
    if (ctx.status !== "ok" || !ctx.userId || !ctx.orgId) {
      return NextResponse.json({ error: ctx.reason || "Unauthorized" }, { status: 401 });
    }
    const { orgId } = ctx;

    const searchParams = req.nextUrl.searchParams;
    const itemId = searchParams.get("itemId");
    const itemType = searchParams.get("itemType");

    if (!itemId || !itemType) {
      return NextResponse.json({ error: "itemId and itemType are required" }, { status: 400 });
    }

    logger.debug(`[Archive] Restoring ${itemType} ${itemId}`);

    if (itemType === "lead") {
      await prisma.leads.update({
        where: { id: itemId, orgId },
        data: {
          archivedAt: null,
          updatedAt: new Date(),
        },
      });
    } else if (itemType === "claim") {
      await prisma.claims.update({
        where: { id: itemId, orgId },
        data: {
          archivedAt: null,
          updatedAt: new Date(),
        },
      });
    } else if (itemType === "project") {
      await prisma.projects.update({
        where: { id: itemId, orgId },
        data: {
          archivedAt: null,
          updatedAt: new Date(),
        },
      });
    } else {
      return NextResponse.json({ error: "Invalid itemType" }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: `${itemType} restored from archive`,
    });
  } catch (error) {
    logger.error("[Archive DELETE] Error:", error);
    return NextResponse.json(
      { error: "Failed to restore", details: "Internal server error" },
      { status: 500 }
    );
  }
}
