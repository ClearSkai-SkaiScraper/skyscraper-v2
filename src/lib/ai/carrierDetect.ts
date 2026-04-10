/**
 * PHASE 41: Carrier Detection Engine
 * 
 * Automatically detects insurance carrier from various sources:
 * - Email addresses (adjuster domains)
 * - Policy PDF text
 * - User manual input
 * - Lead notes/descriptions
 */

import { type CarrierRule,getCarrierRules } from "./carrierRules";

export interface CarrierDetectionResult {
  carrierName: string | null;
  confidence: number; // 0.0 - 1.0
  detectedFrom: "email" | "pdf" | "manual" | "notes" | "adjuster_domain" | "unknown";
  rules: CarrierRule | null;
  alternativePossibilities?: string[];
}

/**
 * Known carrier email domains and patterns
 */
const CARRIER_EMAIL_PATTERNS: Record<string, { carrier: string; confidence: number }> = {
  // State Farm
  "statefarm.com": { carrier: "State Farm", confidence: 1.0 },
  "sf.com": { carrier: "State Farm", confidence: 0.9 },
  
  // Farmers
  "farmersinsurance.com": { carrier: "Farmers", confidence: 1.0 },
  "farmers.com": { carrier: "Farmers", confidence: 1.0 },
  "farmersagent.com": { carrier: "Farmers", confidence: 0.95 },
  
  // USAA
  "usaa.com": { carrier: "USAA", confidence: 1.0 },
  
  // Allstate
  "allstate.com": { carrier: "Allstate", confidence: 1.0 },
  "allstateagent.com": { carrier: "Allstate", confidence: 0.95 },
  
  // Liberty Mutual
  "libertymutual.com": { carrier: "Liberty Mutual", confidence: 1.0 },
  "lmig.com": { carrier: "Liberty Mutual", confidence: 0.95 },
  
  // Nationwide
  "nationwide.com": { carrier: "Nationwide", confidence: 1.0 },
  "nationwidefinancial.com": { carrier: "Nationwide", confidence: 0.95 },
};

/**
 * Carrier name variations and aliases
 */
const CARRIER_NAME_ALIASES: Record<string, string> = {
  "state farm": "State Farm",
  "statefarm": "State Farm",
  "sf": "State Farm",
  "farmers insurance": "Farmers",
  "farmers": "Farmers",
  "usaa": "USAA",
  "allstate": "Allstate",
  "allstate insurance": "Allstate",
  "liberty mutual": "Liberty Mutual",
  "liberty": "Liberty Mutual",
  "nationwide": "Nationwide",
  "nationwide insurance": "Nationwide",
};

/**
 * Detect carrier from email address
 */
export function detectCarrierFromEmail(email: string): CarrierDetectionResult {
  if (!email || !email.includes("@")) {
    return {
      carrierName: null,
      confidence: 0,
      detectedFrom: "email",
      rules: null,
    };
  }

  const domain = email.split("@")[1]?.toLowerCase().trim();
  if (!domain) {
    return {
      carrierName: null,
      confidence: 0,
      detectedFrom: "email",
      rules: null,
    };
  }

  // Check exact domain match
  if (CARRIER_EMAIL_PATTERNS[domain]) {
    const match = CARRIER_EMAIL_PATTERNS[domain];
    return {
      carrierName: match.carrier,
      confidence: match.confidence,
      detectedFrom: "adjuster_domain",
      rules: getCarrierRules(match.carrier),
    };
  }

  // Check if domain contains carrier name
  for (const [pattern, match] of Object.entries(CARRIER_EMAIL_PATTERNS)) {
    if (domain.includes(pattern.replace(".com", ""))) {
      return {
        carrierName: match.carrier,
        confidence: match.confidence * 0.8, // Lower confidence for partial match
        detectedFrom: "adjuster_domain",
        rules: getCarrierRules(match.carrier),
      };
    }
  }

  return {
    carrierName: null,
    confidence: 0,
    detectedFrom: "email",
    rules: null,
  };
}

/**
 * Detect carrier from policy PDF text
 */
export function detectCarrierFromPolicyPDF(pdfText: string): CarrierDetectionResult {
  if (!pdfText) {
    return {
      carrierName: null,
      confidence: 0,
      detectedFrom: "pdf",
      rules: null,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const normalizedText = pdfText.toLowerCase();
  const possibilities: { carrier: string; confidence: number }[] = [];

  // Check for carrier names and aliases in PDF text
  for (const [alias, canonicalName] of Object.entries(CARRIER_NAME_ALIASES)) {
    const pattern = new RegExp(`\\b${alias}\\b`, "gi");
    const matches = pdfText.match(pattern);
    
    if (matches) {
      const frequency = matches.length;
      let confidence = Math.min(0.6 + (frequency * 0.1), 0.95);
      
      // Higher confidence if found in header/title area (first 500 chars)
      if (pdfText.substring(0, 500).toLowerCase().includes(alias)) {
        confidence = Math.min(confidence + 0.15, 1.0);
      }
      
      possibilities.push({ carrier: canonicalName, confidence });
    }
  }

  // Sort by confidence
  possibilities.sort((a, b) => b.confidence - a.confidence);

  if (possibilities.length === 0) {
    return {
      carrierName: null,
      confidence: 0,
      detectedFrom: "pdf",
      rules: null,
    };
  }

  const topMatch = possibilities[0];
  const alternatives = possibilities.slice(1, 3).map(p => p.carrier);

  return {
    carrierName: topMatch.carrier,
    confidence: topMatch.confidence,
    detectedFrom: "pdf",
    rules: getCarrierRules(topMatch.carrier),
    alternativePossibilities: alternatives.length > 0 ? alternatives : undefined,
  };
}

/**
 * Detect carrier from lead notes or description
 */
export function detectCarrierFromNotes(notesText: string): CarrierDetectionResult {
  if (!notesText) {
    return {
      carrierName: null,
      confidence: 0,
      detectedFrom: "notes",
      rules: null,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const normalizedText = notesText.toLowerCase();
  const possibilities: { carrier: string; confidence: number }[] = [];

  // Check for carrier names in notes
  for (const [alias, canonicalName] of Object.entries(CARRIER_NAME_ALIASES)) {
    const pattern = new RegExp(`\\b${alias}\\b`, "gi");
    const matches = notesText.match(pattern);
    
    if (matches) {
      const frequency = matches.length;
      const confidence = Math.min(0.5 + (frequency * 0.15), 0.9);
      possibilities.push({ carrier: canonicalName, confidence });
    }
  }

  possibilities.sort((a, b) => b.confidence - a.confidence);

  if (possibilities.length === 0) {
    return {
      carrierName: null,
      confidence: 0,
      detectedFrom: "notes",
      rules: null,
    };
  }

  const topMatch = possibilities[0];
  const alternatives = possibilities.slice(1, 3).map(p => p.carrier);

  return {
    carrierName: topMatch.carrier,
    confidence: topMatch.confidence,
    detectedFrom: "notes",
    rules: getCarrierRules(topMatch.carrier),
    alternativePossibilities: alternatives.length > 0 ? alternatives : undefined,
  };
}

/**
 * Manual carrier selection by user
 */
export function detectCarrierFromUserInput(carrierInput: string): CarrierDetectionResult {
  if (!carrierInput) {
    return {
      carrierName: null,
      confidence: 0,
      detectedFrom: "manual",
      rules: null,
    };
  }

  const normalized = carrierInput.toLowerCase().trim();
  
  // Check aliases
  const canonicalName = CARRIER_NAME_ALIASES[normalized] || carrierInput;
  const rules = getCarrierRules(canonicalName);

  if (rules) {
    return {
      carrierName: rules.carrierName,
      confidence: 1.0, // Perfect confidence for manual input
      detectedFrom: "manual",
      rules,
    };
  }

  return {
    carrierName: carrierInput,
    confidence: 0.5, // Unknown carrier but user specified
    detectedFrom: "manual",
    rules: null,
  };
}

/**
 * Comprehensive carrier detection from all available sources
 */
export function detectCarrier(params: {
  adjusterEmail?: string;
  policyPDFText?: string;
  leadNotes?: string;
  manualCarrier?: string;
}): CarrierDetectionResult {
  const results: CarrierDetectionResult[] = [];

  // Try manual input first (highest priority)
  if (params.manualCarrier) {
    const result = detectCarrierFromUserInput(params.manualCarrier);
    if (result.carrierName) {
      return result;
    }
  }

  // Try email domain
  if (params.adjusterEmail) {
    const result = detectCarrierFromEmail(params.adjusterEmail);
    if (result.confidence > 0.7) {
      return result;
    }
    if (result.carrierName) {
      results.push(result);
    }
  }

  // Try PDF text
  if (params.policyPDFText) {
    const result = detectCarrierFromPolicyPDF(params.policyPDFText);
    if (result.confidence > 0.7) {
      return result;
    }
    if (result.carrierName) {
      results.push(result);
    }
  }

  // Try notes
  if (params.leadNotes) {
    const result = detectCarrierFromNotes(params.leadNotes);
    if (result.carrierName) {
      results.push(result);
    }
  }

  // Return best result
  if (results.length > 0) {
    results.sort((a, b) => b.confidence - a.confidence);
    return results[0];
  }

  return {
    carrierName: null,
    confidence: 0,
    detectedFrom: "unknown",
    rules: null,
  };
}

/**
 * Merge multiple carrier rules (when uncertainty exists)
 * Uses most restrictive rules from all possibilities
 */
export function mergeCarrierRules(carriers: string[]): Partial<CarrierRule> {
  const allRules = carriers
    .map(c => getCarrierRules(c))
    .filter((r): r is CarrierRule => r !== null);

  if (allRules.length === 0) {
    return {};
  }

  if (allRules.length === 1) {
    return allRules[0];
  }

  // Use most restrictive rules when multiple carriers detected
  return {
    carrierName: "Multiple Carriers",
    requiresStarterRake: allRules.some(r => r.requiresStarterRake),
    allowsIceAndWater: allRules.every(r => r.allowsIceAndWater),
    dripEdgeRequired: allRules.some(r => r.dripEdgeRequired),
    overheadProfitAllowed: allRules.every(r => r.overheadProfitAllowed),
    wasteLimitPercent: Math.min(...allRules.map(r => r.wasteLimitPercent || 15)),
    lineItemLimits: allRules.flatMap(r => r.lineItemLimits),
    requiredItems: [...new Set(allRules.flatMap(r => r.requiredItems))],
    deniedItems: [...new Set(allRules.flatMap(r => r.deniedItems))],
    codeUpgradeRules: [...new Set(allRules.flatMap(r => r.codeUpgradeRules))],
    notes: ["Rules merged from multiple carriers - using most restrictive"],
    documentationRequirements: [...new Set(allRules.flatMap(r => r.documentationRequirements))],
  };
}
