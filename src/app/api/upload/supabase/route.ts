/**
 * Universal Supabase Storage Upload API
 * Replaces UploadThing for all file uploads
 * POST /api/upload/supabase
 *
 * Supports:
 * - claimPhotos: Claim-related images
 * - claimDocuments: PDFs, docs for claims
 * - completionPhotos: Job completion photos
 * - evidence: Evidence files
 *
 * Now with storage guardrails:
 * - Quota enforcement
 * - File validation
 * - Audit logging
 */

import { logger } from "@/lib/logger";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

import { resolveOrg } from "@/lib/org/resolveOrg";
import prisma from "@/lib/prisma";
import {
  checkClaimFileLimit,
  checkStorageCapacity,
  logStorageEvent,
  validateFile,
} from "@/lib/storage/guardrails";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Create Supabase client with service role for server-side uploads
function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    return null;
  }

  return createClient(url, key, {
    auth: { persistSession: false },
  });
}

const UPLOAD_CONFIGS: Record<
  string,
  {
    bucket: string;
    maxSize: number;
    allowedTypes: string[];
  }
> = {
  claimPhotos: {
    bucket: "claim-photos",
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/heic"],
  },
  claimDocuments: {
    bucket: "claim-documents",
    maxSize: 20 * 1024 * 1024, // 20MB
    allowedTypes: ["application/pdf", "image/jpeg", "image/png", "image/webp"],
  },
  completionPhotos: {
    bucket: "completion-photos",
    maxSize: 10 * 1024 * 1024,
    allowedTypes: ["image/jpeg", "image/jpg", "image/png", "image/webp"],
  },
  evidence: {
    bucket: "evidence",
    maxSize: 20 * 1024 * 1024,
    allowedTypes: ["image/jpeg", "image/png", "image/webp", "application/pdf"],
  },
};

export async function POST(request: NextRequest) {
  try {
    const { userId, orgId: clerkOrgId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Resolve orgId from DB (matches withAuth/requireAuth pattern)
    // This ensures uploads use the same orgId as listing queries
    let resolvedOrgId: string | null = clerkOrgId || null;
    try {
      const ctx = await resolveOrg();
      resolvedOrgId = ctx.orgId;
    } catch {
      // Fall through — use clerkOrgId or userId as fallback
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: "Storage not configured" }, { status: 500 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const uploadType = (formData.get("type") as string) || "claimPhotos";
    const claimId = formData.get("claimId") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const config = UPLOAD_CONFIGS[uploadType];
    if (!config) {
      return NextResponse.json({ error: `Invalid upload type: ${uploadType}` }, { status: 400 });
    }

    // ==== GUARDRAILS: Enhanced validation ====

    // 1. Validate file with guardrails
    const fileValidation = validateFile(
      { name: file.name, type: file.type, size: file.size },
      { maxSizeBytes: config.maxSize, allowedTypes: config.allowedTypes }
    );

    if (!fileValidation.valid) {
      await logStorageEvent({
        orgId: resolvedOrgId || userId,
        userId,
        action: "upload",
        filePath: file.name,
        fileSize: file.size,
        fileType: file.type,
        claimId: claimId || undefined,
        success: false,
        error: fileValidation.error,
      });
      return NextResponse.json(
        { error: fileValidation.error, code: fileValidation.code },
        { status: 400 }
      );
    }

    // 2. Check storage quota (only if orgId available)
    if (resolvedOrgId) {
      const quotaCheck = await checkStorageCapacity(resolvedOrgId, file.size);
      if (!quotaCheck.valid) {
        await logStorageEvent({
          orgId: resolvedOrgId,
          userId,
          action: "upload",
          filePath: file.name,
          fileSize: file.size,
          claimId: claimId || undefined,
          success: false,
          error: quotaCheck.error,
        });
        return NextResponse.json(
          { error: quotaCheck.error, code: quotaCheck.code },
          { status: 402 } // Payment Required
        );
      }

      // 3. Check per-claim file limit if uploading to a claim
      if (claimId) {
        const claimLimitCheck = await checkClaimFileLimit(claimId, resolvedOrgId);
        if (!claimLimitCheck.valid) {
          await logStorageEvent({
            orgId: resolvedOrgId,
            userId,
            action: "upload",
            filePath: file.name,
            claimId,
            success: false,
            error: claimLimitCheck.error,
          });
          return NextResponse.json(
            { error: claimLimitCheck.error, code: claimLimitCheck.code },
            { status: 400 }
          );
        }
      }
    }

    // ==== END GUARDRAILS ====

    // Legacy validation (keeping for safety, guardrails now handles this)
    // Validate file type
    if (!config.allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: `Invalid file type: ${file.type}. Allowed: ${config.allowedTypes.join(", ")}` },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > config.maxSize) {
      return NextResponse.json(
        { error: `File too large. Max size: ${config.maxSize / 1024 / 1024}MB` },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Generate file path
    const ext = file.name.split(".").pop() || "bin";
    const timestamp = Date.now();
    const uuid = crypto.randomUUID();
    const safeOrgId = resolvedOrgId || userId;

    let filePath: string;
    if (claimId) {
      filePath = `${safeOrgId}/${claimId}/${timestamp}-${uuid}.${ext}`;
    } else {
      filePath = `${safeOrgId}/${timestamp}-${uuid}.${ext}`;
    }

    // Ensure bucket exists
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some((b) => b.name === config.bucket);

    if (!bucketExists) {
      await supabase.storage.createBucket(config.bucket, {
        public: true,
        fileSizeLimit: config.maxSize,
      });
    }

    // Upload file to Supabase
    const { data, error } = await supabase.storage.from(config.bucket).upload(filePath, buffer, {
      contentType: file.type,
      upsert: true,
    });

    if (error) {
      logger.error("[Supabase Upload] Error, trying Firebase fallback:", error);

      // Try Firebase fallback
      try {
        const { getFirebaseStorage } = await import("@/lib/firebase");
        const { ref, uploadBytes, getDownloadURL } = await import("firebase/storage");

        const firebaseStorage = getFirebaseStorage();
        if (firebaseStorage) {
          const firebasePath = `${config.bucket}/${filePath}`;
          const storageRef = ref(firebaseStorage, firebasePath);
          const uint8Array = new Uint8Array(buffer);

          await uploadBytes(storageRef, uint8Array, {
            contentType: file.type,
            customMetadata: {
              originalName: file.name,
              uploadedAt: new Date().toISOString(),
              orgId: safeOrgId || "",
              claimId: claimId || "",
            },
          });

          const downloadUrl = await getDownloadURL(storageRef);
          logger.debug("[Firebase Upload] Success:", { firebasePath, downloadUrl });

          // Create file_assets DB record for Firebase uploads too
          try {
            await prisma.file_assets.create({
              data: {
                id: crypto.randomUUID(),
                orgId: safeOrgId,
                ownerId: userId,
                claimId: claimId || null,
                filename: file.name,
                mimeType: file.type,
                sizeBytes: file.size,
                storageKey: firebasePath,
                bucket: config.bucket,
                publicUrl: downloadUrl,
                category:
                  uploadType === "claimPhotos"
                    ? "damage"
                    : uploadType === "claimDocuments"
                      ? "document"
                      : "other",
                source: "user",
                updatedAt: new Date(),
              },
            });
          } catch (dbErr) {
            logger.warn("[Firebase Upload] file_assets record creation failed:", dbErr);
          }

          // Log successful Firebase upload
          await logStorageEvent({
            orgId: safeOrgId,
            userId,
            action: "upload",
            filePath: firebasePath,
            fileSize: file.size,
            fileType: file.type,
            claimId: claimId || undefined,
            success: true,
          });

          return NextResponse.json({
            url: downloadUrl,
            path: firebasePath,
            name: file.name,
            size: file.size,
            type: file.type,
            uploadType,
            storage: "firebase",
          });
        }
      } catch (firebaseError) {
        logger.error("[Firebase Upload] Fallback failed:", firebaseError);
      }

      return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    }

    // Get public URL from Supabase
    const {
      data: { publicUrl },
    } = supabase.storage.from(config.bucket).getPublicUrl(filePath);

    // Create file_assets DB record so photos/documents appear in the UI
    try {
      await prisma.file_assets.create({
        data: {
          id: crypto.randomUUID(),
          orgId: safeOrgId,
          ownerId: userId,
          claimId: claimId || null,
          filename: file.name,
          mimeType: file.type,
          sizeBytes: file.size,
          storageKey: filePath,
          bucket: config.bucket,
          publicUrl,
          category:
            uploadType === "claimPhotos"
              ? "damage"
              : uploadType === "claimDocuments"
                ? "document"
                : "other",
          source: "user",
          updatedAt: new Date(),
        },
      });
    } catch (dbErr) {
      logger.warn("[Supabase Upload] file_assets record creation failed:", dbErr);
      // File is uploaded successfully, DB record is secondary
    }

    // Log successful Supabase upload
    await logStorageEvent({
      orgId: safeOrgId,
      userId,
      action: "upload",
      filePath,
      fileSize: file.size,
      fileType: file.type,
      claimId: claimId || undefined,
      success: true,
    });

    return NextResponse.json({
      url: publicUrl,
      path: data.path,
      name: file.name,
      size: file.size,
      type: file.type,
      uploadType,
      storage: "supabase",
    });
  } catch (error) {
    logger.error("[Supabase Upload] Error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
