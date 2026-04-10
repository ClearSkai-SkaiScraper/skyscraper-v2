/**
 * PHASE 21 — PUBLIC CONTRACTOR SEARCH API
 * GET /api/public/search — Search for contractors by location, service, etc.
 *
 * NO AUTHENTICATION REQUIRED - Public endpoint
 */

export const dynamic = "force-dynamic";
export const revalidate = 0;
import { NextRequest, NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { checkRateLimit } from "@/lib/ratelimit";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    // Search parameters
    const zipCode = searchParams.get("zip");
    const city = searchParams.get("city");
    const state = searchParams.get("state");
    const service = searchParams.get("service");
    const emergency = searchParams.get("emergency"); // "true" for emergency services only
    const verifiedOnly = searchParams.get("verified") === "true";
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Basic validation & fallback suggestions
    if (!zipCode && !city && !state && !service) {
      return NextResponse.json(
        {
          error: "At least one query parameter required (zip, city, state, or service)",
          example: {
            usage: "/api/public/search?city=Dallas&state=TX&service=roofing",
            params: ["zip", "city", "state", "service", "limit", "offset", "verified", "emergency"],
          },
        },
        { status: 400 }
      );
    }

    // Build where clause
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {
      status: "active",
      isActive: true,
    };

    if (emergency === "true") {
      where.emergencyAvailable = true;
    }

    // Get all contractors first (we'll filter by location in memory since JSON queries are complex)
    // Rate limit by simple pseudo key (public search flood protection)
    const rateKey = `${zipCode || city || state || "global"}:${service || "any"}`;
    const rl = await checkRateLimit(rateKey, "PUBLIC");
    if (!rl.success) {
      return NextResponse.json({ error: "Rate limit exceeded", reset: rl.reset }, { status: 429 });
    }

    const contractors = await prisma.tradesCompanyMember.findMany({
      where,
      select: {
        id: true,
        companyName: true,
        profilePhoto: true,
        coverPhoto: true,
        tagline: true,
        aboutCompany: true,
        phone: true,
        email: true,
        companyWebsite: true,
        specialties: true,
        serviceArea: true,
        city: true,
        state: true,
        zip: true,
        hoursOfOperation: true,
        emergencyAvailable: true,
        portfolioImages: true,
        company: {
          select: {
            slug: true,
            isVerified: true,
            rating: true,
            reviewCount: true,
          },
        },
      },
      orderBy: [{ createdAt: "desc" }],
    });

    // Filter by location and service, and optionally by verified status
    let filtered = contractors.filter((contractor) => {
      // Check verified filter
      if (verifiedOnly && !contractor.company?.isVerified) {
        return false;
      }

      // Check if contractor serves this location
      const servesLocation = (() => {
        if (zipCode && contractor.zip === zipCode) return true;
        if (city && contractor.city?.toLowerCase() === city.toLowerCase()) return true;
        if (state && contractor.state?.toLowerCase() === state.toLowerCase()) return true;
        // Also check serviceArea string field
        if (contractor.serviceArea) {
          const areaLower = contractor.serviceArea.toLowerCase();
          if (zipCode && areaLower.includes(zipCode)) return true;
          if (city && areaLower.includes(city.toLowerCase())) return true;
          if (state && areaLower.includes(state.toLowerCase())) return true;
        }
        return false;
      })();

      if (!servesLocation) return false;

      // Check if contractor offers this service
      if (service) {
        const specialties = contractor.specialties || [];
        const offersService = specialties.some((s: string) =>
          s.toLowerCase().includes(service.toLowerCase())
        );
        if (!offersService) return false;
      }

      return true;
    });

    // Paginate
    const total = filtered.length;
    filtered = filtered.slice(offset, offset + limit);

    // Track this search (optional analytics)
    try {
      const sessionId = req.headers.get("x-session-id");
      const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip");

      if (sessionId) {
        await prisma.public_users.upsert({
          where: { sessionId },
          create: {
            id: crypto.randomUUID(),
            sessionId,
            ipAddress: ipAddress || undefined,
            searches: [{ query: { zipCode, city, state, service }, timestamp: new Date() }],
          },
          update: {
            lastSeenAt: new Date(),
            searches: [{ query: { zipCode, city, state, service }, timestamp: new Date() }],
          },
        });
      }
    } catch (analyticsError) {
      // Don't fail the request if analytics fails
      logger.warn("Analytics tracking failed:", analyticsError);
    }

    return NextResponse.json({
      contractors: filtered,
      total,
      limit,
      offset,
      filters: {
        zipCode,
        city,
        state,
        service,
        emergency: emergency === "true",
        verifiedOnly,
      },
      rateLimit: { remaining: rl.remaining, limit: rl.limit, reset: rl.reset },
    });
  } catch (error) {
    logger.error("❌ [GET /api/public/search] Error:", error);
    return NextResponse.json({ error: "Failed to search contractors" }, { status: 500 });
  }
}
