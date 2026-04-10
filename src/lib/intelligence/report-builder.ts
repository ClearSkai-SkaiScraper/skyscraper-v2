/* eslint-disable @typescript-eslint/no-explicit-any */
// src/lib/intelligence/report-builder.ts
/**
 * SkaiScraper Intelligence Core - Unified Report Builder
 *
 * The "recipe engine" that transforms 4-stream datasets into
 * professional claim reports using GPT-4o.
 *
 * Report Types:
 * - QUICK: Fast summary for internal use
 * - CLAIMS_READY: Insurance-focused, code-heavy adjuster packet
 * - RETAIL: Client-facing proposal with pricing and materials
 * - PUBLIC_ADJUSTER: Overpowered technical documentation
 */

import { getOpenAI } from "@/lib/openai";
import prisma from "@/lib/prisma";

import { buildIntelligenceCorePayload, type IntelligenceCorePayload } from "./dataset-builders";

// ============================================================================
// REPORT TYPES & RECIPES
// ============================================================================

export type ReportType = "QUICK" | "CLAIMS_READY" | "RETAIL" | "FORENSIC";

export type ReportSection = {
  title: string;
  content: string;
  style: "professional" | "technical" | "friendly" | "legal";
  subsections?: ReportSection[];
};

export type GeneratedReport = {
  reportType: ReportType;
  title: string;
  subtitle: string | null;
  executiveSummary: string;
  sections: ReportSection[];
  metadata: {
    claimNumber: string;
    insured_name: string | null;
    propertyAddress: string;
    dateGenerated: Date;
    generatedBy: string;
  };
  financials: {
    estimatedValue: number | null;
    approvedValue: number | null;
    deductible: number | null;
    acv: number | null;
    rcv: number | null;
    depreciation: number | null;
  } | null;
  citations: Array<{
    type: "code" | "manufacturer" | "weather" | "industry";
    reference: string;
    description: string;
  }>;
  photos: Array<{
    id: string;
    url: string;
    caption: string;
    category: string;
  }>;
  attachments: Array<{
    name: string;
    type: string;
    description: string;
  }>;
};

// ============================================================================
// REPORT RECIPES (PROMPTS)
// ============================================================================

function buildQuickReportPrompt(payload: IntelligenceCorePayload): string {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { internal, documents } = payload;

  return `You are SkaiScraper, an AI claims intelligence assistant. Generate a QUICK internal report.

CLAIM INFO:
- Claim #: ${internal.claim.claimNumber}
- Insured: ${internal.claim.insured_name || "Unknown"}
- Property: ${internal.property?.street}, ${internal.property?.city}, ${internal.property?.state}
- Date of Loss: ${internal.claim.dateOfLoss.toLocaleDateString()}
- Damage Type: ${internal.claim.damageType}
- Status: ${internal.claim.status}

DAMAGE ASSESSMENTS:
${internal.modules.damageAssessments.map((d) => `- ${d.peril}: ${d.severity} (${d.summary})`).join("\n") || "None"}

ESTIMATES:
${internal.modules.estimates.map((e) => `- ${e.title}: ${e.mode}`).join("\n") || "None"}

SUPPLEMENTS:
${internal.modules.supplements.length} supplement(s) on file

INSTRUCTIONS:
Create a brief internal summary (300-500 words) covering:
1. Claim overview
2. Damage assessment
3. Current status
4. Recommended next steps

Return JSON:
{
  "title": "Quick Report – [Claim #]",
  "executiveSummary": "...",
  "sections": [
    {"title": "Claim Overview", "content": "...", "style": "professional"},
    {"title": "Damage Assessment", "content": "...", "style": "professional"},
    {"title": "Next Steps", "content": "...", "style": "professional"}
  ]
}`;
}

function buildClaimsReadyPrompt(payload: IntelligenceCorePayload): string {
  const { internal, features, documents, external } = payload;

  const featuresList = Object.entries(features)
    .filter(([_, enabled]) => enabled)
    .map(([key]) => `- ${key}`)
    .join("\n");

  return `You are SkaiScraper, an elite AI claims adjuster. Generate a CLAIMS-READY adjuster packet.

CLAIM INFO:
- Claim #: ${internal.claim.claimNumber}
- Insured: ${internal.claim.insured_name || "Unknown"}
- Property: ${internal.property?.street}, ${internal.property?.city}, ${internal.property?.state} ${internal.property?.zipCode}
- Date of Loss: ${internal.claim.dateOfLoss.toLocaleDateString()}
- Damage Type: ${internal.claim.damageType}
- Carrier: ${internal.claim.carrier || "Unknown"}
- Adjuster: ${internal.claim.adjusterName || "Unknown"}
- Policy #: ${internal.claim.policyNumber || "Unknown"}

ENABLED FEATURES:
${featuresList}

DAMAGE ASSESSMENTS:
${JSON.stringify(
  internal.modules.damageAssessments.map((d) => ({
    peril: d.peril,
    severity: d.severity,
    summary: d.summary,
    details: d.aiDamageJson,
  })),
  null,
  2
)}

WEATHER REPORTS:
${JSON.stringify(
  internal.modules.weatherReports.map((w) => ({
    date: w.weatherDate,
    type: w.weatherType,
    severity: w.severity,
    probability: w.dolProbability,
    details: w.aiWeatherJson,
  })),
  null,
  2
)}

ESTIMATES & SUPPLEMENTS:
${JSON.stringify(
  {
    estimates: internal.modules.estimates.length,
    supplements: internal.modules.supplements.length,
    scopeGaps: documents.scopeGaps,
  },
  null,
  2
)}

CARRIER ESTIMATE:
${documents.carrierEstimate.found ? JSON.stringify(documents.carrierEstimate, null, 2) : "Not found"}

MEASUREMENTS:
${JSON.stringify(documents.measurements, null, 2)}

BUILDING CODES:
${external.buildingCodes.irc.join("\n")}

FINANCIAL ANALYSIS:
${
  features.financialAnalysisEnabled && internal.modules.financialSnapshots.length > 0
    ? `
Latest Financial Snapshot:
// eslint-disable-next-line @typescript-eslint/no-explicit-any
- Carrier RCV: $${(internal.modules.financialSnapshots[0] as any).totals.rcvCarrier}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
- Contractor RCV: $${(internal.modules.financialSnapshots[0] as any).totals.rcvContractor}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
- Underpayment: $${(internal.modules.financialSnapshots[0] as any).totals.underpayment}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
- Required Supplements: ${(internal.modules.financialSnapshots[0] as any).requiredSupplements.length}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
- Settlement Projection: $${(internal.modules.financialSnapshots[0] as any).settlementProjection.min} - $${(internal.modules.financialSnapshots[0] as any).settlementProjection.max}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
- Confidence: ${(internal.modules.financialSnapshots[0] as any).settlementProjection.confidence}%
`
    : "Not calculated"
}

INSTRUCTIONS:
Create a comprehensive insurance adjuster packet (2000-3000 words) with:

1. Executive Summary (professional tone)
2. Property & Claim Details
3. Damage Documentation (reference specific assessments)
4. Weather Verification (if available)
5. Scope of Repairs (detailed, code-referenced)
6. Code & Manufacturer Citations (specific IRC references)
7. Financial Breakdown (ACV/RCV logic if enabled)
8. Photo Documentation Summary
9. Recommended Actions
10. Appendices (if needed)

CRITICAL REQUIREMENTS:
- Use professional insurance language
- Cite specific code sections
- Reference manufacturer specs
- Include line item justifications
- Address scope gaps vs carrier estimate
- Maintain objectivity and accuracy
- Use industry-standard terminology

Return JSON following this structure:
{
  "title": "Claims Adjustment Report – [Type] Event",
  "subtitle": "Claim [number] – [Insured Name]",
  "executiveSummary": "...",
  "sections": [
    {
      "title": "Property & Claim Details",
      "content": "...",
      "style": "professional"
    },
    {
      "title": "Damage Documentation",
      "content": "...",
      "style": "technical",
      "subsections": [
        {"title": "Primary Damage", "content": "...", "style": "technical"},
        {"title": "Secondary Damage", "content": "...", "style": "technical"}
      ]
    },
    {
      "title": "Weather Verification",
      "content": "...",
      "style": "professional"
    },
    {
      "title": "Recommended Scope of Repairs",
      "content": "...",
      "style": "technical"
    },
    {
      "title": "Code & Manufacturer Citations",
      "content": "...",
      "style": "technical"
    },
    {
      "title": "Financial Analysis",
      "content": "...",
      "style": "professional"
    }
  ],
  "citations": [
    {"type": "code", "reference": "IRC R905.2.8.2", "description": "..."},
    {"type": "manufacturer", "reference": "...", "description": "..."}
  ]
}`;
}

function buildRetailProposalPrompt(payload: IntelligenceCorePayload): string {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { internal, features, documents } = payload;

  return `You are SkaiScraper, a homeowner communication expert. Generate a RETAIL PROPOSAL.

PROPERTY INFO:
- Owner: ${internal.claim.insured_name || "Homeowner"}
- Property: ${internal.property?.street}, ${internal.property?.city}, ${internal.property?.state}
- Property Type: ${internal.property?.propertyType || "Residential"}
- Year Built: ${internal.property?.yearBuilt || "Unknown"}

DAMAGE:
- Type: ${internal.claim.damageType}
- Date: ${internal.claim.dateOfLoss.toLocaleDateString()}
- Summary: ${internal.modules.damageAssessments[0]?.summary || "See damage assessment"}

WORK SCOPE:
${internal.modules.estimates.length} estimate(s) prepared
${internal.modules.supplements.length} supplement item(s)

FEATURES ENABLED:
${features.materialComparison ? "- Material comparison (good/better/best)" : ""}
${features.colorBoards ? "- Color selection boards" : ""}
${features.warrantyInformation ? "- Warranty details" : ""}
${features.financingProposal ? "- Financing options" : ""}
${features.workTimeline ? "- Project timeline" : ""}

INSTRUCTIONS:
Create a homeowner-friendly proposal (1000-1500 words) with:

1. Welcome & Overview (friendly, reassuring)
2. What We Found (plain language damage explanation)
3. Recommended Repairs (clear scope, no jargon)
4. Material Options (if enabled)
5. Project Timeline (if enabled)
6. Investment Summary (clear pricing)
7. Warranty & Protection (if enabled)
8. Financing Options (if enabled)
9. Next Steps (clear call to action)

TONE:
- Friendly and conversational
- Clear and jargon-free
- Reassuring and professional
- Educational without being condescending

Return JSON following this structure:
{
  "title": "Property Restoration Proposal",
  "subtitle": "[Property Address]",
  "executiveSummary": "...",
  "sections": [
    {"title": "Welcome", "content": "...", "style": "friendly"},
    {"title": "What We Found", "content": "...", "style": "friendly"},
    {"title": "Recommended Repairs", "content": "...", "style": "professional"},
    {"title": "Investment Summary", "content": "...", "style": "professional"},
    {"title": "Next Steps", "content": "...", "style": "friendly"}
  ]
}`;
}

function buildForensicReportPrompt(payload: IntelligenceCorePayload): string {
  const { internal, features, documents, external } = payload;

  return `You are SkaiScraper, a forensic claims documentation specialist. Generate a COMPREHENSIVE TECHNICAL ANALYSIS.

THIS IS THE DEEP ANALYSIS MODE FOR DISPUTES. USE EVERYTHING.

COMPLETE CLAIM FILE:
${JSON.stringify(internal, null, 2)}

DOCUMENTS ANALYZED:
${JSON.stringify(documents, null, 2)}

EXTERNAL DATA:
${JSON.stringify(external, null, 2)}

ENABLED FEATURES:
${JSON.stringify(features, null, 2)}

INSTRUCTIONS:
Create a FORENSIC-LEVEL technical report (4000-6000 words) for disputes and complex claims that includes EVERYTHING:

1. **Executive Summary** (comprehensive, data-driven)
2. **Claim File Analysis** (every detail documented)
3. **Property Documentation** (complete property profile)
4. **Damage Assessment** (forensic-level detail)
   - Primary damage analysis
   - Secondary damage analysis
   - Hidden damage indicators
   - Moisture intrusion analysis
   - Structural concerns
5. **Weather Verification** (complete meteorological analysis)
   - Historical weather data
   - Date of loss correlation
   - Severity assessment
   - Supporting documentation
6. **Scope Analysis** (line-by-line breakdown)
   - Carrier estimate review
   - Missing items documentation
   - Undervalued items analysis
   - Code violation corrections
   - Manufacturer requirement citations
7. **Code & Manufacturer Documentation** (exhaustive citations)
   - IRC references with section text
   - Local code requirements
   - Manufacturer installation specs
   - Industry standards
8. **Measurements & Calculations** (HOVER data, manual measurements)
9. **Photo Documentation** (categorized, annotated)
10. **Financial Analysis** (complete breakdown)
    - RCV calculation
    - Depreciation analysis
    - ACV determination
    - Supplement justification
    - Payment schedule
11. **Legal Considerations** (policy language, coverage analysis)
12. **Recommendations** (tactical and strategic)
13. **Appendices** (supporting documentation)

CRITICAL REQUIREMENTS:
- MAXIMUM DETAIL - Leave nothing out
- Cite EVERY source
- Reference EVERY photo
- Justify EVERY line item
- Address EVERY code requirement
- Document EVERY discrepancy
- Professional yet assertive tone
- Data-driven arguments
- Bulletproof documentation

Return JSON with EXTENSIVE sections and subsections:
{
  "title": "Comprehensive Claims Analysis & Documentation",
  "subtitle": "Forensic Technical Report – Claim [number]",
  "executiveSummary": "...",
  "sections": [...extensive array...],
  "citations": [...comprehensive list...],
  "financials": {...complete breakdown...}
}`;
}

// ============================================================================
// UNIFIED REPORT BUILDER
// ============================================================================

export async function runIntelligenceReportBuilder(options: {
  claimId: string;
  orgId?: string | null;
  userId?: string | null;
  reportType: ReportType;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  featureOverrides?: Partial<any>;
}): Promise<GeneratedReport> {
  const { claimId, orgId, userId, reportType, featureOverrides } = options;

  // Build the 4-stream payload
  const payload = await buildIntelligenceCorePayload(claimId, orgId, featureOverrides);

  // Select the appropriate prompt recipe
  let systemPrompt = "";
  let userPrompt = "";

  switch (reportType) {
    case "QUICK":
      systemPrompt =
        "You are SkaiScraper, an AI claims assistant. Generate concise, actionable reports.";
      userPrompt = buildQuickReportPrompt(payload);
      break;
    case "CLAIMS_READY":
      systemPrompt =
        "You are SkaiScraper, an elite AI claims adjuster with 20 years of experience. Generate professional insurance documentation.";
      userPrompt = buildClaimsReadyPrompt(payload);
      break;
    case "RETAIL":
      systemPrompt =
        "You are SkaiScraper, a homeowner communication expert. Generate clear, friendly proposals.";
      userPrompt = buildRetailProposalPrompt(payload);
      break;
    case "FORENSIC":
      systemPrompt =
        "You are SkaiScraper, a forensic claims documentation specialist. Generate comprehensive technical analysis for disputes.";
      userPrompt = buildForensicReportPrompt(payload);
      break;
  }

  // Call OpenAI with JSON Schema
  const openai = getOpenAI();

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-2024-08-06",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "intelligence_report",
        strict: true,
        schema: {
          type: "object",
          properties: {
            title: { type: "string" },
            subtitle: { type: ["string", "null"] },
            executiveSummary: { type: "string" },
            sections: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  content: { type: "string" },
                  style: {
                    type: "string",
                    enum: ["professional", "technical", "friendly", "legal"],
                  },
                },
                required: ["title", "content", "style"],
                additionalProperties: false,
              },
            },
            citations: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  type: {
                    type: "string",
                    enum: ["code", "manufacturer", "weather", "industry"],
                  },
                  reference: { type: "string" },
                  description: { type: "string" },
                },
                required: ["type", "reference", "description"],
                additionalProperties: false,
              },
            },
          },
          required: ["title", "executiveSummary", "sections"],
          additionalProperties: false,
        },
      },
    },
    temperature: 0.3,
  });

  const result = JSON.parse(completion.choices[0].message.content || "{}");

  // Build complete report object
  const report: GeneratedReport = {
    reportType,
    title: result.title || `${reportType} Report`,
    subtitle: result.subtitle || null,
    executiveSummary: result.executiveSummary || "",
    sections: result.sections || [],
    metadata: {
      claimNumber: payload.internal.claim.claimNumber,
      insured_name: payload.internal.claim.insured_name,
      propertyAddress: payload.internal.property
        ? `${payload.internal.property.street}, ${payload.internal.property.city}, ${payload.internal.property.state}`
        : "Unknown",
      dateGenerated: new Date(),
      generatedBy: userId || "System",
    },
    financials: {
      estimatedValue: payload.internal.claim.estimatedValue,
      approvedValue: payload.internal.claim.approvedValue,
      deductible: payload.internal.claim.deductible,
      acv: null,
      rcv: null,
      depreciation: null,
    },
    citations: result.citations || [],
    photos: [],
    attachments: [],
  };

  // Save to database
  const resolvedOrgId = orgId ?? payload.internal.claim.orgId;
  if (!resolvedOrgId) {
    throw new Error("Missing orgId for report persistence");
  }

  await prisma.ai_reports.create({
    data: {
      id: crypto.randomUUID(),
      claimId,
      orgId: resolvedOrgId,
      userId: userId || "system",
      userName: "System",
      type: reportType,
      title: report.title,
      content: JSON.stringify(report),
      prompt: reportType,
      tokensUsed: 0,
      status: "completed",
      updatedAt: new Date(),
    },
  });

  return report;
}
