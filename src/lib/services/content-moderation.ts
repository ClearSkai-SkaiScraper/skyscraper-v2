/**
 * Content Moderation Service
 *
 * Detects and filters inappropriate content including:
 * - Profanity and vulgar language
 * - Hate speech
 * - Personal attacks
 * - Spam and promotional content
 *
 * Used before submission to prevent violations of user agreements.
 */

// Common profanity and slurs (partial list - extend as needed)
const PROFANITY_LIST = [
  // Explicit words
  "fuck",
  "shit",
  "ass",
  "bitch",
  "damn",
  "hell",
  "crap",
  "bastard",
  "dick",
  "cock",
  "pussy",
  "cunt",
  "whore",
  "slut",
  "fag",
  "retard",
  "nigger",
  "nigga",
  // Variations with common substitutions
  "f\\*ck",
  "f\\*\\*k",
  "sh\\*t",
  "a\\*\\*",
  "b\\*tch",
  // Common leetspeak
  "f4ck",
  "sh1t",
  "a55",
  "b1tch",
];

// Hate speech patterns
const HATE_SPEECH_PATTERNS = [
  /\b(kill|murder|die|death to)\s+(all\s+)?(jews?|muslims?|christians?|blacks?|whites?|gays?|trans)/gi,
  /\b(jews?|muslims?|christians?|blacks?|whites?|gays?|trans)\s+(should|must|need to)\s+(die|be killed)/gi,
  /\b(hate|despise)\s+(all\s+)?(jews?|muslims?|christians?|blacks?|whites?|gays?|trans)/gi,
  /\b(inferior|subhuman|animals?)\s*(race|people|group)/gi,
  /\b(white|black|jewish|muslim)\s+supremac/gi,
  /\bheil\s+hitler/gi,
  /\bgas\s+the\s+jews/gi,
  /\b(kike|spic|chink|wetback|gook|raghead)/gi,
];

// Personal attack patterns
const ATTACK_PATTERNS = [
  /\byou('re|\s+are)\s+(stupid|dumb|idiot|moron|retard|trash|worthless)/gi,
  /\b(scam(mer)?|fraud|thief|liar|cheat)\b/gi,
  /\b(sue|lawyer|court)\s+(you|them)/gi,
  /\b(threat(en)?|hurt|harm)\s+(you|your)/gi,
  /\bi('ll|'m going to|will)\s+(kill|hurt|destroy|ruin)/gi,
];

// Spam patterns
const SPAM_PATTERNS = [
  /\b(click here|visit now|free money|make money fast|limited time offer)\b/gi,
  /\b(xxx|porn|adult content|18\+)\b/gi,
  /(https?:\/\/[^\s]+){3,}/gi, // Multiple URLs
  /(.)\1{5,}/gi, // Repeated characters (aaaaaaaa)
  /([A-Z]{10,})/g, // All caps spam
];

export interface ModerationResult {
  isClean: boolean;
  violations: ModerationViolation[];
  severity: "none" | "low" | "medium" | "high" | "severe";
  sanitizedContent?: string;
  shouldBlock: boolean;
  message?: string;
}

export interface ModerationViolation {
  type: "profanity" | "hate_speech" | "personal_attack" | "spam" | "threat";
  severity: "low" | "medium" | "high" | "severe";
  match: string;
  position: number;
  suggestion?: string;
}

/**
 * Moderate content for violations
 */
export function moderateContent(content: string): ModerationResult {
  if (!content || typeof content !== "string") {
    return {
      isClean: true,
      violations: [],
      severity: "none",
      shouldBlock: false,
    };
  }

  const violations: ModerationViolation[] = [];
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const contentLower = content.toLowerCase();

  // Check for profanity
  for (const word of PROFANITY_LIST) {
    const regex = new RegExp(`\\b${word.replace(/\*/g, "\\*")}\\b`, "gi");
    let match;
    while ((match = regex.exec(content)) !== null) {
      violations.push({
        type: "profanity",
        severity: "medium",
        match: match[0],
        position: match.index || 0,
        suggestion: "Please remove inappropriate language",
      });
    }
  }

  // Check for hate speech
  for (const pattern of HATE_SPEECH_PATTERNS) {
    let match;
    const patternCopy = new RegExp(pattern.source, pattern.flags);
    while ((match = patternCopy.exec(content)) !== null) {
      violations.push({
        type: "hate_speech",
        severity: "severe",
        match: match[0],
        position: match.index || 0,
        suggestion: "This content violates our community guidelines against hate speech",
      });
    }
  }

  // Check for personal attacks
  for (const pattern of ATTACK_PATTERNS) {
    let match;
    const patternCopy = new RegExp(pattern.source, pattern.flags);
    while ((match = patternCopy.exec(content)) !== null) {
      violations.push({
        type: "personal_attack",
        severity: "high",
        match: match[0],
        position: match.index || 0,
        suggestion: "Please keep feedback professional. Personal attacks are not allowed.",
      });
    }
  }

  // Check for spam
  for (const pattern of SPAM_PATTERNS) {
    let match;
    const patternCopy = new RegExp(pattern.source, pattern.flags);
    while ((match = patternCopy.exec(content)) !== null) {
      violations.push({
        type: "spam",
        severity: "low",
        match: match[0],
        position: match.index || 0,
        suggestion: "This content appears to be spam or promotional",
      });
    }
  }

  // Determine overall severity
  let severity: ModerationResult["severity"] = "none";
  if (violations.some((v) => v.severity === "severe")) {
    severity = "severe";
  } else if (violations.some((v) => v.severity === "high")) {
    severity = "high";
  } else if (violations.some((v) => v.severity === "medium")) {
    severity = "medium";
  } else if (violations.length > 0) {
    severity = "low";
  }

  // Determine if should block
  const shouldBlock = severity === "severe" || severity === "high";

  // Generate user-friendly message
  let message: string | undefined;
  if (shouldBlock) {
    if (violations.some((v) => v.type === "hate_speech")) {
      message =
        "Your post contains hate speech which violates our community guidelines. This content cannot be posted.";
    } else if (violations.some((v) => v.type === "personal_attack")) {
      message =
        "Your post contains personal attacks. Please keep your feedback professional and respectful.";
    } else if (violations.some((v) => v.type === "threat")) {
      message = "Your post contains threatening language which is not allowed.";
    } else {
      message =
        "Your post contains content that violates our community guidelines. Please revise and try again.";
    }
  } else if (severity === "medium") {
    message =
      "Your post contains some inappropriate language. Consider revising for a more professional tone.";
  }

  return {
    isClean: violations.length === 0,
    violations,
    severity,
    shouldBlock,
    message,
    sanitizedContent: shouldBlock ? undefined : sanitizeContent(content, violations),
  };
}

/**
 * Sanitize content by masking violations
 */
function sanitizeContent(content: string, violations: ModerationViolation[]): string {
  let sanitized = content;

  // Sort by position descending to maintain positions
  const sorted = [...violations].sort((a, b) => b.position - a.position);

  for (const violation of sorted) {
    if (violation.type === "profanity" && violation.severity !== "severe") {
      const replacement =
        violation.match[0] +
        "*".repeat(violation.match.length - 2) +
        violation.match[violation.match.length - 1];
      sanitized =
        sanitized.slice(0, violation.position) +
        replacement +
        sanitized.slice(violation.position + violation.match.length);
    }
  }

  return sanitized;
}

/**
 * Quick check if content is likely clean (for real-time validation)
 */
export function quickCheck(content: string): { likely_clean: boolean; warning?: string } {
  if (!content) return { likely_clean: true };

  const contentLower = content.toLowerCase();

  // Quick profanity check
  for (const word of PROFANITY_LIST.slice(0, 20)) {
    // Check first 20 common words
    if (contentLower.includes(word.replace(/\\/g, ""))) {
      return {
        likely_clean: false,
        warning: "Your message may contain inappropriate language",
      };
    }
  }

  // Quick hate speech check
  for (const pattern of HATE_SPEECH_PATTERNS.slice(0, 5)) {
    if (pattern.test(content)) {
      return {
        likely_clean: false,
        warning: "Your message may violate community guidelines",
      };
    }
  }

  return { likely_clean: true };
}

/**
 * Get a human-readable content policy summary
 */
export function getContentPolicy(): string {
  return `
# SkaiScraper Community Content Policy

## What's Not Allowed:

### 1. Hate Speech
Content that promotes hatred against individuals or groups based on race, ethnicity, religion, gender, sexual orientation, disability, or other protected characteristics.

### 2. Personal Attacks & Harassment
Direct insults, name-calling, threats, or harassment directed at other users or contractors. Disagreements should be expressed professionally.

### 3. Profanity & Vulgar Language
Excessive profanity, slurs, or vulgar language. Keep it professional - this is a business platform.

### 4. Threats
Any content that threatens violence, legal action, or harm against individuals or businesses.

### 5. Spam & Promotional Content
Unsolicited advertisements, excessive links, or repetitive content.

## What Happens When Violations Occur:

- **First Offense**: Warning and content removal
- **Second Offense**: Temporary account suspension (7 days)
- **Third Offense**: Permanent account termination

## Remember:
- It's okay to be dissatisfied with work and express that professionally
- Focus on facts and specific issues rather than personal attacks
- Contractors have the right to respond to reviews
- We're all adults working together in a professional setting

By posting, you agree to follow these guidelines and the full User Agreement.
  `.trim();
}
