// src/lib/storage/firebaseUpload.ts

import { getApp,getApps } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";

import { firebaseAdmin } from "../firebaseAdmin";

function ensureFirebaseInit() {
  // Use centralized admin initialization
  if (!getApps().length) {
    throw new Error("Firebase Admin not initialized. Check firebaseAdmin.ts configuration.");
  }
  return getApp();
}

export async function uploadPDFToFirebase(
  pdfBuffer: Buffer,
  meta: { lat: number; lon: number; date: string }
) {
  ensureFirebaseInit(); // Ensure Firebase Admin is initialized

  const bucket = getStorage(firebaseAdmin).bucket();
  const filePath = `weather-reports/${meta.date}_${meta.lat}_${meta.lon}.pdf`;
  const file = bucket.file(filePath);

  await file.save(pdfBuffer, {
    contentType: "application/pdf",
    metadata: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      customMetadata: meta as any,
    },
  });

  const [url] = await file.getSignedUrl({
    action: "read",
    expires: "03-09-2099",
  });

  return url;
}
