import { NextRequest, NextResponse } from "next/server";

import { withAuth } from "@/lib/auth/withAuth";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { createSupabaseAdminClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];

interface BrandingUpload {
  id: string;
  url: string;
  filename: string;
  fileType: string | null;
  category: string | null;
  createdAt: Date;
}

/**
 * GET /api/branding/image-library
 * Fetch all images in the organization's image library
 */
export const GET = withAuth(async (req: NextRequest, { orgId }) => {
  try {
    // Use raw query for compatibility (model may not be in generated client yet)
    const images = await prisma.$queryRaw<BrandingUpload[]>`
      SELECT id, url, filename, "fileType", category, "createdAt"
      FROM branding_uploads
      WHERE "orgId" = ${orgId}
      ORDER BY "createdAt" DESC
      LIMIT 100
    `;

    return NextResponse.json({ images });
  } catch (error: any) {
    // If table doesn't exist, return empty array
    if (error?.code === "42P01" || error?.message?.includes("does not exist")) {
      return NextResponse.json({ images: [] });
    }
    logger.error("[Image Library] GET error:", error);
    return NextResponse.json({ error: "Failed to fetch images" }, { status: 500 });
  }
});

/**
 * POST /api/branding/image-library
 * Upload a new image to the library
 */
export const POST = withAuth(async (req: NextRequest, { userId, orgId }) => {
  try {
    const rl = await checkRateLimit(userId, "UPLOAD");
    if (!rl.success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const category = (formData.get("category") as string) || "general";

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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const ext = file.name.split(".").pop() || "png";
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_").slice(0, 50);
    const filename = `image-library/${orgId}/${timestamp}-${safeName}`;

    const supabase = createSupabaseAdminClient();

    // Ensure bucket exists
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some((b) => b.name === "branding");
    if (!bucketExists) {
      await supabase.storage.createBucket("branding", {
        public: true,
        fileSizeLimit: 10 * 1024 * 1024,
      });
    }

    const { data, error } = await supabase.storage.from("branding").upload(filename, buffer, {
      contentType: file.type,
      upsert: true,
    });

    if (error) {
      logger.error("[Image Library] Supabase upload error:", error);
      return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("branding").getPublicUrl(data.path);

    // Generate unique ID
    const { createId } = await import("@paralleldrive/cuid2");
    const recordId = createId();

    // Save to database using raw query
    await prisma.$executeRaw`
      INSERT INTO branding_uploads (id, "orgId", "userId", url, filename, "fileType", "fileSize", category, "createdAt")
      VALUES (${recordId}, ${orgId}, ${userId}, ${publicUrl}, ${file.name}, ${file.type}, ${file.size}, ${category}, NOW())
    `;

    logger.info("[Image Library] Image uploaded", { orgId, imageId: recordId });

    return NextResponse.json({
      success: true,
      image: {
        id: recordId,
        url: publicUrl,
        filename: file.name,
        category,
      },
    });
  } catch (error) {
    logger.error("[Image Library] POST error:", error);
    return NextResponse.json({ error: "Failed to upload image" }, { status: 500 });
  }
});

/**
 * DELETE /api/branding/image-library
 * Delete an image from the library
 */
export const DELETE = withAuth(async (req: NextRequest, { orgId }) => {
  try {
    const { searchParams } = new URL(req.url);
    const imageId = searchParams.get("id");

    if (!imageId) {
      return NextResponse.json({ error: "Image ID required" }, { status: 400 });
    }

    // Find the image using raw query
    const images = await prisma.$queryRaw<{ id: string; url: string }[]>`
      SELECT id, url FROM branding_uploads
      WHERE id = ${imageId} AND "orgId" = ${orgId}
      LIMIT 1
    `;

    const image = images[0];

    if (!image) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    // Delete from Supabase storage
    try {
      const supabase = createSupabaseAdminClient();
      const urlParts = image.url.split("/branding/");
      if (urlParts[1]) {
        await supabase.storage.from("branding").remove([urlParts[1]]);
      }
    } catch (storageError) {
      logger.warn("[Image Library] Failed to delete from storage:", storageError);
    }

    // Delete from database using raw query
    await prisma.$executeRaw`
      DELETE FROM branding_uploads WHERE id = ${imageId} AND "orgId" = ${orgId}
    `;

    logger.info("[Image Library] Image deleted", { orgId, imageId });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    // If table doesn't exist, return success
    if (error?.code === "42P01" || error?.message?.includes("does not exist")) {
      return NextResponse.json({ success: true });
    }
    logger.error("[Image Library] DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete image" }, { status: 500 });
  }
});
