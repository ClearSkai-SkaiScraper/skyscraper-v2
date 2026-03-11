/**
 * ============================================================================
 * SAFE PDF GENERATION WRAPPER
 * ============================================================================
 *
 * Wraps `htmlToPdfBuffer()` with:
 *   - Memory pre-check (skips if heap > 80%)
 *   - 45-second hard timeout
 *   - Graceful fallback to HTML download on failure
 *   - Structured logging for monitoring
 *
 * Usage:
 *   import { safePdfGenerate } from "@/lib/pdf/safePdfGenerate";
 *
 *   const result = await safePdfGenerate(html, { format: "Letter" });
 *   if (result.fallback) {
 *     // Serve HTML instead
 *     return new NextResponse(result.html, { headers: result.headers });
 *   }
 *   return new NextResponse(new Uint8Array(result.buffer), { headers: result.headers });
 *
 * ============================================================================
 */

import { logger } from "@/lib/logger";
import { htmlToPdfBuffer } from "@/lib/reports/pdf-utils";

// ── Configuration ────────────────────────────────────────────────────────────

/** Max heap usage (%) before we skip PDF generation entirely */
const HEAP_THRESHOLD_PERCENT = 80;

/** Hard timeout for PDF generation (ms) */
const PDF_TIMEOUT_MS = 45_000;

// ── Types ────────────────────────────────────────────────────────────────────

export interface SafePdfResult {
  /** True if PDF generation succeeded */
  success: true;
  /** The PDF buffer — ready to serve */
  buffer: Buffer;
  /** Whether this is a fallback HTML response */
  fallback: false;
  /** Pre-built headers for NextResponse */
  headers: Record<string, string>;
  /** Generation time in ms */
  durationMs: number;
}

export interface SafePdfFallback {
  /** PDF generation failed */
  success: false;
  /** The original HTML — serve as download instead */
  html: string;
  /** Whether this is a fallback HTML response */
  fallback: true;
  /** Pre-built headers for NextResponse */
  headers: Record<string, string>;
  /** Reason for fallback */
  reason: string;
}

export type SafePdfOutput = SafePdfResult | SafePdfFallback;

export interface SafePdfOptions {
  /** PDF format */
  format?: "Letter" | "A4";
  /** PDF margins */
  margin?: { top?: string; right?: string; bottom?: string; left?: string };
  /** Filename for Content-Disposition header */
  filename?: string;
  /** Inline or attachment? Default: "attachment" */
  disposition?: "inline" | "attachment";
}

// ── Implementation ───────────────────────────────────────────────────────────

export async function safePdfGenerate(
  html: string,
  options: SafePdfOptions = {}
): Promise<SafePdfOutput> {
  const {
    format = "Letter",
    margin,
    filename = "document.pdf",
    disposition = "attachment",
  } = options;

  const start = Date.now();
  const htmlFilename = filename.replace(/\.pdf$/i, ".html");

  // ── Pre-check: memory pressure ───────────────────────────────────────
  const mem = process.memoryUsage();
  const heapPercent = Math.round((mem.heapUsed / mem.heapTotal) * 100);

  if (heapPercent > HEAP_THRESHOLD_PERCENT) {
    const reason = `Memory pressure too high (${heapPercent}% heap used)`;
    logger.warn("[SAFE_PDF] Skipping PDF generation — memory pressure", {
      heapPercent,
      heapUsedMB: Math.round(mem.heapUsed / 1_048_576),
    });

    return {
      success: false,
      html,
      fallback: true,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `attachment; filename="${htmlFilename}"`,
        "X-PDF-Fallback": "true",
        "X-PDF-Fallback-Reason": reason,
      },
      reason,
    };
  }

  // ── Generate PDF with timeout ────────────────────────────────────────
  try {
    const pdfBuffer = await Promise.race([
      htmlToPdfBuffer(html, { format, margin }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("PDF generation timeout")), PDF_TIMEOUT_MS)
      ),
    ]);

    const durationMs = Date.now() - start;

    logger.info("[SAFE_PDF] Generated successfully", {
      filename,
      sizeKB: Math.round(pdfBuffer.length / 1024),
      durationMs,
    });

    return {
      success: true,
      buffer: pdfBuffer,
      fallback: false,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${disposition}; filename="${filename}"`,
        "Content-Length": String(pdfBuffer.length),
      },
      durationMs,
    };
  } catch (error) {
    const durationMs = Date.now() - start;
    const reason = error instanceof Error ? error.message : "Unknown PDF error";

    logger.error("[SAFE_PDF] PDF generation failed — returning HTML fallback", {
      filename,
      reason,
      durationMs,
    });

    return {
      success: false,
      html,
      fallback: true,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `attachment; filename="${htmlFilename}"`,
        "X-PDF-Fallback": "true",
        "X-PDF-Fallback-Reason": reason,
      },
      reason,
    };
  }
}
