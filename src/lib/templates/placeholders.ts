export const PLACEHOLDER_GROUPS = [
  "org",
  "employee",
  "client",
  "property",
  "claim",
  "job",
  "weather",
  "photos",
  "findings",
  "scopeItems",
  "notes",
] as const;

export type PlaceholderGroup = (typeof PLACEHOLDER_GROUPS)[number];

/**
 * Canonical placeholder dictionary for all premium templates.
 *
 * Notes:
 * - Arrays are represented as single-element arrays to define item shape.
 * - The values are intentionally `true` so we can deterministically enumerate paths.
 */
export const PLACEHOLDERS = {
  org: {
    name: true,
    logoUrl: true,
    phone: true,
    email: true,
    website: true,
    addressLine1: true,
    city: true,
    state: true,
    zip: true,
  },
  employee: {
    fullName: true,
    title: true,
    headshotUrl: true,
    phone: true,
    email: true,
    licenseNumber: true,
  },
  client: {
    fullName: true,
    phone: true,
    email: true,
  },
  property: {
    addressLine1: true,
    city: true,
    state: true,
    zip: true,
    yearBuilt: true,
    roofType: true,
    roofAge: true,
    squareFeet: true,
  },
  claim: {
    claimNumber: true,
    lossDate: true,
    causeOfLoss: true,
    carrierName: true,
    policyNumber: true,
  },
  job: {
    jobNumber: true,
    jobType: true,
    scopeSummary: true,
    startDate: true,
    endDate: true,
  },
  weather: {
    stormDate: true,
    hailSize: true,
    windGust: true,
    dataSource: true,
    reportId: true,
  },
  photos: [
    {
      url: true,
      caption: true,
      takenAt: true,
      category: true,
    },
  ],
  findings: [
    {
      component: true,
      condition: true,
      damageType: true,
      severity: true,
      action: true,
      notes: true,
    },
  ],
  scopeItems: [
    {
      item: true,
      quantity: true,
      unit: true,
      notes: true,
    },
  ],
  notes: {
    executiveSummary: true,
    recommendations: true,
    nextSteps: true,
    disclaimers: true,
  },
} as const;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function walkPaths(value: unknown, prefix: string): string[] {
  if (Array.isArray(value)) {
    if (value.length === 0) return [prefix + "[]"];
    const item = value[0];
    const itemPrefix = prefix ? `${prefix}[]` : "[]";
    return walkPaths(item, itemPrefix);
  }

  if (isPlainObject(value)) {
    const keys = Object.keys(value);
    if (keys.length === 0) return prefix ? [prefix] : [];

    return keys.flatMap((k) => {
      const nextPrefix = prefix ? `${prefix}.${k}` : k;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return walkPaths((value as any)[k], nextPrefix);
    });
  }

  return prefix ? [prefix] : [];
}

export function listAllPlaceholderPaths(): string[] {
  const paths = walkPaths(PLACEHOLDERS, "");
  return Array.from(new Set(paths)).sort();
}

export function listPlaceholderPathsByGroup(): Record<PlaceholderGroup, string[]> {
  const out = {} as Record<PlaceholderGroup, string[]>;
  for (const group of PLACEHOLDER_GROUPS) {
    out[group] = walkPaths(PLACEHOLDERS[group], group).sort();
  }
  return out;
}

export function getTemplateRequiredPlaceholders(
  slug: string,
  options?: { category?: string | null | undefined }
): string[] {
  const s = (slug || "").toLowerCase();

  // Group sets (deterministic, no LLM):
  // - Base identity info is always required.
  const base: PlaceholderGroup[] = ["org", "employee", "client", "property"];

  // Claim vs retail-like templates
  const claimHeavy =
    s.includes("claim") ||
    s.includes("damage") ||
    s.includes("inspection") ||
    s.includes("weather") ||
    s.includes("rebuttal") ||
    s.includes("depreciation") ||
    s.includes("bad-faith") ||
    s.includes("appraisal") ||
    s.includes("umpire") ||
    s.includes("expert") ||
    s.includes("litigation");

  const retailHeavy =
    s.includes("estimate") ||
    s.includes("quote") ||
    s.includes("proposal") ||
    s.includes("authorization") ||
    s.includes("warranty") ||
    s.includes("maintenance");

  const groups: PlaceholderGroup[] = [...base];

  if (retailHeavy && !claimHeavy) {
    groups.push("job", "scopeItems", "notes", "photos");
  } else {
    // Default to claim-style
    groups.push("claim", "weather", "findings", "photos", "scopeItems", "notes");
  }

  // Category hinting
  const category = (options?.category || "").toLowerCase();
  if (category.includes("legal")) {
    // legal templates tend to be claim + notes heavy, photos optional
    // keep photos but it can be empty list at runtime.
  }

  const byGroup = listPlaceholderPathsByGroup();
  const required = groups.flatMap((g) => byGroup[g]);
  return Array.from(new Set(required)).sort();
}
