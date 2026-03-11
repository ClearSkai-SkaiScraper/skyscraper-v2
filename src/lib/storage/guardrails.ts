/**
 * Storage Guardrails System
 *
 * Provides:
 * - Per-org storage quotas
 * - File type validation
 * - Size limits
 * - Usage tracking
 * - Rate limiting for uploads
 */

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

// Default storage limits by plan
export const STORAGE_LIMITS = {
  free: {
    maxStorageBytes: 5 * 1024 * 1024 * 1024, // 5GB
    maxFileSizeBytes: 25 * 1024 * 1024, // 25MB for photos
    maxFilesPerClaim: 200,
    maxClaimsPerMonth: 25,
  },
  starter: {
    maxStorageBytes: 100 * 1024 * 1024 * 1024, // 100GB per org
    maxFileSizeBytes: 50 * 1024 * 1024, // 50MB
    maxFilesPerClaim: 500,
    maxClaimsPerMonth: 100,
  },
  pro: {
    maxStorageBytes: 500 * 1024 * 1024 * 1024, // 500GB
    maxFileSizeBytes: 100 * 1024 * 1024, // 100MB
    maxFilesPerClaim: 1000,
    maxClaimsPerMonth: 500,
  },
  enterprise: {
    maxStorageBytes: 2000 * 1024 * 1024 * 1024, // 2TB
    maxFileSizeBytes: 200 * 1024 * 1024, // 200MB
    maxFilesPerClaim: 5000,
    maxClaimsPerMonth: -1, // Unlimited
  },
};

// Allowed file types by category
export const ALLOWED_FILE_TYPES: Record<string, string[]> = {
  images: [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/heic",
    "image/heif",
  ],
  documents: [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/plain",
    "text/csv",
  ],
  videos: ["video/mp4", "video/webm", "video/quicktime", "video/x-msvideo"],
  all: [], // Populated dynamically
};

// Combine all types
ALLOWED_FILE_TYPES.all = [
  ...ALLOWED_FILE_TYPES.images,
  ...ALLOWED_FILE_TYPES.documents,
  ...ALLOWED_FILE_TYPES.videos,
];

// Dangerous file types (always blocked)
const BLOCKED_EXTENSIONS = [
  ".exe",
  ".bat",
  ".cmd",
  ".sh",
  ".ps1",
  ".vbs",
  ".js",
  ".jar",
  ".msi",
  ".dll",
  ".sys",
  ".com",
  ".scr",
];

interface StorageQuota {
  usedBytes: number;
  maxBytes: number;
  percentUsed: number;
  filesCount: number;
  plan: string;
}

interface ValidationResult {
  valid: boolean;
  error?: string;
  code?: string;
}

/**
 * Get current storage usage for an organization
 */
export async function getStorageUsage(orgId: string): Promise<StorageQuota> {
  try {
    // Get org plan info
    const org = await prisma.org.findUnique({
      where: { id: orgId },
      select: { planKey: true },
    });

    const plan = (org?.planKey as keyof typeof STORAGE_LIMITS) || "free";
    const limits = STORAGE_LIMITS[plan] || STORAGE_LIMITS.free;

    // Get storage usage from file_assets
    const fileAssets = await prisma.file_assets.aggregate({
      where: { orgId },
      _sum: { sizeBytes: true },
      _count: true,
    });

    const totalBytes = fileAssets._sum.sizeBytes || 0;
    const filesCount = fileAssets._count || 0;

    return {
      usedBytes: totalBytes,
      maxBytes: limits.maxStorageBytes,
      percentUsed: Math.round((totalBytes / limits.maxStorageBytes) * 100),
      filesCount,
      plan,
    };
  } catch (error) {
    logger.error("[Storage] Error getting usage:", error);
    return {
      usedBytes: 0,
      maxBytes: STORAGE_LIMITS.free.maxStorageBytes,
      percentUsed: 0,
      filesCount: 0,
      plan: "free",
    };
  }
}

/**
 * Check if org has storage capacity for a file
 */
export async function checkStorageCapacity(
  orgId: string,
  fileSize: number
): Promise<ValidationResult> {
  const usage = await getStorageUsage(orgId);

  if (usage.usedBytes + fileSize > usage.maxBytes) {
    const usedGB = (usage.usedBytes / 1024 / 1024 / 1024).toFixed(2);
    const maxGB = (usage.maxBytes / 1024 / 1024 / 1024).toFixed(2);
    return {
      valid: false,
      error: `Storage quota exceeded. Used ${usedGB}GB of ${maxGB}GB. Upgrade your plan for more storage.`,
      code: "QUOTA_EXCEEDED",
    };
  }

  // Check if approaching limit (90%)
  if (usage.percentUsed >= 90) {
    logger.warn(`[Storage] Org ${orgId} at ${usage.percentUsed}% capacity`);
  }

  return { valid: true };
}

/**
 * Validate file before upload
 */
export function validateFile(
  file: { name: string; type: string; size: number },
  options: {
    maxSizeBytes?: number;
    allowedTypes?: string[];
    category?: "images" | "documents" | "videos" | "all";
  } = {}
): ValidationResult {
  const { name, type, size } = file;
  const {
    maxSizeBytes = 50 * 1024 * 1024, // 50MB default
    allowedTypes,
    category = "all",
  } = options;

  // Check file extension for blocked types
  const lowerName = name.toLowerCase();
  for (const ext of BLOCKED_EXTENSIONS) {
    if (lowerName.endsWith(ext)) {
      return {
        valid: false,
        error: `File type "${ext}" is not allowed for security reasons.`,
        code: "BLOCKED_TYPE",
      };
    }
  }

  // Check file size
  if (size > maxSizeBytes) {
    const maxMB = Math.round(maxSizeBytes / 1024 / 1024);
    const fileMB = Math.round(size / 1024 / 1024);
    return {
      valid: false,
      error: `File too large (${fileMB}MB). Maximum size is ${maxMB}MB.`,
      code: "FILE_TOO_LARGE",
    };
  }

  // Check file type
  const allowed = allowedTypes || ALLOWED_FILE_TYPES[category] || ALLOWED_FILE_TYPES.all;
  if (allowed.length > 0 && !allowed.includes(type)) {
    return {
      valid: false,
      error: `File type "${type}" is not allowed. Accepted types: ${allowed.slice(0, 5).join(", ")}...`,
      code: "INVALID_TYPE",
    };
  }

  // Check for empty file
  if (size === 0) {
    return {
      valid: false,
      error: "File is empty.",
      code: "EMPTY_FILE",
    };
  }

  return { valid: true };
}

/**
 * Check files per claim limit
 */
export async function checkClaimFileLimit(
  claimId: string,
  orgId: string
): Promise<ValidationResult> {
  const org = await prisma.org.findUnique({
    where: { id: orgId },
    select: { planKey: true },
  });

  const plan = (org?.planKey as keyof typeof STORAGE_LIMITS) || "free";
  const limits = STORAGE_LIMITS[plan] || STORAGE_LIMITS.free;

  const count = await prisma.file_assets.count({
    where: {
      claimId,
      // Only count user-uploaded files, not system-generated ones like damage reports
      // IMPORTANT: Prisma's notIn does NOT include NULL values (SQL behavior),
      // so we must use OR to explicitly allow NULLs
      OR: [{ file_type: { notIn: ["damage_report"] } }, { file_type: null }],
    },
  });

  if (count >= limits.maxFilesPerClaim) {
    return {
      valid: false,
      error: `Maximum files per claim reached (${limits.maxFilesPerClaim}). Upgrade your plan to add more.`,
      code: "CLAIM_FILE_LIMIT",
    };
  }

  return { valid: true };
}

/**
 * Check monthly claims limit
 */
export async function checkMonthlyClaimsLimit(orgId: string): Promise<ValidationResult> {
  const org = await prisma.org.findUnique({
    where: { id: orgId },
    select: { planKey: true },
  });

  const plan = (org?.planKey as keyof typeof STORAGE_LIMITS) || "free";
  const limits = STORAGE_LIMITS[plan] || STORAGE_LIMITS.free;

  // Unlimited for enterprise
  if (limits.maxClaimsPerMonth === -1) {
    return { valid: true };
  }

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const count = await prisma.claims.count({
    where: {
      orgId,
      createdAt: { gte: startOfMonth },
    },
  });

  if (count >= limits.maxClaimsPerMonth) {
    return {
      valid: false,
      error: `Monthly claims limit reached (${limits.maxClaimsPerMonth}). Upgrade your plan for more.`,
      code: "MONTHLY_CLAIMS_LIMIT",
    };
  }

  return { valid: true };
}

/**
 * Log storage event for audit
 */
export async function logStorageEvent(event: {
  orgId: string;
  userId: string;
  action: "upload" | "delete" | "download";
  filePath: string;
  fileSize?: number;
  fileType?: string;
  claimId?: string;
  success: boolean;
  error?: string;
}): Promise<void> {
  try {
    // Only log if we have a claimId and userId
    if (!event.claimId || !event.userId) {
      logger.debug("[Storage] Skipping log - missing claimId or userId");
      return;
    }

    await prisma.claim_activities.create({
      data: {
        id: `stor_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        claim_id: event.claimId,
        user_id: event.userId,
        type: "NOTE",
        message: `Storage ${event.action}: ${event.filePath}`,
        metadata: {
          action: event.action,
          filePath: event.filePath,
          fileSize: event.fileSize,
          fileType: event.fileType,
          success: event.success,
          error: event.error,
          timestamp: new Date().toISOString(),
        },
        created_at: new Date(),
      },
    });
  } catch (e) {
    logger.error("[Storage] Failed to log event:", e);
  }
}

/**
 * Format bytes for display
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Get storage summary for an org
 */
export async function getStorageSummary(orgId: string) {
  const usage = await getStorageUsage(orgId);

  return {
    used: formatBytes(usage.usedBytes),
    max: formatBytes(usage.maxBytes),
    percentUsed: usage.percentUsed,
    filesCount: usage.filesCount,
    plan: usage.plan,
    isNearLimit: usage.percentUsed >= 80,
    isAtLimit: usage.percentUsed >= 100,
    limits: STORAGE_LIMITS[usage.plan as keyof typeof STORAGE_LIMITS] || STORAGE_LIMITS.free,
  };
}
