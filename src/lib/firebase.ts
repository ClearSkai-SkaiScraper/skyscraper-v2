// Firebase client configuration for frontend
import { getAnalytics, isSupported } from "firebase/analytics";
import { getApps, initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";
import { connectFunctionsEmulator, getFunctions } from "firebase/functions";
import { connectStorageEmulator, getStorage } from "firebase/storage";

import { logger } from "@/lib/logger";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyD37KEfb73z8QvA5c7Mcpl4w0h41vIgamI",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "skaiscraper.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "skaiscraper",
  storageBucket:
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "skaiscraper.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "716295034049",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:716295034049:web:c86340ba861f0dfd15b040",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-04NZENPRF6",
};

// Initialize Firebase - guard against build-time initialization with invalid credentials
let app: ReturnType<typeof initializeApp> | null = null;

try {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
} catch (error) {
  logger.warn("Firebase initialization failed (likely during build):", error);
  // Will be null, lazy initialization will be attempted when services are accessed
}

// Lazy getters for Firebase services - only initialize when accessed
let _storage: ReturnType<typeof getStorage> | null = null;
let _auth: ReturnType<typeof getAuth> | null = null;
let _db: ReturnType<typeof getFirestore> | null = null;
let _functions: ReturnType<typeof getFunctions> | null = null;

export const getFirebaseStorage = () => {
  if (!_storage && app) {
    _storage = getStorage(app);
  }
  return _storage;
};

export const getFirebaseAuth = () => {
  if (!_auth && app) {
    _auth = getAuth(app);
  }
  return _auth;
};

export const getFirebaseDb = () => {
  if (!_db && app) {
    _db = getFirestore(app);
  }
  return _db;
};

export const getFirebaseFunctions = () => {
  if (!_functions && app) {
    _functions = getFunctions(app);
  }
  return _functions;
};

// Legacy exports for backward compatibility (will lazy initialize)
export const storage = new Proxy({} as ReturnType<typeof getStorage>, {
  get(target, prop) {
    const s = getFirebaseStorage();
    if (!s) throw new Error("Firebase storage not initialized");
    return s[prop as keyof typeof s];
  },
});

export const auth = new Proxy({} as ReturnType<typeof getAuth>, {
  get(target, prop) {
    const a = getFirebaseAuth();
    if (!a) throw new Error("Firebase auth not initialized");
    return a[prop as keyof typeof a];
  },
});

export const db = new Proxy({} as ReturnType<typeof getFirestore>, {
  get(target, prop) {
    const d = getFirebaseDb();
    if (!d) throw new Error("Firebase firestore not initialized");
    return d[prop as keyof typeof d];
  },
});

export const functions = new Proxy({} as ReturnType<typeof getFunctions>, {
  get(target, prop) {
    const f = getFirebaseFunctions();
    if (!f) throw new Error("Firebase functions not initialized");
    return f[prop as keyof typeof f];
  },
});

// Initialize Analytics (only in browser, not SSR)
export const analytics =
  typeof window !== "undefined"
    ? (async () => ((await isSupported()) ? getAnalytics(app!) : null))()
    : null;

// Connect to emulators in development (optional)
if (
  process.env.NODE_ENV === "development" &&
  process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === "true" &&
  app
) {
  try {
    const s = getFirebaseStorage();
    const a = getFirebaseAuth();
    const d = getFirebaseDb();
    const f = getFirebaseFunctions();
    if (s) connectStorageEmulator(s, "localhost", 9199);
    if (a) connectAuthEmulator(a, "http://localhost:9099");
    if (d) connectFirestoreEmulator(d, "localhost", 8080);
    if (f) connectFunctionsEmulator(f, "localhost", 5001);
  } catch (error) {
    logger.debug("Firebase emulators already connected or not available");
  }
}

export default app;
