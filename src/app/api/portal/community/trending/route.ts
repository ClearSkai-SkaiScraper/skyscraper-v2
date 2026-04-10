import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/portal/community/trending
 * Returns trending contractors, topics, and search suggestions for the client portal.
 */
export async function GET(req: NextRequest) {
  try {
    // eslint-disable-next-line @typescript-eslint/await-thenable
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.toLowerCase() || "";
    const limit = Math.min(parseInt(searchParams.get("limit") || "10"), 20);

    // Get trending contractors (verified, highly rated)
    const trendingContractors = await prisma.tradesCompany.findMany({
      where: {
        isVerified: true,
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: "insensitive" } },
                { specialties: { hasSome: [search] } },
                { city: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        name: true,
        slug: true,
        logo: true,
        specialties: true,
        city: true,
        state: true,
        isVerified: true,
        rating: true,
        reviewCount: true,
      },
      orderBy: [{ rating: "desc" }, { reviewCount: "desc" }],
      take: limit,
    });

    // Trending topics/categories
    const trendingTopics = [
      { id: "roofing", name: "Roofing", icon: "🏠", count: 234 },
      { id: "water-damage", name: "Water Damage", icon: "💧", count: 189 },
      { id: "storm-damage", name: "Storm Damage", icon: "⛈️", count: 156 },
      { id: "hvac", name: "HVAC", icon: "❄️", count: 98 },
      { id: "plumbing", name: "Plumbing", icon: "🔧", count: 87 },
      { id: "electrical", name: "Electrical", icon: "⚡", count: 76 },
      { id: "mold-remediation", name: "Mold Remediation", icon: "🦠", count: 65 },
      { id: "fire-damage", name: "Fire Damage", icon: "🔥", count: 54 },
    ].filter((topic) => !search || topic.name.toLowerCase().includes(search));

    // Search suggestions based on query
    const suggestions = search
      ? [
          ...trendingContractors.slice(0, 3).map((c) => ({
            type: "contractor" as const,
            id: c.id,
            text: c.name,
            subtext: `${c.specialties?.[0] || "Contractor"} in ${c.city || "your area"}`,
            link: `/portal/company/${c.slug}`,
          })),
          ...trendingTopics.slice(0, 3).map((t) => ({
            type: "topic" as const,
            id: t.id,
            text: t.name,
            subtext: `${t.count} discussions`,
            link: `/portal/network?topic=${t.id}`,
          })),
        ]
      : [];

    return NextResponse.json({
      contractors: trendingContractors.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        logo: c.logo,
        trade: c.specialties?.[0] || null,
        location: c.city && c.state ? `${c.city}, ${c.state}` : null,
        verified: c.isVerified,
        rating: c.rating,
        reviewCount: c.reviewCount,
      })),
      topics: trendingTopics.slice(0, limit),
      suggestions,
    });
  } catch (error) {
    logger.error("[COMMUNITY_TRENDING_ERROR]", error);
    return NextResponse.json({ error: "Failed to load trending" }, { status: 500 });
  }
}
