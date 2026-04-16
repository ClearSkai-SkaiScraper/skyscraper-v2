/**
 * Canonical role-comparison helpers. Use these instead of raw string equality
 * to eliminate the OWNER/owner/ADMIN/admin casing class of bugs.
 *
 * System B canonical roles are LOWERCASE: admin | manager | member | viewer
 * But legacy data in `user_organizations.role` and `users.role` stores uppercase
 * values including "OWNER" which is not part of System B.
 *
 * These helpers normalize both sides before comparing.
 */

/** Normalize any role string to lowercase. Treats null/undefined as "". */
export function normalize(role: string | null | undefined): string {
  return (role ?? "").toString().toLowerCase();
}

/** Treat OWNER and ADMIN both as admin. */
export function isAdminRole(role: string | null | undefined): boolean {
  const r = normalize(role);
  return r === "owner" || r === "admin";
}

/** Admin OR manager. */
export function isManagerOrAbove(role: string | null | undefined): boolean {
  const r = normalize(role);
  return r === "owner" || r === "admin" || r === "manager";
}

/** Case-insensitive role equality. */
export function roleEquals(a: string | null | undefined, b: string): boolean {
  return normalize(a) === normalize(b);
}

/** True if `role` is any of `allowed` (case-insensitive). */
export function roleIn(role: string | null | undefined, allowed: string[]): boolean {
  const r = normalize(role);
  return allowed.some((a) => normalize(a) === r);
}
