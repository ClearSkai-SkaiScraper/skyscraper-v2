// lib/storage/uploadVideoToFirebase.ts

import { getDownloadURL, ref, uploadBytes } from "firebase/storage";

import { storage } from "./firebaseClient";

export async function uploadVideoToFirebase(
  videoBuffer: Buffer,
  orgId: string,
  claimId: string,
  fileName: string
): Promise<string> {
  try {
    const path = `video-reports/${orgId}/${claimId}/${Date.now()}-${fileName}.mp4`;
    const storageRef = ref(storage, path);

    await uploadBytes(storageRef, videoBuffer, {
      contentType: "video/mp4",
    });

    const url = await getDownloadURL(storageRef);
    return url;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    console.error("[FIREBASE_VIDEO] Upload error", { error: err.message });
    throw new Error("Failed to upload video to Firebase");
  }
}
