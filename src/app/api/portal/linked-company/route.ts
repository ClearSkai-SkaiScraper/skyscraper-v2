import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/portal/linked-company
 * Returns the user's linked Trades company (if they have a TradesCompanyMember record).
 * This lets the Portal profile show a "View Company" link for users who also
 * have a Pro Trades account.
 */
export async function GET() {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if this user has a TradesCompanyMember record
    const member = await prisma.tradesCompanyMember
      .findUnique({
        where: { userId: user.id },
        select: {
          role: true,
          companyName: true,
          tradeType: true,
          company: {
            select: {
              id: true,
              name: true,
              slug: true,
              logo: true,
            },
          },
        },
      })
      .catch(() => null);

    if (!member) {
      return NextResponse.json({ company: null });
    }

    // Use company record if linked, otherwise use member-level data
    const company = member.company
      ? {
          id: member.company.id,
          name: member.company.name,
          slug: member.company.slug,
          logo: member.company.logo,
          trade: member.tradeType || null,
          role: member.role,
        }
      : {
          id: null,
          name: member.companyName || null,
          slug: null,
          logo: null,
          trade: member.tradeType || null,
          role: member.role,
        };

    return NextResponse.json({ company });
  } catch (error) {
    logger.error("[linked-company] Error:", error);
    return NextResponse.json({ company: null });
  }
}
