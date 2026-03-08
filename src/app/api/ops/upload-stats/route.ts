export const dynamic = "force-dynamic";

import { logger } from "@/lib/logger";
import { NextResponse } from "next/server";

import { requireApiAuth } from "@/lib/auth/apiAuth";
import prisma from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";

/**
 * GET /api/ops/upload-stats
 * Returns upload statistics for ops dashboard
 */
export async function GET() {
  const authResult = await requireApiAuth();
  if (authResult instanceof NextResponse) return authResult;

  const rl = await checkRateLimit(authResult.userId, "API");
  if (!rl.success) return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });

  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Use FileAsset model for file/upload counts
    const uploadsToday = await prisma.file_assets.count({
      where: {
        createdAt: {
          gte: todayStart,
        },
      },
    });

    const totalFiles = await prisma.file_assets.count();

    // Estimate total storage (if sizeBytes exists in schema)
    // For now, return placeholder
    const totalSizeGB = "—";

    // Count failed uploads (check activities for upload errors)
    let failedToday = 0;
    try {
      failedToday = await prisma.activities.count({
        where: {
          type: {
            contains: "upload_error",
          },
          createdAt: {
            gte: todayStart,
          },
        },
      });
    } catch {
      // activities table may not have upload_error entries
      failedToday = 0;
    }

    return NextResponse.json({
      uploadsToday,
      totalFiles,
      totalSizeGB,
      failedToday,
    });
  } catch (error) {
    logger.error("[OPS_UPLOAD_STATS] Failed:", error);
    return NextResponse.json({
      uploadsToday: 0,
      totalFiles: 0,
      totalSizeGB: "—",
      failedToday: 0,
    });
  }
}
