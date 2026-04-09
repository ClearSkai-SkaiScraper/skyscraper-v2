export const dynamic = "force-dynamic";

/**
 * POST /api/claims/[claimId]/weather/refresh
 * Force refresh weather data (rate-limited: 1 per 10 minutes per claim)
 */

import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { withAuth } from "@/lib/auth/withAuth";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { fetchOpenMeteoWeather } from "@/lib/weather/openMeteo";
import { formatLocationError, resolveClaimLocation } from "@/lib/weather/resolveClaimLocation";

const WeatherRefreshSchema = z.object({
  startDate: z.string().min(1, "startDate is required"),
  endDate: z.string().min(1, "endDate is required"),
});

const RATE_LIMIT_MS = 10 * 60 * 1000; // 10 minutes

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

export const POST = withAuth(
  async (request: NextRequest, { userId, orgId }, routeParams: { params: { claimId: string } }) => {
    try {
      const { claimId } = routeParams.params;

      // Parse body
      const raw = await request.json();
      const parsed = WeatherRefreshSchema.safeParse(raw);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Validation failed", details: parsed.error.flatten() },
          { status: 400 }
        );
      }
      const { startDate, endDate } = parsed.data;

      // Verify claim belongs to org
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

      // Check rate limit - using createdAt as timestamp
      const recentReport = await prisma.weather_reports.findFirst({
        where: {
          claimId,
          mode: "open-meteo",
        },
        orderBy: {
          createdAt: "desc",
        },
        select: {
          createdAt: true,
        },
      });

      if (recentReport) {
        const timeSinceLastFetch = Date.now() - recentReport.createdAt.getTime();
        if (timeSinceLastFetch < RATE_LIMIT_MS) {
          const remainingMs = RATE_LIMIT_MS - timeSinceLastFetch;
          const remainingMinutes = Math.ceil(remainingMs / 60000);
          return NextResponse.json(
            {
              error: "Rate limit exceeded",
              message: `Please wait ${remainingMinutes} minute(s) before refreshing weather data again.`,
              retryAfter: remainingMs,
            },
            { status: 429 }
          );
        }
      }

      // Use unified location resolver
      const locationResult = await resolveClaimLocation(claimId);
      if (!locationResult.ok) {
        logger.warn("[weather/refresh] Location resolution failed", {
          claimId,
          error: locationResult.error,
        });
        return NextResponse.json(
          { error: formatLocationError(locationResult.error) },
          { status: 400 }
        );
      }

      const { latitude: lat, longitude: lng } = locationResult.location;
      const resolvedAddress = locationResult.location.fullAddress || "Unknown";
      logger.info("[weather/refresh] Resolved location", {
        claimId,
        lat,
        lng,
        source: locationResult.location.source,
      });

      // Fetch fresh weather from Open-Meteo
      const weatherFacts = await fetchOpenMeteoWeather({
        lat,
        lng,
        startDate,
        endDate,
      });

      // Check if report exists for this exact window
      const existing = await prisma.weather_reports.findFirst({
        where: {
          claimId,
          mode: "open-meteo",
          periodFrom: new Date(startDate + "T00:00:00Z"),
          periodTo: new Date(endDate + "T23:59:59Z"),
        },
      });

      // Determine primary peril from weather data
      const maxWind = weatherFacts.maxWindGustMph ?? 0;
      const maxHail = weatherFacts.maxHailInches ?? 0;
      const primaryPeril = maxWind > 50 ? "wind" : maxHail > 0 ? "hail" : "storm";
      const overallAssessment = maxWind > 60 ? "severe" : "moderate";

      let weatherReport;
      if (existing) {
        // Update existing
        weatherReport = await prisma.weather_reports.update({
          where: { id: existing.id },
          data: {
            lat,
            lng,
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
            } as unknown as Prisma.InputJsonValue,
            updatedAt: new Date(),
          },
        });
      } else {
        // Create new
        weatherReport = await prisma.weather_reports.create({
          data: {
            id: crypto.randomUUID(),
            claimId,
            createdById: userId,
            mode: "open-meteo",
            address: resolvedAddress,
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
            } as unknown as Prisma.InputJsonValue,
            updatedAt: new Date(),
          },
        });
      }

      const rawData = weatherReport.providerRaw as WeatherData | null;

      return NextResponse.json({
        refreshed: true,
        data: {
          maxWindGustMph: rawData?.maxWindGustMph ?? null,
          maxSustainedWindMph: rawData?.maxSustainedWindMph ?? null,
          maxHailInches: rawData?.maxHailInches ?? null,
          precipitationIn: rawData?.precipitationIn ?? null,
          snowfallIn: rawData?.snowfallIn ?? null,
          sourceLabel: rawData?.sourceLabel ?? "Open-Meteo",
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
      logger.error("Weather refresh error:", error);
      return NextResponse.json(
        {
          error: "Failed to refresh weather data",
          details: "Unknown error",
        },
        { status: 500 }
      );
    }
  }
);
