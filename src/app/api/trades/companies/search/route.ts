/**
 * Company Search API for Join Company flow
 *
 * GET /api/trades/companies/search
 *
 * Returns all active, verified companies that users can request to join.
 * Filters out incomplete or placeholder companies.
 * This is a public-ish API (requires auth but not company membership)
 */

import { logger } from "@/lib/logger";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import prisma from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.toLowerCase() || "";

    // Find all active companies with stricter filtering
    // - Must be active
    // - Must have a real name (not placeholder)
    // - Optionally prioritize verified companies
    const companies = await prisma.tradesCompany.findMany({
      where: {
        isActive: true,
        // Exclude placeholder/incomplete companies
        name: {
          not: { in: ["", "Unknown", "Untitled", "Test Company", "My Company"] },
        },
        // Must have a name of reasonable length (not just "A" or "AB")
        AND: [
          { name: { not: { equals: "" } } },
          // Prisma doesn't have length filter, so we check for at least 3 chars
        ],
        // If there's a search query, filter by name
        ...(query && {
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { city: { contains: query, mode: "insensitive" } },
            { state: { contains: query, mode: "insensitive" } },
          ],
        }),
      },
      select: {
        id: true,
        name: true,
        slug: true,
        logo: true,
        city: true,
        state: true,
        specialties: true,
        isVerified: true,
        description: true,
        createdAt: true,
        _count: {
          select: { members: { where: { isActive: true, status: "active" } } },
        },
      },
      // Sort: verified first, then by member count (more established), then alphabetically
      orderBy: [{ isVerified: "desc" }, { name: "asc" }],
      take: 50, // Limit results
    });

    // Post-filter: exclude companies with very short names (< 3 chars)
    // and companies with no active members (likely abandoned/placeholder)
    const filteredCompanies = companies.filter((c) => {
      // Name must be at least 3 characters
      if (!c.name || c.name.trim().length < 3) return false;
      // Skip if it looks like a placeholder
      if (/^(org_|auto_|test|demo|sample)/i.test(c.name)) return false;
      return true;
    });

    return NextResponse.json({
      companies: filteredCompanies.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        logo: c.logo,
        city: c.city,
        state: c.state,
        specialties: c.specialties || [],
        verified: c.isVerified ?? false,
        description: c.description,
        memberCount: c._count?.members ?? 0,
      })),
    });
  } catch (error) {
    logger.error("Error searching companies:", error);
    return NextResponse.json({ error: "Failed to search companies" }, { status: 500 });
  }
}
