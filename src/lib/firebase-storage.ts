// Enhanced Firebase Storage utilities with upload, preview, and thumbnail generation
import {
  deleteObject,
  getDownloadURL,
  getMetadata,
  listAll,
  ref,
  uploadBytesResumable,
} from "firebase/storage";
import { toast } from "sonner";

import { storage } from "@/lib/firebase";
import { logger } from "@/lib/logger";

export interface UploadProgress {
  progress: number;
  state: "running" | "paused" | "success" | "error";
  bytesTransferred: number;
  totalBytes: number;
}

export interface FileMetadata {
  name: string;
  size: number;
  type: string;
  url: string;
  path: string;
  uploadedAt: Date;
  uploadedBy?: string;
}

// Generate organized file path
export function generateFilePath(
  file: File,
  organizationId: string,
  category: "uploads" | "reports" | "mockups" | "branding" = "uploads"
): string {
  const timestamp = new Date().toISOString().split("T")[0];
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
  return `organizations/${organizationId}/${category}/${timestamp}_${sanitizedName}`;
}

// Upload file with progress tracking
export async function uploadFileWithProgress(
  file: File,
  path: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<string> {
  return new Promise((resolve, reject) => {
    const storageRef = ref(storage, path);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      "state_changed",
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        onProgress?.({
          progress,
          state: snapshot.state as any,
          bytesTransferred: snapshot.bytesTransferred,
          totalBytes: snapshot.totalBytes,
        });
      },
      (error) => {
        logger.error("Upload failed:", error);
        toast.error(`Upload failed: ${error.message}`);
        reject(error);
      },
      async () => {
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          toast.success("File uploaded successfully!");
          resolve(downloadURL);
        } catch (error) {
          reject(error);
        }
      }
    );
  });
}

// Upload multiple files
export async function uploadMultipleFiles(
  files: FileList | File[],
  organizationId: string,
  category: "uploads" | "reports" | "mockups" | "branding" = "uploads",
  onProgress?: (fileIndex: number, progress: UploadProgress) => void
): Promise<string[]> {
  const fileArray = Array.from(files);
  const uploadPromises = fileArray.map((file, index) => {
    const path = generateFilePath(file, organizationId, category);
    return uploadFileWithProgress(file, path, (progress) => {
      onProgress?.(index, progress);
    });
  });

  return Promise.all(uploadPromises);
}

// Generate thumbnail for images
export async function generateThumbnail(file: File, maxSize: number = 200): Promise<File> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    img.onload = () => {
      // Calculate thumbnail dimensions
      const { width, height } = img;
      const aspectRatio = width / height;

      let thumbnailWidth = maxSize;
      let thumbnailHeight = maxSize;

      if (aspectRatio > 1) {
        thumbnailHeight = maxSize / aspectRatio;
      } else {
        thumbnailWidth = maxSize * aspectRatio;
      }

      canvas.width = thumbnailWidth;
      canvas.height = thumbnailHeight;

      // Draw thumbnail
      ctx?.drawImage(img, 0, 0, thumbnailWidth, thumbnailHeight);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            const thumbnailFile = new File([blob], `thumb_${file.name}`, {
              type: "image/jpeg",
            });
            resolve(thumbnailFile);
          } else {
            reject(new Error("Failed to generate thumbnail"));
          }
        },
        "image/jpeg",
        0.8
      );
    };

    img.onerror = () => reject(new Error("Failed to load image for thumbnail"));
    img.src = URL.createObjectURL(file);
  });
}

// Upload with automatic thumbnail generation for images
export async function uploadWithThumbnail(
  file: File,
  organizationId: string,
  category: "uploads" | "reports" | "mockups" | "branding" = "uploads",
  onProgress?: (progress: UploadProgress) => void
): Promise<{ url: string; thumbnailUrl?: string }> {
  const isImage = file.type.startsWith("image/");
  const filePath = generateFilePath(file, organizationId, category);

  // Upload main file
  const url = await uploadFileWithProgress(file, filePath, onProgress);

  let thumbnailUrl: string | undefined;

  // Generate and upload thumbnail for images
  if (isImage) {
    try {
      const thumbnail = await generateThumbnail(file);
      const thumbnailPath = filePath.replace(/(\.[^.]+)$/, "_thumb$1");
      thumbnailUrl = await uploadFileWithProgress(thumbnail, thumbnailPath);
    } catch (error) {
      logger.warn("Failed to generate thumbnail:", error);
      // Continue without thumbnail
    }
  }

  return { url, thumbnailUrl };
}

// Get file metadata
export async function getFileMetadata(path: string): Promise<FileMetadata> {
  const fileRef = ref(storage, path);
  const metadata = await getMetadata(fileRef);
  const url = await getDownloadURL(fileRef);

  return {
    name: metadata.name || path.split("/").pop() || "unknown",
    size: metadata.size || 0,
    type: metadata.contentType || "application/octet-stream",
    url,
    path,
    uploadedAt: new Date(metadata.timeCreated),
    uploadedBy: metadata.customMetadata?.uploadedBy,
  };
}

// List files in organization folder
export async function listOrganizationFiles(
  organizationId: string,
  category?: "uploads" | "reports" | "mockups" | "branding"
): Promise<FileMetadata[]> {
  const folderPath = category
    ? `organizations/${organizationId}/${category}`
    : `organizations/${organizationId}`;

  const folderRef = ref(storage, folderPath);
  const result = await listAll(folderRef);

  const filePromises = result.items.map(async (itemRef) => {
    try {
      return await getFileMetadata(itemRef.fullPath);
    } catch (error) {
      logger.error(`Failed to get metadata for ${itemRef.fullPath}:`, error);
      return null;
    }
  });

  const files = await Promise.all(filePromises);
  return files.filter((file): file is FileMetadata => file !== null);
}

// Delete file
export async function deleteFile(path: string): Promise<void> {
  const fileRef = ref(storage, path);
  await deleteObject(fileRef);
  toast.success("File deleted successfully");
}

// Delete multiple files
export async function deleteMultipleFiles(paths: string[]): Promise<void> {
  const deletePromises = paths.map((path) => deleteFile(path));
  await Promise.all(deletePromises);
}

// Check if file exists
export async function fileExists(path: string): Promise<boolean> {
  try {
    const fileRef = ref(storage, path);
    await getMetadata(fileRef);
    return true;
  } catch (error) {
    return false;
  }
}

// Get file size in human readable format
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

// Validate file type and size
export function validateFile(
  file: File,
  allowedTypes: string[] = ["image/*", "application/pdf", "text/*"],
  maxSizeBytes: number = 100 * 1024 * 1024 // 100MB
): { valid: boolean; error?: string } {
  // Check file size
  if (file.size > maxSizeBytes) {
    return {
      valid: false,
      error: `File size must be less than ${formatFileSize(maxSizeBytes)}`,
    };
  }

  // Check file type
  const isValidType = allowedTypes.some((allowedType) => {
    if (allowedType.endsWith("/*")) {
      const category = allowedType.replace("/*", "");
      return file.type.startsWith(category);
    }
    return file.type === allowedType;
  });

  if (!isValidType) {
    return {
      valid: false,
      error: `File type not allowed. Allowed types: ${allowedTypes.join(", ")}`,
    };
  }

  return { valid: true };
}

// Preview file URL for different file types
export function getPreviewUrl(fileMetadata: FileMetadata): string {
  const { type, url } = fileMetadata;

  if (type.startsWith("image/")) {
    return url;
  }

  if (type === "application/pdf") {
    // Return PDF viewer URL
    return `${url}#view=FitH`;
  }

  // For other files, return download URL
  return url;
}

export default {
  uploadFileWithProgress,
  uploadMultipleFiles,
  uploadWithThumbnail,
  generateThumbnail,
  getFileMetadata,
  listOrganizationFiles,
  deleteFile,
  deleteMultipleFiles,
  fileExists,
  formatFileSize,
  validateFile,
  getPreviewUrl,
  generateFilePath,
};
