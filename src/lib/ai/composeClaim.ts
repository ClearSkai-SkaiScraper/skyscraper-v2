/**
 * LangChain-style AI Pipeline for Claims Composition
 * Synthesizes JE layers + photos + notes + weather into claims-ready summaries
 */

import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";

export type ComposeModeType = "inspection" | "insurance" | "retail";

export interface ComposeClaimInput {
  notes: string;
  photosMeta?: Array<{ url: string; caption?: string; damageTypes?: string[] }>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  weather?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  jeSnapshot?: any;
  mode: ComposeModeType;
}

/**
 * Compose a comprehensive claim summary using AI
 */
export async function composeClaim(input: ComposeClaimInput): Promise<string> {
  const { notes, photosMeta = [], weather, jeSnapshot, mode } = input;

  // Build context payload
  const context = {
    mode,
    notes,
    photoCount: photosMeta.length,
    damageTypes: Array.from(new Set(photosMeta.flatMap((p) => p.damageTypes || []))),
    weather: weather
      ? {
          hasHail: !!weather.nearestHail,
          hailSize: weather.nearestHail?.sizeInches,
          windSpeed: weather.wind?.mph,
          date: weather.nearestHail?.date || weather.wind?.date,
        }
      : null,
    jeSnapshot: jeSnapshot
      ? {
          layers: jeSnapshot.layers || [],
          snapshotId: jeSnapshot.snapshotId,
        }
      : null,
  };

  // System prompt based on mode
  const systemPrompts: Record<ComposeModeType, string> = {
    inspection:
      "You are a professional roof inspector writing a concise inspection report. Focus on observations, damage assessment, and code compliance. Use bullet points for findings.",
    insurance:
      "You are a claims adjuster preparing an insurance claim report. Document damage with precise measurements, cite weather correlation, and recommend scope. Be thorough but concise.",
    retail:
      "You are a sales consultant presenting a retail proposal. Highlight value, quality materials, and customer benefits. Be persuasive but professional.",
  };

  const prompt = `${systemPrompts[mode]}

Context:
${JSON.stringify(context, null, 2)}

Inspector Notes:
${notes || "No notes provided"}

Write a structured report with these sections:
1. Summary (2-3 sentences)
2. Key Observations (bullet points)
3. ${
    mode === "insurance"
      ? "Weather Correlation"
      : mode === "retail"
        ? "Recommended System"
        : "Damage Assessment"
  }
4. ${mode === "insurance" ? "Recommended Scope" : "Next Steps"}

Keep it professional, specific, and actionable.`;

  try {
    const { data, error } = await supabase.functions.invoke("ai-summarize", {
      body: {
        notes: prompt,
        jeSnapshot,
        mode,
      },
    });

    if (error) throw error;
    return data?.summary || "";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (e: any) {
    logger.error("composeClaim error:", e);
    throw new Error(e.message || "Failed to compose claim");
  }
}

/**
 * Map-reduce for large photo sets
 * Processes photos in chunks to avoid token limits
 */
export async function composeClaimMapReduce(
  input: ComposeClaimInput,
  chunkSize = 10
): Promise<string> {
  const { photosMeta = [] } = input;

  if (photosMeta.length <= chunkSize) {
    // Single pass for small sets
    return composeClaim(input);
  }

  // Map phase: Process each chunk
  const chunks: string[] = [];
  for (let i = 0; i < photosMeta.length; i += chunkSize) {
    const chunk = photosMeta.slice(i, i + chunkSize);
    const chunkSummary = await composeClaim({
      ...input,
      photosMeta: chunk,
      notes: `${input.notes}\n\nProcessing photos ${i + 1}-${Math.min(
        i + chunkSize,
        photosMeta.length
      )} of ${photosMeta.length}`,
    });
    chunks.push(chunkSummary);
  }

  // Reduce phase: Synthesize all chunks
  const finalSummary = await composeClaim({
    ...input,
    photosMeta: [], // Don't reprocess photos
    notes: `Synthesize these ${
      chunks.length
    } section summaries into a cohesive final report:\n\n${chunks
      .map((c, i) => `Section ${i + 1}:\n${c}`)
      .join("\n\n---\n\n")}`,
  });

  return finalSummary;
}
