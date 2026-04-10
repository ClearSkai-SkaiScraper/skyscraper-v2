// ORG-SCOPE: Public catalog — queries vendor/vendor_products_v2. Cross-org by design (manufacturer marketplace).
/**
 * Client Products API
 * GET /api/portal/products — Browse manufacturer products, brochures, catalogs
 * Returns manufacturers from VIN with their products and marketing assets.
 */

import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { getLogoFromWebsite, VENDOR_LOGOS } from "@/lib/vendors/vendorLogos";
import { VENDOR_RESOURCES } from "@/lib/vendors/vendorResources";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    // eslint-disable-next-line @typescript-eslint/await-thenable
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const trade = searchParams.get("trade");
    const search = searchParams.get("q");
    const limit = Math.min(parseInt(searchParams.get("limit") || "100"), 200);
    const offset = parseInt(searchParams.get("offset") || "0");

    // Only show manufacturers — this is the key distinction from VIN
    const where: Record<string, unknown> = {
      isActive: true,
      vendorTypes: { has: "manufacturer" },
      NOT: { vendorTypes: { has: "technology" } },
    };

    if (trade) {
      where.tradeTypes = { has: trade };
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { category: { contains: search, mode: "insensitive" } },
      ];
    }

    const [manufacturers, total] = await Promise.all([
      prisma.vendor.findMany({
        where,
        orderBy: [{ isFeatured: "desc" }, { rating: "desc" }, { name: "asc" }],
        take: limit,
        skip: offset,
        include: {
          vendor_products_v2: {
            where: { isActive: true },
            orderBy: { name: "asc" },
            select: {
              id: true,
              name: true,
              category: true,
              description: true,
              brochureUrl: true,
              specSheetUrl: true,
              warrantyUrl: true,
              priceRangeLow: true,
              priceRangeHigh: true,
              unit: true,
              inStock: true,
              features: true,
              imageUrl: true,
              tradeType: true,
              sku: true,
              manufacturer: true,
            },
          },
          vendor_assets: {
            where: { isActive: true },
            orderBy: { downloads: "desc" },
            select: {
              id: true,
              type: true,
              title: true,
              description: true,
              pdfUrl: true,
              fileSize: true,
              tradeType: true,
              downloads: true,
            },
          },
        },
      }),
      prisma.vendor.count({ where }),
    ]);

    const result = manufacturers.map((m) => {
      // Logo resolution chain: DB logo → manifest → Clearbit from website domain
      const logoEntry = VENDOR_LOGOS[m.slug];
      const logo = m.logo || logoEntry?.logoPath || getLogoFromWebsite(m.website) || null;

      // Merge vendor resources as additional assets
      const dbAssets = m.vendor_assets.map((a) => ({
        id: a.id,
        type: a.type,
        title: a.title,
        description: a.description,
        pdfUrl: a.pdfUrl,
        fileSize: a.fileSize,
        tradeType: a.tradeType,
        downloads: a.downloads,
        format: a.pdfUrl?.toLowerCase().endsWith(".pdf") ? "PDF" : "WEB",
      }));

      const extraResources = (VENDOR_RESOURCES[m.slug] || [])
        .filter((r) => !dbAssets.some((a) => a.pdfUrl === r.url))
        .map((r) => ({
          id: r.id,
          type:
            r.category === "catalog"
              ? "catalog"
              : r.category === "spec_sheet"
                ? "spec_sheet"
                : r.category === "installation_guide"
                  ? "install_guide"
                  : "brochure",
          title: r.title,
          description: r.description || null,
          pdfUrl: r.url,
          fileSize: r.fileSize || null,
          tradeType: null,
          downloads: 0,
          format: r.format || "PDF",
        }));

      const allAssets = [...dbAssets, ...extraResources];

      return {
        id: m.id,
        slug: m.slug,
        name: m.name,
        description: m.description,
        logo,
        website: m.website || logoEntry?.website || null,
        category: m.category,
        tradeTypes: m.tradeTypes,
        vendorTypes: m.vendorTypes,
        isFeatured: m.isFeatured ?? false,
        isVerified: m.isVerified ?? false,
        rating: m.rating ? Number(m.rating) : null,
        reviewCount: m.reviewCount ?? 0,
        certifications: m.certifications,
        products: m.vendor_products_v2.map((p) => ({
          id: p.id,
          name: p.name,
          category: p.category,
          description: p.description,
          brochureUrl: p.brochureUrl,
          specSheetUrl: p.specSheetUrl,
          warrantyUrl: p.warrantyUrl,
          priceRangeLow: p.priceRangeLow ? Number(p.priceRangeLow) : null,
          priceRangeHigh: p.priceRangeHigh ? Number(p.priceRangeHigh) : null,
          unit: p.unit,
          inStock: p.inStock,
          features: p.features,
          imageUrl: p.imageUrl,
          tradeType: p.tradeType,
          sku: p.sku,
          manufacturer: p.manufacturer,
        })),
        assets: allAssets,
        productCount: m.vendor_products_v2.length,
        assetCount: allAssets.length,
      };
    });

    // Trade distribution for filter chips
    const tradeDistribution: Record<string, number> = {};
    result.forEach((m) => {
      m.tradeTypes.forEach((t) => {
        tradeDistribution[t] = (tradeDistribution[t] || 0) + 1;
      });
    });

    return NextResponse.json({
      success: true,
      manufacturers: result,
      pagination: { total, limit, offset, hasMore: offset + result.length < total },
      stats: {
        total,
        totalProducts: result.reduce((sum, m) => sum + m.productCount, 0),
        totalAssets: result.reduce((sum, m) => sum + m.assetCount, 0),
        tradeDistribution,
      },
    });
  } catch (error) {
    logger.error("[Products API] Error:", error);
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
  }
}
