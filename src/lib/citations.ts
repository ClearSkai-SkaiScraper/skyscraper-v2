/**
 * Citation Management for AI Assistant
 * Captures and formats source citations for PDF reports
 */

export type Citation = {
  id: string;
  label: string;
  text?: string;
  source?: string;
  url?: string;
  retrievedAt?: string;
};

/**
 * Generate stable ID from citation data
 */
export function makeCitationId(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash = hash & hash; // Convert to 32-bit integer
  }
  return String(hash);
}

/**
 * Normalize citation data with stable ID
 */
export function normalizeCitation(c: Partial<Citation> & { label: string }): Citation {
  const base = JSON.stringify({
    label: c.label,
    source: c.source,
    url: c.url,
    text: c.text,
  });

  return {
    id: c.id || makeCitationId(base),
    label: c.label,
    text: c.text,
    source: c.source,
    url: c.url,
    retrievedAt: c.retrievedAt || new Date().toISOString(),
  };
}

/**
 * Format citation as numbered footnote
 */
export function formatFootnote(c: Citation, idx: number): string {
  const parts: string[] = [`${idx}. ${c.label}`];

  if (c.source) {
    parts.push(` — ${c.source}`);
  }

  if (c.url) {
    parts.push(`\n${c.url}`);
  }

  if (c.retrievedAt) {
    const date = new Date(c.retrievedAt).toLocaleDateString();
    parts.push(` (retrieved ${date})`);
  }

  return parts.join("");
}

/**
 * Extract citation from tool result
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function extractCitationFromTool(toolName: string, result: any): Citation | null {
  if (!result) return null;

  switch (toolName) {
    case "getStorm": {
      const { nearestHail, wind, address } = result;
      return normalizeCitation({
        label: `Storm data for ${address || "property"}`,
        source: result.source || "Weather Provider",
        text: nearestHail
          ? `Nearest hail: ${nearestHail.sizeInches}" at ${nearestHail.distanceMiles} mi on ${nearestHail.date}; Wind: ${wind?.mph || 0} mph`
          : undefined,
        url: result.url,
        retrievedAt: result.retrievedAt,
      });
    }

    case "getCodeClause": {
      const { clause, title, text, city, state } = result;
      return normalizeCitation({
        label: `${clause || "Code clause"} — ${city || ""}${city ? ", " : ""}${state || ""}`.trim(),
        source: result.jurisdiction || clause,
        text: text ? `${title}: ${text}` : title,
        url: result.url,
        retrievedAt: result.retrievedAt,
      });
    }

    case "getJEAsset": {
      const { snapshotId, layers, propertyId } = result;
      return normalizeCitation({
        label: `Aerial Snapshot ${snapshotId || ""}`.trim(),
        source: `Third-party aerial layers: ${(layers || []).join(", ")}`,
        text: propertyId ? `Property ID: ${propertyId}` : undefined,
        url: result.url,
        retrievedAt: result.retrievedAt,
      });
    }

    default:
      return null;
  }
}
