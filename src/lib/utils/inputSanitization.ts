/**
 * Input Sanitization + Validation Helpers
 *
 * Server-side and client-side input sanitization for all user-facing forms.
 * Prevents XSS, SQL injection patterns, and ensures data quality.
 */

/**
 * Sanitize a plain text string: trim, collapse whitespace, strip control chars.
 */
export function sanitizeText(input: unknown, maxLength = 1000): string {
  if (typeof input !== "string") return "";
  return input
    .trim()
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "") // Strip control characters
    .replace(/\s+/g, " ") // Collapse whitespace
    .substring(0, maxLength);
}

/**
 * Sanitize HTML-sensitive characters for safe display.
 */
export function escapeHtml(input: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return input.replace(/[&<>"']/g, (char) => map[char] || char);
}

/**
 * Sanitize and validate an email address.
 */
export function sanitizeEmail(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const email = input.trim().toLowerCase();
  // RFC 5322 simplified pattern
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email) ? email : null;
}

/**
 * Sanitize a phone number: strip non-digits, validate length.
 */
export function sanitizePhone(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const digits = input.replace(/\D/g, "");
  if (digits.length === 10) return digits;
  if (digits.length === 11 && digits.startsWith("1")) return digits.substring(1);
  return null;
}

/**
 * Sanitize a URL: validate protocol and format.
 */
export function sanitizeUrl(input: unknown): string | null {
  if (typeof input !== "string") return null;
  try {
    const url = new URL(input.trim());
    if (!["http:", "https:"].includes(url.protocol)) return null;
    return url.toString();
  } catch {
    return null;
  }
}

/**
 * Sanitize a monetary amount: parse to number, ensure non-negative.
 */
export function sanitizeAmount(input: unknown): number | null {
  if (input === null || input === undefined) return null;
  const num =
    typeof input === "string" ? parseFloat(input.replace(/[^0-9.-]/g, "")) : Number(input);
  if (isNaN(num) || num < 0) return null;
  return Math.round(num * 100) / 100; // Round to 2 decimal places
}

/**
 * Generic max-length guard for string fields.
 * Returns truncated string if over limit.
 */
export function enforceMaxLength(input: unknown, maxLength: number): string {
  if (typeof input !== "string") return "";
  return input.substring(0, maxLength);
}

/**
 * Detect and strip potential SQL injection patterns.
 * Note: This is defense-in-depth — Prisma parameterization is the primary defense.
 */
export function stripSqlPatterns(input: string): string {
  return input
    .replace(
      /('|--|;|\/\*|\*\/|xp_|exec\s|execute\s|drop\s|alter\s|create\s|insert\s|delete\s|update\s|union\s|select\s)/gi,
      ""
    )
    .trim();
}

/**
 * Validate that an input matches a UUID v4 pattern.
 */
export function isValidUuid(input: unknown): boolean {
  if (typeof input !== "string") return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input);
}

/**
 * Validate that an input looks like a Clerk ID.
 */
export function isValidClerkId(input: unknown): boolean {
  if (typeof input !== "string") return false;
  return /^(user_|org_|orgmem_)[a-zA-Z0-9]+$/.test(input);
}

/**
 * Batch sanitize form data. Takes a record and applies sanitizeText to all string values.
 */
export function sanitizeFormData<T extends Record<string, unknown>>(
  data: T,
  maxLengths?: Partial<Record<keyof T, number>>
): T {
  const result = { ...data };
  for (const [key, value] of Object.entries(result)) {
    if (typeof value === "string") {
      const maxLen = maxLengths?.[key as keyof T] as number | undefined;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (result as any)[key] = sanitizeText(value, maxLen || 1000);
    }
  }
  return result;
}
