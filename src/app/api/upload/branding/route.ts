/**
 * Branding Asset Upload API
 * Uploads branding assets (logo, team photos, etc.) to Supabase Storage
 * Uses service role key for reliable server-side uploads
 */

import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";

import { withAuth } from "@/lib/auth/withAuth";
import prisma from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { createSupabaseAdminClient } from "@/lib/supabase-server";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/svg+xml"];

export const POST = withAuth(async (req: NextRequest, { userId, orgId }) => {
  try {
    const rl = await checkRateLimit(userId, "UPLOAD");
    if (!rl.success) {
      return NextResponse.json(
        { error: "rate_limit_exceeded", message: "Too many requests" },
        { status: 429 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const type = (formData.get("type") as string) || "logo";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: `Invalid file type: ${file.type}` }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File too large (max 5MB)" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const timestamp = Date.now();
    const ext = file.name.split(".").pop() || "png";
    const filename = `branding/${orgId}/${timestamp}-${type}.${ext}`;

    const supabase = createSupabaseAdminClient();

    // Ensure branding bucket exists
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
      logger.error("[Branding Upload] Supabase error:", error);
      return NextResponse.json({ error: "Upload failed: " + error.message }, { status: 500 });
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("branding").getPublicUrl(data.path);

    // Update org_branding record if this is a logo
    if (type === "logo") {
      try {
        const existing = await prisma.org_branding.findFirst({
          where: { OR: [{ orgId }, { ownerId: userId }] },
        });

        if (existing) {
          await prisma.org_branding.update({
            where: { id: existing.id },
            data: { logoUrl: publicUrl, updatedAt: new Date() },
          });
        }
      } catch (dbError) {
        logger.error("[Branding Upload] DB update error:", dbError);
        // Non-fatal — the upload still succeeded
      }
    }

    return NextResponse.json({ url: publicUrl, storage: "supabase" });
  } catch (error) {
    logger.error("[Branding Upload] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
});
