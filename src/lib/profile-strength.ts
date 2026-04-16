/**
 * Profile Strength Calculator
 * Server-safe utility — NO "use client" directive.
 * This can be safely imported from both server components and client components.
 *
 * The ProfileStrengthBanner.tsx component re-exports these for backward
 * compatibility, but server components should import from here directly
 * to avoid the "use client" boundary issue.
 */

type FieldCheck = { label: string; filled: boolean };

export function calculateProStrength(m: Record<string, unknown>): {
  percent: number;
  missing: string[];
} {
  const checks: FieldCheck[] = [
    { label: "First name", filled: !!m.firstName },
    { label: "Last name", filled: !!m.lastName },
    { label: "Email", filled: !!m.email },
    { label: "Phone", filled: !!m.phone },
    { label: "City", filled: !!m.city },
    { label: "State", filled: !!m.state },
    { label: "Bio / About", filled: !!m.bio },
    { label: "Profile photo", filled: !!(m.avatar || m.profilePhoto) },
    { label: "Trade type", filled: !!m.tradeType },
    { label: "Job title", filled: !!m.jobTitle },
    { label: "Years of experience", filled: !!m.yearsExperience },
    { label: "License #", filled: !!m.licenseNumber },
    {
      label: "Bonded status",
      filled: m.isBonded === true || m.isBonded === false,
    },
    {
      label: "Insured status",
      filled: m.isInsured === true || m.isInsured === false,
    },
    {
      label: "Coverage types",
      filled: Array.isArray(m.coverageTypes) && (m.coverageTypes as unknown[]).length > 0,
    },
  ];

  const filled = checks.filter((c) => c.filled).length;
  const percent = Math.round((filled / checks.length) * 100);
  return { percent, missing: checks.filter((c) => !c.filled).map((c) => c.label) };
}

export function calculateClientStrength(p: Record<string, unknown>): {
  percent: number;
  missing: string[];
} {
  const checks: FieldCheck[] = [
    { label: "First name", filled: !!p.firstName },
    { label: "Last name", filled: !!p.lastName },
    { label: "Phone", filled: !!p.phone },
    { label: "Address", filled: !!p.address },
    { label: "City", filled: !!p.city },
    { label: "State", filled: !!p.state },
    { label: "Zip", filled: !!(p.postal || p.zip) },
    { label: "Bio", filled: !!p.bio },
    { label: "Profile photo", filled: !!p.avatarUrl },
    { label: "Property photo", filled: !!p.propertyPhotoUrl },
  ];

  const filled = checks.filter((c) => c.filled).length;
  const percent = Math.round((filled / checks.length) * 100);
  return { percent, missing: checks.filter((c) => !c.filled).map((c) => c.label) };
}

/**
 * Inspector profile completeness — checks all editable fields on the inspector model.
 */
export function calculateInspectorStrength(p: Record<string, unknown>): {
  percent: number;
  missing: string[];
} {
  const checks: FieldCheck[] = [
    { label: "First name", filled: !!p.firstName },
    { label: "Last name", filled: !!p.lastName },
    { label: "Email", filled: !!p.email },
    { label: "Phone", filled: !!p.phone },
    { label: "License number", filled: !!p.licenseNumber },
    { label: "Certification level", filled: !!p.certificationLevel },
    {
      label: "Specialties",
      filled: Array.isArray(p.specialties) && (p.specialties as unknown[]).length > 0,
    },
    { label: "Bio", filled: !!p.bio },
    {
      label: "Service area",
      filled: Array.isArray(p.serviceArea) && (p.serviceArea as unknown[]).length > 0,
    },
    {
      label: "Certifications",
      filled: Array.isArray(p.certifications) && (p.certifications as unknown[]).length > 0,
    },
    { label: "Insurance info", filled: !!p.insuranceInfo },
  ];

  const filled = checks.filter((c) => c.filled).length;
  const percent = Math.round((filled / checks.length) * 100);
  return { percent, missing: checks.filter((c) => !c.filled).map((c) => c.label) };
}
