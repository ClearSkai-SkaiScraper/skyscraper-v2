/**
 * PII Masking utility (Sprint 10.1.7)
 *
 * Masks personally identifiable information in log entries.
 * Used by the logger to prevent PII leaks.
 */

// ── Patterns ────────────────────────────────────────────────────────
const EMAIL_REGEX = /[\w.+-]+@[\w-]+\.[\w.]+/g;
const PHONE_REGEX = /(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
const SSN_REGEX = /\b\d{3}-\d{2}-\d{4}\b/g;
const CREDIT_CARD_REGEX = /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g;
const API_KEY_REGEX = /(?:sk|pk|whsec|rk)_(?:test|live|prod)_[a-zA-Z0-9]{10,}/g;

/**
 * Mask a string, replacing PII with redacted placeholders.
 */
export function maskPII(input: string): string {
  return input
    .replace(EMAIL_REGEX, "[EMAIL_REDACTED]")
    .replace(SSN_REGEX, "[SSN_REDACTED]")
    .replace(CREDIT_CARD_REGEX, "[CC_REDACTED]")
    .replace(API_KEY_REGEX, "[KEY_REDACTED]")
    .replace(PHONE_REGEX, "[PHONE_REDACTED]");
}

/**
 * Recursively mask PII in an object (for structured log entries).
 */
export function maskPIIDeep(obj: unknown, depth = 0): unknown {
  if (depth > 10) return obj; // prevent infinite recursion

  if (typeof obj === "string") return maskPII(obj);
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== "object") return obj;

  if (Array.isArray(obj)) {
    return obj.map((item) => maskPIIDeep(item, depth + 1));
  }

  const masked: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    // Redact known sensitive field names entirely
    const lowerKey = key.toLowerCase();
    if (
      lowerKey.includes("password") ||
      lowerKey.includes("secret") ||
      lowerKey.includes("token") ||
      lowerKey === "authorization" ||
      lowerKey === "cookie"
    ) {
      masked[key] = "[REDACTED]";
    } else {
      masked[key] = maskPIIDeep(value, depth + 1);
    }
  }

  return masked;
}

/**
 * Mask an email address, showing only first char + domain.
 * "john@example.com" → "j***@example.com"
 */
export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return "[EMAIL_REDACTED]";
  return `${local[0]}***@${domain}`;
}

/**
 * Mask a phone number, showing only last 4 digits.
 * "(602) 555-1234" → "***-1234"
 */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return "[PHONE_REDACTED]";
  return `***-${digits.slice(-4)}`;
}
