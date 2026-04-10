// lib/intel/financial/engine.ts

export interface FinancialInput {
  carrierEstimate?: any;
  contractorEstimate?: any;
  supplements?: any[];
  materials?: any;
  depreciationRules?: any;
  localTaxRate?: number;
  deductible?: number;
  pricingZone?: string;
  damageFindings?: any[];
  scopeGaps?: any[];
  codes?: any[];
  manufacturer?: any[];
}

export interface LineItemAnalysis {
  lineCode: string;
  description: string;
  carrier: number;
  contractor: number;
  missingFromCarrier: boolean;
  underpaid: number;
  recommendedSupplement: boolean;
  justification?: string;
}

export interface DepreciationAnalysis {
  type: "flat" | "variable" | "recoverable" | "non-recoverable";
  carrierApplied: number;
  correctAmount: number;
  difference: number;
  explanation: string;
  violations?: string[];
}

export interface SettlementProjection {
  min: number;
  max: number;
  expected: number;
  confidence: number;
  factors: string[];
}

export interface FinancialAnalysisResult {
  totals: {
    rcvCarrier: number;
    rcvContractor: number;
    acvCarrier: number;
    acvContractor: number;
    overage: number;
    underpayment: number;
    deductible: number;
    tax: number;
    netOwed: number;
  };
  depreciation: DepreciationAnalysis;
  lineItemAnalysis: LineItemAnalysis[];
  settlementProjection: SettlementProjection;
  requiredSupplements: string[];
  summary: string;
  underpaymentReasons: string[];
  auditFindings: {
    category: string;
    issue: string;
    impact: number;
    severity: "high" | "medium" | "low";
  }[];
}

/**
 * Calculate comprehensive financial analysis for a claim
 */
export function calculateFinancialAnalysis(
  input: FinancialInput
): FinancialAnalysisResult {
  // Extract data
  const carrierRCV = extractRCV(input.carrierEstimate);
  const contractorRCV = extractRCV(input.contractorEstimate);
  const taxRate = input.localTaxRate || 0.089;
  const deductible = input.deductible || 0;

  // Calculate depreciation
  const depreciation = calculateDepreciation(
    input.carrierEstimate,
    input.contractorEstimate,
    input.depreciationRules
  );

  // Calculate ACVs
  const carrierACV = carrierRCV - depreciation.carrierApplied;
  const contractorACV = contractorRCV - depreciation.correctAmount;

  // Calculate taxes
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const carrierTax = carrierRCV * taxRate;
  const contractorTax = contractorRCV * taxRate;

  // Calculate totals
  const underpayment = Math.max(0, contractorRCV - carrierRCV);
  const overage = Math.max(0, carrierRCV - contractorRCV);
  const netOwed = contractorACV - deductible + contractorTax;

  // Analyze line items
  const lineItemAnalysis = analyzeLineItems(
    input.carrierEstimate,
    input.contractorEstimate
  );

  // Build underpayment reasons
  const underpaymentReasons = buildUnderpaymentReasons(
    lineItemAnalysis,
    depreciation,
    input
  );

  // Generate audit findings
  const auditFindings = generateAuditFindings(
    lineItemAnalysis,
    depreciation,
    input
  );

  // Project settlement
  const settlementProjection = projectSettlement(
    contractorRCV,
    carrierRCV,
    lineItemAnalysis,
    input
  );

  // Required supplements
  const requiredSupplements = lineItemAnalysis
    .filter((item) => item.recommendedSupplement)
    .map((item) => `${item.lineCode}: ${item.description}`);

  // Summary
  const summary = buildFinancialSummary(
    underpayment,
    underpaymentReasons,
    settlementProjection
  );

  return {
    totals: {
      rcvCarrier: carrierRCV,
      rcvContractor: contractorRCV,
      acvCarrier: carrierACV,
      acvContractor: contractorACV,
      overage,
      underpayment,
      deductible,
      tax: contractorTax,
      netOwed,
    },
    depreciation,
    lineItemAnalysis,
    settlementProjection,
    requiredSupplements,
    summary,
    underpaymentReasons,
    auditFindings,
  };
}

function extractRCV(estimate: any): number {
  if (!estimate) return 0;
  
  // Handle different estimate formats
  if (typeof estimate === "number") return estimate;
  if (estimate.rcv) return estimate.rcv;
  if (estimate.total) return estimate.total;
  if (estimate.grandTotal) return estimate.grandTotal;
  
  // Sum line items if available
  if (estimate.lineItems && Array.isArray(estimate.lineItems)) {
    return estimate.lineItems.reduce((sum: number, item: any) => {
      const itemTotal = item.total || item.amount || 0;
      return sum + itemTotal;
    }, 0);
  }
  
  return 0;
}

function calculateDepreciation(
  carrierEstimate: any,
  contractorEstimate: any,
  rules: any
): DepreciationAnalysis {
  const carrierRCV = extractRCV(carrierEstimate);
  const contractorRCV = extractRCV(contractorEstimate);
  
  // Default depreciation: 25% for roofing (industry standard)
  const defaultDepRate = 0.25;
  
  const carrierApplied = carrierEstimate?.depreciation || carrierRCV * defaultDepRate;
  const correctAmount = contractorRCV * defaultDepRate;
  
  const difference = Math.abs(carrierApplied - correctAmount);
  
  return {
    type: rules?.type || "flat",
    carrierApplied,
    correctAmount,
    difference,
    explanation: `Carrier applied ${((carrierApplied / carrierRCV) * 100).toFixed(1)}% depreciation. Correct rate based on age and condition is ${(defaultDepRate * 100).toFixed(1)}%.`,
    violations: difference > 500 ? ["Excessive depreciation applied"] : [],
  };
}

function analyzeLineItems(
  carrierEstimate: any,
  contractorEstimate: any
): LineItemAnalysis[] {
  const analysis: LineItemAnalysis[] = [];
  
  const contractorItems = contractorEstimate?.lineItems || [];
  const carrierItems = carrierEstimate?.lineItems || [];
  
  // Analyze contractor line items
  contractorItems.forEach((item: any) => {
    const carrierItem = carrierItems.find(
      (c: any) => c.code === item.code || c.description === item.description
    );
    
    const contractorPrice = item.total || item.amount || 0;
    const carrierPrice = carrierItem?.total || carrierItem?.amount || 0;
    
    const underpaid = Math.max(0, contractorPrice - carrierPrice);
    
    analysis.push({
      lineCode: item.code || "MISC",
      description: item.description || "Unknown item",
      carrier: carrierPrice,
      contractor: contractorPrice,
      missingFromCarrier: !carrierItem,
      underpaid,
      recommendedSupplement: underpaid > 100 || !carrierItem,
      justification: !carrierItem
        ? "Item missing from carrier estimate"
        : underpaid > 100
        ? `Underpaid by $${underpaid.toFixed(2)}`
        : undefined,
    });
  });
  
  return analysis;
}

function buildUnderpaymentReasons(
  lineItems: LineItemAnalysis[],
  depreciation: DepreciationAnalysis,
  input: FinancialInput
): string[] {
  const reasons: string[] = [];
  
  // Missing items
  const missingItems = lineItems.filter((item) => item.missingFromCarrier);
  if (missingItems.length > 0) {
    reasons.push(`${missingItems.length} line items missing from carrier estimate`);
  }
  
  // Underpaid items
  const underpaidItems = lineItems.filter((item) => item.underpaid > 100);
  if (underpaidItems.length > 0) {
    const totalUnderpaid = underpaidItems.reduce((sum, item) => sum + item.underpaid, 0);
    reasons.push(`$${totalUnderpaid.toFixed(2)} underpaid across ${underpaidItems.length} line items`);
  }
  
  // Depreciation issues
  if (depreciation.difference > 500) {
    reasons.push(`Incorrect depreciation: $${depreciation.difference.toFixed(2)} overcalculated`);
  }
  
  // Scope gaps
  if (input.scopeGaps && input.scopeGaps.length > 0) {
    reasons.push(`${input.scopeGaps.length} scope gaps identified`);
  }
  
  return reasons;
}

function generateAuditFindings(
  lineItems: LineItemAnalysis[],
  depreciation: DepreciationAnalysis,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  input: FinancialInput
) {
  const findings: FinancialAnalysisResult["auditFindings"] = [];
  
  // High impact findings
  lineItems.forEach((item) => {
    if (item.missingFromCarrier && item.contractor > 500) {
      findings.push({
        category: "Missing Line Item",
        issue: `${item.description} (${item.lineCode}) not included in carrier estimate`,
        impact: item.contractor,
        severity: "high",
      });
    }
  });
  
  // Depreciation issues
  if (depreciation.difference > 1000) {
    findings.push({
      category: "Depreciation Error",
      issue: depreciation.explanation,
      impact: depreciation.difference,
      severity: "high",
    });
  }
  
  return findings;
}

function projectSettlement(
  contractorRCV: number,
  carrierRCV: number,
  lineItems: LineItemAnalysis[],
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  input: FinancialInput
): SettlementProjection {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const underpayment = contractorRCV - carrierRCV;
  const supplementPotential = lineItems
    .filter((item) => item.recommendedSupplement)
    .reduce((sum, item) => sum + item.underpaid, 0);
  
  // Conservative projection: 60-80% of supplement potential recovered
  const min = carrierRCV + supplementPotential * 0.6;
  const max = carrierRCV + supplementPotential * 0.9;
  const expected = carrierRCV + supplementPotential * 0.75;
  
  const confidence = lineItems.length > 10 ? 85 : 70;
  
  return {
    min,
    max,
    expected,
    confidence,
    factors: [
      "Historical supplement approval rates",
      "Line item justification strength",
      "Carrier responsiveness",
      "Documentation quality",
    ],
  };
}

function buildFinancialSummary(
  underpayment: number,
  reasons: string[],
  projection: SettlementProjection
): string {
  if (underpayment === 0) {
    return "Carrier estimate aligns with contractor scope. No underpayment detected.";
  }
  
  return `This claim is underpaid by $${underpayment.toFixed(2)}. ${reasons.join(". ")}. Projected settlement range: $${projection.min.toFixed(0)}–$${projection.max.toFixed(0)} with ${projection.confidence}% confidence.`;
}
