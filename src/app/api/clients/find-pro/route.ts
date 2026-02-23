import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { log } from "@/lib/logger";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/clients/find-pro - Search for a pro/company by code or name
 * Used by clients to connect with their contractor
 */
export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q");
    const code = searchParams.get("code"); // Direct org code lookup

    if (!query && !code) {
      return NextResponse.json({ error: "Provide search query or code" }, { status: 400 });
    }

    let org: { id: string; name: string; createdAt: Date } | null = null;

    // Direct code lookup (e.g., referral code or org slug)
    if (code) {
      org = await prisma.org.findFirst({
        where: {
          OR: [{ id: code }, { name: { contains: code, mode: "insensitive" } }],
        },
        select: {
          id: true,
          name: true,
          createdAt: true,
        },
      });
    }

    // Search by name
    if (!org && query) {
      org = await prisma.org.findFirst({
        where: {
          name: { contains: query, mode: "insensitive" },
        },
        select: {
          id: true,
          name: true,
          createdAt: true,
        },
      });
    }

    if (!org) {
      return NextResponse.json({
        found: false,
        message: "No contractor found with that name or code",
      });
    }

    // Get branding if available
    const branding = await prisma.org_branding.findFirst({
      where: { orgId: org.id },
      select: {
        companyName: true,
        colorPrimary: true,
        logoUrl: true,
      },
    });

    return NextResponse.json({
      found: true,
      org: {
        id: org.id,
        name: branding?.companyName || org.name,
        logoUrl: branding?.logoUrl || null,
        primaryColor: branding?.colorPrimary || "#117CFF",
      },
    });
  } catch (error) {
    log.error("[clients/find-pro] Search failed", { error: "Internal server error" });
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}

/**
 * POST /api/clients/find-pro - Request connection to an org
 * Client sends request, pro must accept
 */
export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { orgId } = body;

    if (!orgId) {
      return NextResponse.json({ error: "Org ID required" }, { status: 400 });
    }

    // Get or create client record
    let client = await prisma.client.findFirst({
      where: { userId },
    });

    if (!client) {
      // Create client record
      const slug = `c-${Date.now().toString(36)}`;
      client = await prisma.client.create({
        data: {
          id: crypto.randomUUID(),
          slug,
          userId,
          email: `user-${userId}@portal.skaiscraper.com`,
          name: "New Client",
          orgId,
          category: "Homeowner",
        },
      });
    } else if (client.orgId !== orgId) {
      // Update to new org (or handle multi-org later)
      client = await prisma.client.update({
        where: { id: client.id },
        data: { orgId },
      });
    }

    // Check if already connected
    const existing = await prisma.clientConnection.findUnique({
      where: {
        orgId_clientId: { orgId, clientId: client.id },
      },
    });

    if (existing) {
      return NextResponse.json({
        success: true,
        status: existing.status,
        message:
          existing.status === "connected" ? "Already connected" : "Connection request pending",
      });
    }

    // Create pending connection request
    await prisma.clientConnection.create({
      data: {
        id: crypto.randomUUID(),
        orgId,
        clientId: client.id,
        status: "pending",
        invitedBy: client.id, // Self-initiated
      },
    });

    log.info("[clients/find-pro] Connection requested", {
      clientId: client.id,
      orgId,
    });

    return NextResponse.json({
      success: true,
      status: "pending",
      message: "Connection request sent! The contractor will review your request.",
    });
  } catch (error) {
    log.error("[clients/find-pro] Connection request failed", { error: "Internal server error" });
    return NextResponse.json({ error: "Request failed" }, { status: 500 });
  }
}
