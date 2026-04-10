export const dynamic = "force-dynamic";

/**
 * Claims Folder Assembly API
 * POST /api/claims-folder/assemble
 * Assembles a complete claims-ready folder from a claim ID
 */

import { NextRequest, NextResponse } from "next/server";

import { withAuth } from "@/lib/auth/withAuth";
import { assembleClaimFolder } from "@/lib/claims-folder/folderAssembler";
import type { SectionStatus } from "@/lib/claims-folder/folderSchema";
import { AssembleFolderRequestSchema } from "@/lib/claims-folder/folderSchema";
import { logger } from "@/lib/logger";

// Demo folder for testing - uses `any` to allow flexible demo structure
// that matches what the UI components expect
function buildDemoFolder(claimId: string): Record<string, unknown> {
  const now = new Date();
  return {
    metadata: {
      folderId: `folder-${claimId}-demo`,
      claimId,
      orgId: "demo-org",
      createdAt: now,
      generatedBy: "SkaiScraper AI Demo",
      version: "1.0.0",
    },
    coverSheet: {
      propertyAddress: "123 Main Street, Phoenix, AZ 85001",
      policyholderName: "John Smith",
      dateOfLoss: new Date("2026-01-15"),
      claimNumber: "CLM-2026-00123",
      carrier: "State Farm",
      contractorName: "ClearSkai Technologies LLC",
      preparedBy: "SkaiScraper AI",
      generatedAt: now,
    },
    weatherCauseOfLoss: {
      stormDate: new Date("2026-01-15"),
      stormType: "hail",
      hailSize: "1.25 inch",
      windSpeed: 65,
      noaaVerification: true,
      distanceFromProperty: 2.3,
      narrativeSummary:
        'On January 15, 2026, a significant hailstorm impacted the Phoenix area. NOAA confirmed 1.25" hail.',
      weatherSources: [{ source: "NOAA", verified: true }],
    },
    inspectionOverview: {
      inspectionDate: new Date("2026-01-20"),
      inspectorName: "Mike Johnson, RCI",
      roofType: "Asphalt Shingle - 3-Tab",
      roofPitch: "4/12",
      estimatedAge: 12,
      overallCondition: "fair",
    },
    photos: [
      {
        id: "1",
        url: "/demo/photos/roof-overview.jpg",
        thumbnailUrl: "/demo/photos/roof-overview.jpg",
        caption: "Roof Overview",
        timestamp: now,
      },
      {
        id: "2",
        url: "/demo/photos/hail-impact.jpg",
        thumbnailUrl: "/demo/photos/hail-impact.jpg",
        caption: "Hail Impact",
        timestamp: now,
      },
      {
        id: "3",
        url: "/demo/photos/granule-loss.jpg",
        thumbnailUrl: "/demo/photos/granule-loss.jpg",
        caption: "Granule Loss",
        timestamp: now,
      },
      {
        id: "4",
        url: "/demo/photos/soft-metal.jpg",
        thumbnailUrl: "/demo/photos/soft-metal.jpg",
        caption: "Soft Metal Damage",
        timestamp: now,
      },
      {
        id: "5",
        url: "/demo/photos/gutter-dents.jpg",
        thumbnailUrl: "/demo/photos/gutter-dents.jpg",
        caption: "Gutter Dents",
        timestamp: now,
      },
      {
        id: "6",
        url: "/demo/photos/ridge-vent.jpg",
        thumbnailUrl: "/demo/photos/ridge-vent.jpg",
        caption: "Ridge Vent Damage",
        timestamp: now,
      },
      {
        id: "7",
        url: "/demo/photos/downspout.jpg",
        thumbnailUrl: "/demo/photos/downspout.jpg",
        caption: "Downspout Impact",
        timestamp: now,
      },
      {
        id: "8",
        url: "/demo/photos/ac-unit.jpg",
        thumbnailUrl: "/demo/photos/ac-unit.jpg",
        caption: "AC Unit Damage",
        timestamp: now,
      },
      {
        id: "9",
        url: "/demo/photos/window-screen.jpg",
        thumbnailUrl: "/demo/photos/window-screen.jpg",
        caption: "Window Screen Damage",
        timestamp: now,
      },
      {
        id: "10",
        url: "/demo/photos/test-square.jpg",
        thumbnailUrl: "/demo/photos/test-square.jpg",
        caption: "Test Square Results",
        timestamp: now,
      },
    ],
    codeCompliance: {
      state: "AZ",
      jurisdiction: "City of Phoenix",
      applicableCodes: ["IRC 2021", "Phoenix Building Code"],
      codes: [
        {
          code: "IRC R905.2.3",
          title: "Deck Requirements",
          requirement: "Solid or closely fitted deck required",
          category: "installation",
          source: "irc",
          appliesTo: "roof",
          citation: "IRC R905.2.3",
        },
        {
          code: "IRC R905.2.7",
          title: "Underlayment",
          requirement: "Underlayment required on entire roof deck",
          category: "underlayment",
          source: "irc",
          appliesTo: "roof",
          citation: "IRC R905.2.7",
        },
        {
          code: "IRC R905.2.8.5",
          title: "Drip Edge",
          requirement: "Drip edge required at eaves and rakes",
          category: "flashing",
          source: "irc",
          appliesTo: "roof",
          citation: "IRC R905.2.8.5",
        },
        {
          code: "IRC R905.2.6",
          title: "Nailing Pattern",
          requirement: "Six nails per shingle for high-wind areas",
          category: "installation",
          source: "irc",
          appliesTo: "roof",
          citation: "IRC R905.2.6",
        },
        {
          code: "IRC R903.4",
          title: "Valley Flashing",
          requirement: "Metal flashing required in valleys",
          category: "flashing",
          source: "irc",
          appliesTo: "roof",
          citation: "IRC R903.4",
        },
      ],
    },
    scopePricing: {
      lineItems: [
        {
          id: "1",
          trade: "roofing",
          description: "Remove existing shingles",
          quantity: 24,
          unit: "SQ",
          unitPrice: 75.0,
          total: 1800.0,
          source: "Xactimate",
        },
        {
          id: "2",
          trade: "roofing",
          description: "Install 30# felt underlayment",
          quantity: 24,
          unit: "SQ",
          unitPrice: 45.0,
          total: 1080.0,
          source: "Xactimate",
        },
        {
          id: "3",
          trade: "roofing",
          description: "Install architectural shingles",
          quantity: 24,
          unit: "SQ",
          unitPrice: 385.0,
          total: 9240.0,
          source: "Xactimate",
        },
        {
          id: "4",
          trade: "roofing",
          description: "Install ice/water shield at eaves",
          quantity: 240,
          unit: "LF",
          unitPrice: 3.5,
          total: 840.0,
          source: "Xactimate",
        },
        {
          id: "5",
          trade: "roofing",
          description: "Install drip edge - eaves",
          quantity: 140,
          unit: "LF",
          unitPrice: 2.75,
          total: 385.0,
          source: "Xactimate",
        },
        {
          id: "6",
          trade: "roofing",
          description: "Install drip edge - rakes",
          quantity: 80,
          unit: "LF",
          unitPrice: 2.75,
          total: 220.0,
          source: "Xactimate",
        },
        {
          id: "7",
          trade: "roofing",
          description: "Install ridge cap",
          quantity: 60,
          unit: "LF",
          unitPrice: 8.5,
          total: 510.0,
          source: "Xactimate",
        },
        {
          id: "8",
          trade: "roofing",
          description: "Install pipe boots (4)",
          quantity: 4,
          unit: "EA",
          unitPrice: 65.0,
          total: 260.0,
          source: "Xactimate",
        },
        {
          id: "9",
          trade: "roofing",
          description: "Install ridge vent",
          quantity: 40,
          unit: "LF",
          unitPrice: 12.0,
          total: 480.0,
          source: "Xactimate",
        },
        {
          id: "10",
          trade: "gutters",
          description: "Replace gutters",
          quantity: 140,
          unit: "LF",
          unitPrice: 9.5,
          total: 1330.0,
          source: "Xactimate",
        },
        {
          id: "11",
          trade: "gutters",
          description: "Replace downspouts",
          quantity: 4,
          unit: "EA",
          unitPrice: 85.0,
          total: 340.0,
          source: "Xactimate",
        },
        {
          id: "12",
          trade: "siding",
          description: "Replace vinyl siding - north",
          quantity: 200,
          unit: "SF",
          unitPrice: 8.5,
          total: 1700.0,
          source: "Xactimate",
        },
      ],
      laborTotal: 8500.0,
      materialTotal: 11285.0,
      overhead: 1978.5,
      profit: 1978.5,
      grandTotal: 23742.0,
      source: "Xactimate",
    },
    timeline: [
      {
        date: new Date("2026-01-15"),
        event: "Storm Event",
        description: "Hailstorm impacted property",
        type: "storm",
      },
      {
        date: new Date("2026-01-16"),
        event: "Claim Filed",
        description: "Homeowner filed claim with State Farm",
        type: "claim",
      },
      {
        date: new Date("2026-01-20"),
        event: "Inspection",
        description: "Contractor inspection completed",
        type: "inspection",
      },
      {
        date: new Date("2026-01-22"),
        event: "Estimate Prepared",
        description: "Xactimate estimate completed",
        type: "estimate",
      },
    ],
    signatures: [
      { role: "homeowner", name: "John Smith", date: new Date("2026-01-22") },
      { role: "contractor", name: "ClearSkai Technologies LLC", date: new Date("2026-01-22") },
    ],
    checklist: [
      {
        section: "Cover Sheet",
        item: "Property info complete",
        status: "complete",
        required: true,
      },
      { section: "Weather", item: "NOAA verification", status: "complete", required: true },
      { section: "Photos", item: "Damage photos uploaded", status: "complete", required: true },
      { section: "Codes", item: "Code citations generated", status: "complete", required: true },
      { section: "Scope", item: "Line items defined", status: "complete", required: true },
      { section: "Signatures", item: "Homeowner signature", status: "complete", required: false },
      { section: "Signatures", item: "Contractor signature", status: "complete", required: false },
    ],
    readinessScore: 95,
    missingItems: [],
    sectionStatus: {
      "cover-sheet": "complete",
      "table-of-contents": "complete",
      "executive-summary": "complete",
      "weather-cause-of-loss": "complete",
      "inspection-overview": "complete",
      "damage-grids": "complete",
      "photo-evidence": "complete",
      "test-cuts": "partial",
      "code-compliance": "complete",
      "scope-pricing": "complete",
      "supplements-variances": "missing",
      "repair-justification": "complete",
      "contractor-summary": "complete",
      timeline: "complete",
      "homeowner-statement": "partial",
      "adjuster-cover-letter": "complete",
      "claim-checklist": "complete",
      "digital-signatures": "partial",
      attachments: "partial",
    } as Record<string, SectionStatus>,
  };
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const POST = withAuth(async (request: NextRequest, { userId }) => {
  try {
    const body = await request.json();

    // Validate request
    const parsed = AssembleFolderRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid request", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { claimId, includeSections, generateNarratives, includeHomeownerStatement } = parsed.data;

    // Return demo folder for demo claim IDs
    if (claimId === "demo-claim" || claimId.startsWith("demo-")) {
      const demoFolder = buildDemoFolder(claimId);
      return NextResponse.json({
        success: true,
        folder: demoFolder,
        readinessScore: {
          weather: { score: 15, maxScore: 15, status: "complete" },
          photos: { score: 20, maxScore: 20, status: "complete" },
          codes: { score: 15, maxScore: 15, status: "complete" },
          scope: { score: 20, maxScore: 20, status: "complete" },
          narratives: { score: 15, maxScore: 15, status: "complete" },
          signatures: { score: 10, maxScore: 10, status: "complete" },
          timeline: { score: 5, maxScore: 5, status: "complete" },
          overall: 95,
          grade: "A",
          recommendation: "Your folder is carrier-ready!",
        },
        warnings: [],
      });
    }

    // Assemble the folder from real data
    const result = await assembleClaimFolder({
      claimId,
      includeSections,
      generateNarratives,
      includeHomeownerStatement,
    });

    if (!result.success) {
      return NextResponse.json({ success: false, errors: result.errors }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      folder: result.folder,
      readinessScore: result.readinessScore,
      warnings: result.warnings,
    });
  } catch (error) {
    logger.error("Error in claims folder assembly:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
});
