export const dynamic = "force-dynamic";

/**
 * Claims Folder Section Data API
 * GET /api/claims-folder/sections/[section]?claimId=xxx
 * Returns section-specific data for the claims folder
 */

import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";

import { getOrgClaimOrThrow, OrgScopeError } from "@/lib/auth/orgScope";
import { isAuthError, requireAuth } from "@/lib/auth/requireAuth";
import {
  fetchClaimData,
  fetchCodeData,
  fetchPhotos,
  fetchScopeData,
  fetchTimeline,
  fetchWeatherData,
} from "@/lib/claims-folder/folderAssembler";
import prisma from "@/lib/prisma";

// Demo data for each section when claimId is "demo-claim"
const DEMO_DATA: Record<string, unknown> = {
  "cover-sheet": {
    propertyAddress: "123 Main Street, Phoenix, AZ 85001",
    insured_name: "John Smith",
    policyNumber: "POL-2026-00456",
    dateOfLoss: "2026-01-15",
    claimNumber: "CLM-2026-00123",
    carrier: "State Farm",
    contractorName: "ClearSkai Technologies LLC",
    contractorLicense: "ROC-123456",
    contractorPhone: "(480) 555-0123",
    contractorEmail: "claims@clearskaitech.com",
    preparedBy: "SkaiScraper AI",
  },
  "table-of-contents": {
    sections: [
      { title: "Cover Sheet", page: 1, status: "complete" },
      { title: "Table of Contents", page: 2, status: "complete" },
      { title: "Executive Summary", page: 3, status: "complete" },
      { title: "Weather / Cause of Loss", page: 5, status: "complete" },
      { title: "Inspection Overview", page: 7, status: "complete" },
      { title: "Damage Grids", page: 9, status: "complete" },
      { title: "Photo Evidence", page: 12, status: "complete" },
      { title: "Code Compliance", page: 18, status: "complete" },
      { title: "Scope & Pricing", page: 21, status: "partial" },
      { title: "Repair Justification", page: 25, status: "pending" },
      { title: "Contractor Summary", page: 28, status: "pending" },
      { title: "Timeline of Events", page: 30, status: "complete" },
      { title: "Homeowner Statement", page: 32, status: "pending" },
      { title: "Adjuster Cover Letter", page: 34, status: "pending" },
      { title: "Claim Checklist", page: 36, status: "complete" },
      { title: "Digital Signatures", page: 38, status: "pending" },
      { title: "Attachments", page: 40, status: "partial" },
    ],
    totalPages: 45,
    generatedAt: new Date().toISOString(),
  },
  "executive-summary": {
    propertyAddress: "123 Main Street, Phoenix, AZ 85001",
    dateOfLoss: "2026-01-15",
    stormType: "Hail",
    damageOverview:
      'On January 15, 2026, the subject property sustained significant hail damage during a severe storm event. NOAA verified 1.25" hail in the immediate area. Inspection revealed impact damage to roofing, siding, and exterior fixtures consistent with storm event.',
    scopeSummary:
      "Full roof replacement recommended due to granule loss exceeding 25% and multiple penetrating impacts. Partial siding replacement on north and west elevations. Gutter replacement recommended.",
    totalEstimate: 28750.0,
    recommendation: "Full replacement per IRC 2021 and manufacturer warranty requirements",
  },
  "weather-cause-of-loss": {
    stormDate: "2026-01-15",
    stormType: "hail",
    hailSize: "1.25 inch",
    windSpeed: 65,
    noaaVerification: true,
    localStationConfirmation: "Phoenix Sky Harbor International",
    distanceFromProperty: 2.3,
    narrativeSummary:
      'On January 15, 2026, a significant hailstorm impacted the Phoenix metropolitan area. NOAA Storm Reports confirmed 1.25" diameter hail within 2.3 miles of the subject property. Wind speeds reached 65 mph during the event. CoCoRaHS stations in the area reported accumulating hail.',
    weatherSources: [
      { source: "NOAA Storm Reports", verified: true },
      { source: "NWS Phoenix", verified: true },
      { source: "CoCoRaHS", verified: true },
    ],
  },
  "inspection-overview": {
    inspectionDate: "2026-01-20",
    inspectorName: "Mike Johnson, RCI",
    roofType: "Asphalt Shingle - 3-Tab",
    roofPitch: "4/12",
    estimatedAge: 12,
    layers: 1,
    slopeCount: 4,
    softMetalsPresent: true,
    overallCondition: "fair",
    accessPoints: ["Ladder - South", "Ladder - West"],
    accessoriesImpacted: ["Ridge vent", "Pipe boots", "Skylights"],
    notes: "Roof showed pre-existing wear but storm damage clearly identifiable by impact patterns",
  },
  "damage-grids": {
    elevations: [
      {
        direction: "north",
        hitCount: 45,
        creasePatterns: true,
        brittleTestResult: "fail",
        damagePercentage: 35,
      },
      {
        direction: "east",
        hitCount: 38,
        creasePatterns: true,
        brittleTestResult: "fail",
        damagePercentage: 28,
      },
      {
        direction: "south",
        hitCount: 52,
        creasePatterns: true,
        brittleTestResult: "fail",
        damagePercentage: 42,
      },
      {
        direction: "west",
        hitCount: 41,
        creasePatterns: true,
        brittleTestResult: "fail",
        damagePercentage: 32,
      },
    ],
    totalAffectedArea: 2400,
    damagePattern: "directional",
    testSquareResults: "8 of 10 test squares showed damage exceeding replacement threshold",
  },
  "photo-evidence": {
    photos: [
      {
        id: "1",
        url: "https://images.unsplash.com/photo-1632759145356-c3f2cf793669?w=800",
        thumbnailUrl: "https://images.unsplash.com/photo-1632759145356-c3f2cf793669?w=200",
        caption: "Roof Overview - North Elevation showing widespread hail damage",
        elevation: "North",
        aiCaption: {
          materialType: "Asphalt Shingle - 3 Tab",
          damageType: "Hail Impact - Granule Loss",
          functionalImpact: "Compromised weather barrier, reduced UV protection",
          applicableCode: "IRC R905.2.7",
        },
        damageBoxes: [
          { x: 0.2, y: 0.3, w: 0.15, h: 0.15, label: "Hail Impact", severity: "severe" },
          { x: 0.5, y: 0.4, w: 0.1, h: 0.1, label: "Granule Loss", severity: "moderate" },
          { x: 0.7, y: 0.2, w: 0.12, h: 0.12, label: "Crease Pattern", severity: "severe" },
        ],
      },
      {
        id: "2",
        url: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800",
        thumbnailUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=200",
        caption: "Close-up hail impact with granule displacement",
        elevation: "North",
        aiCaption: {
          materialType: "Asphalt Shingle - Architectural",
          damageType: "Direct Hail Impact",
          functionalImpact: "Exposed fiberglass mat, water infiltration risk",
          applicableCode: "ASTM D3462",
        },
        damageBoxes: [
          { x: 0.4, y: 0.35, w: 0.2, h: 0.2, label: "Impact Center", severity: "severe" },
        ],
      },
      {
        id: "3",
        url: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800",
        thumbnailUrl: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=200",
        caption: "Soft metal damage - HVAC vent cap showing multiple impacts",
        elevation: "South",
        aiCaption: {
          materialType: "Aluminum Vent Cap",
          damageType: "Hail Dent Pattern",
          functionalImpact: "Cosmetic damage, storm intensity indicator",
          applicableCode: "N/A - Collateral damage",
        },
        damageBoxes: [
          { x: 0.3, y: 0.3, w: 0.1, h: 0.1, label: "Dent #1", severity: "moderate" },
          { x: 0.5, y: 0.25, w: 0.08, h: 0.08, label: "Dent #2", severity: "minor" },
          { x: 0.45, y: 0.5, w: 0.12, h: 0.12, label: "Dent #3", severity: "moderate" },
        ],
      },
      {
        id: "4",
        url: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800",
        thumbnailUrl: "https://images.unsplash.com/photo-1600585154340-be6161a0c?w=200",
        caption: "Property front view - Overall condition assessment",
        elevation: "Overview",
        aiCaption: {
          materialType: "Residential Structure",
          damageType: "Storm Damage Assessment",
          functionalImpact: "Multiple systems affected",
          applicableCode: "Full inspection required",
        },
      },
      {
        id: "5",
        url: "https://images.unsplash.com/photo-1628624747186-a941c476b7ef?w=800",
        thumbnailUrl: "https://images.unsplash.com/photo-1628624747186-a941c476b7ef?w=200",
        caption: "Gutter damage - Multiple hail dents visible",
        elevation: "West",
        aiCaption: {
          materialType: "Aluminum Gutter",
          damageType: "Hail Impact Dents",
          functionalImpact: "Potential water flow obstruction",
          applicableCode: "IRC R801.3",
        },
        damageBoxes: [
          { x: 0.2, y: 0.4, w: 0.15, h: 0.1, label: "Dent Cluster", severity: "moderate" },
          { x: 0.6, y: 0.45, w: 0.2, h: 0.1, label: "Impact Pattern", severity: "moderate" },
        ],
      },
      {
        id: "6",
        url: "https://images.unsplash.com/photo-1597484661973-ee6cd0b6482c?w=800",
        thumbnailUrl: "https://images.unsplash.com/photo-1597484661973-ee6cd0b6482c?w=200",
        caption: "Ridge line showing damage pattern",
        elevation: "Overview",
        aiCaption: {
          materialType: "Ridge Cap Shingles",
          damageType: "Hail damage to ridge caps",
          functionalImpact: "Ridge ventilation compromised",
          applicableCode: "IRC R905.2.8",
        },
      },
    ],
    totalPhotos: 48,
    categoryCounts: { overview: 8, damage: 32, comparison: 8 },
  },
  "code-compliance": {
    codes: [
      {
        code: "R905.2.6",
        title: "Ice Barrier Requirements",
        requirement:
          "Ice barrier shall extend from eave edge to a point at least 24 inches inside the exterior wall line in areas where the average daily temperature is 25°F or less.",
        category: "ice_water",
        source: "irc",
        appliesTo: "Roof deck",
        citation: "R905.2.6",
      },
      {
        code: "R905.2.7",
        title: "Underlayment Requirements",
        requirement:
          "Asphalt shingles shall be applied over underlayment as specified. One layer of No. 15 asphalt felt complying with ASTM D226 Type I or ASTM D4869 Type I.",
        category: "underlayment",
        source: "irc",
        appliesTo: "Entire roof area",
        citation: "R905.2.7",
      },
      {
        code: "R905.7.5",
        title: "Wind Resistance Classification",
        requirement:
          "Roofing materials shall be designed for wind resistance in accordance with Section R905.2.4.1 or tested in accordance with ASTM D3161 Class F.",
        category: "fasteners",
        source: "irc",
        appliesTo: "All shingles",
        citation: "R905.7.5",
      },
      {
        code: "R905.2.8.2",
        title: "Drip Edge Requirements",
        requirement:
          "A drip edge shall be provided at eaves and gables of shingle roofs. Adjacent segments shall overlap at least 2 inches.",
        category: "drip_edge",
        source: "irc",
        appliesTo: "Roof perimeter",
        citation: "R905.2.8.2",
      },
      {
        code: "R905.2.5",
        title: "Valley Flashing",
        requirement:
          "Valley linings shall be installed per manufacturer specifications. Minimum 24-gauge corrosion-resistant metal.",
        category: "valley",
        source: "irc",
        appliesTo: "All valleys",
        citation: "R905.2.5",
      },
      {
        code: "R903.2.1",
        title: "Flashing Requirements",
        requirement:
          "Flashings shall be installed at wall and roof intersections, changes in roof slope or direction, and around roof openings.",
        category: "flashing",
        source: "irc",
        appliesTo: "All penetrations",
        citation: "R903.2.1",
      },
    ],
    localAmendments: [
      "City of Phoenix requires Class A fire-rated roofing materials",
      "High wind zone designation requires enhanced fastening schedule",
      "Permit required for all re-roofing projects exceeding 100 sq ft",
    ],
    permitRequired: true,
    permitFees: 385,
    highWindZone: true,
    iceWaterShieldRequired: false,
    jurisdiction: "City of Phoenix, Maricopa County",
    adoptedCode: "IRC 2021 with local amendments",
  },
  "scope-pricing": {
    lineItems: [
      {
        id: "1",
        code: "RFG REMV",
        description: "Remove roofing - comp shingle/3 tab",
        quantity: 24,
        unit: "SQ",
        unitPrice: 125.0,
        total: 3000.0,
        category: "Removal",
      },
      {
        id: "2",
        code: "RFG FELT30",
        description: "Roofing felt - 30 lb",
        quantity: 24,
        unit: "SQ",
        unitPrice: 45.0,
        total: 1080.0,
        category: "Materials",
      },
      {
        id: "3",
        code: "RFG ARCH",
        description: "Shingles - architectural grade (GAF Timberline HDZ)",
        quantity: 24,
        unit: "SQ",
        unitPrice: 485.0,
        total: 11640.0,
        category: "Materials",
      },
      {
        id: "4",
        code: "RFG RIDGE",
        description: "Ridge vent - aluminum w/filter",
        quantity: 48,
        unit: "LF",
        unitPrice: 18.5,
        total: 888.0,
        category: "Ventilation",
      },
      {
        id: "5",
        code: "RFG DRIP",
        description: "Drip edge - aluminum",
        quantity: 180,
        unit: "LF",
        unitPrice: 4.5,
        total: 810.0,
        category: "Trim",
      },
      {
        id: "6",
        code: "RFG STRTR",
        description: "Starter strip - 4 tab",
        quantity: 180,
        unit: "LF",
        unitPrice: 3.25,
        total: 585.0,
        category: "Materials",
      },
      {
        id: "7",
        code: "RFG PIPE",
        description: "Pipe jack boot/flashing - replace",
        quantity: 4,
        unit: "EA",
        unitPrice: 85.0,
        total: 340.0,
        category: "Flashing",
      },
      {
        id: "8",
        code: "RFG STEP",
        description: "Step flashing - aluminum",
        quantity: 32,
        unit: "LF",
        unitPrice: 12.5,
        total: 400.0,
        category: "Flashing",
      },
    ],
    subtotal: 18743.0,
    wasteFactor: 1.1,
    laborTotal: 4200.0,
    removalTotal: 3000.0,
    overheadAndProfit: {
      enabled: true,
      percentage: 20,
      amount: 5188.6,
    },
    grandTotal: 28140.0,
  },
  "repair-justification": {
    narrative: `Based on comprehensive inspection findings and industry standards, full roof replacement is required for the subject property at 123 Main Street, Phoenix, AZ 85001.

The January 15, 2026 hailstorm caused significant damage across all roof elevations, with impact patterns consistent with 1.25" diameter hail verified by NOAA storm reports. Brittle test results indicate shingle failure at 8 of 10 test locations, demonstrating the roofing material has exceeded its functional lifespan due to storm damage.

Key factors supporting full replacement include:

1. GRANULE LOSS: Laboratory analysis confirms granule loss exceeding 25% across representative samples, compromising the shingle's ability to provide adequate weather protection.

2. PATTERN DAMAGE: Directional hail damage is present on all four elevations, indicating system-wide impact rather than isolated damage areas.

3. SPOT REPAIR INFEASIBILITY: Due to the extent of damage and material discontinuation, spot repairs would result in a patchwork appearance and compromise overall roof integrity.

4. CODE COMPLIANCE: Current IRC 2021 requirements mandate enhanced underlayment and fastening schedules that cannot be achieved through partial repairs.

5. MANUFACTURER WARRANTY: GAF warranty requirements specify full system replacement when damage exceeds threshold levels documented in this report.

Professional recommendation: Authorize full roof system replacement to restore property to pre-loss condition and ensure compliance with current building codes.`,
    reasons: [
      "Granule loss exceeds 25% replacement threshold",
      "Damage present on all four roof elevations",
      "Brittle test failure at 8 of 10 test squares",
      "Material matching unavailable - shingles discontinued",
      "Code upgrade triggers full system replacement",
      "Manufacturer warranty requires complete system installation",
    ],
    brittleTestFailed: true,
    patternDamageAcrossElevations: true,
    spotRepairInfeasible: true,
    matchingConcerns: [
      "Original shingle color (Weathered Wood) discontinued by manufacturer",
      "Existing shingles show UV degradation affecting color match",
      "Partial replacement would create visible color variation",
    ],
    manufacturerDiscontinued: true,
    localOrdinanceTriggers: [
      "IRC 2021 R905.2.7 - Enhanced underlayment requirements",
      "City of Phoenix high-wind zone designation",
      "Permit code requirement for roof replacement >100 sq ft",
    ],
  },
  "contractor-summary": {
    companyName: "ClearSkai Technologies LLC",
    license: "ROC-123456",
    insurance: {
      generalLiability: "$2,000,000",
      workersComp: "Full Coverage",
      autoLiability: "$1,000,000",
    },
    certifications: ["HAAG Certified", "GAF Master Elite", "CertainTeed SELECT ShingleMaster"],
    yearsInBusiness: 15,
    projectManager: "Sarah Martinez",
    estimatedDuration: "3-4 days",
  },
  timeline: {
    events: [
      {
        id: "1",
        date: "2026-01-15T14:30:00Z",
        event: "Severe hailstorm impacts property",
        category: "loss",
        details: '1.25" hail reported by NOAA, wind gusts to 65 mph',
      },
      {
        id: "2",
        date: "2026-01-15T18:00:00Z",
        event: "Homeowner discovers damage to gutters and outdoor furniture",
        category: "loss",
        details: "Initial damage assessment by property owner",
      },
      {
        id: "3",
        date: "2026-01-16T09:00:00Z",
        event: "Claim filed with State Farm Insurance",
        category: "claim",
        details: "Claim #CLM-2026-00123 opened",
      },
      {
        id: "4",
        date: "2026-01-16T14:00:00Z",
        event: "Weather verification report obtained",
        category: "weather",
        details: "NOAA storm report confirms hail activity within 2.3 miles",
      },
      {
        id: "5",
        date: "2026-01-20T10:00:00Z",
        event: "Professional roof inspection completed",
        category: "inspection",
        details: "HAAG-certified inspector Mike Johnson, RCI documented damage",
      },
      {
        id: "6",
        date: "2026-01-21T11:00:00Z",
        event: "Homeowner statement recorded",
        category: "claim",
        details: "Written statement from John and Jane Smith",
      },
      {
        id: "7",
        date: "2026-01-22T09:00:00Z",
        event: "Xactimate estimate prepared",
        category: "claim",
        details: "Full scope of work documented: $28,140 total",
      },
      {
        id: "8",
        date: "2026-01-22T15:00:00Z",
        event: "Estimate submitted to carrier",
        category: "claim",
        details: "Complete claims packet uploaded to State Farm portal",
      },
      {
        id: "9",
        date: "2026-01-25T09:00:00Z",
        event: "Carrier adjuster inspection scheduled",
        category: "adjuster",
        details: "State Farm adjuster to inspect January 30, 2026",
      },
    ],
    nextSteps: [
      "Adjuster site inspection - January 30, 2026",
      "Scope agreement meeting",
      "Authorization to proceed",
      "Material ordering",
      "Project scheduling",
    ],
  },
  "homeowner-statement": {
    insured_name: "John Smith",
    statementDate: "2026-01-21",
    statement:
      "I was home during the storm on January 15th. The hail was extremely loud on the roof and windows. After the storm, I noticed dents in my gutters and damage to my outdoor furniture. I contacted my insurance company the next day.",
    witnessInfo: "Spouse Jane Smith was also present",
    signatureStatus: "pending",
  },
  "adjuster-cover-letter": {
    adjusterName: "To Be Assigned",
    carrierName: "State Farm",
    claimNumber: "CLM-2026-00123",
    letterContent:
      "Dear Claims Adjuster,\n\nPlease find enclosed the complete claims documentation packet for the above-referenced claim. This packet includes comprehensive weather verification, damage documentation, code compliance analysis, and scope of repairs.\n\nWe look forward to your review and are available to schedule an inspection at your earliest convenience.\n\nSincerely,\nClearSkai Technologies LLC",
  },
  "claim-checklist": {
    items: [
      { item: "Claim filed with carrier", complete: true },
      { item: "Date of loss verified", complete: true },
      { item: "Weather documentation obtained", complete: true },
      { item: "Property inspection completed", complete: true },
      { item: "Photos documented", complete: true },
      { item: "Estimate prepared", complete: true },
      { item: "Code compliance reviewed", complete: true },
      { item: "Adjuster inspection scheduled", complete: false },
      { item: "Scope agreed upon", complete: false },
      { item: "Authorization received", complete: false },
    ],
    completionPercentage: 70,
  },
  "digital-signatures": {
    signatures: [
      {
        id: "sig-demo-1",
        signerName: "John Smith",
        signerRole: "homeowner",
        status: "signed",
        signedAt: "2026-01-22T14:30:00Z",
        ipAddress: "192.168.1.10",
        signatureData: null,
      },
      {
        id: "sig-demo-2",
        signerName: "Sarah Martinez",
        signerRole: "contractor",
        status: "pending",
        signedAt: null,
        ipAddress: null,
        signatureData: null,
      },
      {
        id: "sig-demo-3",
        signerName: "Mike Johnson",
        signerRole: "witness",
        status: "pending",
        signedAt: null,
        ipAddress: null,
        signatureData: null,
      },
    ],
    documentsRequiringSignature: [
      "Authorization to Proceed",
      "Direction to Pay",
      "Scope Agreement",
    ],
  },
  attachments: {
    documents: [
      {
        name: "Insurance Policy Declaration Page",
        type: "pdf",
        size: "245 KB",
        status: "attached",
      },
      { name: "Weather Verification Report", type: "pdf", size: "1.2 MB", status: "attached" },
      { name: "Xactimate Estimate", type: "pdf", size: "890 KB", status: "attached" },
      { name: "Photo Documentation", type: "zip", size: "45 MB", status: "attached" },
    ],
    totalSize: "47.3 MB",
  },
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ section: string }> }
) {
  const authResult = await requireAuth();
  if (isAuthError(authResult)) return authResult;
  const { orgId } = authResult;

  try {
    const { section } = await params;
    const { searchParams } = new URL(request.url);
    const claimId = searchParams.get("claimId");

    if (!claimId) {
      return NextResponse.json({ success: false, error: "claimId is required" }, { status: 400 });
    }

    // Return demo data for demo-claim
    if (claimId === "demo-claim") {
      const demoData = DEMO_DATA[section];
      if (!demoData) {
        return NextResponse.json(
          { success: false, error: `No demo data for section: ${section}` },
          { status: 404 }
        );
      }
      return NextResponse.json({ success: true, data: demoData, isDemo: true });
    }

    // Verify claim belongs to this org before fetching section data
    await getOrgClaimOrThrow(orgId, claimId);
    let data: unknown = null;

    switch (section) {
      case "cover-sheet": {
        const result = await fetchClaimData(claimId);
        data = result.coverSheet;
        break;
      }
      case "weather-cause-of-loss": {
        data = await fetchWeatherData(claimId);
        break;
      }
      case "inspection-overview": {
        const result = await fetchClaimData(claimId);
        data = result.inspection;
        break;
      }
      case "photo-evidence": {
        const photos = await fetchPhotos(claimId);
        data = { photos, totalPhotos: photos.length };
        break;
      }
      case "code-compliance": {
        data = await fetchCodeData(claimId);
        break;
      }
      case "scope-pricing": {
        data = await fetchScopeData(claimId);
        break;
      }
      case "timeline": {
        const events = await fetchTimeline(claimId);
        data = { events };
        break;
      }
      case "digital-signatures": {
        // Fetch signature envelopes linked to this claim
        const envelopes = await prisma.signatureEnvelope.findMany({
          where: { claimId },
          orderBy: { createdAt: "desc" },
        });
        data = {
          signatures: envelopes.map((env) => ({
            id: env.id,
            signerName: env.signerName,
            signerRole: env.signerRole || "contractor",
            status:
              env.status === "signed"
                ? "signed"
                : env.status === "declined"
                  ? "declined"
                  : "pending",
            signedAt: env.signedAt?.toISOString() || null,
            ipAddress: (env.metadata as Record<string, unknown>)?.ipAddress || null,
            signatureData: env.signedDocumentUrl || null,
          })),
        };
        break;
      }
      default:
        // For sections without dedicated fetchers, return placeholder
        data = {
          message: `Section "${section}" data will be populated from claim data`,
          claimId,
        };
    }

    if (!data) {
      return NextResponse.json({
        success: true,
        data: null,
        message: "No data available for this section yet",
      });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    if (error instanceof OrgScopeError) {
      return NextResponse.json({ success: false, error: "Claim not found" }, { status: 404 });
    }
    logger.error("Error fetching section data:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch section data" },
      { status: 500 }
    );
  }
}
