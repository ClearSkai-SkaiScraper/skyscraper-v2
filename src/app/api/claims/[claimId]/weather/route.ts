export const dynamic = "force-dynamic";

/**
 * GET /api/claims/[claimId]/weather
 * Fetch and cache weather verification data
 */

import { NextRequest, NextResponse } from "next/server";

import { OrgScopeError } from "@/lib/auth/orgScope";
import { withAuth } from "@/lib/auth/withAuth";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { fetchOpenMeteoWeather } from "@/lib/weather/openMeteo";
import { formatLocationError, resolveClaimLocation } from "@/lib/weather/resolveClaimLocation";

// Type for weather data stored in providerRaw JSON
interface WeatherData {
  maxWindGustMph?: number | null;
  maxSustainedWindMph?: number | null;
  maxHailInches?: number | null;
  precipitationIn?: number | null;
  snowfallIn?: number | null;
  sourceLabel?: string;
  raw?: unknown;
}

export const GET = withAuth(
  async (
    req: NextRequest,
    { orgId, userId },
    routeParams: { params: Promise<{ claimId: string }> }
  ) => {
    try {
      const { claimId } = await routeParams.params;

      // Parse query params
      const url = new URL(req.url);
      const startParam = url.searchParams.get("start");
      const endParam = url.searchParams.get("end");

      // Verify claim belongs to org (DB-backed orgId)
      const claim = await prisma.claims.findFirst({
        where: {
          id: claimId,
          orgId,
        },
        select: {
          id: true,
          dateOfLoss: true,
          propertyId: true,
        },
      });

      if (!claim) {
        return NextResponse.json({ error: "Claim not found" }, { status: 404 });
      }

      // Determine date range (default: loss date ± 3 days)
      const lossDate = new Date(claim.dateOfLoss);
      const defaultStart = new Date(lossDate);
      defaultStart.setDate(defaultStart.getDate() - 3);
      const defaultEnd = new Date(lossDate);
      defaultEnd.setDate(defaultEnd.getDate() + 3);

      const startDate = startParam || defaultStart.toISOString().split("T")[0];
      const endDate = endParam || defaultEnd.toISOString().split("T")[0];

      // Check cache - using actual schema fields
      const cached = await prisma.weather_reports.findFirst({
        where: {
          claimId,
          mode: "open-meteo",
          periodFrom: new Date(startDate + "T00:00:00Z"),
          periodTo: new Date(endDate + "T23:59:59Z"),
        },
      });

      if (cached) {
        // Return cached data - extract from providerRaw JSON
        const rawData = cached.providerRaw as WeatherData | null;
        return NextResponse.json({
          cached: true,
          data: {
            maxWindGustMph: rawData?.maxWindGustMph ?? null,
            maxSustainedWindMph: rawData?.maxSustainedWindMph ?? null,
            maxHailInches: rawData?.maxHailInches ?? null,
            precipitationIn: rawData?.precipitationIn ?? null,
            snowfallIn: rawData?.snowfallIn ?? null,
            sourceLabel: rawData?.sourceLabel ?? "Open-Meteo",
            fetchedAt: cached.createdAt,
            provider: cached.mode,
            locationLat: cached.lat,
            locationLng: cached.lng,
            eventStart: cached.periodFrom,
            eventEnd: cached.periodTo,
            primaryPeril: cached.primaryPeril,
            overallAssessment: cached.overallAssessment,
            confidence: cached.confidence,
          },
        });
      }

      // Use unified location resolver
      const locationResult = await resolveClaimLocation(claimId);
      if (!locationResult.ok) {
        logger.warn("[weather] Location resolution failed", {
          claimId,
          error: locationResult.error,
        });
        return NextResponse.json(
          { error: formatLocationError(locationResult.error) },
          { status: 400 }
        );
      }

      const { latitude: lat, longitude: lng } = locationResult.location;
      logger.info("[weather] Resolved location", {
        claimId,
        lat,
        lng,
        source: locationResult.location.source,
      });

      // Fetch weather from Open-Meteo
      const weatherFacts = await fetchOpenMeteoWeather({
        lat,
        lng,
        startDate,
        endDate,
      });

      // Determine primary peril from weather data
      const maxWind = weatherFacts.maxWindGustMph ?? 0;
      const maxHail = weatherFacts.maxHailInches ?? 0;
      const primaryPeril = maxWind > 50 ? "wind" : maxHail > 0 ? "hail" : "storm";
      const overallAssessment = maxWind > 60 ? "severe" : "moderate";

      // Store in database using actual schema fields
      const weatherReport = await prisma.weather_reports.create({
        data: {
          id: crypto.randomUUID(),
          claimId,
          createdById: userId,
          mode: "open-meteo",
          address: locationResult.location.fullAddress || "Unknown",
          lat,
          lng,
          lossType: "weather",
          dol: claim.dateOfLoss,
          periodFrom: new Date(startDate + "T00:00:00Z"),
          periodTo: new Date(endDate + "T23:59:59Z"),
          primaryPeril,
          overallAssessment,
          confidence: 0.85,
          providerRaw: {
            maxWindGustMph: weatherFacts.maxWindGustMph,
            maxSustainedWindMph: weatherFacts.maxSustainedWindMph,
            maxHailInches: weatherFacts.maxHailInches,
            precipitationIn: weatherFacts.precipitationIn,
            snowfallIn: weatherFacts.snowfallIn,
            sourceLabel: weatherFacts.sourceLabel,
            raw: weatherFacts.raw,
          } as any,
          updatedAt: new Date(),
        },
      });

      const newRawData = weatherReport.providerRaw as WeatherData | null;

      return NextResponse.json({
        cached: false,
        data: {
          maxWindGustMph: newRawData?.maxWindGustMph ?? null,
          maxSustainedWindMph: newRawData?.maxSustainedWindMph ?? null,
          maxHailInches: newRawData?.maxHailInches ?? null,
          precipitationIn: newRawData?.precipitationIn ?? null,
          snowfallIn: newRawData?.snowfallIn ?? null,
          sourceLabel: newRawData?.sourceLabel ?? "Open-Meteo",
          fetchedAt: weatherReport.createdAt,
          provider: weatherReport.mode,
          locationLat: weatherReport.lat,
          locationLng: weatherReport.lng,
          eventStart: weatherReport.periodFrom,
          eventEnd: weatherReport.periodTo,
          primaryPeril: weatherReport.primaryPeril,
          overallAssessment: weatherReport.overallAssessment,
          confidence: weatherReport.confidence,
        },
      });
    } catch (error) {
      if (error instanceof OrgScopeError) {
        return NextResponse.json({ error: "Claim not found" }, { status: 404 });
      }
      logger.error("Weather fetch error:", error);
      return NextResponse.json(
        {
          error: "Failed to fetch weather data",
          details: "Unknown error",
        },
        { status: 500 }
      );
    }
  }
);
