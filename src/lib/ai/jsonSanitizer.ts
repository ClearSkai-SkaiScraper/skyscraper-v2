// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function sanitizeJsonResponse(raw: string): { ok: boolean; data?: any; error?: string; raw: string } {
  let cleaned = raw.trim();
  try {
    cleaned = cleaned.replace(/^```json\s*/i, "");
    cleaned = cleaned.replace(/^```\s*/i, "");
    cleaned = cleaned.replace(/```$/i, "");
    cleaned = cleaned.replace(/```/g, "");
    // Remove leading 'json' prefix if present (e.g., json{"a":1})
    cleaned = cleaned.replace(/^json\s*/i, "");
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1) {
      cleaned = cleaned.slice(firstBrace, lastBrace + 1);
    }
    const parsed = JSON.parse(cleaned);
    return { ok: true, data: parsed, raw: cleaned };
  // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
  } catch (_e: any) {
    return { ok: false, error: 'invalid_json', raw: cleaned };
  }
}