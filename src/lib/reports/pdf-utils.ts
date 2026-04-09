/* eslint-disable no-restricted-syntax */
/**
 * PDF generation and upload utilities
 * Handles HTML to PDF conversion and Supabase Storage uploads
 */

import chromium from "@sparticuz/chromium";
import { createClient } from "@supabase/supabase-js";
import puppeteer, { type Browser } from "puppeteer-core";

import { logger } from "@/lib/logger";

/**
 * Convert HTML to PDF buffer using Puppeteer with retry logic
 *
 * @param html - HTML string to convert
 * @param options - PDF generation options
 * @returns PDF buffer
 */
export async function htmlToPdfBuffer(
  html: string,
  options: {
    format?: "Letter" | "A4";
    margin?: { top?: string; right?: string; bottom?: string; left?: string };
    retries?: number;
  } = {}
): Promise<Buffer> {
  const maxRetries = options.retries ?? 2;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    let browser: Browser | null = null;

    try {
      if (attempt > 0) {
        logger.debug(`[htmlToPdfBuffer] Retry attempt ${attempt}/${maxRetries}`);
        // Wait before retry
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
      }

      // Launch headless browser (serverless-compatible)
      const isDev = process.env.NODE_ENV === "development";
      if (isDev) {
        browser = await puppeteer.launch({
          headless: true,
          args: ["--no-sandbox", "--disable-setuid-sandbox"],
          timeout: 30000,
        });
      } else {
        browser = await puppeteer.launch({
          args: chromium.args,
          executablePath: await chromium.executablePath(),
          headless: true,
          timeout: 30000,
        });
      }

      const page = await browser.newPage();

      // Set viewport for consistent rendering
      await page.setViewport({ width: 1280, height: 1024 });

      // Set HTML content with timeout
      await page.setContent(html, {
        waitUntil: "networkidle0",
        timeout: 30000,
      });

      // Generate PDF
      const pdfBuffer = await page.pdf({
        format: options.format || "Letter",
        printBackground: true,
        margin: options.margin || {
          top: "0.5in",
          right: "0.5in",
          bottom: "0.5in",
          left: "0.5in",
        },
        timeout: 30000,
      });

      await browser.close();
      browser = null;

      logger.debug(`[htmlToPdfBuffer] Success on attempt ${attempt + 1}`);
      return Buffer.from(pdfBuffer);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Unknown error");
      logger.error(`[htmlToPdfBuffer] Attempt ${attempt + 1} failed: ${lastError.message}`);

      if (browser) {
        try {
          await browser.close();
        } catch (e) {
          logger.error("[htmlToPdfBuffer] Error closing browser:", e);
        }
      }

      // Don't retry on last attempt
      if (attempt === maxRetries) {
        break;
      }
    }
  }

  // All retries failed
  throw new Error(
    `Failed to generate PDF after ${maxRetries + 1} attempts: ${lastError?.message || "Unknown error"}`
  );
}

/**
 * Structured result envelope for PDF operations
 */
export type PDFResult<T = string> =
  | { success: true; data: T; error: null }
  | { success: false; data: null; error: string };

/**
 * Upload PDF report to Supabase Storage with retry logic
 *
 * @param params - Upload parameters
 * @param params.bucket - Storage bucket name
 * @param params.key - File path/key in the bucket
 * @param params.buffer - PDF file buffer
 * @param params.retries - Number of retry attempts (default: 2)
 * @returns Public URL of uploaded file
 */
export async function uploadReport({
  bucket,
  key,
  buffer,
  retries = 2,
}: {
  bucket: string;
  key: string;
  buffer: Buffer;
  retries?: number;
}): Promise<string> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing Supabase configuration");
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      if (attempt > 0) {
        logger.debug(`[uploadReport] Retry attempt ${attempt}/${retries}`);
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
      }

      // Upload file (upsert = true to overwrite if exists)
      const { error } = await supabase.storage.from(bucket).upload(key, buffer, {
        contentType: "application/pdf",
        upsert: true,
      });

      if (error) {
        throw new Error(`Upload failed: ${error.message}`);
      }

      // Get public URL
      const { data } = supabase.storage.from(bucket).getPublicUrl(key);

      logger.debug(`[uploadReport] Success on attempt ${attempt + 1}`);
      return data.publicUrl;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Unknown error");
      logger.error(`[uploadReport] Attempt ${attempt + 1} failed: ${lastError.message}`);

      if (attempt === retries) {
        break;
      }
    }
  }

  throw new Error(
    `Failed to upload PDF after ${retries + 1} attempts: ${lastError?.message || "Unknown error"}`
  );
}

/**
 * Safe wrapper for PDF generation and upload with structured error handling
 *
 * @param html - HTML to convert to PDF
 * @param uploadParams - Upload parameters
 * @returns Structured result with URL or error
 */
export async function generateAndUploadPDF(
  html: string,
  uploadParams: {
    bucket: string;
    key: string;
    format?: "Letter" | "A4";
  }
): Promise<PDFResult> {
  try {
    // Generate PDF with retry
    const buffer = await htmlToPdfBuffer(html, {
      format: uploadParams.format,
      retries: 2,
    });

    // Upload with retry
    const url = await uploadReport({
      bucket: uploadParams.bucket,
      key: uploadParams.key,
      buffer,
      retries: 2,
    });

    return { success: true, data: url, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error(`[generateAndUploadPDF] Failed: ${message}`);
    return { success: false, data: null, error: message };
  }
}
