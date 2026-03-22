/**
 * PHASE 38-40: Complete Packet Export
 *
 * Downloads a comprehensive ZIP with claim, estimate, and pricing data
 * POST /api/export/complete-packet
 */

export const dynamic = "force-dynamic";

import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import JSZip from "jszip";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { logger } from "@/lib/observability/logger";
import prisma from "@/lib/prisma";
import { checkRateLimit, getRateLimitError } from "@/lib/ratelimit";
import { track } from "@/lib/track";

let _supabase: ReturnType<typeof createClient> | null = null;

function getSupabase() {
  if (!_supabase) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      // During build, return null placeholder
      return null!;
    }

    _supabase = createClient(url, key);
  }
  return _supabase;
}

// Input validation schema
const CompletePacketSchema = z.object({
  leadId: z.string().min(1, "Lead ID is required"),
});

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Rate limiting
    const rateLimit = await checkRateLimit(userId, "API");
    if (!rateLimit.success) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded",
          message: getRateLimitError(rateLimit.reset),
          limit: rateLimit.limit,
          remaining: rateLimit.remaining,
          reset: rateLimit.reset,
        },
        { status: 429 }
      );
    }

    // 3. Parse and validate request
    const body = await req.json();
    const parsed = CompletePacketSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid input",
          details: parsed.error.format(),
        },
        { status: 400 }
      );
    }

    const { leadId } = parsed.data;

    // 4. Get user info
    const user = await prisma.users.findUnique({
      where: { clerkUserId: userId },
      select: { id: true, orgId: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // B-22: Require orgId — never export data without tenant scoping
    if (!user.orgId) {
      return NextResponse.json({ error: "Organization context required" }, { status: 403 });
    }

    // Fetch org branding for packet header
    const orgBranding = user.orgId
      ? await prisma.org_branding.findFirst({ where: { orgId: user.orgId } })
      : null;
    const companyName = orgBranding?.companyName || "SkaiScraper Pro";

    // Fetch claim data
    const claims: any[] = await prisma.$queryRaw`
      SELECT * FROM "ClaimWriter" 
      WHERE "leadId" = ${leadId} AND "orgId" = ${user.orgId}
      ORDER BY "createdAt" DESC 
      LIMIT 1
    `;
    const claim = claims[0];

    // Fetch estimate data
    const estimates: any[] = await prisma.$queryRaw`
      SELECT * FROM "EstimateExport" 
      WHERE "leadId" = ${leadId} AND "orgId" = ${user.orgId}
      ORDER BY "createdAt" DESC 
      LIMIT 1
    `;
    const estimate = estimates[0];

    // Build comprehensive ZIP
    const zip = new JSZip();

    // Add claim files if available
    if (claim) {
      const claimFolder = zip.folder("1-claim");
      if (claimFolder) {
        if (claim.narrative) {
          claimFolder.file("narrative.txt", claim.narrative);
        }
        if (claim.scopeJson) {
          claimFolder.file("scope.json", JSON.stringify(claim.scopeJson, null, 2));
        }
        if (claim.carrierNotes) {
          const notes = JSON.parse(claim.carrierNotes);
          claimFolder.file(
            "rebuttals.txt",
            `WEAR AND TEAR REBUTTAL:
${notes.wearAndTear}

FUNCTIONAL DAMAGE REBUTTAL:
${notes.functionalDamage}

PRIOR DAMAGE REBUTTAL:
${notes.priorDamage}`
          );
        }
        if (claim.summary) {
          claimFolder.file("summary.txt", claim.summary);
        }
      }
    }

    // Add estimate files if available
    if (estimate) {
      const estimateFolder = zip.folder("2-estimate");
      if (estimateFolder) {
        if (estimate.xml) {
          estimateFolder.file("estimate.xml", estimate.xml);
        }
        if (estimate.symbility) {
          estimateFolder.file("symbility.json", JSON.stringify(estimate.symbility, null, 2));
        }
        if (estimate.summary) {
          estimateFolder.file("summary.txt", estimate.summary);
        }
      }
    }

    // Add master README
    zip.file(
      "README.txt",
      `${companyName.toUpperCase()} — COMPLETE CLAIM PACKET
Lead ID: ${leadId}
Generated: ${new Date().toISOString()}

This package contains:
${claim ? "✓ 1-claim/ - Complete claim narrative and scope" : "✗ No claim data"}
${estimate ? "✓ 2-estimate/ - Xactimate XML and Symbility JSON exports" : "✗ No estimate data"}

HOW TO USE:
1. Review claim narrative in 1-claim/narrative.txt
2. Import estimate.xml into Xactimate X1 or symbility.json into Symbility Claims
3. Use rebuttals.txt for carrier denial responses

Generated by ${companyName} via SkaiScraper Pro
https://skaiscrape.com`
    );

    // Generate ZIP buffer
    const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });

    // Upload to Supabase Storage
    const supabase = getSupabase();
    if (!supabase) {
      return NextResponse.json({ error: "Storage not configured" }, { status: 503 });
    }

    const fileName = `complete-packets/${leadId}-${Date.now()}.zip`;
    const { data, error } = await supabase.storage.from("exports").upload(fileName, zipBuffer, {
      contentType: "application/zip",
      upsert: false,
    });

    if (error) {
      logger.error("[CompletePacket] Upload error:", error);
      return NextResponse.json({ error: "Failed to upload export" }, { status: 500 });
    }

    // Get signed URL (valid for 7 days)
    const { data: signedUrlData } = await supabase.storage
      .from("exports")
      .createSignedUrl(fileName, 7 * 24 * 60 * 60);

    if (!signedUrlData?.signedUrl) {
      return NextResponse.json({ error: "Failed to generate signed URL" }, { status: 500 });
    }

    // Track analytics
    await track("complete_packet_downloaded", {
      props: {
        leadId,
        orgId: user.orgId,
        tokensUsed: 5,
        hasClaim: !!claim,
        hasEstimate: !!estimate,
        fileName,
      },
    }).catch(logger.error);

    return NextResponse.json({
      success: true,
      downloadUrl: signedUrlData.signedUrl,
      hasClaim: !!claim,
      hasEstimate: !!estimate,
      fileName,
    });
  } catch (error) {
    logger.error("[CompletePacket] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
