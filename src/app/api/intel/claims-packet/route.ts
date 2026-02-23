// app/api/intel/claims-packet/route.ts
import { logger } from "@/lib/logger";
import { NextResponse } from "next/server";

import { withAuth } from "@/lib/auth/withAuth";
import { ClaimsPacketInput, generateClaimsPacket } from "@/lib/intel/reports/claims-packet";
import prisma from "@/lib/prisma";

export const POST = withAuth(async (req, { orgId, userId }) => {
  try {
    const body = await req.json();
    const { claimId } = body;

    if (!claimId) {
      return NextResponse.json({ error: "Missing claimId" }, { status: 400 });
    }

    // Fetch comprehensive claim data — scoped to DB-backed orgId
    const claim = await prisma.claims.findFirst({
      where: {
        id: claimId,
        orgId,
      },
      include: {
        properties: true,
        estimates: {
          orderBy: { createdAt: "desc" },
          take: 2, // Carrier + Contractor
        },
        supplements: {
          orderBy: { created_at: "desc" },
        },
        weather_reports: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        damage_assessments: {
          orderBy: { created_at: "desc" },
          take: 1,
        },
        scopes: {
          orderBy: { created_at: "desc" },
          take: 1,
        },
      },
    });

    if (!claim) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }

    // Build input for claims packet generation
    const input: ClaimsPacketInput = {
      claimId,

      // Financial data from estimates
      financials: {
        carrierRCV:
          claim.estimates?.find(
            (e) =>
              (e.source as Record<string, unknown> | null)?.source === "carrier" ||
              e.mode === "insurance"
          )?.grand_total || 0,
        carrierACV:
          claim.estimates?.find(
            (e) => (e.source as Record<string, unknown> | null)?.source === "carrier"
          )?.grand_total || 0, // NOTE: Get actual ACV from carrier estimate
        contractorRCV:
          claim.estimates?.find(
            (e) =>
              (e.source as Record<string, unknown> | null)?.source === "contractor" ||
              e.mode === "retail"
          )?.grand_total || 0,
        underpayment: 0, // NOTE: Calculate from financial engine when available
        depreciationErrors: [],
        supplementJustification: "Supplement required for missing items and code requirements",
        settlementProjection: {
          min: 0,
          max: 0,
          confidence: 0.85,
        },
      },

      // Damage assessment data
      damage: {
        photoGroups: [],
        locations: [],
        severity: claim.damage_assessments?.[0]?.primaryPeril || "Unknown",
        materialTypes: [],
        missingItems: [],
        damageNotes: claim.damage_assessments?.[0]?.summary || "",
      },

      // Weather data
      weather: {
        eventTimeline: String(claim.weather_reports?.[0]?.globalSummary || ""),
        hailSize: String(claim.weather_reports?.[0]?.primaryPeril || ""),
        windGusts: "",
        eventFrequency: 1,
        verificationMap: "",
        citations: [],
      },

      // Code requirements
      codeRequirements: {
        ircRequirements: [],
        manufacturerSpecs: [],
        localCodes: [],
        requiredDocumentation: [],
      },

      // Scope data
      scope: {
        missingLineItems: [],
        incorrectMeasurements: [],
        requiredUpgrades: [],
        materialCorrections: [],
        laborCorrections: [],
        supplementOpportunities: (claim.supplements || []).map((s) => ({
          description: s.notes || "Supplement item",
          priority: "medium" as const,
          value: s.total || 0,
        })),
      },

      // Property context
      property: {
        address: claim.properties?.street || "",
        city: claim.properties?.city || "",
        state: claim.properties?.state || "",
        zip: claim.properties?.zipCode || "",
      },

      // Claim context
      claim: {
        claimNumber: claim.claimNumber,
        dateOfLoss: claim.dateOfLoss.toISOString().split("T")[0],
        carrier: claim.carrier || "",
        adjusterName: claim.adjusterName || "",
        policyNumber: claim.policy_number || "",
      },
    };

    // Generate claims packet
    const packet = await generateClaimsPacket(input);

    // Save to database
    const savedReport = await prisma.ai_reports.create({
      data: {
        id: crypto.randomUUID(),
        orgId,
        claimId,
        type: "claims_packet",
        title: `Claims-Ready Report Packet - ${claim.claimNumber}`,
        prompt: "Claims-Ready Report Packet Generation",
        content: JSON.stringify(packet),
        tokensUsed: 0,
        model: "gpt-4o",
        userId,
        userName: "Claims Packet Generator",
        status: "generated",
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      reportId: savedReport.id,
      packet,
    });
  } catch (error) {
    logger.error("Claims Packet Generation Error:", error);
    return NextResponse.json(
      { error: "Claims packet generation failed", details: String(error) },
      { status: 500 }
    );
  }
});

export const GET = withAuth(async (req, { orgId }) => {
  try {
    const { searchParams } = new URL(req.url);
    const claimId = searchParams.get("claimId");

    if (!claimId) {
      return NextResponse.json({ error: "Missing claimId" }, { status: 400 });
    }

    // Fetch most recent claims packet — scoped to DB-backed orgId
    const report = await prisma.ai_reports.findFirst({
      where: {
        claimId,
        orgId,
        type: "claims_packet",
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (!report) {
      return NextResponse.json({ error: "No claims packet found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      reportId: report.id,
      packet: JSON.parse(report.content),
      generatedAt: report.createdAt,
    });
  } catch (error) {
    logger.error("Claims Packet Retrieval Error:", error);
    return NextResponse.json(
      { error: "Claims packet retrieval failed", details: String(error) },
      { status: 500 }
    );
  }
});
