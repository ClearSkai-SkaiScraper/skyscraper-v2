// lib/storage/firebaseClient.ts
import { getApp,getApps, initializeApp } from "firebase/app";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  // eslint-disable-next-line no-restricted-syntax
  apiKey: process.env.FIREBASE_API_KEY!,
  // eslint-disable-next-line no-restricted-syntax
  authDomain: process.env.FIREBASE_AUTH_DOMAIN!,
  // eslint-disable-next-line no-restricted-syntax
  projectId: process.env.FIREBASE_PROJECT_ID!,
  // eslint-disable-next-line no-restricted-syntax
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET!,
  // eslint-disable-next-line no-restricted-syntax
  messagingSenderId: process.env.FIREBASE_SENDER_ID!,
  // eslint-disable-next-line no-restricted-syntax
  appId: process.env.FIREBASE_APP_ID!,
};

// Singleton pattern: only initialize if not already initialized
function initializeFirebaseApp() {
  if (getApps().length > 0) {
    return getApp();
  }
  return initializeApp(firebaseConfig);
}

const app = initializeFirebaseApp();
export const storage = getStorage(app);
