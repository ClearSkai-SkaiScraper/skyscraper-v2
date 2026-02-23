/**
 * POST /api/codes/analyze
 *
 * Analyze building codes for a claim's property location.
 * Returns applicable codes, jurisdiction info, and permit requirements.
 *
 * Accepts: { claimId, address, city, state, zip }
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

import { withAuth } from "@/lib/auth/withAuth";
import { logger } from "@/lib/logger";

export const POST = withAuth(async (req: NextRequest, { orgId }) => {
  try {
    const body = await req.json();
    const { claimId, address, city, state, zip } = body;

    if (!state) {
      return NextResponse.json({ error: "State is required for code lookup" }, { status: 400 });
    }

    // Determine jurisdiction based on state
    const stateUpper = (state as string).toUpperCase().trim();
    const jurisdiction = `${city || "Unknown City"}, ${stateUpper}`;

    // Base IRC codes that apply everywhere
    const baseCodes = [
      {
        code: "IRC R905.2.7",
        title: "Underlayment Requirements",
        requirement:
          "One layer of No. 15 asphalt felt or approved synthetic underlayment applied over entire roof deck",
        category: "underlayment",
        source: "irc" as const,
        appliesTo: "All roofing",
        citation: "2021 IRC Section R905.2.7",
      },
      {
        code: "IRC R905.2.5",
        title: "Flashing Requirements",
        requirement:
          "Flashing shall be installed at wall and roof intersections, valleys, roof penetrations, and drip edges",
        category: "flashing",
        source: "irc" as const,
        appliesTo: "All roofing",
        citation: "2021 IRC Section R905.2.5",
      },
      {
        code: "IRC R806.1",
        title: "Ventilation Required",
        requirement:
          "Enclosed attics and rafter spaces shall have cross ventilation. Net free ventilating area not less than 1/150 of area of vented space.",
        category: "ventilation",
        source: "irc" as const,
        appliesTo: "Attic spaces",
        citation: "2021 IRC Section R806.1",
      },
      {
        code: "IRC R905.2.6",
        title: "Fastener Requirements",
        requirement:
          "Asphalt shingles shall be secured with not less than four fasteners per strip shingle",
        category: "fasteners",
        source: "irc" as const,
        appliesTo: "Asphalt shingles",
        citation: "2021 IRC Section R905.2.6",
      },
      {
        code: "IRC R905.2.7.1",
        title: "Ice Barrier/Water Shield",
        requirement:
          "In areas where the average daily temperature in January is 25°F or less, ice barrier required at eaves",
        category: "ice_water",
        source: "irc" as const,
        appliesTo: "Cold climate regions",
        citation: "2021 IRC Section R905.2.7.1",
      },
      {
        code: "IRC R905.2.8.5",
        title: "Drip Edge Installation",
        requirement:
          "Drip edge shall be provided at eaves and gable ends of shingle roofs. Installed beneath underlayment at eaves.",
        category: "drip_edge",
        source: "irc" as const,
        appliesTo: "All roofing",
        citation: "2021 IRC Section R905.2.8.5",
      },
    ];

    // High wind zones (simplified — FL, TX coast, OK, KS, etc.)
    const highWindStates = ["FL", "TX", "OK", "KS", "LA", "MS", "AL", "SC", "NC"];
    const highWindZone = highWindStates.includes(stateUpper);

    // Ice dam states
    const coldStates = [
      "MN",
      "WI",
      "MI",
      "ME",
      "VT",
      "NH",
      "NY",
      "MA",
      "CT",
      "RI",
      "PA",
      "OH",
      "IN",
      "IL",
      "IA",
      "ND",
      "SD",
      "NE",
      "MT",
      "WY",
      "CO",
      "ID",
    ];
    const iceWaterShieldRequired = coldStates.includes(stateUpper);

    // Add wind-specific codes
    if (highWindZone) {
      baseCodes.push({
        code: "IRC R905.2.6 (High Wind)",
        title: "High Wind Fastener Requirements",
        requirement:
          "In high-wind regions (≥110 mph), shingles shall be secured with six fasteners per strip shingle. Enhanced starter strips required.",
        category: "fasteners",
        source: "irc" as const,
        appliesTo: "High wind zones",
        citation: "2021 IRC Section R905.2.6",
      });
    }

    // Add valley codes
    baseCodes.push({
      code: "IRC R905.2.8.2",
      title: "Valley Lining Requirements",
      requirement:
        "Valley linings shall be installed per manufacturer specifications. Woven or closed-cut valley methods acceptable.",
      category: "valley",
      source: "irc" as const,
      appliesTo: "Roof valleys",
      citation: "2021 IRC Section R905.2.8.2",
    });

    // Determine local amendments based on state
    const localAmendments: string[] = [];
    if (stateUpper === "AZ") {
      localAmendments.push("Arizona Residential Code 2018 adopted with local amendments");
      localAmendments.push(
        "Maricopa County requires engineered plans for re-roofing over 500 sq ft"
      );
    } else if (stateUpper === "FL") {
      localAmendments.push("Florida Building Code 7th Edition (2020) — enhanced wind requirements");
      localAmendments.push("Miami-Dade HVHZ requires NOA-approved products");
    } else if (stateUpper === "TX") {
      localAmendments.push("Texas follows 2015 IRC with local amendments");
    }

    const result = {
      codes: baseCodes,
      jurisdiction,
      adoptedCode: `2021 International Residential Code (${stateUpper} Edition)`,
      localAmendments,
      permitRequired: true,
      permitFees: 150,
      highWindZone,
      iceWaterShieldRequired,
    };

    return NextResponse.json(result);
  } catch (error) {
    logger.error("[POST /api/codes/analyze] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Code analysis failed" },
      { status: 500 }
    );
  }
});
