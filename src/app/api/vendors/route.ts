export const dynamic = "force-dynamic";

import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";

import { requireAuth } from "@/lib/auth/requireAuth";
import prisma from "@/lib/prisma";
import { getLogoFromWebsite, VENDOR_LOGOS } from "@/lib/vendors/vendorLogos";

// GET /api/vendors - Fetch vendor network (Phase 2)
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;
    const { orgId, userId } = auth;

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const debug = searchParams.get("debug") === "1";

    const vendorsRaw = await prisma.vendor.findMany({
      where: {
        isActive: true,
        ...(category && { category }),
      },
      include: {
        VendorLocation: {
          where: { isActive: true },
          select: {
            id: true,
            city: true,
            state: true,
          },
        },
        _count: {
          select: {
            VendorLocation: true,
            VendorContact: true,
            VendorResource: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    // Transform to match frontend expectations
    // Resolve logos with same fallback chain as /api/vin:
    //   DB logo → VENDOR_LOGOS manifest (Google Favicons) → website favicon
    const vendors = vendorsRaw.map((v) => {
      const logoEntry = VENDOR_LOGOS[v.slug];
      const resolvedLogo = v.logo || logoEntry?.logoPath || getLogoFromWebsite(v.website) || null;
      return {
        ...v,
        logo: resolvedLogo,
        locations: v.VendorLocation,
        _count: {
          locations: v._count.VendorLocation,
          contacts: v._count.VendorContact,
          resources: v._count.VendorResource,
        },
      };
    });

    if (debug) {
      return NextResponse.json({
        vendors,
        debug: {
          org: { ok: true, orgId, userId },
          count: vendors.length,
        },
      });
    }

    return NextResponse.json({ vendors });
  } catch (error) {
    logger.error("Error fetching vendors:", error);
    return NextResponse.json({ error: "Failed to fetch vendors" }, { status: 500 });
  }
}
