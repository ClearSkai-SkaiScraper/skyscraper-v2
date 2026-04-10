/**
 * Template Renderer
 *
 * Render templates to various formats including PDF
 * Uses Puppeteer for HTML-to-PDF conversion
 */

import puppeteer, {
  type Browser,
  type Page,
  type PDFOptions,
  type ScreenshotOptions,
} from "puppeteer";

import { logger } from "@/lib/logger";

import { mergeTemplate } from "./mergeTemplate";

export interface RenderOptions {
  format?: "html" | "pdf" | "docx";
  styles?: string;
}

export interface RenderResult {
  success: boolean;
  content?: string | Buffer;
  contentType?: string;
  error?: string;
}

export interface PdfRenderOptions {
  format?: "Letter" | "Legal" | "A4" | "Tabloid";
  margin?: {
    top?: string;
    right?: string;
    bottom?: string;
    left?: string;
  };
  printBackground?: boolean;
  landscape?: boolean;
}

export interface ThumbnailRenderOptions {
  width?: number;
  height?: number;
  quality?: number;
}

// Browser instance cache for reuse
let browserInstance: Browser | null = null;
let browserLastUsed = 0;
const BROWSER_IDLE_TIMEOUT = 30000; // Close browser after 30s of inactivity

/**
 * Get or create a browser instance
 */
async function getBrowser(): Promise<Browser> {
  // Check if existing browser is still usable
  if (browserInstance) {
    try {
      // Test if browser is still connected
      await browserInstance.version();
      browserLastUsed = Date.now();
      return browserInstance;
    } catch {
      // Browser disconnected, create new one
      browserInstance = null;
    }
  }

  // Launch new browser
  browserInstance = await puppeteer.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--disable-web-security",
      "--font-render-hinting=none",
    ],
  });

  browserLastUsed = Date.now();

  // Set up idle timeout to close browser when not in use
  scheduleIdleClose();

  return browserInstance;
}

/**
 * Schedule browser close after idle timeout
 */
function scheduleIdleClose() {
  setTimeout(async () => {
    if (browserInstance && Date.now() - browserLastUsed >= BROWSER_IDLE_TIMEOUT) {
      try {
        await browserInstance.close();
      } catch {
        // Ignore close errors
      }
      browserInstance = null;
    } else if (browserInstance) {
      // Reschedule if still in use
      scheduleIdleClose();
    }
  }, BROWSER_IDLE_TIMEOUT);
}

/**
 * Render template to HTML
 */
export function renderToHTML(
  templateHtml: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Record<string, any>,
  options: RenderOptions = {}
): RenderResult {
  try {
    const html = mergeTemplate(templateHtml, data);

    // Wrap in full HTML document if not already
    const fullHtml = html.includes("<html")
      ? html
      : `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>${options.styles || ""}</style>
</head>
<body>
  ${html}
</body>
</html>`;

    return {
      success: true,
      content: fullHtml,
      contentType: "text/html",
    };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Render template to PDF using Puppeteer
 */
export async function renderToPDF(
  templateHtml: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Record<string, any>,
  options: RenderOptions = {}
): Promise<RenderResult> {
  const htmlResult = renderToHTML(templateHtml, data, options);
  if (!htmlResult.success) {
    return htmlResult;
  }

  try {
    const pdfBuffer = await renderTemplateToPdf(htmlResult.content as string, data, {
      format: "Letter",
      printBackground: true,
    });

    return {
      success: true,
      content: pdfBuffer,
      contentType: "application/pdf",
    };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    logger.error("[Renderer] PDF generation failed:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Render HTML template to PDF buffer
 * Primary export for PDF generation
 */
export async function renderTemplateToPdf(
  templateHtml: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Record<string, any>,
  options: PdfRenderOptions = {}
): Promise<Buffer> {
  const {
    format = "Letter",
    margin = { top: "0.5in", right: "0.5in", bottom: "0.5in", left: "0.5in" },
    printBackground = true,
    landscape = false,
  } = options;

  let browser: Browser | null = null;
  let page: Page | null = null;

  try {
    // Get or create browser
    browser = await getBrowser();
    page = await browser.newPage();

    // Set viewport for consistent rendering
    await page.setViewport({
      width: landscape ? 1100 : 850,
      height: landscape ? 850 : 1100,
      deviceScaleFactor: 2,
    });

    // Merge template with data
    const mergedHtml = mergeTemplate(templateHtml, data);

    // Set page content
    await page.setContent(mergedHtml, {
      waitUntil: "networkidle0",
      timeout: 30000,
    });

    // Wait for any images/fonts to load
    await page.evaluate(() => {
      return Promise.all([
        // Wait for all images
        ...Array.from(document.images)
          .filter((img) => !img.complete)
          .map(
            (img) =>
              new Promise((resolve) => {
                img.onload = img.onerror = resolve;
              })
          ),
        // Wait for fonts
        document.fonts?.ready || Promise.resolve(),
      ]);
    });

    // Small delay for any CSS transitions to complete
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Generate PDF
    const pdfOptions: PDFOptions = {
      format,
      margin,
      printBackground,
      landscape,
      preferCSSPageSize: true,
    };

    const pdfBuffer = await page.pdf(pdfOptions);

    logger.debug(`[Renderer] PDF generated successfully, size: ${pdfBuffer.length} bytes`);

    return Buffer.from(pdfBuffer);
  } catch (error) {
    logger.error("[Renderer] PDF generation error:", error);
    throw new Error(
      `PDF generation failed: ${error instanceof Error ? error.message : String(error)}`
    );
  } finally {
    // Close the page but keep browser for reuse
    if (page) {
      try {
        await page.close();
      } catch {
        // Ignore page close errors
      }
    }
  }
}

/**
 * Render HTML template to PNG thumbnail
 */
export async function renderTemplateToThumbnail(
  templateHtml: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Record<string, any>,
  options: ThumbnailRenderOptions = {}
): Promise<Buffer> {
  const { width = 400, height = 520, quality = 90 } = options;

  let browser: Browser | null = null;
  let page: Page | null = null;

  try {
    // Get or create browser
    browser = await getBrowser();
    page = await browser.newPage();

    // Set viewport to match thumbnail size
    await page.setViewport({
      width: 850, // Full page width for rendering
      height: 1100, // Full page height
      deviceScaleFactor: 2,
    });

    // Merge template with data
    const mergedHtml = mergeTemplate(templateHtml, data);

    // Set page content
    await page.setContent(mergedHtml, {
      waitUntil: "networkidle0",
      timeout: 30000,
    });

    // Wait for images and fonts
    await page.evaluate(() => {
      return Promise.all([
        ...Array.from(document.images)
          .filter((img) => !img.complete)
          .map(
            (img) =>
              new Promise((resolve) => {
                img.onload = img.onerror = resolve;
              })
          ),
        document.fonts?.ready || Promise.resolve(),
      ]);
    });

    // Small delay for rendering
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Take screenshot of top portion (first "page")
    const screenshotOptions: ScreenshotOptions = {
      type: "png",
      clip: {
        x: 0,
        y: 0,
        width: 850,
        height: 1100,
      },
      omitBackground: false,
    };

    const fullBuffer = await page.screenshot(screenshotOptions);

    // Resize to thumbnail dimensions using sharp if available,
    // otherwise return full screenshot
    try {
      // Try to use sharp for resizing
      const sharp = await import("sharp").then((m) => m.default);
      const resizedBuffer = await sharp(fullBuffer)
        .resize(width, height, {
          fit: "cover",
          position: "top",
        })
        .png({ quality })
        .toBuffer();

      logger.debug(`[Renderer] Thumbnail generated, size: ${resizedBuffer.length} bytes`);
      return resizedBuffer;
    } catch {
      // Sharp not available, return full-size screenshot
      logger.debug("[Renderer] Sharp not available, returning full-size screenshot");
      return Buffer.from(fullBuffer);
    }
  } catch (error) {
    logger.error("[Renderer] Thumbnail generation error:", error);
    throw new Error(
      `Thumbnail generation failed: ${error instanceof Error ? error.message : String(error)}`
    );
  } finally {
    if (page) {
      try {
        await page.close();
      } catch {
        // Ignore page close errors
      }
    }
  }
}

/**
 * Render template (legacy interface)
 */
export async function render(
  templateHtml: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Record<string, any>,
  options: RenderOptions = {}
): Promise<RenderResult> {
  const { format = "html" } = options;

  switch (format) {
    case "pdf":
      return renderToPDF(templateHtml, data, options);
    case "html":
    default:
      return renderToHTML(templateHtml, data, options);
  }
}

/**
 * Close browser instance (for cleanup)
 */
export async function closeBrowser(): Promise<void> {
  if (browserInstance) {
    try {
      await browserInstance.close();
    } catch {
      // Ignore close errors
    }
    browserInstance = null;
  }
}
