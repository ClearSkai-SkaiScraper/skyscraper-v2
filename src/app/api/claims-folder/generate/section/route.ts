export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Per-Section Regeneration API
 *
 * POST /api/claims-folder/generate/section
 *   body: { claimId, sectionKey }
 *
 * Maps any section key to its appropriate generator and returns updated content.
 * This replaces the need to call individual generate/* endpoints.
 */

import { logger } from "@/lib/logger";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { getOpenAI } from "@/lib/ai/client";
import { getOrgClaimOrThrow, OrgScopeError } from "@/lib/auth/orgScope";
import { isAuthError, requireAuth } from "@/lib/auth/requireAuth";
import { onSectionGenerated } from "@/lib/claimiq/readiness-hooks";
import prisma from "@/lib/prisma";

const RequestSchema = z.object({
  claimId: z.string().min(1),
  sectionKey: z.string().min(1),
  /** If true, force regeneration even if content exists */
  force: z.boolean().optional().default(false),
});

/** Sections that have dedicated AI generators */
const AI_GENERATABLE_SECTIONS = [
  "executive-summary",
  "weather-cause",
  "repair-justification",
  "adjuster-cover-letter",
  "inspection-overview",
  "damage-grids",
  "code-compliance",
  "scope-pricing",
  "contractor-summary",
  "claim-checklist",
  "table-of-contents",
] as const;

/** Map section keys to their generator endpoints */
const SECTION_GENERATOR_MAP: Record<string, string> = {
  "executive-summary": "/api/claims-folder/generate/executive-summary",
  "weather-cause": "/api/claims-folder/generate/cause-of-loss",
  "repair-justification": "/api/claims-folder/generate/repair-justification",
  "adjuster-cover-letter": "/api/claims-folder/generate/cover-letter",
};

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (isAuthError(auth)) return auth;
    const { orgId, userId } = auth;

    const body = await request.json();
    const { claimId, sectionKey, force } = RequestSchema.parse(body);

    // Org scope check
    await getOrgClaimOrThrow(orgId, claimId);

    logger.info("[SECTION_REGEN]", { claimId, sectionKey, force });

    // ── Sections with dedicated endpoints — delegate to them ─────────────
    if (SECTION_GENERATOR_MAP[sectionKey]) {
      const endpoint = SECTION_GENERATOR_MAP[sectionKey];
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

      const res = await fetch(`${baseUrl}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Forward cookies for auth
          Cookie: request.headers.get("cookie") || "",
        },
        body: JSON.stringify({ claimId }),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        return NextResponse.json(
          { success: false, error: `Generator failed: ${errText.slice(0, 200)}` },
          { status: res.status }
        );
      }

      const result = await res.json();

      // Fire ClaimIQ readiness refresh (non-blocking)
      onSectionGenerated(claimId, orgId, userId, sectionKey).catch(() => {});

      return NextResponse.json({
        success: true,
        sectionKey,
        generated: true,
        data: result,
      });
    }

    // ── Sections that can be derived from data ───────────────────────────
    const claim = await prisma.claims.findFirst({
      where: { id: claimId, orgId },
      include: {
        properties: true,
        weather_reports: true,
      },
    });

    if (!claim) {
      return NextResponse.json({ success: false, error: "Claim not found" }, { status: 404 });
    }

    switch (sectionKey) {
      case "cover-sheet": {
        const property = claim.properties;
        return NextResponse.json({
          success: true,
          sectionKey,
          generated: true,
          data: {
            insuredName: (claim as any).insured_name || claim.title,
            propertyAddress: property
              ? `${property.street}, ${property.city}, ${property.state} ${property.zipCode}`
              : "Address not set",
            claimNumber: claim.claimNumber || "Not assigned",
            carrier: claim.carrier || "Not set",
            dateOfLoss: claim.dateOfLoss,
            policyNumber: (claim as any).policy_number || property?.policyNumber || "Not set",
          },
        });
      }

      case "table-of-contents": {
        // Derive TOC from section API
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        const tocRes = await fetch(
          `${baseUrl}/api/claims-folder/sections/table-of-contents?claimId=${claimId}`,
          { headers: { Cookie: request.headers.get("cookie") || "" } }
        );
        if (tocRes.ok) {
          const tocData = await tocRes.json();
          return NextResponse.json({
            success: true,
            sectionKey,
            generated: true,
            data: tocData,
          });
        }
        break;
      }

      case "inspection-overview": {
        // Generate from photos + detections
        const photos = await prisma.file_assets.findMany({
          where: { claimId, orgId, mimeType: { startsWith: "image/" } },
        });

        const detections = await prisma.file_assets.findMany({
          where: { claimId, orgId, category: "detection" },
        });

        // Collect damage types from ai_damage arrays and ai_tags
        const allDamageTypes = detections.flatMap((d) => [
          ...(d.ai_damage || []),
          ...(d.ai_tags || []),
        ]);
        const uniqueDamageTypes = [...new Set(allDamageTypes)].filter(Boolean);

        const openai = getOpenAI();
        const aiRes = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content:
                "You are a storm damage inspection report writer. Generate a professional inspection overview section.",
            },
            {
              role: "user",
              content: `Write an inspection overview for a property claim:
- Property: ${claim.properties?.street || "Unknown"}, ${claim.properties?.city || ""} ${claim.properties?.state || ""}
- Photos uploaded: ${photos.length}
- AI detections found: ${detections.length}
- Damage types detected: ${uniqueDamageTypes.join(", ") || "Pending analysis"}
- Date of Loss: ${claim.dateOfLoss?.toISOString().split("T")[0] || "Unknown"}

Write 2-3 paragraphs covering: inspection scope, methodology, and initial findings summary. Professional insurance tone.`,
            },
          ],
          temperature: 0.4,
          max_tokens: 800,
        });

        return NextResponse.json({
          success: true,
          sectionKey,
          generated: true,
          data: {
            narrative: aiRes.choices[0]?.message?.content || "",
            photoCount: photos.length,
            detectionCount: detections.length,
          },
        });
      }

      case "contractor-summary": {
        // Pull contractor info from org branding or claim data
        const orgBranding = await prisma.org_branding
          .findFirst({
            where: { orgId },
          })
          .catch(() => null);

        return NextResponse.json({
          success: true,
          sectionKey,
          generated: true,
          data: {
            companyName: orgBranding?.companyName || "Company Name",
            licenseNumber: orgBranding?.license || "Not set",
            phone: orgBranding?.phone || "Not set",
            email: orgBranding?.email || "Not set",
          },
        });
      }

      case "claim-checklist": {
        // Derive from readiness data
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        const checkRes = await fetch(
          `${baseUrl}/api/claims-folder/sections/claim-checklist?claimId=${claimId}`,
          { headers: { Cookie: request.headers.get("cookie") || "" } }
        );
        if (checkRes.ok) {
          const checkData = await checkRes.json();
          return NextResponse.json({
            success: true,
            sectionKey,
            generated: true,
            data: checkData,
          });
        }
        break;
      }

      case "damage-grids": {
        const detectionAssets = await prisma.file_assets.findMany({
          where: { claimId, orgId, category: "detection" },
          orderBy: { createdAt: "desc" },
          take: 100,
        });

        // Group by primary damage type from ai_damage array
        const grouped = detectionAssets.reduce(
          (acc: Record<string, typeof detectionAssets>, d) => {
            const primaryDamage =
              d.ai_damage?.[0] || d.ai_tags?.[0] || d.ai_caption || "unclassified";
            if (!acc[primaryDamage]) acc[primaryDamage] = [];
            acc[primaryDamage].push(d);
            return acc;
          },
          {} as Record<string, typeof detectionAssets>
        );

        return NextResponse.json({
          success: true,
          sectionKey,
          generated: true,
          data: {
            totalDetections: detectionAssets.length,
            damageTypes: Object.keys(grouped),
            grids: Object.entries(grouped).map(([label, dets]) => ({
              damageType: label,
              count: dets.length,
              avgConfidence:
                dets.reduce(
                  (s: number, d) => s + (d.ai_confidence ? Number(d.ai_confidence) : 0),
                  0
                ) / Math.max(dets.length, 1),
            })),
          },
        });
      }

      default:
        return NextResponse.json(
          {
            success: false,
            error: `Section "${sectionKey}" does not have a generator. It may require manual input.`,
            sectionKey,
            canAutoGenerate: false,
          },
          { status: 400 }
        );
    }

    return NextResponse.json(
      { success: false, error: "Section generation not implemented" },
      { status: 501 }
    );
  } catch (err) {
    if (err instanceof OrgScopeError) {
      return NextResponse.json(
        { success: false, error: "Claim not found or access denied" },
        { status: 403 }
      );
    }
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "Invalid request", details: err.issues },
        { status: 400 }
      );
    }
    logger.error("[SECTION_REGEN_ERROR]", err);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
