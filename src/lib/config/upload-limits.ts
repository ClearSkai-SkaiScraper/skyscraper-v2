/**
 * ============================================================================
 * CENTRALIZED UPLOAD LIMITS CONFIGURATION
 * ============================================================================
 *
 * Single source of truth for all file upload limits across the platform.
 * Designed for enterprise scale: 500+ users with heavy upload activity.
 *
 * Storage Strategy:
 * - Supabase Storage (S3-compatible) with auto-scaling
 * - CDN delivery for fast photo serving
 * - Org-scoped paths prevent cross-tenant access
 *
 * Scale Assumptions (500 users overnight):
 * - Each user uploads avg 50 photos/day = 25,000 photos/day
 * - At 25MB max = 625GB/day worst case (typically 3-5MB avg = ~100GB/day)
 * - Supabase Pro plan: 100GB included, auto-scales to TB
 *
 * ============================================================================
 */

// ═══════════════════════════════════════════════════════════════════════════════
// PHOTO UPLOAD LIMITS
// ═══════════════════════════════════════════════════════════════════════════════

/** Maximum file size for photos (25MB) */
export const MAX_PHOTO_SIZE = 25 * 1024 * 1024;

/** Maximum photos per claim (100) */
export const MAX_PHOTOS_PER_CLAIM = 100;

/** Maximum photos per retail job (50) */
export const MAX_PHOTOS_PER_RETAIL_JOB = 50;

/** Maximum photos per batch upload (allows uploading in chunks) */
export const MAX_PHOTOS_PER_BATCH = 50;

/** Maximum photos per lead (25) */
export const MAX_PHOTOS_PER_LEAD = 25;

// ═══════════════════════════════════════════════════════════════════════════════
// DOCUMENT UPLOAD LIMITS
// ═══════════════════════════════════════════════════════════════════════════════

/** Maximum file size for documents/PDFs (50MB) */
export const MAX_DOCUMENT_SIZE = 50 * 1024 * 1024;

/** Maximum documents per claim */
export const MAX_DOCUMENTS_PER_CLAIM = 50;

// ═══════════════════════════════════════════════════════════════════════════════
// BRANDING/AVATAR LIMITS
// ═══════════════════════════════════════════════════════════════════════════════

/** Maximum file size for logos/avatars (10MB) */
export const MAX_LOGO_SIZE = 10 * 1024 * 1024;

// ═══════════════════════════════════════════════════════════════════════════════
// ALLOWED FILE TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export const ALLOWED_PHOTO_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
];

export const ALLOWED_DOCUMENT_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

// ═══════════════════════════════════════════════════════════════════════════════
// STORAGE CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

export const STORAGE_BUCKETS = {
  claimPhotos: "claim-photos",
  claimDocuments: "claim-documents",
  completionPhotos: "completion-photos",
  evidence: "evidence",
  branding: "branding",
  avatars: "avatars",
  retailJobPhotos: "retail-job-photos",
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// RATE LIMITS (requests per minute)
// ═══════════════════════════════════════════════════════════════════════════════

/** Photo uploads per minute per org */
export const UPLOAD_RATE_LIMIT = 60;

/** AI analysis requests per minute per org */
export const AI_ANALYSIS_RATE_LIMIT = 30;

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function isAllowedPhotoType(mimeType: string): boolean {
  return ALLOWED_PHOTO_TYPES.includes(mimeType);
}

export function isAllowedDocumentType(mimeType: string): boolean {
  return ALLOWED_DOCUMENT_TYPES.includes(mimeType);
}

/**
 * Get upload config for a specific context
 */
export function getUploadConfig(context: "claim" | "retail" | "lead" | "completion") {
  switch (context) {
    case "claim":
      return {
        maxSize: MAX_PHOTO_SIZE,
        maxFiles: MAX_PHOTOS_PER_CLAIM,
        maxBatch: MAX_PHOTOS_PER_BATCH,
        allowedTypes: ALLOWED_PHOTO_TYPES,
      };
    case "retail":
      return {
        maxSize: MAX_PHOTO_SIZE,
        maxFiles: MAX_PHOTOS_PER_RETAIL_JOB,
        maxBatch: MAX_PHOTOS_PER_BATCH,
        allowedTypes: ALLOWED_PHOTO_TYPES,
      };
    case "lead":
      return {
        maxSize: MAX_PHOTO_SIZE,
        maxFiles: MAX_PHOTOS_PER_LEAD,
        maxBatch: MAX_PHOTOS_PER_BATCH,
        allowedTypes: ALLOWED_PHOTO_TYPES,
      };
    case "completion":
      return {
        maxSize: MAX_PHOTO_SIZE,
        maxFiles: 50,
        maxBatch: 25,
        allowedTypes: ALLOWED_PHOTO_TYPES,
      };
    default:
      return {
        maxSize: MAX_PHOTO_SIZE,
        maxFiles: MAX_PHOTOS_PER_BATCH,
        maxBatch: MAX_PHOTOS_PER_BATCH,
        allowedTypes: ALLOWED_PHOTO_TYPES,
      };
  }
}
