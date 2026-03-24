/**
 * Phase 3.6 - Embeddings Service
 *
 * Handles text chunking, embedding generation via OpenAI,
 * and storage of vectorized claim content for semantic search.
 */

import { getOpenAI } from "@/lib/ai/client";
import { logger } from "@/lib/logger";

const openai = getOpenAI();

// Model configuration
const EMBEDDING_MODEL = "text-embedding-3-large";
const EMBEDDING_DIMENSIONS = 3072; // text-embedding-3-large native dimensions

// Chunking configuration
const CHUNK_SIZE = 800; // Target tokens per chunk
const CHUNK_OVERLAP = 200; // Overlap between chunks to preserve context

/**
 * Simple token estimator (rough approximation: 1 token ≈ 4 chars)
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Split text into overlapping chunks of ~CHUNK_SIZE tokens
 */
export function chunkText(text: string, maxTokens = CHUNK_SIZE, overlap = CHUNK_OVERLAP): string[] {
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const chunks: string[] = [];
  let currentChunk = "";
  let currentTokens = 0;

  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i].trim() + ".";
    const sentenceTokens = estimateTokens(sentence);

    if (currentTokens + sentenceTokens > maxTokens && currentChunk.length > 0) {
      // Save current chunk
      chunks.push(currentChunk.trim());

      // Start new chunk with overlap (last few sentences)
      const overlapSentences: string[] = [];
      let overlapTokens = 0;
      let j = i - 1;

      while (j >= 0 && overlapTokens < overlap) {
        const prevSentence = sentences[j].trim() + ".";
        const prevTokens = estimateTokens(prevSentence);
        if (overlapTokens + prevTokens > overlap) break;
        overlapSentences.unshift(prevSentence);
        overlapTokens += prevTokens;
        j--;
      }

      currentChunk = overlapSentences.join(" ") + " " + sentence;
      currentTokens = overlapTokens + sentenceTokens;
    } else {
      currentChunk += (currentChunk.length > 0 ? " " : "") + sentence;
      currentTokens += sentenceTokens;
    }
  }

  // Add remaining chunk
  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim());
  }

  return chunks.length > 0 ? chunks : [text]; // Fallback if no chunks created
}

/**
 * Generate embeddings for multiple text chunks in parallel
 */
export async function embedTextBatch(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  try {
    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: texts,
      dimensions: EMBEDDING_DIMENSIONS,
    });

    return response.data.map((item) => item.embedding);
  } catch (error) {
    logger.error("[embedTextBatch] OpenAI embedding error:", error);
    throw new Error(
      `Failed to generate embeddings: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Convert number[] embedding to Buffer (bytea) for Postgres storage
 */
function embeddingToBuffer(embedding: number[]): Buffer {
  const buffer = Buffer.allocUnsafe(embedding.length * 4); // 4 bytes per float32
  for (let i = 0; i < embedding.length; i++) {
    buffer.writeFloatLE(embedding[i], i * 4);
  }
  return buffer;
}

/**
 * Convert Buffer (bytea) from Postgres to number[] embedding
 */
export function bufferToEmbedding(buffer: Buffer): number[] {
  const embedding: number[] = [];
  for (let i = 0; i < buffer.length; i += 4) {
    embedding.push(buffer.readFloatLE(i));
  }
  return embedding;
}

/**
 * Main function: Chunk text, generate embeddings, and save to database
 * DEPRECATED: claimsMemoryChunk model doesn't exist in schema.
 */
export async function saveClaimEmbeddings(params: {
  orgId: string;
  claimId: string;
  sourceType: "document" | "note" | "letter" | "email" | "estimate" | "photo_caption" | "other";
  sourceId?: string;
  title: string;
  content: string;
  metadata?: Record<string, any>;
}): Promise<{ chunksCreated: number; chunkIds: string[] }> {
  // claimsMemoryChunk model doesn't exist in schema
  logger.debug(
    `[EMBEDDINGS] Stub: Would save embeddings for "${params.title}" in claim ${params.claimId}`
  );
  return { chunksCreated: 0, chunkIds: [] };
}

/**
 * Compute cosine similarity between two embeddings
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error("Embeddings must have the same dimensions");
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
