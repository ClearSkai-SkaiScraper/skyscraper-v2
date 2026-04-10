/**
 * 📸 PORTAL PROPERTY PHOTOS API
 *
 * Handles property photo CRUD for the client portal profile page.
 * GET  — List photos for the authenticated user
 * POST — Upload a new property photo
 * DELETE — Remove a property photo by ID
 *
 * Storage: Supabase Storage → "portal-uploads" bucket
 */

// eslint-disable-next-line no-restricted-imports
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { logger } from "@/lib/observability/logger";
import { getStorageClient } from "@/lib/storage/client";

export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/heic"];
const BUCKET = "portal-uploads";

/**
 * GET /api/portal/property-photos
 * Returns all property photos for the current user, organized by folder.
 */
export async function GET() {
  try {
    // eslint-disable-next-line @typescript-eslint/await-thenable
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = getStorageClient();
    if (!supabase) {
      // Return empty data when storage not configured (graceful degradation)
      return NextResponse.json({ photos: [], folders: {} });
    }

    // List all files in the user's property-photos folder
    const basePath = `property-photos/${userId}`;
    const { data: files, error } = await supabase.storage.from(BUCKET).list(basePath, {
      limit: 200,
      sortBy: { column: "created_at", order: "desc" },
    });

    if (error) {
      logger.error("[Property Photos] List error:", error);
      return NextResponse.json({ photos: [], folders: {} });
    }

    const photos = (files || [])
      .filter((f) => !f.id?.endsWith("/")) // Skip folders
      .map((f) => {
        const {
          data: { publicUrl },
        } = supabase.storage.from(BUCKET).getPublicUrl(`${basePath}/${f.name}`);

        // Extract folder from filename pattern: folder_timestamp-randomstr.ext
        const folderMatch = f.name.match(/^([a-z]+)_/);
        const folder = folderMatch?.[1] || "property";

        return {
          id: f.id || f.name,
          url: publicUrl,
          name: f.name,
          folder,
          size: f.metadata?.size || 0,
          uploadedAt: f.created_at || new Date().toISOString(),
        };
      });

    // Group by folder
    const folders: Record<string, typeof photos> = {};
    for (const photo of photos) {
      if (!folders[photo.folder]) folders[photo.folder] = [];
      folders[photo.folder].push(photo);
    }

    return NextResponse.json({ photos, folders });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    logger.error("[Property Photos] GET error:", error);
    return NextResponse.json({ error: "Failed to load photos" }, { status: 500 });
  }
}

/**
 * POST /api/portal/property-photos
 * Upload a new property photo.
 * Expects multipart/form-data with "file" and optional "folder" fields.
 */
export async function POST(req: NextRequest) {
  try {
    // eslint-disable-next-line @typescript-eslint/await-thenable
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = getStorageClient();
    if (!supabase) {
      return NextResponse.json({ error: "Storage not configured" }, { status: 503 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const folder = (formData.get("folder") as string) || "property";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: `Invalid file type: ${file.type}` }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const timestamp = Date.now();
    const randomStr = crypto.randomUUID().replace(/-/g, "").slice(0, 13);
    const ext = file.name.split(".").pop() || "jpg";
    const filename = `property-photos/${userId}/${folder}_${timestamp}-${randomStr}.${ext}`;

    // Ensure bucket exists
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some((b) => b.name === BUCKET);
    if (!bucketExists) {
      const { error: createError } = await supabase.storage.createBucket(BUCKET, {
        public: true,
        fileSizeLimit: MAX_FILE_SIZE,
      });
      if (createError && !createError.message.includes("already exists")) {
        logger.error("[Property Photos] Bucket creation failed:", createError);
      }
    }

    const { data, error } = await supabase.storage.from(BUCKET).upload(filename, buffer, {
      contentType: file.type,
      upsert: false,
    });

    if (error) {
      logger.error("[Property Photos] Upload error:", error);
      return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(BUCKET).getPublicUrl(data.path);

    logger.info(`[Property Photos] Uploaded: ${filename} (${file.size} bytes)`);

    return NextResponse.json({
      success: true,
      photo: {
        id: data.path,
        url: publicUrl,
        name: file.name,
        folder,
        size: file.size,
        uploadedAt: new Date().toISOString(),
      },
    });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    logger.error("[Property Photos] POST error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}

/**
 * DELETE /api/portal/property-photos?id=<photoId>
 * Remove a property photo by its storage path/ID.
 */
export async function DELETE(req: NextRequest) {
  try {
    // eslint-disable-next-line @typescript-eslint/await-thenable
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = getStorageClient();
    if (!supabase) {
      return NextResponse.json({ error: "Storage not configured" }, { status: 503 });
    }

    const { searchParams } = new URL(req.url);
    const photoId = searchParams.get("id");

    if (!photoId) {
      return NextResponse.json({ error: "Photo ID required" }, { status: 400 });
    }

    // Security: ensure the file belongs to this user
    const userPrefix = `property-photos/${userId}/`;
    const filePath = photoId.startsWith(userPrefix) ? photoId : `${userPrefix}${photoId}`;

    if (!filePath.startsWith(userPrefix)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { error } = await supabase.storage.from(BUCKET).remove([filePath]);

    if (error) {
      logger.error("[Property Photos] Delete error:", error);
      return NextResponse.json({ error: "Failed to delete photo" }, { status: 500 });
    }

    logger.info(`[Property Photos] Deleted: ${filePath}`);
    return NextResponse.json({ success: true });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    logger.error("[Property Photos] DELETE error:", error);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
