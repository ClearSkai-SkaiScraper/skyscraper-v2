import prisma from "@/lib/prisma";

/**
 * getStorageUrlForAsset
 * Resolves a storage URL for a FileAsset given its ID. Falls back to
 * constructing a Firebase Storage path if publicUrl missing.
 */
export async function getStorageUrlForAsset(id: string) {
  const asset = await prisma.file_assets.findUnique({ where: { id } });
  if (!asset) return null;
  if (asset.publicUrl) return asset.publicUrl;
  // Fallback Firebase path construction
  // eslint-disable-next-line no-restricted-syntax
  const baseBucket = process.env.FIREBASE_STORAGE_BUCKET || asset.bucket;
  return `https://firebasestorage.googleapis.com/v0/b/${baseBucket}/o/${encodeURIComponent(asset.storageKey)}?alt=media`;
}
