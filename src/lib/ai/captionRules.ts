/**
 * AI CAPTION RULES ENFORCER
 *
 * Validates that AI-generated photo captions follow strict rules:
 * - No uncertain language ("may", "possible", "appears")
 * - Active voice only
 * - Must mention material, damage type, functional impact, code, DOL
 */

import { PhotoCaption } from "./photo-caption-generator";

export interface CaptionValidation {
  valid: boolean;
  violations: string[];
  score: number; // 0-100
}

// Forbidden uncertain words
const FORBIDDEN_WORDS = [
  "may",
  "might",
  "could",
  "possibly",
  "perhaps",
  "appears",
  "seems",
  "likely",
  "probably",
  "potentially",
  "suggests",
  "indicates",
];

// Passive voice indicators
const PASSIVE_INDICATORS = [
  "may have been",
  "could have been",
  "appears to be",
  "seems to be",
  "is believed",
  "is thought",
  "is suspected",
];

// Required elements
const REQUIRED_ELEMENTS = {
  materialType: "Material type must be explicitly stated",
  damageType: "Damage type must be clearly identified",
  functionalImpact: "Functional impact must explain consequences",
  applicableCode: "Applicable building code must be cited",
  dolTieIn: "Must tie damage to date of loss",
};

/**
 * Validate a photo caption against all rules
 */
export function validateCaption(caption: PhotoCaption): CaptionValidation {
  const violations: string[] = [];
  let score = 100;

  // 1. Check for forbidden uncertain language
  const allText = Object.values(caption).join(" ").toLowerCase();

  FORBIDDEN_WORDS.forEach((word) => {
    if (allText.includes(word)) {
      violations.push(`❌ Contains uncertain language: "${word}"`);
      score -= 15;
    }
  });

  // 2. Check for passive voice
  PASSIVE_INDICATORS.forEach((phrase) => {
    if (allText.includes(phrase)) {
      violations.push(`❌ Uses passive voice: "${phrase}"`);
      score -= 10;
    }
  });

  // 3. Check all required fields are populated
  Object.entries(REQUIRED_ELEMENTS).forEach(([field, description]) => {
    const value = caption[field as keyof PhotoCaption];
    if (!value || typeof value !== "string" || value.trim().length === 0) {
      violations.push(`❌ Missing required field: ${description}`);
      score -= 20;
    }
  });

  // 4. Check for assertive language (should use "is", "has", "shows", "exposes")
  const assertiveWords = ["is", "has", "shows", "exposes", "demonstrates", "proves"];
  const hasAssertive = assertiveWords.some((word) => allText.includes(word));
  if (!hasAssertive) {
    violations.push(`⚠️ Caption lacks assertive language (use "is", "has", "shows")`);
    score -= 5;
  }

  // 5. Check material type is specific (not generic)
  if (caption.materialType && caption.materialType.toLowerCase().includes("unknown")) {
    violations.push(`⚠️ Material type is too generic: "${caption.materialType}"`);
    score -= 10;
  }

  // 6. Check damage type is specific
  if (caption.damageType && caption.damageType.toLowerCase().includes("damage identified")) {
    violations.push(`⚠️ Damage type is too generic: "${caption.damageType}"`);
    score -= 10;
  }

  // 7. Check functional impact explains consequences
  if (caption.functionalImpact && caption.functionalImpact.length < 20) {
    violations.push(`⚠️ Functional impact is too brief (needs more detail)`);
    score -= 5;
  }

  // 8. Check code citation is specific (should reference IRC, TRI, NRCA, etc.)
  if (caption.applicableCode) {
    const hasCodeReference = /IRC|TRI|NRCA|IBC|R\d{3}/.test(caption.applicableCode);
    if (!hasCodeReference) {
      violations.push(`⚠️ Code citation lacks specific reference (e.g., IRC R905.3)`);
      score -= 10;
    }
  }

  // 9. Check DOL tie-in mentions date or event
  if (caption.dolTieIn) {
    const hasDate = /\d{1,2}\/\d{1,2}\/\d{2,4}|\d{4}-\d{2}-\d{2}|storm|hail|wind/.test(
      caption.dolTieIn.toLowerCase()
    );
    if (!hasDate) {
      violations.push(`⚠️ DOL tie-in should reference date or storm event`);
      score -= 5;
    }
  }

  score = Math.max(0, Math.min(100, score));

  return {
    valid: violations.length === 0,
    violations,
    score,
  };
}

/**
 * Batch validate multiple captions
 */
export function validateCaptionsBatch(captions: PhotoCaption[]): {
  allValid: boolean;
  results: CaptionValidation[];
  averageScore: number;
  totalViolations: number;
} {
  const results = captions.map(validateCaption);
  const allValid = results.every((r) => r.valid);
  const averageScore = results.reduce((sum, r) => sum + r.score, 0) / (results.length || 1);
  const totalViolations = results.reduce((sum, r) => sum + r.violations.length, 0);

  return {
    allValid,
    results,
    averageScore,
    totalViolations,
  };
}

/**
 * Auto-fix common issues (best-effort)
 */
export function autoFixCaption(caption: PhotoCaption): PhotoCaption {
  const fixed = { ...caption };

  // Remove uncertain language
  FORBIDDEN_WORDS.forEach((word) => {
    const regex = new RegExp(`\\b${word}\\b`, "gi");
    Object.keys(fixed).forEach((key) => {
      const field = key as keyof PhotoCaption;
      if (typeof fixed[field] === "string") {
        fixed[field] = (fixed[field] as string).replace(regex, "");
      }
    });
  });

  // Clean up extra whitespace
  Object.keys(fixed).forEach((key) => {
    const field = key as keyof PhotoCaption;
    if (typeof fixed[field] === "string") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      fixed[field] = (fixed[field] as string).replace(/\s+/g, " ").trim() as any;
    }
  });

  return fixed;
}

/**
 * Get caption quality rating
 */
export function getCaptionQuality(score: number): {
  rating: "excellent" | "good" | "fair" | "poor";
  emoji: string;
  description: string;
} {
  if (score >= 90)
    return {
      rating: "excellent",
      emoji: "✅",
      description: "Professional, adjuster-ready",
    };
  if (score >= 75)
    return {
      rating: "good",
      emoji: "👍",
      description: "Minor improvements needed",
    };
  if (score >= 60) return { rating: "fair", emoji: "⚠️", description: "Needs revision" };
  return {
    rating: "poor",
    emoji: "❌",
    description: "Requires significant rework",
  };
}

/**
 * Generate report for caption quality
 */
export function generateCaptionReport(captions: PhotoCaption[]): string {
  const batchResult = validateCaptionsBatch(captions);
  const quality = getCaptionQuality(batchResult.averageScore);

  let report = `📊 CAPTION QUALITY REPORT\n\n`;
  report += `Total Captions: ${captions.length}\n`;
  report += `Average Score: ${batchResult.averageScore.toFixed(1)}/100\n`;
  report += `Quality Rating: ${quality.emoji} ${quality.rating.toUpperCase()} - ${quality.description}\n`;
  report += `Total Violations: ${batchResult.totalViolations}\n`;
  report += `All Valid: ${batchResult.allValid ? "✅ YES" : "❌ NO"}\n\n`;

  if (!batchResult.allValid) {
    report += `🚨 VIOLATIONS BY CAPTION:\n\n`;
    batchResult.results.forEach((result, index) => {
      if (result.violations.length > 0) {
        report += `Photo ${index + 1} (Score: ${result.score}/100):\n`;
        result.violations.forEach((v) => {
          report += `  ${v}\n`;
        });
        report += `\n`;
      }
    });
  }

  return report;
}
