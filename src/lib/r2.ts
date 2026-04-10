/**
 * Cloudflare R2 Storage Client
 * S3-compatible client for template assets
 */

import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { logger } from "@/lib/logger";

// Environment variables validation
// eslint-disable-next-line no-restricted-syntax
const R2_ENDPOINT = process.env.R2_ENDPOINT;
// eslint-disable-next-line no-restricted-syntax
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
// eslint-disable-next-line no-restricted-syntax
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
// eslint-disable-next-line no-restricted-syntax
const R2_BUCKET = process.env.R2_BUCKET || "skaiscraper-assets";

if (!R2_ENDPOINT || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
  logger.warn("[R2] ⚠️  R2 credentials not configured. Template assets will use fallback URLs.");
}

/**
 * R2 Client (S3-compatible)
 */
export const r2Client = new S3Client({
  region: "auto",
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID || "",
    secretAccessKey: R2_SECRET_ACCESS_KEY || "",
  },
});

/**
 * Check if R2 is configured
 */
export function isR2Configured(): boolean {
  return !!(R2_ENDPOINT && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY);
}

/**
 * Get object from R2
 * Returns readable stream
 */
export async function getR2Object(key: string): Promise<ReadableStream | null> {
  if (!isR2Configured()) {
    logger.warn(`[R2] Cannot fetch ${key} - R2 not configured`);
    return null;
  }

  try {
    const command = new GetObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
    });

    const response = await r2Client.send(command);

    if (!response.Body) {
      return null;
    }

    // Convert Node.js stream to Web ReadableStream
    return response.Body.transformToWebStream();
  } catch (error) {
    logger.error(`[R2] Error fetching ${key}:`, error);
    return null;
  }
}

/**
 * Get signed URL for R2 object (expires in 1 hour)
 * Use for client-side access or temporary sharing
 */
export async function getR2SignedUrl(
  key: string,
  expiresIn: number = 3600
): Promise<string | null> {
  if (!isR2Configured()) {
    return null;
  }

  try {
    const command = new GetObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
    });

    const url = await getSignedUrl(r2Client, command, { expiresIn });
    return url;
  } catch (error) {
    logger.error(`[R2] Error generating signed URL for ${key}:`, error);
    return null;
  }
}

/**
 * Upload object to R2
 */
export async function putR2Object(
  key: string,
  body: Buffer | Uint8Array | string,
  contentType?: string
): Promise<boolean> {
  if (!isR2Configured()) {
    logger.warn(`[R2] Cannot upload ${key} - R2 not configured`);
    return false;
  }

  try {
    const command = new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    });

    await r2Client.send(command);
    return true;
  } catch (error) {
    logger.error(`[R2] Error uploading ${key}:`, error);
    return false;
  }
}

/**
 * Get content type from file extension
 */
export function getContentType(key: string): string {
  const ext = key.split(".").pop()?.toLowerCase();

  const mimeTypes: Record<string, string> = {
    pdf: "application/pdf",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    svg: "image/svg+xml",
    webp: "image/webp",
    json: "application/json",
  };

  return mimeTypes[ext || ""] || "application/octet-stream";
}
