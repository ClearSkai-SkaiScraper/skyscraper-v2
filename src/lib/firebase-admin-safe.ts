/**
 * Firebase Admin SDK - Netlify Safe Configuration
 * Uses base64-encoded service account to bypass AWS Lambda 4KB env var limit
 */

import { cert, getApps, initializeApp } from "firebase-admin/app";

import { logger } from "@/lib/logger";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let firebaseAdmin: any = null;

export function getFirebaseAdmin() {
  if (firebaseAdmin) return firebaseAdmin;

  const apps = getApps();
  if (apps.length > 0) {
    firebaseAdmin = apps[0];
    return firebaseAdmin;
  }

  try {
    // Option 1: Use base64-encoded service account (recommended for Netlify)
    // eslint-disable-next-line no-restricted-syntax
    const serviceAccountBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;

    if (serviceAccountBase64) {
      const serviceAccount = JSON.parse(
        Buffer.from(serviceAccountBase64, "base64").toString("utf8")
      );

      firebaseAdmin = initializeApp({
        credential: cert(serviceAccount),
        // eslint-disable-next-line no-restricted-syntax
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
      });

      return firebaseAdmin;
    }

    // Option 2: Fallback to individual env vars (Vercel-style)
    // eslint-disable-next-line no-restricted-syntax
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

    // eslint-disable-next-line no-restricted-syntax
    if (!privateKey || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PROJECT_ID) {
      throw new Error("Missing Firebase credentials");
    }

    firebaseAdmin = initializeApp({
      credential: cert({
        // eslint-disable-next-line no-restricted-syntax
        projectId: process.env.FIREBASE_PROJECT_ID,
        // eslint-disable-next-line no-restricted-syntax
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey,
      }),
      // eslint-disable-next-line no-restricted-syntax
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    });

    return firebaseAdmin;
  } catch (error) {
    logger.error("[Firebase Admin] Initialization failed:", error);
    throw error;
  }
}

export default getFirebaseAdmin;
