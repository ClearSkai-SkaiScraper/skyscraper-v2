import { supabase } from "@/integrations/supabase/client";

import { logger } from "@/lib/logger";

export type StorageAdapter = "mock" | "supabase" | "s3";

interface UploadResult {
  url: string;
  path: string;
}

/**
 * Generate safe UUID-based filename
 */
export function makeSafeFileName(file: File): string {
  const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
  const id = crypto.randomUUID();
  return `${id}.${ext}`;
}

/**
 * Mock uploader - returns a placeholder URL
 */
export async function uploadMock(file: File): Promise<UploadResult> {
  // Simulate upload delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  return {
    url: `https://placeholder.com/${file.name}`,
    path: `mock/${file.name}`,
  };
}

/**
 * Supabase Storage uploader with user-specific folders
 */
export async function uploadSupabase(
  file: File,
  bucket: string = "photos",
  folder?: string
): Promise<UploadResult> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User must be authenticated to upload files");
  }

  // SECURITY: Validate brochures bucket uploads server-side
  if (bucket === "brochures") {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const token = session?.access_token;

    if (!token) {
      throw new Error("Authentication required for brochures upload");
    }

    const supabaseUrl =
      (process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined) ||
      process.env.NEXT_PUBLIC_SUPABASE_URL;
    const fnUrl = `${supabaseUrl!.replace("/rest/v1", "")}/functions/v1/validate-brochure-upload`;

    const validationResponse = await fetch(fnUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        fileName: file.name,
        mimeType: file.type,
        fileSize: file.size,
        bucket: "brochures",
      }),
    });

    if (!validationResponse.ok) {
      const error = await validationResponse.json();
      throw new Error(error.message || "Upload validation failed");
    }
  }

  // SECURITY: Use UUID for file naming to prevent enumeration
  const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
  const uuid = crypto.randomUUID();
  const fileName = `${uuid}.${ext}`;
  const filePath = folder ? `${user.id}/${folder}/${fileName}` : `${user.id}/${fileName}`;

  const { data, error } = await supabase.storage.from(bucket).upload(filePath, file, {
    cacheControl: "3600",
    upsert: false,
  });

  if (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }

  // SECURITY NOTE: Brochures bucket is intentionally PUBLIC
  // Purpose: Public marketing materials (vendor brochures, product PDFs)
  // Access: Anyone can view if they know the URL (suitable for marketing content)
  // Protection: Write operations require authentication via RLS policies
  // File naming: Uses vendor slugs + timestamps to prevent enumeration
  // Content policy: Only non-sensitive marketing PDFs/images should be uploaded
  if (bucket === "brochures") {
    const {
      data: { publicUrl },
    } = supabase.storage.from(bucket).getPublicUrl(data.path);

    return {
      url: publicUrl,
      path: data.path,
    };
  }

  // For private buckets, create signed URL (valid for 1 hour)
  const { data: signedUrlData, error: signedError } = await supabase.storage
    .from(bucket)
    .createSignedUrl(data.path, 3600);

  if (signedError) {
    throw new Error(`Failed to create signed URL: ${signedError.message}`);
  }

  return {
    url: signedUrlData.signedUrl,
    path: data.path,
  };
}

/**
 * S3 uploader using presigned URL
 */
export async function uploadS3(file: File): Promise<UploadResult> {
  const baseUrl =
    (process.env.NEXT_PUBLIC_API_BASE_URL as string | undefined) ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    "http://localhost:8787";

  // Get presigned URL from your backend
  const signResponse = await fetch(
    `${baseUrl}/storage/s3/sign?name=${encodeURIComponent(
      file.name
    )}&type=${encodeURIComponent(file.type)}`
  );

  if (!signResponse.ok) {
    throw new Error("Failed to get presigned URL");
  }

  const { uploadUrl, url, key } = await signResponse.json();

  // Upload directly to S3 using presigned PUT
  const uploadResponse = await fetch(uploadUrl, {
    method: "PUT",
    body: file,
    headers: {
      "Content-Type": file.type,
    },
  });

  if (!uploadResponse.ok) {
    throw new Error("S3 upload failed");
  }

  return {
    url,
    path: key,
  };
}

/**
 * Upload file using specified adapter
 */
export async function uploadFile(
  file: File,
  adapter: StorageAdapter = "mock"
): Promise<UploadResult> {
  switch (adapter) {
    case "supabase":
      return uploadSupabase(file);
    case "s3":
      return uploadS3(file);
    case "mock":
    default:
      return uploadMock(file);
  }
}

// ============================================================================
// Degraded Mode Support Functions
// ============================================================================

/**
 * Check if storage is enabled via environment variable
 */
export function isStorageEnabled(): boolean {
  return process.env.STORAGE_ENABLED === "true";
}

/**
 * Check if storage bucket is ready for use
 */
export async function bucketReady(): Promise<boolean> {
  if (!isStorageEnabled()) return false;

  try {
    // Dynamic import to avoid loading Firebase admin on client
    const { storage } = await import("@/lib/firebaseAdmin");

    if (!storage) return false;

    const bucket = storage;
    await bucket.getMetadata(); // Will throw if bucket not found or inaccessible
    return true;
  } catch (error) {
    logger.warn("[STORAGE] Bucket check failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

/**
 * Check if storage is ready for use with detailed status
 * Returns object with enabled/ready status and bucket info
 */
export async function assertStorageReady(): Promise<{
  enabled: boolean;
  ready: boolean;
  bucket?: string;
}> {
  const enabled = isStorageEnabled();

  if (!enabled) {
    return { enabled, ready: false };
  }

  try {
    // Only import Firebase Admin if storage is enabled to avoid client-side imports
    if (typeof window !== "undefined") {
      // Client-side - can't check bucket directly, assume ready if enabled
      return { enabled, ready: true };
    }

    // Server-side - check if Firebase bucket is accessible
    const { storage } = await import("@/lib/firebaseAdmin");

    if (!storage) {
      return { enabled, ready: false };
    }

    const bucket = storage;
    await bucket.getMetadata();
    return {
      enabled,
      ready: true,
      bucket: bucket.name || process.env.FIREBASE_STORAGE_BUCKET,
    };
  } catch (error) {
    logger.warn("[STORAGE] Readiness check failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return { enabled, ready: false };
  }
}

/**
 * Get storage configuration details
 */
export function getStorageConfig() {
  return {
    enabled: isStorageEnabled(),
    bucket: process.env.FIREBASE_STORAGE_BUCKET || null,
    projectId: process.env.FIREBASE_PROJECT_ID || null,
  };
}

/**
 * Generate a signed URL for Supabase Storage
 */
export async function getSignedUrl(
  bucket: string,
  path: string,
  expiresIn: number = 60 * 60 * 24 * 7 // 7 days default
): Promise<string> {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn);

  if (error || !data) {
    throw new Error(`Failed to generate signed URL: ${error?.message || "Unknown error"}`);
  }

  return data.signedUrl;
}
