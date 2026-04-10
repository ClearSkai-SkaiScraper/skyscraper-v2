// eslint-disable-next-line no-restricted-imports
import { auth } from "@clerk/nextjs/server";
import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

const f = createUploadthing();

/**
 * Helper to get user's org from our internal org system
 * Falls back to Clerk orgId if available, otherwise looks up user_organizations
 */
async function getUploadContext() {
  // eslint-disable-next-line @typescript-eslint/await-thenable
  const { userId, orgId: clerkOrgId } = await auth();
  if (!userId) throw new UploadThingError("Unauthorized");

  // Try Clerk orgId first
  if (clerkOrgId) {
    return { userId, orgId: clerkOrgId };
  }

  // Fall back to internal org system
  const membership = await prisma.user_organizations.findFirst({
    where: { userId },
    include: { Org: true },
  });

  if (membership?.Org?.id) {
    return { userId, orgId: membership.Org.id };
  }

  // Last resort: check users.orgId
  const user = await prisma.users.findUnique({
    where: { id: userId },
    select: { orgId: true },
  });

  if (user?.orgId) {
    return { userId, orgId: user.orgId };
  }

  throw new UploadThingError("Unauthorized - no organization found");
}

/**
 * UploadThing File Router
 * Defines upload routes for different file types across the app
 */
export const ourFileRouter = {
  /**
   * Claims Photos Upload
   * Used in Claims Workspace photo gallery
   */
  claimPhotos: f({
    image: { maxFileSize: "8MB", maxFileCount: 20 },
  })
    .middleware(async () => {
      return await getUploadContext();
    })
    .onUploadComplete(async ({ metadata, file }) => {
      logger.debug("[UploadThing] Claim photo uploaded:", file.url);

      // Store in database using FileAsset model
      await prisma.file_assets.create({
        data: {
          id: file.key,
          orgId: metadata.orgId,
          ownerId: metadata.userId,
          filename: file.name,
          sizeBytes: file.size || 0,
          mimeType: file.type || "image/jpeg",
          publicUrl: file.url,
          storageKey: file.key,
          bucket: "uploadthing",
          category: "claim_photo",
          updatedAt: new Date(),
        },
      });

      return { uploadedBy: metadata.userId, fileUrl: file.url };
    }),

  /**
   * Documents Upload
   * Used for PDFs, contracts, estimates, etc.
   */
  claimDocuments: f({
    pdf: { maxFileSize: "16MB", maxFileCount: 10 },
    image: { maxFileSize: "8MB", maxFileCount: 10 },
  })
    .middleware(async () => {
      return await getUploadContext();
    })
    .onUploadComplete(async ({ metadata, file }) => {
      logger.debug("[UploadThing] Document uploaded:", file.url);

      await prisma.file_assets.create({
        data: {
          id: file.key,
          orgId: metadata.orgId,
          ownerId: metadata.userId,
          filename: file.name,
          sizeBytes: file.size || 0,
          mimeType: file.type || "application/pdf",
          publicUrl: file.url,
          storageKey: file.key,
          bucket: "uploadthing",
          category: "claim_document",
          updatedAt: new Date(),
        },
      });

      return { uploadedBy: metadata.userId, fileUrl: file.url };
    }),

  /**
   * Branding Assets Upload
   * Used for organization logos, letterheads, etc.
   */
  brandingAssets: f({
    image: { maxFileSize: "4MB", maxFileCount: 5 },
  })
    .middleware(async () => {
      return await getUploadContext();
    })
    .onUploadComplete(async ({ metadata, file }) => {
      logger.debug("[UploadThing] Branding asset uploaded:", file.url);

      await prisma.file_assets.create({
        data: {
          id: file.key,
          orgId: metadata.orgId,
          ownerId: metadata.userId,
          filename: file.name,
          sizeBytes: file.size || 0,
          mimeType: file.type || "image/png",
          publicUrl: file.url,
          storageKey: file.key,
          bucket: "uploadthing",
          category: "branding_asset",
          updatedAt: new Date(),
        },
      });

      return { uploadedBy: metadata.userId, fileUrl: file.url };
    }),

  /**
   * Client Portal Uploads
   * Used by clients to upload supplemental photos/docs
   */
  clientPortalUploads: f({
    image: { maxFileSize: "8MB", maxFileCount: 10 },
    pdf: { maxFileSize: "8MB", maxFileCount: 5 },
  })
    .middleware(async () => {
      return await getUploadContext();
    })
    .onUploadComplete(async ({ metadata, file }) => {
      logger.debug("[UploadThing] Client upload:", file.url);

      await prisma.file_assets.create({
        data: {
          id: file.key,
          orgId: metadata.orgId,
          ownerId: metadata.userId,
          filename: file.name,
          sizeBytes: file.size || 0,
          mimeType: file.type || "application/octet-stream",
          publicUrl: file.url,
          storageKey: file.key,
          bucket: "uploadthing",
          category: "client_portal",
          updatedAt: new Date(),
        },
      });

      return { uploadedBy: metadata.userId, fileUrl: file.url };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
