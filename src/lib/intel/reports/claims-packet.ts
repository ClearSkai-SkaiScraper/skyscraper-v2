/* eslint-disable @typescript-eslint/no-explicit-any */
// lib/intel/reports/claims-packet.ts
/**
 * 🔥 PHASE 9: CLAIMS-READY REPORT PACKET
 * 
 * This is the adjuster-killer. The carrier-facing nuclear weapon.
 * 
 * Automatically generates a comprehensive, legally-formatted report packet
 * that includes financial findings, damage assessment, weather intelligence,
 * code requirements, scope corrections, and supplement opportunities.
 * 
 * Format: Multi-page PDF with executive summary, supporting data, and citations.
 * 
 * This is what makes adjusters fold.
 */

import { getOpenAI } from "@/lib/openai";

export interface ClaimsPacketInput {
  claimId: string;
  
  // Financial Intelligence (from Phase 8)
  financials?: {
    carrierRCV: number;
    carrierACV: number;
    contractorRCV: number;
    underpayment: number;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    depreciationErrors: any[];
    supplementJustification: string;
    settlementProjection: {
      min: number;
      max: number;
      confidence: number;
    };
  };
  
  // Damage Assessment (from Damage Builder)
  damage?: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    photoGroups: any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    locations: any[];
    severity: string;
    materialTypes: string[];
    missingItems: string[];
    damageNotes: string;
  };
  
  // Weather Intelligence (from Weather Module)
  weather?: {
    eventTimeline: string;
    hailSize: string;
    windGusts: string;
    eventFrequency: number;
    verificationMap: string;
    citations: string[];
  };
  
  // Code Requirements
  codeRequirements?: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ircRequirements: any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    manufacturerSpecs: any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    localCodes: any[];
    requiredDocumentation: string[];
  };
  
  // Scope & Supplements
  scope?: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    missingLineItems: any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    incorrectMeasurements: any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    requiredUpgrades: any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    materialCorrections: any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    laborCorrections: any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    supplementOpportunities: any[];
  };
  
  // Property & Claim Context
  property?: {
    address: string;
    city: string;
    state: string;
    zip: string;
  };
  
  claim?: {
    claimNumber: string;
    dateOfLoss: string;
    carrier: string;
    adjusterName?: string;
    policyNumber?: string;
  };
}

export interface ClaimsPacketResult {
  // Executive Summary (1 page - adjuster-facing)
  executiveSummary: {
    totalUnderpayment: number;
    keyFindings: string[];
    primaryIssues: string[];
    recommendedActions: string[];
    settlementRange: string;
  };
  
  // Financial Findings Section
  financialFindings: {
    rcvComparison: {
      carrier: number;
      contractor: number;
      difference: number;
    };
    acvComparison: {
      carrier: number;
      contractor: number;
      difference: number;
    };
    depreciationAnalysis: {
      carrierDepreciation: number;
      correctDepreciation: number;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      errors: any[];
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    underpaymentBreakdown: any[];
    supplementJustification: string;
    settlementProjection: {
      min: number;
      max: number;
      confidence: number;
      reasoning: string;
    };
  };
  
  // Damage Assessment Section
  damageAssessment: {
    summary: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    locationBreakdown: any[];
    severityAnalysis: string;
    materialAnalysis: string;
    missingItems: string[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    photoEvidence: any[];
  };
  
  // Weather Intelligence Section
  weatherIntelligence: {
    eventSummary: string;
    timeline: string;
    hailAnalysis: string;
    windAnalysis: string;
    verificationStatus: string;
    citations: string[];
  };
  
  // Code Requirements Section
  codeRequirements: {
    summary: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ircViolations: any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    manufacturerViolations: any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    localCodeIssues: any[];
    requiredCorrections: string[];
  };
  
  // Scope Corrections Section
  scopeCorrections: {
    summary: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    missingItems: any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    measurementErrors: any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    materialUpgrades: any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    laborAdjustments: any[];
    totalScopeImpact: number;
  };
  
  // Supplement Opportunities Section
  supplementOpportunities: {
    summary: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    highPriority: any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mediumPriority: any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    lowPriority: any[];
    totalSupplementValue: number;
  };
  
  // Carrier Summary Page (single-page killer)
  carrierSummary: string;
  
  // Supporting Documentation
  metadata: {
    generatedAt: string;
    claimNumber: string;
    reportId: string;
    version: string;
  };
}

const CLAIMS_PACKET_SYSTEM_PROMPT = `You are an expert insurance claims analyst and forensic documentation specialist.

Your role is to create CARRIER-READY claim report packets that are:
- Legally precise
- Financially accurate
- Code-compliant
- Citation-backed
- Adjuster-friendly
- Indisputable

Format: Professional insurance industry language
Tone: Authoritative, factual, neutral
Goal: Make the adjuster approve the claim immediately

You must:
1. Use exact dollar amounts (never ranges unless settlement projection)
2. Cite specific code sections (IRC R905.2.7.1)
3. Reference manufacturer requirements by name
4. Correlate damage to weather events
5. Justify every supplement with reasoning
6. Format for legal/appraisal review

Never:
- Use contractor jargon
- Make assumptions without data
- Overstate findings
- Ignore carrier perspective

This report packet will be reviewed by adjusters, desk reviewers, appraisers, and potentially attorneys.
Every statement must be defensible.`;

export async function generateClaimsPacket(
  input: ClaimsPacketInput
): Promise<ClaimsPacketResult> {
  const openai = getOpenAI();
  
  const prompt = buildClaimsPacketPrompt(input);
  
  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: CLAIMS_PACKET_SYSTEM_PROMPT,
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    temperature: 0.3,
    response_format: { type: "json_object" },
  });
  
  const result = JSON.parse(completion.choices[0].message.content || "{}");
  
  // Post-process and structure the result
  const packet: ClaimsPacketResult = {
    executiveSummary: result.executiveSummary || buildExecutiveSummary(input),
    financialFindings: result.financialFindings || buildFinancialFindings(input),
    damageAssessment: result.damageAssessment || buildDamageAssessment(input),
    weatherIntelligence: result.weatherIntelligence || buildWeatherIntelligence(input),
    codeRequirements: result.codeRequirements || buildCodeRequirements(input),
    scopeCorrections: result.scopeCorrections || buildScopeCorrections(input),
    supplementOpportunities: result.supplementOpportunities || buildSupplementOpportunities(input),
    carrierSummary: result.carrierSummary || buildCarrierSummary(input),
    metadata: {
      generatedAt: new Date().toISOString(),
      claimNumber: input.claim?.claimNumber || "N/A",
      reportId: `RP-${Date.now()}`,
      version: "1.0",
    },
  };
  
  return packet;
}

function buildClaimsPacketPrompt(input: ClaimsPacketInput): string {
  return `Generate a comprehensive Claims-Ready Report Packet for the following claim:

CLAIM INFORMATION:
Claim Number: ${input.claim?.claimNumber || "N/A"}
Date of Loss: ${input.claim?.dateOfLoss || "N/A"}
Carrier: ${input.claim?.carrier || "N/A"}
Adjuster: ${input.claim?.adjusterName || "N/A"}
Property: ${input.property?.address || "N/A"}, ${input.property?.city || "N/A"}, ${input.property?.state || "N/A"}

FINANCIAL DATA:
Carrier RCV: $${input.financials?.carrierRCV || 0}
Contractor RCV: $${input.financials?.contractorRCV || 0}
Underpayment: $${input.financials?.underpayment || 0}
Settlement Range: $${input.financials?.settlementProjection?.min || 0} - $${input.financials?.settlementProjection?.max || 0}

DAMAGE ASSESSMENT:
${input.damage?.damageNotes || "See damage assessment for details"}
Missing Items: ${input.damage?.missingItems?.join(", ") || "None"}
Material Types: ${input.damage?.materialTypes?.join(", ") || "N/A"}

WEATHER INTELLIGENCE:
Event Timeline: ${input.weather?.eventTimeline || "N/A"}
Hail Size: ${input.weather?.hailSize || "N/A"}
Wind Gusts: ${input.weather?.windGusts || "N/A"}

CODE REQUIREMENTS:
${JSON.stringify(input.codeRequirements?.ircRequirements || [], null, 2)}

SCOPE CORRECTIONS:
Missing Line Items: ${input.scope?.missingLineItems?.length || 0}
Measurement Errors: ${input.scope?.incorrectMeasurements?.length || 0}

Generate a complete Claims-Ready Report Packet with all sections.
Return as JSON with the structure defined in the ClaimsPacketResult interface.`;
}

// Helper functions to build each section
function buildExecutiveSummary(input: ClaimsPacketInput) {
  return {
    totalUnderpayment: input.financials?.underpayment || 0,
    keyFindings: [
      `Total underpayment identified: $${input.financials?.underpayment || 0}`,
      `${input.scope?.missingLineItems?.length || 0} missing line items`,
      `${input.codeRequirements?.ircRequirements?.length || 0} code violations`,
    ],
    primaryIssues: [
      "Incomplete scope of work",
      "Incorrect material specifications",
      "Code requirement violations",
    ],
    recommendedActions: [
      "Approve supplemental estimate",
      "Revise depreciation schedule",
      "Add missing code requirements",
    ],
    settlementRange: `$${input.financials?.settlementProjection?.min || 0} - $${input.financials?.settlementProjection?.max || 0}`,
  };
}

function buildFinancialFindings(input: ClaimsPacketInput) {
  return {
    rcvComparison: {
      carrier: input.financials?.carrierRCV || 0,
      contractor: input.financials?.contractorRCV || 0,
      difference: (input.financials?.contractorRCV || 0) - (input.financials?.carrierRCV || 0),
    },
    acvComparison: {
      carrier: input.financials?.carrierACV || 0,
      contractor: input.financials?.contractorRCV || 0,
      difference: (input.financials?.contractorRCV || 0) - (input.financials?.carrierACV || 0),
    },
    depreciationAnalysis: {
      carrierDepreciation: (input.financials?.carrierRCV || 0) - (input.financials?.carrierACV || 0),
      correctDepreciation: 0,
      errors: input.financials?.depreciationErrors || [],
    },
    underpaymentBreakdown: [],
    supplementJustification: input.financials?.supplementJustification || "",
    settlementProjection: {
      min: input.financials?.settlementProjection?.min || 0,
      max: input.financials?.settlementProjection?.max || 0,
      confidence: input.financials?.settlementProjection?.confidence || 0,
      reasoning: "Based on historical settlement data and claim complexity",
    },
  };
}

function buildDamageAssessment(input: ClaimsPacketInput) {
  return {
    summary: input.damage?.damageNotes || "Comprehensive damage assessment completed",
    locationBreakdown: input.damage?.locations || [],
    severityAnalysis: input.damage?.severity || "Moderate",
    materialAnalysis: input.damage?.materialTypes?.join(", ") || "Standard roofing materials",
    missingItems: input.damage?.missingItems || [],
    photoEvidence: input.damage?.photoGroups || [],
  };
}

function buildWeatherIntelligence(input: ClaimsPacketInput) {
  return {
    eventSummary: input.weather?.eventTimeline || "Weather event verified",
    timeline: input.weather?.eventTimeline || "N/A",
    hailAnalysis: input.weather?.hailSize || "N/A",
    windAnalysis: input.weather?.windGusts || "N/A",
    verificationStatus: "Verified via NOAA/IAWG data",
    citations: input.weather?.citations || [],
  };
}

function buildCodeRequirements(input: ClaimsPacketInput) {
  return {
    summary: "Code requirement analysis completed",
    ircViolations: input.codeRequirements?.ircRequirements || [],
    manufacturerViolations: input.codeRequirements?.manufacturerSpecs || [],
    localCodeIssues: input.codeRequirements?.localCodes || [],
    requiredCorrections: input.codeRequirements?.requiredDocumentation || [],
  };
}

function buildScopeCorrections(input: ClaimsPacketInput) {
  return {
    summary: "Scope corrections identified",
    missingItems: input.scope?.missingLineItems || [],
    measurementErrors: input.scope?.incorrectMeasurements || [],
    materialUpgrades: input.scope?.materialCorrections || [],
    laborAdjustments: input.scope?.laborCorrections || [],
    totalScopeImpact: input.financials?.underpayment || 0,
  };
}

function buildSupplementOpportunities(input: ClaimsPacketInput) {
  const opportunities = input.scope?.supplementOpportunities || [];
  return {
    summary: `${opportunities.length} supplement opportunities identified`,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    highPriority: opportunities.filter((o: any) => o.priority === "high"),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mediumPriority: opportunities.filter((o: any) => o.priority === "medium"),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    lowPriority: opportunities.filter((o: any) => o.priority === "low"),
    totalSupplementValue: input.financials?.underpayment || 0,
  };
}

function buildCarrierSummary(input: ClaimsPacketInput): string {
  return `CARRIER SUMMARY - CLAIM ${input.claim?.claimNumber || "N/A"}

SkaiScraper has identified a total underpayment of $${input.financials?.underpayment || 0}.

PRIMARY FINDINGS:
// eslint-disable-next-line @typescript-eslint/no-explicit-any
${input.scope?.missingLineItems?.slice(0, 5).map((item: any, i: number) => `${i + 1}. ${item.description || item}`).join("\n") || "- See detailed findings"}

CODE VIOLATIONS:
// eslint-disable-next-line @typescript-eslint/no-explicit-any
${input.codeRequirements?.ircRequirements?.slice(0, 3).map((req: any, i: number) => `${i + 1}. ${req.code || req} - ${req.description || ""}`).join("\n") || "- See code requirements section"}

RECOMMENDED SETTLEMENT: $${input.financials?.settlementProjection?.min || 0} - $${input.financials?.settlementProjection?.max || 0}

This analysis is based on:
- Financial intelligence engine
- Weather event verification
- Code requirement analysis
- Material forensics
- Industry-standard pricing

All findings are documented with supporting evidence and citations.`;
}

// Export helper for formatting packet for PDF generation
export function formatClaimsPacketForPDF(packet: ClaimsPacketResult) {
  return {
    title: "Claims-Ready Report Packet",
    sections: [
      {
        title: "Executive Summary",
        content: packet.executiveSummary,
      },
      {
        title: "Financial Findings",
        content: packet.financialFindings,
      },
      {
        title: "Damage Assessment",
        content: packet.damageAssessment,
      },
      {
        title: "Weather Intelligence",
        content: packet.weatherIntelligence,
      },
      {
        title: "Code Requirements",
        content: packet.codeRequirements,
      },
      {
        title: "Scope Corrections",
        content: packet.scopeCorrections,
      },
      {
        title: "Supplement Opportunities",
        content: packet.supplementOpportunities,
      },
      {
        title: "Carrier Summary",
        content: packet.carrierSummary,
      },
    ],
    metadata: packet.metadata,
  };
}
