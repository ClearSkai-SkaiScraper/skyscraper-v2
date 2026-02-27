import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * GET /api/portal/community/groups
 * Returns community groups for the client portal.
 * Groups are topic-based discussion areas (homeowners by region, damage type, etc.)
 */
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Pre-defined community groups
    // In production, these could be database-driven with real member counts
    const groups = [
      {
        id: "storm-survivors",
        name: "Storm Survivors",
        description: "Support and advice for homeowners recovering from storm damage",
        icon: "⛈️",
        memberCount: 1243,
        postsThisWeek: 47,
        isJoined: false,
      },
      {
        id: "roof-repair-tips",
        name: "Roof Repair Tips",
        description: "Share experiences and get advice on roofing projects",
        icon: "🏠",
        memberCount: 892,
        postsThisWeek: 32,
        isJoined: false,
      },
      {
        id: "insurance-claims-101",
        name: "Insurance Claims 101",
        description: "Learn the ins and outs of filing and managing insurance claims",
        icon: "📋",
        memberCount: 2156,
        postsThisWeek: 89,
        isJoined: true,
      },
      {
        id: "water-damage-recovery",
        name: "Water Damage Recovery",
        description: "Tips for dealing with flooding, leaks, and water damage restoration",
        icon: "💧",
        memberCount: 756,
        postsThisWeek: 28,
        isJoined: false,
      },
      {
        id: "contractor-reviews",
        name: "Contractor Reviews",
        description: "Share your experiences with contractors and get recommendations",
        icon: "⭐",
        memberCount: 1567,
        postsThisWeek: 54,
        isJoined: false,
      },
      {
        id: "diy-home-repair",
        name: "DIY Home Repair",
        description: "For minor repairs you can tackle yourself before calling a pro",
        icon: "🔧",
        memberCount: 634,
        postsThisWeek: 21,
        isJoined: false,
      },
      {
        id: "arizona-homeowners",
        name: "Arizona Homeowners",
        description: "Local community for Arizona property owners",
        icon: "🌵",
        memberCount: 423,
        postsThisWeek: 15,
        isJoined: false,
      },
      {
        id: "texas-homeowners",
        name: "Texas Homeowners",
        description: "Local community for Texas property owners",
        icon: "🤠",
        memberCount: 867,
        postsThisWeek: 38,
        isJoined: false,
      },
    ];

    return NextResponse.json({
      groups,
      total: groups.length,
    });
  } catch (error) {
    logger.error("[COMMUNITY_GROUPS_ERROR]", error);
    return NextResponse.json({ error: "Failed to load groups" }, { status: 500 });
  }
}
