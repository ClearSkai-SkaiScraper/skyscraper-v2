import Busboy from "busboy";
import crypto from "crypto";
import mime from "mime";
import { NextRequest, NextResponse } from "next/server";

import { verifyClaimAccess } from "@/lib/auth/apiAuth";
import { withAuth } from "@/lib/auth/withAuth";
import { getDelegate } from "@/lib/db/modelAliases";
import { storage } from "@/lib/firebaseAdmin";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { assertStorageReady } from "@/lib/storage";

// Prisma singleton imported from @/lib/db/prisma

export const runtime = "nodejs"; // ensure Node runtime for Busboy streams
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 60; // Vercel function timeout hint

function parseMultipart(req: NextRequest) {
  return new Promise<{
    fields: Record<string, string>;
    files: Array<{
      buffer: Buffer;
      filename: string;
      mimeType: string;
      name: string;
    }>;
  }>((resolve, reject) => {
    const bb = Busboy({ headers: Object.fromEntries(req.headers.entries()) });
    const fields: Record<string, string> = {};
    const files: Array<{
      buffer: Buffer;
      filename: string;
      mimeType: string;
      name: string;
    }> = [];

    bb.on("file", (fieldName, file, info) => {
      const filename = info.filename || "upload";
      const mimeType = info.mimeType || "application/octet-stream";
      const chunks: Buffer[] = [];

      file.on("data", (chunk) => chunks.push(chunk));
      file.on("end", () => {
        files.push({
          buffer: Buffer.concat(chunks),
          filename,
          mimeType,
          name: fieldName,
        });
      });
    });

    bb.on("field", (name, val) => {
      fields[name] = val;
    });

    bb.on("finish", () => {
      resolve({ fields, files });
    });

    bb.on("error", reject);

    // Fix for Next.js ReadableStream
    const stream = req.body as ReadableStream & {
      pipe?: (dest: unknown) => void;
      getReader?: () => ReadableStreamDefaultReader;
    };
    if (stream && typeof stream.pipe === "function") {
      stream.pipe(bb);
    } else {
      // Convert ReadableStream to Node stream
      const reader = stream?.getReader();
      if (reader) {
        const pump = async () => {
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              bb.write(value);
            }
            bb.end();
          } catch (error) {
            bb.destroy(error instanceof Error ? error : new Error(String(error)));
          }
        };
        void pump();
      } else {
        bb.end();
      }
    }
  });
}

export const POST = withAuth(async (req: NextRequest, { userId, orgId }) => {
  try {
    // Check storage availability first
    const { enabled, ready } = await assertStorageReady();
    if (!enabled) {
      logger.warn("Upload attempted while storage disabled");
      return NextResponse.json(
        {
          code: "STORAGE_DISABLED",
          description: "Uploads temporarily disabled while billing is verified.",
        },
        { status: 503 }
      );
    }

    if (!ready) {
      logger.warn("Upload attempted while storage not ready");
      return NextResponse.json(
        {
          code: "STORAGE_NOT_READY",
          description: "Storage not ready. Try again later.",
        },
        { status: 503 }
      );
    }

    const contentType = req.headers.get("content-type") || "";
    if (!contentType.startsWith("multipart/form-data")) {
      return NextResponse.json({ error: "Use multipart/form-data" }, { status: 400 });
    }

    // Get Org by DB UUID (withAuth guarantees DB-backed orgId)
    const Org = await prisma.org.findUnique({
      where: { id: orgId },
    });

    if (!Org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const { fields, files } = await parseMultipart(req);

    if (files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    // Bulk upload limits
    if (files.length > 10) {
      return NextResponse.json({ error: "Maximum 10 files per upload" }, { status: 400 });
    }

    const totalSize = files.reduce((sum, file) => sum + file.buffer.length, 0);
    if (totalSize > 200 * 1024 * 1024) {
      // 200MB limit
      return NextResponse.json({ error: "Total file size exceeds 200MB limit" }, { status: 400 });
    }

    // Extract form fields
    const leadId = fields.leadId || null;
    const claimId = fields.claim_id || null;
    const category = fields.category || "other";
    const note = fields.note || null;

    // SECURITY: Verify claim access if claimId provided
    if (claimId) {
      const accessResult = await verifyClaimAccess(claimId, orgId, userId);
      if (accessResult instanceof NextResponse) {
        return accessResult; // Access denied or error
      }
    }

    // Validate category
    const allowedCategories = ["damage", "estimate", "invoice", "carrier", "other"];
    if (!allowedCategories.includes(category)) {
      return NextResponse.json({ error: "Invalid category" }, { status: 400 });
    }

    const results: Array<{
      id: string;
      filename: string;
      mimeType: string;
      sizeBytes: number;
      previewUrl: string;
      storageKey: string;
      category: string;
      note: string | null;
    }> = [];

    const errors: Array<{
      filename: string;
      error: string;
    }> = [];

    // Process each file
    for (let i = 0; i < files.length; i++) {
      try {
        const file = files[i];
        const { buffer, filename, mimeType } = file;

        // Size limits per file
        const maxSize = mimeType.startsWith("image/") ? 25 * 1024 * 1024 : 50 * 1024 * 1024; // 25MB for images, 50MB for PDFs

        if (buffer.length > maxSize) {
          errors.push({ filename, error: "File too large" });
          continue;
        }

        // MIME type validation
        const allowedTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

        if (!allowedTypes.includes(mimeType)) {
          errors.push({ filename, error: "File type not allowed" });
          continue;
        }

        const ext = mime.getExtension(mimeType) || filename.split(".").pop() || "bin";

        // Deterministic storage key
        const today = new Date();
        const yyyy = today.getUTCFullYear();
        const mm = String(today.getUTCMonth() + 1).padStart(2, "0");
        const dd = String(today.getUTCDate()).padStart(2, "0");
        const id = crypto.randomUUID();

        const safeName = filename.replace(/[^\w.-]+/g, "_");
        const storageKey = `orgs/${orgId}/${
          claimId ? `claims/${claimId}` : leadId ? `leads/${leadId}` : "misc"
        }/${yyyy}/${mm}/${dd}/${id}_${safeName}`;

        // Compute checksum
        const checksum = crypto.createHash("md5").update(buffer).digest("base64");

        // Upload to Firebase Storage
        const fileRef = storage.file(storageKey);
        await fileRef.save(buffer, {
          contentType: mimeType,
          metadata: {
            metadata: {
              orgId,
              claim_id: claimId ?? "",
              leadId: leadId ?? "",
              ownerId: userId,
              checksum,
              category,
              note: note ?? "",
            },
          },
          resumable: false,
          public: false,
          validation: false,
        });

        // Time-limited read URL
        const [signedUrl] = await fileRef.getSignedUrl({
          action: "read",
          expires: Date.now() + 1000 * 60 * 15, // 15 minutes
        });

        // Persist record with category and note
        const record = await getDelegate("FileAsset").create({
          data: {
            orgId: Org.id,
            ownerId: userId,
            leadId: leadId ?? undefined,
            claim_id: claimId ?? undefined,
            filename,
            mimeType,
            sizeBytes: buffer.length,
            storageKey,
            bucket: storage.name,
            publicUrl: signedUrl,
            checksum,
            category,
            note,
          },
        });

        // Log activity
        const { getUserName } = await import("@/lib/clerk-utils");
        await prisma.activities.create({
          data: {
            id: crypto.randomUUID(),
            orgId: Org.id,
            type: "file_uploaded",
            title: "File Uploaded",
            description: `Uploaded ${filename} (${Math.round(
              buffer.length / 1024
            )}KB) - ${category}`,
            userId,
            userName: await getUserName(userId),
            leadId: leadId ?? undefined,
            claimId: claimId ?? undefined,
            updatedAt: new Date(),
          },
        });

        results.push({
          id: record.id,
          filename,
          mimeType,
          sizeBytes: buffer.length,
          previewUrl: signedUrl,
          storageKey,
          category,
          note,
        });
      } catch (fileError) {
        logger.error(`Error processing file ${files[i].filename}:`, fileError);
        errors.push({
          filename: files[i].filename,
          error: "Upload failed",
        });
      }
    }

    return NextResponse.json({
      success: true,
      uploaded: results,
      errors: errors,
      totalUploaded: results.length,
      totalErrors: errors.length,
    });
  } catch (err) {
    logger.error("Upload error:", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
});
