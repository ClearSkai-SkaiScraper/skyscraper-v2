/**
 * Signed URL Generator
 * Generate temporary signed URLs for secure artifact access
 */

import crypto from "crypto";

// eslint-disable-next-line no-restricted-syntax
const SIGNING_SECRET = process.env.ARTIFACT_SIGNING_SECRET || "change-in-production";
const URL_EXPIRY_HOURS = 1;

export type SignedUrlParams = {
  artifactId: string;
  userId?: string;
  expiresAt?: Date;
};

/**
 * Generate signed URL for artifact access
 */
export function generateSignedUrl(params: SignedUrlParams): string {
  const expiresAt = params.expiresAt || new Date(Date.now() + URL_EXPIRY_HOURS * 60 * 60 * 1000);
  const expiryTimestamp = Math.floor(expiresAt.getTime() / 1000);

  // Create payload
  const payload = {
    artifactId: params.artifactId,
    userId: params.userId,
    exp: expiryTimestamp,
  };

  // Generate signature
  const signature = crypto
    .createHmac("sha256", SIGNING_SECRET)
    .update(JSON.stringify(payload))
    .digest("hex");

  // Build URL
  // eslint-disable-next-line no-restricted-syntax
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://skaiscrape.com";
  const queryParams = new URLSearchParams({
    id: params.artifactId,
    exp: expiryTimestamp.toString(),
    sig: signature,
  });

  if (params.userId) {
    queryParams.set("uid", params.userId);
  }

  return `${baseUrl}/api/artifacts/download?${queryParams.toString()}`;
}

/**
 * Verify signed URL signature
 */
export function verifySignedUrl(params: URLSearchParams): {
  valid: boolean;
  artifactId?: string;
  userId?: string;
  error?: string;
} {
  const artifactId = params.get("id");
  const expiry = params.get("exp");
  const signature = params.get("sig");
  const userId = params.get("uid");

  if (!artifactId || !expiry || !signature) {
    return { valid: false, error: "Missing required parameters" };
  }

  // Check expiry
  const now = Math.floor(Date.now() / 1000);
  const expiryTimestamp = parseInt(expiry, 10);

  if (expiryTimestamp < now) {
    return { valid: false, error: "URL expired" };
  }

  // Verify signature
  const payload = {
    artifactId,
    userId: userId || undefined,
    exp: expiryTimestamp,
  };

  const expectedSignature = crypto
    .createHmac("sha256", SIGNING_SECRET)
    .update(JSON.stringify(payload))
    .digest("hex");

  if (signature !== expectedSignature) {
    return { valid: false, error: "Invalid signature" };
  }

  return { valid: true, artifactId, userId: userId || undefined };
}
