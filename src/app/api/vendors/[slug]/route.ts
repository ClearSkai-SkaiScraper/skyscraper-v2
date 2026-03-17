import { NextRequest, NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: { slug: string } }) {
  const { searchParams } = new URL(request.url);
  const debug = searchParams.get("debug") === "1";

  try {
    const vendorRaw = await prisma.vendor.findFirst({
      where: {
        slug: params.slug,
        isActive: true,
      },
      include: {
        VendorLocation: {
          where: { isActive: true },
          include: {
            VendorContact: {
              where: { isActive: true },
            },
          },
          orderBy: {
            city: "asc",
          },
        },
        VendorResource: {
          where: { isActive: true },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    if (!vendorRaw) {
      return NextResponse.json({ error: "Vendor not found", slug: params.slug }, { status: 404 });
    }

    // Transform to match frontend expectations
    const vendor = {
      ...vendorRaw,
      locations: vendorRaw.VendorLocation.map((loc) => ({
        ...loc,
        contacts: loc.VendorContact,
      })),
      resources: vendorRaw.VendorResource,
    };

    return NextResponse.json({ vendor });
  } catch (error) {
    logger.error("Error fetching vendor:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch vendor",
        ...(debug
          ? { message: String(error?.message ?? error), stack: String(error?.stack ?? "") }
          : {}),
      },
      { status: 500 }
    );
  }
}
