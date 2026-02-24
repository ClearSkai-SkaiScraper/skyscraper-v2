// ============================================================================
// AI PHOTO GROUPING ENGINE
// ============================================================================
// Pulls real photo data from file_assets and groups by category.
// Falls back to empty state when no photos are available.

import prisma from "@/lib/prisma";

import type { AIField, AISectionKey, AISectionState } from "../types";

export async function runPhotoGrouping(
  reportId: string,
  sectionKey: AISectionKey,
  _context?: { claimId?: string; orgId?: string }
): Promise<AISectionState> {
  const now = new Date().toISOString();

  // Attempt to resolve claimId/orgId from reportId
  let claimId = _context?.claimId;
  let orgId = _context?.orgId;
  if ((!claimId || !orgId) && reportId) {
    try {
      const report = await prisma.reports.findFirst({
        where: { id: reportId },
        select: { claimId: true, orgId: true },
      });
      if (!claimId) claimId = report?.claimId || undefined;
      if (!orgId) orgId = report?.orgId || undefined;
    } catch {
      // Non-fatal
    }
  }

  // Pull real photos from DB and group by category
  if (claimId && orgId) {
    try {
      const assets = await prisma.file_assets.findMany({
        where: {
          orgId,
          claimId,
          mimeType: { startsWith: "image/" },
        },
        orderBy: { createdAt: "asc" },
        take: 100,
      });

      if (assets.length > 0) {
        // Group photos by category
        const groups: Record<string, { title: string; photoIds: string[]; count: number }> = {};
        const photoTags: Record<string, string[]> = {};

        for (const asset of assets) {
          const category = asset.category || "uncategorized";
          if (!groups[category]) {
            groups[category] = {
              title: category.charAt(0).toUpperCase() + category.slice(1).replace(/-/g, " "),
              photoIds: [],
              count: 0,
            };
          }
          groups[category].photoIds.push(asset.id);
          groups[category].count++;

          // Build tags from available metadata
          const tags = [category];
          if (asset.photo_angle) tags.push(asset.photo_angle);
          photoTags[asset.id] = tags;
        }

        const fields: Record<string, AIField> = {
          photoGroups: {
            value: groups,
            aiGenerated: false,
            approved: true,
            source: "file_assets",
            confidence: 1.0,
            generatedAt: now,
          },
          photoTags: {
            value: photoTags,
            aiGenerated: false,
            approved: true,
            source: "file_assets",
            confidence: 1.0,
            generatedAt: now,
          },
          groupSummary: {
            value:
              `${assets.length} photos organized into ${Object.keys(groups).length} categories: ` +
              Object.entries(groups)
                .map(([, g]) => `${g.title} (${g.count})`)
                .join(", ") +
              ".",
            aiGenerated: false,
            approved: true,
            source: "file_assets",
            confidence: 1.0,
            generatedAt: now,
          },
        };

        return {
          sectionKey,
          status: "succeeded",
          fields,
          updatedAt: now,
        };
      }
    } catch (err) {
      console.warn("[AI Photo Grouping] DB query failed:", err);
    }
  }

  // Fallback: no photos on file
  const fields: Record<string, AIField> = {
    photoGroups: {
      value: {},
      aiGenerated: true,
      approved: false,
      source: "photoGrouping",
      confidence: 0,
      generatedAt: now,
    },
    photoTags: {
      value: {},
      aiGenerated: true,
      approved: false,
      source: "photoGrouping",
      confidence: 0,
      generatedAt: now,
    },
    groupSummary: {
      value: "No photos uploaded for this claim. Upload photos to enable auto-grouping.",
      aiGenerated: true,
      approved: false,
      source: "photoGrouping",
      confidence: 0,
      generatedAt: now,
    },
  };

  return {
    sectionKey,
    status: "succeeded",
    fields,
    updatedAt: now,
  };
}
