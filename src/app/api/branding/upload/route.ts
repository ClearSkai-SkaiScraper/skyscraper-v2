/**
 * Branding Asset Upload API
 * Uses Supabase Storage for reliable file hosting
 * POST /api/branding/upload
 */

import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

import { withAuth } from "@/lib/auth/withAuth";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Create Supabase client with service role for server-side uploads
function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    logger.warn("[Branding Upload] Supabase not configured, falling back to base64");
    return null;
  }

  return createClient(url, key, {
    auth: { persistSession: false },
  });
}

export const POST = withAuth(async (request: NextRequest, { orgId }) => {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const rawType = formData.get("type") as string;
    const type = ["logo", "team"].includes(rawType) ? rawType : "logo"; // Validated to "logo" | "team"

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        {
          error: "Invalid file type. Please upload an image (JPEG, PNG, WebP, or GIF)",
        },
        { status: 400 }
      );
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json({ error: "File too large. Maximum size is 5MB" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Try Supabase Storage first
    const supabase = getSupabaseAdmin();

    if (supabase) {
      try {
        const bucket = "branding-assets";
        const ext = file.name.split(".").pop() || "jpg";
        const timestamp = Date.now();
        const uuid = crypto.randomUUID();
        const prefix = type === "team" ? "team" : "logo";
        const filename = `${orgId}/${prefix}-${timestamp}-${uuid}.${ext}`;

        // Ensure bucket exists
        const { data: buckets } = await supabase.storage.listBuckets();
        const bucketExists = buckets?.some((b) => b.name === bucket);

        if (!bucketExists) {
          await supabase.storage.createBucket(bucket, {
            public: true,
            fileSizeLimit: 5 * 1024 * 1024,
          });
        }

        // Upload file
        const { data, error } = await supabase.storage.from(bucket).upload(filename, buffer, {
          contentType: file.type,
          upsert: true,
        });

        if (error) {
          logger.error("[Branding Upload] Supabase error:", error);
          throw error;
        }

        // Get public URL
        const {
          data: { publicUrl },
        } = supabase.storage.from(bucket).getPublicUrl(filename);

        logger.debug("[Branding Upload] Supabase success:", { filename, publicUrl });

        return NextResponse.json({
          url: publicUrl,
          path: data.path,
          description: "Image uploaded to Supabase Storage",
        });
      } catch (supabaseError) {
        logger.error("[Branding Upload] Supabase failed, trying Firebase:", supabaseError);
        // Fall through to Firebase fallback
      }
    }

    // Fallback: Try Firebase Storage
    try {
      const { getFirebaseStorage } = await import("@/lib/firebase");
      const { ref, uploadBytes, getDownloadURL } = await import("firebase/storage");

      const firebaseStorage = getFirebaseStorage();
      if (firebaseStorage) {
        const ext = file.name.split(".").pop() || "jpg";
        const timestamp = Date.now();
        const uuid = crypto.randomUUID();
        const prefix = type === "team" ? "team" : "logo";
        const firebasePath = `branding/${orgId}/${prefix}-${timestamp}-${uuid}.${ext}`;

        const storageRef = ref(firebaseStorage, firebasePath);
        const uint8Array = new Uint8Array(buffer);

        await uploadBytes(storageRef, uint8Array, {
          contentType: file.type,
          customMetadata: {
            originalName: file.name,
            uploadedAt: new Date().toISOString(),
            orgId: orgId,
          },
        });

        const downloadUrl = await getDownloadURL(storageRef);
        logger.debug("[Branding Upload] Firebase success:", { firebasePath, downloadUrl });

        return NextResponse.json({
          url: downloadUrl,
          path: firebasePath,
          description: "Image uploaded to Firebase Storage (fallback)",
        });
      }
    } catch (firebaseError) {
      logger.error("[Branding Upload] Firebase fallback failed:", firebaseError);
    }

    // Final fallback: Convert file to base64 data URL
    const base64 = buffer.toString("base64");
    const dataUrl = `data:${file.type};base64,${base64}`;

    logger.debug("[Branding Upload] Using base64 final fallback");

    return NextResponse.json({
      url: dataUrl,
      description: "Image uploaded (base64 fallback)",
    });
  } catch (error) {
    logger.error("[Branding Upload] Error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
});
