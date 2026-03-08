export const dynamic = "force-dynamic";

import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";

import { withAuth } from "@/lib/auth/withAuth";
import { getRateLimitIdentifier, rateLimiters } from "@/lib/rate-limit";
import { GeneratedWeatherReport, WeatherWizardSchema } from "@/lib/weather/types";

/**
 * Weather Builder - Smart Generation API
 *
 * This endpoint will eventually:
 * 1. Validate the weather wizard payload
 * 2. Call the Intelligence Core to gather claim data
 * 3. Fetch external weather data (NOAA, NWS, NCEI, etc.)
 * 4. Use GPT-4o to generate a structured weather report
 * 5. Save to database if save=true
 * 6. Return the generated report + reportId
 *
 * For Phase 1, we return a placeholder response with the expected structure
 */
export const POST = withAuth(async (req: NextRequest, { userId, orgId }) => {
  try {
    // Rate limiting check (20 requests per minute for weather endpoints)
    const identifier = getRateLimitIdentifier(userId, req);
    const allowed = await rateLimiters.weather.check(20, identifier);
    if (!allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please wait a moment and try again." },
        { status: 429 }
      );
    }

    const body = await req.json();

    // Validate payload
    const validationResult = WeatherWizardSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: validationResult.error },
        { status: 400 }
      );
    }

    const payload = validationResult.data;

    // PHASE 2: Implement full weather generation pipeline
    // 1. Fetch claim data via Intelligence Core
    // 2. Fetch external weather data from APIs
    // 3. Call GPT-4o with structured schema
    // 4. Generate comprehensive weather report

    // For now, return a placeholder structure
    const weatherReport: GeneratedWeatherReport = {
      title: `Weather Verification Report - ${payload.peril}`,
      subtitle: `${payload.address}, ${payload.city}, ${payload.state}`,
      claimId: payload.claim_id,
      address: `${payload.address}, ${payload.city}, ${payload.state} ${payload.zip}`,
      dateOfLoss: payload.dateOfLoss,
      peril: payload.peril,
      summary: {
        confidence: "MEDIUM",
        aiSummary:
          "Weather verification report is in development. Full AI-powered analysis coming in Phase 2.",
        meteorologicalData: "Meteorological data will be fetched from NOAA, NWS, and NCEI APIs.",
        severityRating: payload.options.aiSeverityRating ? 7 : undefined,
      },
      sections: [
        {
          id: "intro",
          title: "Weather Analysis Overview",
          content:
            "This section will contain AI-generated weather analysis based on selected data sources.",
          dataSource: "AI",
        },
      ],
      recommendations: [
        "Full weather report generation coming in Phase 2",
        "Will include: NOAA data, radar imagery, storm events, building codes, and more",
      ],
      meta: {
        generatedAt: new Date().toISOString(),
        options: payload.options,
      },
    };

    // Note: Save functionality can be added when needed:
    // if (body.save === true) {
    //   const savedReport = await prisma.weather_reports.create({
    //     data: { claimId: body.claimId, reportData: weatherReport, orgId }
    //   });
    //   return NextResponse.json({ report: weatherReport, reportId: savedReport.id });
    // }

    return NextResponse.json(
      {
        report: weatherReport,
        reportId: null, // Will be populated when save is implemented
        description:
          "Phase 1 complete - Wizard UI functional. Full AI generation coming in Phase 2.",
      },
      { status: 200 }
    );
  } catch (err) {
    logger.error("Error in weather build-smart route:", err);
    return NextResponse.json({ error: "Failed to generate weather report" }, { status: 500 });
  }
});
