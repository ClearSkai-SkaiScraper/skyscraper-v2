/**
 * Token Encryption Service
 *
 * Provides AES-256-GCM encryption for sensitive tokens at rest.
 * Used for QuickBooks OAuth tokens and other integration credentials.
 *
 * Environment variable required:
 * - TOKEN_ENCRYPTION_KEY: 32-byte hex string (64 characters)
 *
 * Generate a key: openssl rand -hex 32
 */

import * as crypto from "crypto";

import { logger } from "@/lib/logger";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // GCM standard
const AUTH_TAG_LENGTH = 16;

/**
 * Get encryption key from environment.
 * Falls back to a development-only key if not set (NEVER use in production).
 */
function getEncryptionKey(): Buffer {
  const keyHex = process.env.TOKEN_ENCRYPTION_KEY;

  if (!keyHex) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("TOKEN_ENCRYPTION_KEY environment variable is required in production");
    }
    // Development fallback - DO NOT USE IN PRODUCTION
    logger.warn(
      "[CRYPTO] Using development encryption key - set TOKEN_ENCRYPTION_KEY in production!"
    );
    return Buffer.from("0".repeat(64), "hex");
  }

  if (keyHex.length !== 64) {
    throw new Error("TOKEN_ENCRYPTION_KEY must be a 32-byte hex string (64 characters)");
  }

  return Buffer.from(keyHex, "hex");
}

/**
 * Encrypt a plaintext string.
 * Returns base64-encoded ciphertext with IV and auth tag prepended.
 *
 * Format: base64(IV + authTag + ciphertext)
 */
export function encryptToken(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);

  const authTag = cipher.getAuthTag();

  // Combine: IV + authTag + ciphertext
  const combined = Buffer.concat([iv, authTag, encrypted]);

  return combined.toString("base64");
}

/**
 * Decrypt a base64-encoded ciphertext.
 * Expects format from encryptToken: base64(IV + authTag + ciphertext)
 */
export function decryptToken(ciphertext: string): string {
  const key = getEncryptionKey();
  const combined = Buffer.from(ciphertext, "base64");

  // Extract components
  const iv = combined.subarray(0, IV_LENGTH);
  const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const encrypted = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);

  return decrypted.toString("utf8");
}

/**
 * Check if a string looks like an encrypted token (base64 with minimum length).
 * Used to detect if migration from plaintext is needed.
 */
export function isEncrypted(value: string): boolean {
  // Encrypted tokens have: IV (12) + authTag (16) + at least 1 byte ciphertext
  // Base64 encoded, minimum ~40 chars
  if (value.length < 40) return false;

  // Check if it's valid base64
  try {
    const decoded = Buffer.from(value, "base64");
    // Minimum size check
    return decoded.length >= IV_LENGTH + AUTH_TAG_LENGTH + 1;
  } catch {
    return false;
  }
}

/**
 * Encrypt token only if not already encrypted.
 * Safe to call multiple times.
 */
export function ensureEncrypted(value: string): string {
  if (isEncrypted(value)) {
    // Verify it's actually our encryption by trying to decrypt
    try {
      decryptToken(value);
      return value; // Already encrypted
    } catch {
      // Not our encryption, encrypt it
    }
  }
  return encryptToken(value);
}

/**
 * Decrypt token, handling both encrypted and plaintext values.
 * Useful during migration from plaintext to encrypted storage.
 */
export function safeDecrypt(value: string): string {
  if (!isEncrypted(value)) {
    return value; // Plaintext
  }

  try {
    return decryptToken(value);
  } catch {
    // Decryption failed, assume plaintext
    return value;
  }
}
