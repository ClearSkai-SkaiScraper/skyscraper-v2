import { NextRequest, NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import { getCurrentUserPermissions } from "@/lib/permissions";
import prisma from "@/lib/prisma";

/**
 * GET /api/clients/search
 *
 * Search for discoverable clients (isPublic = true)
 * Query params:
 * - q: search query (searches name, companyName, city, state)
 * - category: filter by client category
 * - city: filter by city
 * - state: filter by state
 * - limit: max results (default 50)
 * - offset: pagination offset (default 0)
 */
export async function GET(req: NextRequest) {
  try {
    const { orgId } = await getCurrentUserPermissions();
    if (!orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q") || "";
    const category = searchParams.get("category");
    const city = searchParams.get("city");
    const state = searchParams.get("state");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
    const offset = parseInt(searchParams.get("offset") || "0");

    // Build where clause - only show public clients from other orgs
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {
      isPublic: true,
      orgId: { not: orgId }, // Don't show own clients
      status: "active",
    };

    if (query) {
      where.OR = [
        { name: { contains: query, mode: "insensitive" } },
        { companyName: { contains: query, mode: "insensitive" } },
        { city: { contains: query, mode: "insensitive" } },
        { state: { contains: query, mode: "insensitive" } },
      ];
    }

    if (category) {
      where.category = category;
    }

    if (city) {
      where.city = { contains: city, mode: "insensitive" };
    }

    if (state) {
      where.state = { equals: state, mode: "insensitive" };
    }

    const [clients, total] = await Promise.all([
      prisma.client.findMany({
        where,
        select: {
          id: true,
          slug: true,
          name: true,
          companyName: true,
          category: true,
          avatarUrl: true,
          propertyPhotoUrl: true,
          bio: true,
          city: true,
          state: true,
          postal: true,
          preferredContact: true,
          createdAt: true,
        },
        orderBy: [{ lastActiveAt: "desc" }, { createdAt: "desc" }],
        take: limit,
        skip: offset,
      }),
      prisma.client.count({ where }),
    ]);

    return NextResponse.json({
      clients,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + clients.length < total,
      },
    });
  } catch (error) {
    logger.error("[clients/search] Error:", error);
    return NextResponse.json(
      { error: "Search failed", details: "Unknown error" },
      { status: 500 }
    );
  }
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
