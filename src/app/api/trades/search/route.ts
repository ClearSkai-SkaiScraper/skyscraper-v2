// ORG-SCOPE: Public marketplace data — cross-org by design
// No auth required. Searches all active tradesCompany, tradesCompanyMember,
// and Vendor records. None of these tables use orgId;
// the trades marketplace search is intentionally cross-org for public discovery.

import { NextRequest, NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Search API for Trades Network
 * Supports searching:
 * - Companies by name, city, state, specialties
 * - Members by name, trade type, specialties
 * - Combined search for "Facebook-style" feed discovery
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || searchParams.get("query") || "";
    const zip = searchParams.get("zip");
    const city = searchParams.get("city");
    const state = searchParams.get("state");
    const specialty = searchParams.get("specialty") || searchParams.get("service");
    const type = searchParams.get("type") || "all"; // "companies", "members", "all"
    const limit = parseInt(searchParams.get("limit") || "200");
    const page = parseInt(searchParams.get("page") || "1");
    const offset = (page - 1) * limit;

    const results: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      companies: any[];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      members: any[];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vendors: any[];
      total: number;
    } = {
      companies: [],
      members: [],
      vendors: [],
      total: 0,
    };

    // Build company search conditions
    if (type === "companies" || type === "all") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const companyWhere: any = {
        isActive: true,
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const companyOrConditions: any[] = [];

      if (query.trim()) {
        companyOrConditions.push(
          { name: { contains: query, mode: "insensitive" } },
          { description: { contains: query, mode: "insensitive" } }
        );
      }

      if (specialty?.trim()) {
        // Case-insensitive specialty matching — check multiple casings
        const s = specialty.trim();
        const variants = [s, s.toLowerCase(), s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()];
        companyOrConditions.push(
          { specialties: { hasSome: variants } },
          { name: { contains: s, mode: "insensitive" } },
          { description: { contains: s, mode: "insensitive" } }
        );
      }

      if (companyOrConditions.length > 0) {
        companyWhere.OR = companyOrConditions;
      }

      if (city?.trim()) {
        companyWhere.city = { contains: city, mode: "insensitive" };
      }

      if (state?.trim()) {
        companyWhere.state = { equals: state, mode: "insensitive" };
      }

      if (zip?.trim()) {
        companyWhere.zip = { equals: zip };
      }

      const companies = await prisma.tradesCompany
        .findMany({
          where: companyWhere,
          take: limit,
          skip: offset,
          orderBy: [{ isVerified: "desc" }, { rating: "desc" }, { createdAt: "desc" }],
          select: {
            id: true,
            name: true,
            slug: true,
            logo: true,
            coverimage: true,
            city: true,
            state: true,
            description: true,
            specialties: true,
            yearsInBusiness: true,
            rating: true,
            reviewCount: true,
            isVerified: true,
            _count: {
              select: {
                members: true,
              },
            },
          },
        })
        .catch((err) => {
          logger.error("trades/search: company query error:", err.message);
          return [];
        });

      results.companies = companies;
    }

    // Build member search conditions
    if (type === "members" || type === "all") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const memberWhere: any = {
        status: "active",
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const memberOrConditions: any[] = [];

      if (query.trim()) {
        memberOrConditions.push(
          { firstName: { contains: query, mode: "insensitive" } },
          { lastName: { contains: query, mode: "insensitive" } },
          { bio: { contains: query, mode: "insensitive" } },
          { tradeType: { contains: query, mode: "insensitive" } }
        );
      }

      if (specialty?.trim()) {
        const s = specialty.trim();
        const variants = [s, s.toLowerCase(), s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()];
        memberOrConditions.push(
          { specialties: { hasSome: variants } },
          { tradeType: { contains: s, mode: "insensitive" } },
          { companyName: { contains: s, mode: "insensitive" } }
        );
      }

      if (memberOrConditions.length > 0) {
        memberWhere.OR = memberOrConditions;
      }

      const members = await prisma.tradesCompanyMember
        .findMany({
          where: memberWhere,
          take: limit,
          skip: offset,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
            tradeType: true,
            jobTitle: true,
            bio: true,
            specialties: true,
            yearsExperience: true,
            company: {
              select: {
                id: true,
                name: true,
                logo: true,
                isVerified: true,
                city: true,
                state: true,
              },
            },
          },
        })
        .catch((err) => {
          logger.error("trades/search: member query error:", err.message);
          return [];
        });

      results.members = members;
    }

    // ================================================================
    // Also search the Vendor table (material suppliers, manufacturers)
    // ================================================================
    {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const vendorWhere: any = {
        isActive: true,
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const vendorOrConditions: any[] = [];

      if (query.trim()) {
        vendorOrConditions.push(
          { name: { contains: query, mode: "insensitive" } },
          { description: { contains: query, mode: "insensitive" } },
          { category: { contains: query, mode: "insensitive" } }
        );
      }

      if (specialty?.trim()) {
        const s = specialty.trim();
        const variants = [s, s.toLowerCase(), s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()];
        vendorOrConditions.push(
          { tradeTypes: { hasSome: variants } },
          { category: { contains: s, mode: "insensitive" } },
          { name: { contains: s, mode: "insensitive" } },
          { description: { contains: s, mode: "insensitive" } }
        );
      }

      if (vendorOrConditions.length > 0) {
        vendorWhere.OR = vendorOrConditions;
      }

      const vendors = await prisma.vendor
        .findMany({
          where: vendorWhere,
          take: limit,
          skip: offset,
          orderBy: [{ isFeatured: "desc" }, { rating: "desc" }, { name: "asc" }],
          select: {
            id: true,
            name: true,
            slug: true,
            logo: true,
            description: true,
            category: true,
            primaryPhone: true,
            primaryEmail: true,
            website: true,
            isVerified: true,
            isFeatured: true,
            rating: true,
            reviewCount: true,
            tradeTypes: true,
            vendorTypes: true,
            serviceRegions: true,
            foundedYear: true,
            financingAvail: true,
            rebatesAvail: true,
            certifications: true,
            VendorLocation: {
              take: 1,
              select: {
                city: true,
                state: true,
              },
            },
          },
        })
        .catch((err) => {
          logger.error("trades/search: vendor query error:", err.message);
          return [];
        });

      results.vendors = vendors;
    }

    results.total = results.companies.length + results.members.length + results.vendors.length;

    return NextResponse.json({
      ok: true,
      query,
      type,
      page,
      limit,
      ...results,
    });
  } catch (error) {
    logger.error("GET /api/trades/search error:", error);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
