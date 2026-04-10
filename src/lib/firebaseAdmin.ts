import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";

import { logger } from "@/lib/logger";

// Check if storage is enabled and all required env vars are present
// eslint-disable-next-line no-restricted-syntax
const isStorageEnabled = process.env.STORAGE_ENABLED === "true";
const hasRequiredEnvs = Boolean(
  // eslint-disable-next-line no-restricted-syntax
  process.env.FIREBASE_PROJECT_ID &&
  // eslint-disable-next-line no-restricted-syntax
  process.env.FIREBASE_CLIENT_EMAIL &&
  // eslint-disable-next-line no-restricted-syntax
  process.env.FIREBASE_PRIVATE_KEY &&
  // eslint-disable-next-line no-restricted-syntax
  process.env.FIREBASE_STORAGE_BUCKET
);

// Initialize Firebase Admin only if storage is enabled and configured
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let firebaseAdmin: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let storage: any = null;

if (isStorageEnabled && hasRequiredEnvs) {
  try {
    // eslint-disable-next-line no-restricted-syntax
    const projectId = process.env.FIREBASE_PROJECT_ID!;
    // eslint-disable-next-line no-restricted-syntax
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL!;
    // eslint-disable-next-line no-restricted-syntax
    const privateKey = process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, "\n");
    // eslint-disable-next-line no-restricted-syntax
    const bucketName = process.env.FIREBASE_STORAGE_BUCKET!;

    firebaseAdmin =
      getApps().length === 0
        ? initializeApp({
            credential: cert({ projectId, clientEmail, privateKey }),
            storageBucket: bucketName,
          })
        : getApps()[0];

    storage = getStorage(firebaseAdmin).bucket(bucketName);
  } catch (error) {
    logger.warn("[FIREBASE_ADMIN] Initialization failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    // Continue with null storage - degraded mode
  }
} else {
  // Storage disabled or missing env vars - create no-op stubs
  logger.info("Firebase Storage disabled or not configured - running in degraded mode");
}

// Export stubs that won't crash the app if storage is disabled
export { firebaseAdmin, storage };
