import {
  deleteObject,
  getDownloadURL,
  listAll,
  ref,
  uploadBytes,
  uploadBytesResumable,
} from "firebase/storage";

import { logger } from "@/lib/logger";

import { storage } from "../firebase";

export type UploadProgress = {
  bytesTransferred: number;
  totalBytes: number;
  percentage: number;
};

export type FileUploadOptions = {
  onProgress?: (progress: UploadProgress) => void;
  metadata?: Record<string, string>;
};

/**
 * Upload a file to Firebase Storage
 */
export async function uploadFile(
  file: File,
  path: string,
  options: FileUploadOptions = {}
): Promise<string> {
  const { onProgress, metadata = {} } = options;

  // Create storage reference
  const storageRef = ref(storage, path);

  // Add default metadata
  const fileMetadata = {
    contentType: file.type,
    customMetadata: {
      originalName: file.name,
      uploadedAt: new Date().toISOString(),
      ...metadata,
    },
  };

  if (onProgress) {
    // Use resumable upload for progress tracking
    const uploadTask = uploadBytesResumable(storageRef, file, fileMetadata);

    return new Promise((resolve, reject) => {
      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const progress = {
            bytesTransferred: snapshot.bytesTransferred,
            totalBytes: snapshot.totalBytes,
            percentage: (snapshot.bytesTransferred / snapshot.totalBytes) * 100,
          };
          onProgress(progress);
        },
        (error) => reject(error),
        async () => {
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            resolve(downloadURL);
          } catch (error) {
            reject(error);
          }
        }
      );
    });
  } else {
    // Simple upload without progress
    const snapshot = await uploadBytes(storageRef, file, fileMetadata);
    return getDownloadURL(snapshot.ref);
  }
}

/**
 * Upload multiple files
 */
export async function uploadFiles(
  files: File[],
  getPath: (file: File, index: number) => string,
  options: FileUploadOptions = {}
): Promise<string[]> {
  const uploads = files.map((file, index) => uploadFile(file, getPath(file, index), options));

  return Promise.all(uploads);
}

/**
 * Delete a file from Firebase Storage
 */
export async function deleteFile(path: string): Promise<void> {
  const storageRef = ref(storage, path);
  await deleteObject(storageRef);
}

/**
 * Delete multiple files
 */
export async function deleteFiles(paths: string[]): Promise<void> {
  const deletions = paths.map((path) => deleteFile(path));
  await Promise.all(deletions);
}

/**
 * List all files in a directory
 */
export async function listFiles(directoryPath: string): Promise<string[]> {
  const storageRef = ref(storage, directoryPath);
  const result = await listAll(storageRef);

  const urls = await Promise.all(result.items.map((itemRef) => getDownloadURL(itemRef)));

  return urls;
}

/**
 * Generate standardized paths for different file types
 */
export const generatePaths = {
  orgDocument: (orgId: string, filename: string) =>
    `organizations/${orgId}/documents/${Date.now()}-${filename}`,

  userUpload: (userId: string, filename: string) =>
    `users/${userId}/uploads/${Date.now()}-${filename}`,

  mockup: (orgId: string, projectId: string, filename: string) =>
    `organizations/${orgId}/mockups/${projectId}/${Date.now()}-${filename}`,

  report: (orgId: string, reportId: string, filename: string) =>
    `organizations/${orgId}/reports/${reportId}/${Date.now()}-${filename}`,

  temp: (sessionId: string, filename: string) => `temp/${sessionId}/${Date.now()}-${filename}`,

  branding: (orgId: string, type: "logo" | "banner" | "watermark", filename: string) =>
    `organizations/${orgId}/branding/${type}/${Date.now()}-${filename}`,
};

/**
 * Clean up temporary files older than specified hours
 */
export async function cleanupTempFiles(olderThanHours: number = 24): Promise<number> {
  try {
    const tempRef = ref(storage, "temp");
    const result = await listAll(tempRef);

    const cutoffTime = Date.now() - olderThanHours * 60 * 60 * 1000;
    let deletedCount = 0;

    for (const itemRef of result.items) {
      try {
        // Extract timestamp from filename
        const pathParts = itemRef.fullPath.split("/");
        const filename = pathParts[pathParts.length - 1];
        const timestampMatch = filename.match(/^(\d+)-/);

        if (timestampMatch) {
          const fileTimestamp = parseInt(timestampMatch[1]);
          if (fileTimestamp < cutoffTime) {
            await deleteObject(itemRef);
            deletedCount++;
          }
        }
      } catch (error) {
        logger.warn(`Failed to delete temp file ${itemRef.fullPath}:`, error);
      }
    }

    return deletedCount;
  } catch (error) {
    logger.error("Error cleaning up temp files:", error);
    return 0;
  }
}

/**
 * Upload a buffer (e.g. PDF) to Firebase Storage
 * Used for weather PDFs and other programmatically generated files
 */
export async function uploadToFirebase(
  buffer: Buffer,
  path: string,
  contentType: string
): Promise<string> {
  const storageRef = ref(storage, path);

  const metadata = {
    contentType,
    customMetadata: {
      uploadedAt: new Date().toISOString(),
      source: "weather_verification",
    },
  };

  await uploadBytes(storageRef, buffer, metadata);
  const downloadURL = await getDownloadURL(storageRef);

  return downloadURL;
}
