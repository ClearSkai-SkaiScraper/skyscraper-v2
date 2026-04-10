/**
 * Portfolio Image Upload Utility for Trades Network
 * Leverages existing Firebase Storage infrastructure
 */

import { auth } from "@/lib/firebase";
import { uploadFileWithProgress } from "@/lib/firebase-storage";

/**
 * Upload a portfolio image for contractor profiles
 * Returns the public download URL
 */
export async function uploadPortfolioImage(
  file: File,
  onProgress?: (progress: number) => void
): Promise<string> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("User must be authenticated to upload portfolio images");
  }

  // Generate organized path for portfolio images
  const timestamp = Date.now();
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
  const path = `portfolios/${user.uid}/${timestamp}_${sanitizedName}`;

  // Upload with progress tracking
  const url = await uploadFileWithProgress(file, path, (progressData) => {
    onProgress?.(progressData.progress);
  });

  return url;
}

/**
 * Upload multiple portfolio images
 */
export async function uploadPortfolioImages(
  files: File[],
  onProgress?: (fileIndex: number, progress: number) => void
): Promise<string[]> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("User must be authenticated to upload portfolio images");
  }

  const uploadPromises = files.map((file, index) => {
    const timestamp = Date.now() + index; // Ensure unique filenames
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const path = `portfolios/${user.uid}/${timestamp}_${sanitizedName}`;

    return uploadFileWithProgress(file, path, (progressData) => {
      onProgress?.(index, progressData.progress);
    });
  });

  return Promise.all(uploadPromises);
}
