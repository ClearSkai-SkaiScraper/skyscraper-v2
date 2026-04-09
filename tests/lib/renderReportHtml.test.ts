/**
 * ============================================================================
 * renderReportHtml Unit Tests
 * ============================================================================
 *
 * Tests the premium PDF HTML renderer with mock report context data.
 * Verifies HTML output structure, branding injection, section rendering.
 */

import { describe, expect, it } from "vitest";

import type { ComposeResult } from "@/lib/reports/renderReportHtml";
import { renderReportHtml } from "@/lib/reports/renderReportHtml";
import type { ReportContext } from "@/lib/reports/reportContext.schema";

// ═══════════════════════════════════════════════════════════════════════════════
// Test Fixtures
// ═══════════════════════════════════════════════════════════════════════════════

const MOCK_CONTEXT: ReportContext = {
  reportId: "rpt_test001",
  generatedAt: "2026-04-09T12:00:00Z",
  generatedBy: "user_test",
  company: {
    id: "org_test",
    name: "Storm Shield Roofing",
    logo: "https://example.com/logo.png",
    pdfHeaderText: "STORM SHIELD RESTORATION",
    pdfFooterText: "© 2026 Storm Shield Roofing LLC",
  },
  claim: {
    id: "claim_test",
    claimNumber: "CLM-2026-0042",
    insured_name: "John Doe",
    propertyAddress: "123 Main St, Flagstaff, AZ 86001",
    lossDate: "2026-03-15",
    lossType: "Hail",
    damageType: "Roof",
    status: "in_progress",
    carrier: "State Farm",
    policyNumber: "POL-123456",
    adjusterName: "Jane Adjuster",
    adjusterEmail: "jane@statefarm.com",
    adjusterPhone: "555-0100",
  },
  property: {
    address: "123 Main St",
    city: "Flagstaff",
    state: "AZ",
    zip: "86001",
    coordinates: { lat: 35.1983, lng: -111.6513 },
  },
  scopes: { adjuster: null, contractor: null },
  variances: null,
  weather: {
    lossDate: "2026-03-15",
    hailSize: "1.5 inches",
    windSpeed: "65 mph",
    precipitation: "Heavy rain",
    provider: "NOAA",
    source: "Storm Events Database",
    eventStart: "2026-03-15T14:00:00Z",
    eventEnd: "2026-03-15T16:30:00Z",
    verificationStatement: "Severe hail event confirmed by NOAA radar data.",
  },
  media: {
    photos: [
      {
        id: "photo_1",
        url: "https://example.com/photo1.jpg",
        type: "ROOF",
        caption: "Impact damage on north slope",
        timestamp: "2026-03-16T10:00:00Z",
        metadata: null,
      },
    ],
    photosByCategory: {
      ROOF: [
        {
          id: "photo_1",
          url: "https://example.com/photo1.jpg",
          type: "ROOF",
          caption: "Impact damage on north slope",
          timestamp: "2026-03-16T10:00:00Z",
          metadata: null,
        },
      ],
      EXTERIOR: [],
      INTERIOR: [],
      DETAIL: [],
      AERIAL: [],
      OTHER: [],
    },
    totalPhotos: 1,
  },
  notes: [
    {
      id: "note_1",
      content: "Initial inspection completed",
      authorName: "Field Inspector",
      authorId: "user_inspector",
      createdAt: "2026-03-16T10:30:00Z",
      category: "inspection",
    },
  ],
  findings: [
    {
      id: "finding_1",
      category: "Roof",
      description: "Multiple hail impacts on asphalt shingles",
      severity: "high",
      location: "North slope",
      detectedAt: "2026-03-16T10:15:00Z",
      status: "confirmed",
    },
  ],
  evidence: null,
  carrierStrategy: null,
  template: {
    id: "tpl_insurance",
    name: "Insurance Claim Report",
    description: "Standard carrier-facing report",
    category: "Insurance",
    structure: {},
    placeholders: [],
    version: "1.0",
  },
};

const MOCK_COMPOSED: ComposeResult = {
  executiveSummary:
    "Property at 123 Main St sustained significant hail damage during the March 15 storm event.",
  damageAssessment:
    "Roof: 47 hail impacts identified on north-facing slope. Shingle damage rated severe.",
  weatherAnalysis: "NOAA confirmed 1.5-inch hail and 65mph winds during the event window.",
  photoDocumentation: "Photo evidence documenting damage across 4 inspection areas.",
  recommendations: "Full roof replacement recommended. Estimated cost: $18,500.",
};

// ═══════════════════════════════════════════════════════════════════════════════
// Tests
// ═══════════════════════════════════════════════════════════════════════════════

describe("renderReportHtml", () => {
  it("returns a valid HTML string", () => {
    const html = renderReportHtml(MOCK_CONTEXT, MOCK_COMPOSED);
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("</html>");
  });

  it("includes company branding in the output", () => {
    const html = renderReportHtml(MOCK_CONTEXT, MOCK_COMPOSED);
    expect(html).toContain("STORM SHIELD RESTORATION");
    expect(html).toContain("© 2026 Storm Shield Roofing LLC");
  });

  it("includes claim number", () => {
    const html = renderReportHtml(MOCK_CONTEXT, MOCK_COMPOSED);
    expect(html).toContain("CLM-2026-0042");
  });

  it("includes insured name", () => {
    const html = renderReportHtml(MOCK_CONTEXT, MOCK_COMPOSED);
    expect(html).toContain("John Doe");
  });

  it("includes weather data when present", () => {
    const html = renderReportHtml(MOCK_CONTEXT, MOCK_COMPOSED);
    // Weather analysis content from composed sections
    expect(html).toContain("NOAA confirmed");
  });

  it("includes executive summary section", () => {
    const html = renderReportHtml(MOCK_CONTEXT, MOCK_COMPOSED);
    expect(html).toContain("significant hail damage");
  });

  it("includes damage assessment section", () => {
    const html = renderReportHtml(MOCK_CONTEXT, MOCK_COMPOSED);
    expect(html).toContain("47 hail impacts");
  });

  it("renders with letter page size by default", () => {
    const html = renderReportHtml(MOCK_CONTEXT, MOCK_COMPOSED);
    expect(html).toContain("8.5in");
  });

  it("renders with A4 page size when specified", () => {
    const html = renderReportHtml(MOCK_CONTEXT, MOCK_COMPOSED, { pageSize: "a4" });
    expect(html).toContain("210mm");
  });

  it("handles empty composed sections gracefully", () => {
    const html = renderReportHtml(MOCK_CONTEXT, {});
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("CLM-2026-0042");
  });

  it("handles missing weather data", () => {
    const contextNoWeather = { ...MOCK_CONTEXT, weather: null };
    const html = renderReportHtml(contextNoWeather, MOCK_COMPOSED);
    expect(html).toContain("<!DOCTYPE html>");
  });

  it("includes template name", () => {
    const html = renderReportHtml(MOCK_CONTEXT, MOCK_COMPOSED);
    expect(html).toContain("Insurance Claim Report");
  });
});
