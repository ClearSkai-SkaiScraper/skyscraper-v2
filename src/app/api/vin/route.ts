/**
 * Vendor Intelligence Network — Core API
 * GET  /api/vin — Browse vendor network with filtering
 * POST /api/vin — Create new vendor (admin)
 */

import { NextRequest, NextResponse } from "next/server";

import { requireAuth } from "@/lib/auth/requireAuth";
import { logger } from "@/lib/logger";
import { getActiveOrgContext } from "@/lib/org/getActiveOrgContext";
import prisma from "@/lib/prisma";
import { getLogoFromWebsite, VENDOR_LOGOS } from "@/lib/vendors/vendorLogos";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;
    const { orgId, userId } = auth;

    const { searchParams } = new URL(request.url);
    const trade = searchParams.get("trade");
    const vendorType = searchParams.get("vendorType");
    const excludeType = searchParams.get("excludeType");
    const region = searchParams.get("region");
    const search = searchParams.get("q");
    const featured = searchParams.get("featured");
    const emergency = searchParams.get("emergency");
    const openNow = searchParams.get("openNow");
    const deliveryToday = searchParams.get("deliveryToday");
    const hasFinancing = searchParams.get("financing");
    const hasRebates = searchParams.get("rebates");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 200);
    const offset = parseInt(searchParams.get("offset") || "0");

    // Build where clause — exclude software/technology vendors (competitors)
    const notConditions: Record<string, unknown>[] = [{ vendorTypes: { has: "technology" } }];

    const where: Record<string, unknown> = {
      isActive: true,
    };

    if (trade) {
      where.tradeTypes = { has: trade };
    }

    if (vendorType) {
      where.vendorTypes = { has: vendorType };
    }

    // Exclude a vendor type (e.g. manufacturers go on the Products page)
    if (excludeType) {
      notConditions.push({ vendorTypes: { has: excludeType } });
    }

    // Apply NOT conditions as AND array
    where.AND = notConditions.map((cond) => ({ NOT: cond }));

    if (region) {
      where.serviceRegions = { has: region };
    }

    if (featured === "true") {
      where.isFeatured = true;
    }

    if (emergency === "true") {
      where.emergencyPhone = { not: null };
    }

    if (hasFinancing === "true") {
      where.financingAvail = true;
    }

    if (hasRebates === "true") {
      where.rebatesAvail = true;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { category: { contains: search, mode: "insensitive" } },
      ];
    }

    const [vendors, total] = await Promise.all([
      prisma.vendor.findMany({
        where,
        orderBy: [{ isFeatured: "desc" }, { rating: "desc" }, { name: "asc" }],
        take: limit,
        skip: offset,
        include: {
          VendorLocation: {
            where: { isActive: true },
            select: { id: true, city: true, state: true },
          },
          VendorContact: {
            where: { isActive: true },
            select: { id: true },
          },
          vendor_products_v2: {
            where: { isActive: true },
            select: { id: true },
          },
          vendor_programs: {
            where: { isActive: true },
            select: { id: true },
          },
        },
      }),
      prisma.vendor.count({ where }),
    ]);

    const transformedVendors = vendors.map((v) => {
      const logoEntry = VENDOR_LOGOS[v.slug];
      const resolvedLogo = v.logo || logoEntry?.logoPath || getLogoFromWebsite(v.website) || null;
      return {
        id: v.id,
        slug: v.slug,
        name: v.name,
        description: v.description,
        logo: resolvedLogo,
        website: v.website,
        category: v.category,
        primaryPhone: v.primaryPhone,
        primaryEmail: v.primaryEmail,
        emergencyPhone: v.emergencyPhone,
        tradeTypes: v.tradeTypes,
        vendorTypes: v.vendorTypes,
        serviceRegions: v.serviceRegions,
        rating: v.rating ? Number(v.rating) : null,
        reviewCount: v.reviewCount ?? 0,
        isFeatured: v.isFeatured ?? false,
        isVerified: v.isVerified ?? false,
        financingAvail: v.financingAvail ?? false,
        rebatesAvail: v.rebatesAvail ?? false,
        certifications: v.certifications,
        locationCount: v.VendorLocation.length,
        contactCount: v.VendorContact.length,
        productCount: v.vendor_products_v2.length,
        programCount: v.vendor_programs.length,
      };
    });

    // Compute trade distribution
    const tradeDistribution: Record<string, number> = {};
    transformedVendors.forEach((v) => {
      v.tradeTypes.forEach((t) => {
        tradeDistribution[t] = (tradeDistribution[t] || 0) + 1;
      });
    });

    return NextResponse.json({
      success: true,
      vendors: transformedVendors,
      pagination: { total, limit, offset, hasMore: offset + vendors.length < total },
      stats: {
        total,
        featured: transformedVendors.filter((v) => v.isFeatured).length,
        verified: transformedVendors.filter((v) => v.isVerified).length,
        withFinancing: transformedVendors.filter((v) => v.financingAvail).length,
        tradeDistribution,
      },
    });
  } catch (error) {
    logger.error("[VIN] Error fetching vendors:", error);
    return NextResponse.json({ error: "Failed to fetch vendors" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await getActiveOrgContext();
    if (!ctx.ok) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      description,
      website,
      category,
      primaryPhone,
      primaryEmail,
      emergencyPhone,
      tradeTypes,
      vendorTypes,
      serviceRegions,
      financingAvail,
      rebatesAvail,
      certifications,
      logo,
    } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    // Generate slug
    const baseSlug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    const existing = await prisma.vendor.count({ where: { slug: baseSlug } });
    const slug = existing > 0 ? `${baseSlug}-${Date.now()}` : baseSlug;

    const vendor = await prisma.vendor.create({
      data: {
        slug,
        name,
        description,
        website,
        category,
        primaryPhone,
        primaryEmail,
        emergencyPhone,
        logo,
        tradeTypes: tradeTypes || [],
        vendorTypes: vendorTypes || [],
        serviceRegions: serviceRegions || [],
        financingAvail: financingAvail || false,
        rebatesAvail: rebatesAvail || false,
        certifications: certifications || [],
        isActive: true,
        isFeatured: false,
        isVerified: false,
      },
    });

    return NextResponse.json({ success: true, vendor });
  } catch (error) {
    logger.error("[VIN] Error creating vendor:", error);
    return NextResponse.json({ error: "Failed to create vendor" }, { status: 500 });
  }
}
