/**
 * VIN Vendor Detail API
 * GET /api/vin/[vendorId] — Full vendor detail with all relations
 * PUT /api/vin/[vendorId] — Update vendor (admin)
 */

import { NextRequest, NextResponse } from "next/server";

import { isAuthError, requireAdmin, requireAuth } from "@/lib/auth/requireAuth";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: { vendorId: string } }) {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { orgId, userId } = auth;

    const vendor = await prisma.vendor.findFirst({
      where: {
        OR: [{ id: params.vendorId }, { slug: params.vendorId }],
        isActive: true,
      },
      include: {
        VendorLocation: {
          where: { isActive: true },
          include: {
            VendorContact: { where: { isActive: true } },
          },
          orderBy: { city: "asc" },
        },
        VendorResource: {
          where: { isActive: true },
          orderBy: { createdAt: "desc" },
        },
        vendor_products_v2: {
          where: { isActive: true },
          orderBy: { name: "asc" },
        },
        vendor_assets: {
          where: { isActive: true },
          orderBy: { createdAt: "desc" },
        },
        vendor_programs: {
          where: { isActive: true },
          orderBy: { name: "asc" },
        },
      },
    });

    if (!vendor) {
      return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
    }

    const transformed = {
      id: vendor.id,
      slug: vendor.slug,
      name: vendor.name,
      description: vendor.description,
      logo: vendor.logo,
      coverImage: vendor.coverImage,
      website: vendor.website,
      category: vendor.category,
      primaryPhone: vendor.primaryPhone,
      primaryEmail: vendor.primaryEmail,
      emergencyPhone: vendor.emergencyPhone,
      tradeTypes: vendor.tradeTypes,
      vendorTypes: vendor.vendorTypes,
      serviceRegions: vendor.serviceRegions,
      rating: vendor.rating ? Number(vendor.rating) : null,
      reviewCount: vendor.reviewCount ?? 0,
      isFeatured: vendor.isFeatured ?? false,
      isVerified: vendor.isVerified ?? false,
      financingAvail: vendor.financingAvail ?? false,
      rebatesAvail: vendor.rebatesAvail ?? false,
      certifications: vendor.certifications,
      locations: vendor.VendorLocation.map((loc) => ({
        id: loc.id,
        name: loc.name,
        address: loc.address,
        city: loc.city,
        state: loc.state,
        zip: loc.zip,
        phone: loc.phone,
        email: loc.email,
        hours: loc.hours as Record<string, string> | null,
        lat: loc.lat,
        lng: loc.lng,
        deliveryRadiusMi: loc.deliveryRadiusMi,
        deliveryCutoffTime: loc.deliveryCutoffTime,
        localRepName: loc.localRepName,
        localRepPhone: loc.localRepPhone,
        emergencyPhone: loc.emergencyPhone,
        contacts: loc.VendorContact.map((c) => ({
          id: c.id,
          name: c.name,
          title: c.title,
          email: c.email,
          phone: c.phone,
          mobilePhone: c.mobilePhone,
          territory: c.territory,
          isPrimary: c.isPrimary ?? false,
        })),
      })),
      resources: vendor.VendorResource.map((r) => ({
        id: r.id,
        title: r.title,
        description: r.description,
        type: r.type,
        url: r.url,
        fileSize: r.fileSize,
        format: r.format,
        category: r.category,
        tags: r.tags,
        downloads: r.downloads ?? 0,
      })),
      products: vendor.vendor_products_v2.map((p) => ({
        id: p.id,
        tradeType: p.tradeType,
        sku: p.sku,
        name: p.name,
        category: p.category,
        manufacturer: p.manufacturer,
        description: p.description,
        brochureUrl: p.brochureUrl,
        specSheetUrl: p.specSheetUrl,
        warrantyUrl: p.warrantyUrl,
        priceRangeLow: p.priceRangeLow ? Number(p.priceRangeLow) : null,
        priceRangeHigh: p.priceRangeHigh ? Number(p.priceRangeHigh) : null,
        unit: p.unit ?? "each",
        inStock: p.inStock ?? true,
        leadTimeDays: p.leadTimeDays,
        features: p.features,
        imageUrl: p.imageUrl,
      })),
      assets: vendor.vendor_assets.map((a) => ({
        id: a.id,
        type: a.type,
        title: a.title,
        description: a.description,
        jobUseCase: a.jobUseCase,
        pdfUrl: a.pdfUrl,
        fileSize: a.fileSize,
        tradeType: a.tradeType,
        downloads: a.downloads ?? 0,
      })),
      programs: vendor.vendor_programs.map((p) => ({
        id: p.id,
        programType: p.programType,
        name: p.name,
        description: p.description,
        eligibility: p.eligibility,
        amount: p.amount ? Number(p.amount) : null,
        percentOff: p.percentOff ? Number(p.percentOff) : null,
        validFrom: p.validFrom?.toISOString() ?? null,
        validTo: p.validTo?.toISOString() ?? null,
        applicationUrl: p.applicationUrl,
        terms: p.terms,
      })),
    };

    return NextResponse.json({ success: true, vendor: transformed });
  } catch (error) {
    logger.error("[VIN] Error fetching vendor detail:", error);
    return NextResponse.json({ error: "Failed to fetch vendor" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: { vendorId: string } }) {
  try {
    // Vendor mutation requires admin role
    const auth = await requireAdmin();
    if (isAuthError(auth)) return auth;

    const body = await request.json();

    const vendor = await prisma.vendor.update({
      where: { id: params.vendorId },
      data: {
        name: body.name,
        description: body.description,
        website: body.website,
        category: body.category,
        primaryPhone: body.primaryPhone,
        primaryEmail: body.primaryEmail,
        emergencyPhone: body.emergencyPhone,
        tradeTypes: body.tradeTypes,
        vendorTypes: body.vendorTypes,
        serviceRegions: body.serviceRegions,
        financingAvail: body.financingAvail,
        rebatesAvail: body.rebatesAvail,
        certifications: body.certifications,
        isFeatured: body.isFeatured,
        isVerified: body.isVerified,
        logo: body.logo,
        coverImage: body.coverImage,
      },
    });

    return NextResponse.json({ success: true, vendor });
  } catch (error) {
    logger.error("[VIN] Error updating vendor:", error);
    return NextResponse.json({ error: "Failed to update vendor" }, { status: 500 });
  }
}
