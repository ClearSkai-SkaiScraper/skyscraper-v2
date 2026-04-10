import { logger } from "@/lib/logger";

/**
 * Phase 3.6 - Claim Memory Retrieval Service
 *
 * DEPRECATED: claimsMemoryChunk model doesn't exist in schema.
 */

export type MemoryChunk = {
  id: string;
  title: string;
  sourceType: string;
  sourceId: string | null;
  content: string;
  similarity: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata: any;
};

/**
 * Retrieve relevant claim memory chunks using semantic search
 */
export async function getRelevantClaimChunks(params: {
  orgId: string;
  claimId: string;
  query: string;
  limit?: number;
  minSimilarity?: number;
}): Promise<MemoryChunk[]> {
  // claimsMemoryChunk model doesn't exist in schema
  logger.debug(`[claimMemory] Would search for chunks in claim ${params.claimId}`);
  return [];
}

/**
 * Format memory chunks as a human-readable string for injection into AI Assistant context
 */
export function formatMemoryChunks(chunks: MemoryChunk[]): string {
  if (chunks.length === 0) {
    return "No relevant memory found for this query.";
  }

  const sections = chunks.map((chunk, index) => {
    const similarityPercent = Math.round(chunk.similarity * 100);
    return `
[Memory ${index + 1}/${chunks.length}]
Source: ${chunk.sourceType}
Title: ${chunk.title}
Relevance: ${similarityPercent}%

${chunk.content.trim()}
---`;
  });

  return `
Retrieved Claim Memory (${chunks.length} relevant chunks found):

${sections.join("\n")}

Instructions: Use the above retrieved memory to answer the user's question. 
Quote specific phrases or facts from the memory when possible. 
If the memory doesn't contain the answer, say so clearly.
`.trim();
}

/**
 * Search claim memory and return formatted results (convenience function)
 */
export async function searchClaimMemory(params: {
  orgId: string;
  claimId: string;
  query: string;
  limit?: number;
}): Promise<string> {
  const chunks = await getRelevantClaimChunks(params);
  return formatMemoryChunks(chunks);
}
