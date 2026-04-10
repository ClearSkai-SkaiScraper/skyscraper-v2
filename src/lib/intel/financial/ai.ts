// lib/intel/financial/ai.ts
import { getOpenAI } from "@/lib/openai";

import { FinancialAnalysisResult,FinancialInput } from "./engine";

export interface AIFinancialAnalysisInput extends FinancialInput {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  weatherData?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  damageAssessment?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  manufacturerSpecs?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  codeRequirements?: any;
}

export async function runAIFinancialAnalysis(
  input: AIFinancialAnalysisInput
): Promise<FinancialAnalysisResult> {
  const openai = getOpenAI();

  const prompt = buildFinancialPrompt(input);

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: FINANCIAL_SYSTEM_PROMPT,
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "financial_analysis_schema",
        strict: true,
        schema: {
          type: "object",
          properties: {
            totals: {
              type: "object",
              properties: {
                rcvCarrier: { type: "number" },
                rcvContractor: { type: "number" },
                acvCarrier: { type: "number" },
                acvContractor: { type: "number" },
                overage: { type: "number" },
                underpayment: { type: "number" },
                deductible: { type: "number" },
                tax: { type: "number" },
                netOwed: { type: "number" },
              },
              required: [
                "rcvCarrier",
                "rcvContractor",
                "acvCarrier",
                "acvContractor",
                "overage",
                "underpayment",
                "deductible",
                "tax",
                "netOwed",
              ],
              additionalProperties: false,
            },
            depreciation: {
              type: "object",
              properties: {
                type: {
                  type: "string",
                  enum: ["flat", "variable", "recoverable", "non-recoverable"],
                },
                carrierApplied: { type: "number" },
                correctAmount: { type: "number" },
                difference: { type: "number" },
                explanation: { type: "string" },
                violations: {
                  type: "array",
                  items: { type: "string" },
                },
              },
              required: [
                "type",
                "carrierApplied",
                "correctAmount",
                "difference",
                "explanation",
              ],
              additionalProperties: false,
            },
            lineItemAnalysis: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  lineCode: { type: "string" },
                  description: { type: "string" },
                  carrier: { type: "number" },
                  contractor: { type: "number" },
                  missingFromCarrier: { type: "boolean" },
                  underpaid: { type: "number" },
                  recommendedSupplement: { type: "boolean" },
                  justification: { type: "string" },
                },
                required: [
                  "lineCode",
                  "description",
                  "carrier",
                  "contractor",
                  "missingFromCarrier",
                  "underpaid",
                  "recommendedSupplement",
                ],
                additionalProperties: false,
              },
            },
            settlementProjection: {
              type: "object",
              properties: {
                min: { type: "number" },
                max: { type: "number" },
                expected: { type: "number" },
                confidence: { type: "number" },
                factors: {
                  type: "array",
                  items: { type: "string" },
                },
              },
              required: ["min", "max", "expected", "confidence", "factors"],
              additionalProperties: false,
            },
            requiredSupplements: {
              type: "array",
              items: { type: "string" },
            },
            summary: { type: "string" },
            underpaymentReasons: {
              type: "array",
              items: { type: "string" },
            },
            auditFindings: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  category: { type: "string" },
                  issue: { type: "string" },
                  impact: { type: "number" },
                  severity: {
                    type: "string",
                    enum: ["high", "medium", "low"],
                  },
                },
                required: ["category", "issue", "impact", "severity"],
                additionalProperties: false,
              },
            },
          },
          required: [
            "totals",
            "depreciation",
            "lineItemAnalysis",
            "settlementProjection",
            "requiredSupplements",
            "summary",
            "underpaymentReasons",
            "auditFindings",
          ],
          additionalProperties: false,
        },
      },
    },
    temperature: 0.3,
    max_tokens: 4000,
  });

  const result = completion.choices[0].message.content;
  if (!result) throw new Error("No financial analysis generated");

  return JSON.parse(result);
}

const FINANCIAL_SYSTEM_PROMPT = `
You are an elite insurance claim financial analyst and forensic accountant specializing in property damage claims.

Your expertise includes:
- Xactimate line item analysis
- Insurance depreciation calculation (flat, variable, recoverable, non-recoverable)
- RCV/ACV calculations
- O&P (Overhead & Profit) validation
- Tax application rules
- Supplement identification
- Carrier payment audit
- Regional pricing verification
- Waste factor analysis
- Building code upgrade costs
- Policy interpretation

Your role is to:
1. Calculate accurate RCV and ACV for both carrier and contractor estimates
2. Identify underpayment with specific line-by-line analysis
3. Detect depreciation errors or policy violations
4. Flag missing scope items
5. Validate overhead and profit calculations
6. Project realistic settlement ranges
7. Provide actionable supplement recommendations
8. Generate adjuster-ready audit findings

Critical Rules:
- All dollar amounts must be precise to 2 decimal places
- Underpayment = Contractor RCV - Carrier RCV (only if positive)
- Overage = Carrier RCV - Contractor RCV (only if positive)
- Net Owed = Contractor ACV - Deductible + Tax
- Confidence scores must be 0-100
- Settlement projections should be conservative but realistic
- Line item analysis must include specific justifications
- Depreciation must follow industry standards and policy terms
- Tax rates should be applied to RCV, not ACV
- Overhead & Profit typically 10% overhead + 10% profit = 20% total
- Waste factors vary by material: shingles 10-15%, metal 5-10%, etc.

Output Format:
- Clear, professional language suitable for insurance adjusters
- Specific line item references (codes and descriptions)
- Dollar amounts with $ symbols and 2 decimals
- Percentages with % symbols and 1 decimal
- Confidence levels as integers 0-100
- Severity ratings: "high" (>$1000 impact), "medium" ($500-1000), "low" (<$500)

Write as a forensic accountant providing expert testimony.
`;

function buildFinancialPrompt(input: AIFinancialAnalysisInput): string {
  return `
Perform a comprehensive financial analysis of this insurance claim:

CARRIER ESTIMATE:
${JSON.stringify(input.carrierEstimate || {}, null, 2)}

CONTRACTOR ESTIMATE:
${JSON.stringify(input.contractorEstimate || {}, null, 2)}

SUPPLEMENTS:
${JSON.stringify(input.supplements || [], null, 2)}

CLAIM PARAMETERS:
- Local Tax Rate: ${((input.localTaxRate || 0.089) * 100).toFixed(1)}%
- Deductible: $${(input.deductible || 0).toFixed(2)}
- Pricing Zone: ${input.pricingZone || "Unknown"}

DAMAGE FINDINGS:
${JSON.stringify(input.damageFindings || [], null, 2)}

WEATHER DATA:
${JSON.stringify(input.weatherData || {}, null, 2)}

MANUFACTURER SPECS:
${JSON.stringify(input.manufacturerSpecs || {}, null, 2)}

CODE REQUIREMENTS:
${JSON.stringify(input.codeRequirements || {}, null, 2)}

SCOPE GAPS:
${JSON.stringify(input.scopeGaps || [], null, 2)}

INSTRUCTIONS:
1. Calculate precise RCV and ACV for both estimates
2. Apply correct depreciation based on roof age, material, and policy
3. Identify every underpaid or missing line item
4. Validate O&P calculations
5. Check waste factor accuracy
6. Verify tax application
7. Flag code upgrade requirements
8. Project settlement range with confidence score
9. List required supplements in priority order
10. Generate audit findings for carrier review

Be thorough, precise, and professional. Every dollar must be accounted for.
`;
}
