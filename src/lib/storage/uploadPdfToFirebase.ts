// lib/storage/uploadPdfToFirebase.ts
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";

import { storage } from "./firebaseClient";

export async function uploadPdfToFirebase(
  pdfBuffer: Buffer,
  orgId: string,
  claimId: string,
  fileName: string
) {
  try {
    const path = `reports/${orgId}/${claimId}/${Date.now()}-${fileName}.pdf`;
    const storageRef = ref(storage, path);

    await uploadBytes(storageRef, pdfBuffer, {
      contentType: "application/pdf",
    });

    const url = await getDownloadURL(storageRef);
    return url;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    console.error("[FIREBASE_PDF] Upload error", { error: err.message });
    throw new Error("Failed to upload PDF to Firebase");
  }
}
