// Utility to produce Flight-safe plain JSON structures
export function toPlainJSON(value: any): any {
  if (value === null || value === undefined) return value === undefined ? null : value;

  if (value instanceof Date) return value.toISOString();
  if (typeof value === "bigint") return value.toString();

  // Arrays — recurse into each element
  if (Array.isArray(value)) return value.map((item) => toPlainJSON(item));

  if (typeof value === "object") {
    // Prisma Decimal or special numeric wrapper (NOT plain objects / arrays)
    // Plain objects use Object.prototype.toString which returns "[object Object]"
    // — we only want custom toString on Decimal-like wrappers.
    const proto = Object.getPrototypeOf(value);
    if (proto !== null && proto !== Object.prototype && typeof value.toString === "function") {
      const str = value.toString();
      const num = Number(str);
      if (!Number.isNaN(num)) return num;
      // Not numeric — fall through to plain-object handling
    }

    // Plain objects — recurse into each key
    const result: Record<string, any> = {};
    for (const [k, v] of Object.entries(value)) {
      const cleaned = toPlainJSON(v);
      result[k] = cleaned === undefined ? null : cleaned;
    }
    return result;
  }

  return value;
}
