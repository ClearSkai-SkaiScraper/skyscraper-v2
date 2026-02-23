// ============================================================================
// PDF EXPORT API — Hybrid LibreOffice + pdf-lib
// ============================================================================
// POST /api/export/pdf
// Body: { mode: "retail" | "claims", packetId | reportId, docxBuffer? }
// Returns: PDF blob
// ============================================================================

import { auth } from "@clerk/nextjs/server";
import { logger } from "@/lib/logger";
import * as Sentry from "@sentry/nextjs";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

import { exportToPdf, isLibreOfficeAvailable } from "@/lib/pdf/hybridExport";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    // Auth check
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse request body
    const body = await req.json();
    const { mode, packetId, reportId, data } = body;

    if (!mode || !data) {
      return NextResponse.json({ error: "Missing required fields: mode, data" }, { status: 400 });
    }

    if (mode !== "retail" && mode !== "claims") {
      return NextResponse.json(
        { error: "Invalid mode. Must be 'retail' or 'claims'" },
        {
          status: 400,
        }
      );
    }

    logger.debug(`[PDF_EXPORT] Starting export for ${mode} - ID: ${packetId || reportId}`);

    // Check LibreOffice availability
    const hasLibreOffice = await isLibreOfficeAvailable();
    logger.debug(`[PDF_EXPORT] LibreOffice available: ${hasLibreOffice}`);

    // Fetch branding (non-fatal if fails)
    let branding: any = null;
    try {
      const brandingRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/me/branding`, {
        headers: { Cookie: req.headers.get('cookie') || '' },
        cache: 'no-store'
      });
      if (brandingRes.ok) {
        branding = await brandingRes.json();
      }
    } catch (e) {
      logger.warn('[PDF_EXPORT] Branding fetch failed, continuing without branding');
    }

    const enrichedData = { ...data, branding };

    // Generate PDF using hybrid export (pass branding inside data)
    const pdfBuffer = await exportToPdf({
      mode,
      data: enrichedData,
    });

    logger.debug(`[PDF_EXPORT] PDF generated successfully (${pdfBuffer.length} bytes)`);

    // Return PDF as blob
    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${mode}-${packetId || reportId || Date.now()}.pdf"`,
        "Content-Length": pdfBuffer.length.toString(),
      },
    });
  } catch (error) {
    logger.error("[PDF_EXPORT] Export failed:", error);
    Sentry.captureException(error, {
      tags: { component: "pdf-export" },
    });
    return NextResponse.json({ error: "PDF export failed" }, { status: 500 });
  }
}

/**
 * GET endpoint to check PDF export capabilities
 */
export async function GET() {
  try {
    const hasLibreOffice = await isLibreOfficeAvailable();

    return NextResponse.json({
      ok: true,
      capabilities: {
        libreOffice: hasLibreOffice,
        pdfLib: true, // Always available
      },
      strategy: hasLibreOffice ? "LibreOffice + pdf-lib fallback" : "pdf-lib only",
    });
  } catch (error) {
    logger.error("[PDF_EXPORT] Capability check failed:", error);
    return NextResponse.json(
      { error: "Capability check failed" },
      { status: 500 }
    );
  }
}
