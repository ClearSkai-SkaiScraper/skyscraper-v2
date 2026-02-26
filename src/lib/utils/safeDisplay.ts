/**
 * Safe Data Display Helpers
 *
 * Utility functions for safely displaying data that may have null, undefined,
 * or unexpected types. Prevents "Cannot read properties of null/undefined" crashes.
 *
 * Usage:
 *   import { safe, safeDate, safeCurrency, safeList } from "@/lib/utils/safeDisplay";
 *
 *   <span>{safe(claim.adjusterName)}</span>
 *   <span>{safeCurrency(claim.totalAmount)}</span>
 *   <span>{safeDate(claim.createdAt)}</span>
 */

/**
 * Safely display a string value. Returns fallback for null/undefined/empty.
 */
export function safe(value: unknown, fallback = "—"): string {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "string") return value.trim() || fallback;
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return fallback;
}

/**
 * Safely format a date value. Handles string, Date, number (timestamp), null.
 */
export function safeDate(
  value: unknown,
  options?: Intl.DateTimeFormatOptions,
  fallback = "—"
): string {
  if (!value) return fallback;

  try {
    let date: Date;
    if (value instanceof Date) {
      date = value;
    } else if (typeof value === "string") {
      date = new Date(value);
    } else if (typeof value === "number") {
      date = new Date(value);
    } else {
      return fallback;
    }

    if (isNaN(date.getTime())) return fallback;

    return date.toLocaleDateString(
      "en-US",
      options || {
        year: "numeric",
        month: "short",
        day: "numeric",
      }
    );
  } catch {
    return fallback;
  }
}

/**
 * Safely format a date+time value.
 */
export function safeDateTime(value: unknown, fallback = "—"): string {
  return safeDate(
    value,
    {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    },
    fallback
  );
}

/**
 * Safely format a currency value. Handles string, number, null.
 */
export function safeCurrency(value: unknown, currency = "USD", fallback = "$0.00"): string {
  if (value === null || value === undefined) return fallback;

  try {
    const num = typeof value === "string" ? parseFloat(value) : Number(value);
    if (isNaN(num)) return fallback;

    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  } catch {
    return fallback;
  }
}

/**
 * Safely format a number value. Handles commas, decimals, null.
 */
export function safeNumber(value: unknown, decimals = 0, fallback = "0"): string {
  if (value === null || value === undefined) return fallback;

  try {
    const num = typeof value === "string" ? parseFloat(value) : Number(value);
    if (isNaN(num)) return fallback;

    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(num);
  } catch {
    return fallback;
  }
}

/**
 * Safely format a percentage.
 */
export function safePercent(value: unknown, decimals = 1, fallback = "0%"): string {
  if (value === null || value === undefined) return fallback;

  try {
    const num = typeof value === "string" ? parseFloat(value) : Number(value);
    if (isNaN(num)) return fallback;
    return `${num.toFixed(decimals)}%`;
  } catch {
    return fallback;
  }
}

/**
 * Safely access a nested property. Avoids "Cannot read properties of undefined".
 */
export function safeGet<T>(obj: unknown, path: string, fallback: T): T {
  try {
    const keys = path.split(".");
    let current: unknown = obj;

    for (const key of keys) {
      if (current === null || current === undefined) return fallback;
      current = (current as Record<string, unknown>)[key];
    }

    return (current as T) ?? fallback;
  } catch {
    return fallback;
  }
}

/**
 * Safely handle arrays. Returns empty array for null/undefined/non-array.
 */
export function safeList<T>(value: unknown, fallback: T[] = []): T[] {
  if (Array.isArray(value)) return value;
  return fallback;
}

/**
 * Safely truncate a string to a max length with ellipsis.
 */
export function safeTruncate(value: unknown, maxLength: number, fallback = "—"): string {
  const str = safe(value, fallback);
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength - 1) + "…";
}

/**
 * Safely get a phone number display.
 */
export function safePhone(value: unknown, fallback = "—"): string {
  if (!value || typeof value !== "string") return fallback;
  const digits = value.replace(/\D/g, "");
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits.startsWith("1")) {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return value; // Return as-is if not standard format
}

/**
 * Safely get an email display (lowercased, trimmed).
 */
export function safeEmail(value: unknown, fallback = "—"): string {
  if (!value || typeof value !== "string") return fallback;
  const trimmed = value.trim().toLowerCase();
  return trimmed.includes("@") ? trimmed : fallback;
}
