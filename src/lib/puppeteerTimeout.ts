/**
 * Puppeteer with timeout wrapper
 * Prevents hanging PDF generation in production
 */

import puppeteer, { Browser } from "puppeteer";

import { FeatureFlags } from "@/lib/flags";

export interface PuppeteerTimeoutError extends Error {
  code: "PDF_RENDER_TIMEOUT";
  timeoutMs: number;
}

/**
 * Launch browser with timeout protection
 */
export async function launchBrowserWithTimeout(
  timeoutMs: number = FeatureFlags.PDF_RENDER_TIMEOUT
): Promise<Browser> {
  const launchPromise = puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
  });

  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      const err = new Error("Browser launch timed out") as PuppeteerTimeoutError;
      err.code = "PDF_RENDER_TIMEOUT";
      err.timeoutMs = timeoutMs;
      reject(err);
    }, timeoutMs);
  });

  return Promise.race([launchPromise, timeoutPromise]);
}

/**
 * Generate PDF with timeout protection
 */
export async function generatePDFWithTimeout(
  html: string,
  options?: {
    format?: "Letter" | "A4";
    margin?: { top: string; right: string; bottom: string; left: string };
    timeoutMs?: number;
  }
): Promise<Buffer> {
  const timeoutMs = options?.timeoutMs || FeatureFlags.PDF_RENDER_TIMEOUT;
  let browser: Browser | null = null;

  try {
    browser = await launchBrowserWithTimeout(timeoutMs);
    const page = await browser.newPage();

    // Set content with timeout
    await Promise.race([
      page.setContent(html, { waitUntil: "networkidle0" }),
      new Promise((_, reject) =>
        setTimeout(() => {
          const err = new Error("Page content load timed out") as PuppeteerTimeoutError;
          err.code = "PDF_RENDER_TIMEOUT";
          err.timeoutMs = timeoutMs;
          reject(err);
        }, timeoutMs)
      ),
    ]);

    // Generate PDF with timeout
    const pdfPromise = page.pdf({
      format: options?.format || "Letter",
      printBackground: true,
      margin: options?.margin || { top: "0.5in", right: "0.5in", bottom: "0.5in", left: "0.5in" },
    });

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        const err = new Error("PDF generation timed out") as PuppeteerTimeoutError;
        err.code = "PDF_RENDER_TIMEOUT";
        err.timeoutMs = timeoutMs;
        reject(err);
      }, timeoutMs);
    });

    const pdfBuffer = await Promise.race([pdfPromise, timeoutPromise]);
    return pdfBuffer as Buffer;
  } finally {
    if (browser) {
      await browser.close().catch(() => {
        // Ignore close errors
      });
    }
  }
}
