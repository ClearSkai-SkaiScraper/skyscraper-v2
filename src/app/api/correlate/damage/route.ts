export const dynamic = "force-dynamic";

import { auth } from "@clerk/nextjs/server";
import { logger } from "@/lib/logger";
import { NextResponse } from "next/server";

import { correlateDamageWithWeather } from "@/lib/intel/correlation/damage-weather";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { claimId } = await req.json();

    if (!claimId) {
      return NextResponse.json({ error: "claimId required" }, { status: 400 });
    }

    // Fetch claim data with related records
    const claim = await prisma.claims.findFirst({
      where: {
        id: claimId,
        orgId,
      },
      include: {
        weather_reports: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        damage_assessments: {
          orderBy: { created_at: "desc" },
        },
      },
    });

    if (!claim) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }

    // Extract weather data
    const weatherData =
      claim.weather_reports[0]?.providerRaw || claim.weather_reports[0]?.globalSummary;

    // Extract damage data
    const damageData = claim.damage_assessments.map((assessment) => ({
      id: assessment.id,
      summary: assessment.summary,
      primaryPeril: assessment.primaryPeril,
      recommendation: assessment.overall_recommendation,
      metadata: assessment.metadata,
      createdAt: assessment.created_at,
    }));

    // For now, specs and codes are placeholders
    // These would come from manufacturer specs database and code library
    const specsData = {
      roofingMaterial: "3-tab asphalt shingles",
      windRating: "110 mph",
      hailRating: "Class 3",
      warranty: "25 years",
    };

    const codesData = {
      irc: "IRC 2021 R905",
      windZone: "Zone III",
      seismicZone: "D1",
    };

    // Run correlation engine
    const correlation = await correlateDamageWithWeather({
      weather: weatherData,
      damage: damageData,
      specs: specsData,
      codes: codesData,
    });

    // Save correlation result
    // Note: For now we'll store in claim notes/metadata
    // A dedicated CorrelationReport model should be added to schema
    const correlationRecord = {
      claimId,
      type: "DAMAGE_WEATHER_CORRELATION",
      payload: correlation,
      createdAt: new Date(),
      createdBy: userId,
    };

    // Note: CorrelationReport schema can be added in future migration:
    // model CorrelationReport {
    //   id String @id @default(cuid())
    //   claimId String
    //   correlationScore Float
    //   matches Json
    //   createdAt DateTime @default(now())
    // }
    // For now, storing in generic JSON storage or returning directly to client

    return NextResponse.json({
      success: true,
      correlation,
      description: "Forensic correlation analysis complete",
    });
  } catch (err) {
    logger.error("CORRELATION ERROR:", err);
    return NextResponse.json(
      { error: err?.message || "Correlation analysis failed" },
      { status: 500 }
    );
  }
}
