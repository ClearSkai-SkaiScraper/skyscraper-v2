import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { logger } from "@/lib/observability/logger";
import { getStorageClient } from "@/lib/storage/client";

export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const storage = getStorageClient();
    if (!storage) {
      return NextResponse.json({ error: "Storage not configured" }, { status: 503 });
    }

    const formData = await req.formData();
    const files = formData.getAll("files") as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    if (files.length > 15) {
      return NextResponse.json({ error: "Maximum 15 photos allowed" }, { status: 400 });
    }

    const uploadedUrls: string[] = [];

    for (const file of files) {
      // Validate file type
      if (!ALLOWED_TYPES.includes(file.type)) {
        return NextResponse.json({ error: `Invalid file type: ${file.type}` }, { status: 400 });
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json({ error: `File too large: ${file.name}` }, { status: 400 });
      }

      // Convert file to buffer
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Generate unique filename
      const timestamp = Date.now();
      const randomStr = crypto.randomUUID().replace(/-/g, "").slice(0, 13);
      const ext = file.name.split(".").pop();
      const filename = `${userId}/${timestamp}-${randomStr}.${ext}`;

      // Upload to Supabase Storage
      const { data, error } = await storage.storage
        .from("portfolio-photos")
        .upload(filename, buffer, {
          contentType: file.type,
          upsert: false,
        });

      if (error) {
        logger.error("Supabase upload error:", error);
        return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
      }

      // Get public URL
      const {
        data: { publicUrl },
      } = storage.storage.from("portfolio-photos").getPublicUrl(data.path);

      uploadedUrls.push(publicUrl);
    }

    return NextResponse.json({ urls: uploadedUrls });
  } catch (error) {
    logger.error("Portfolio upload error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
