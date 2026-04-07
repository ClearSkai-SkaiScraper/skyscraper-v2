/**
 * Common PDF Generation Utilities
 * Shared types and helper functions for PDF generation
 */

export interface PDFBranding {
  orgName?: string;
  brandLogoUrl?: string;
  pdfHeaderText?: string;
  pdfFooterText?: string;
}

export interface PDFMetadata {
  title: string;
  author?: string;
  subject?: string;
  creator: string;
  producer: string;
}

// Type for database adapters - supports both Prisma and raw query styles
type DbAdapter = {
  $queryRaw?<T = unknown>(query: TemplateStringsArray, ...values: unknown[]): Promise<T>;
  query?: (text: string, params?: unknown[]) => Promise<{ rows: unknown[] }>;
};

/**
 * Get organization branding for PDF generation
 *
 * @deprecated Use getOrgBrandingForPdf(orgId) from "@/lib/branding/getOrgBranding" instead.
 * That function queries both org_branding AND Org tables via Prisma ORM
 * (not raw SQL) and returns canonical defaults from constants.
 */
export async function getOrgBranding(db: DbAdapter, orgId: string): Promise<PDFBranding> {
  // Support Prisma $queryRaw style
  if (db.$queryRaw) {
    const result =
      (await db.$queryRaw`SELECT name, "brandLogoUrl", "pdfHeaderText", "pdfFooterText" 
       FROM "Org" WHERE id = ${orgId} LIMIT 1`) as Array<{
        name: string;
        brandLogoUrl: string | null;
        pdfHeaderText: string | null;
        pdfFooterText: string | null;
      }>;

    if (!result || result.length === 0) {
      return {};
    }

    return {
      orgName: result[0].name,
      brandLogoUrl: result[0].brandLogoUrl ?? undefined,
      pdfHeaderText: result[0].pdfHeaderText ?? undefined,
      pdfFooterText: result[0].pdfFooterText ?? undefined,
    };
  }

  // Fallback to raw query style (db.query)
  if (db.query) {
    const result = await db.query(
      `SELECT name, "brandLogoUrl", "pdfHeaderText", "pdfFooterText" FROM "Org" WHERE id = $1 LIMIT 1`,
      [orgId]
    );
    const rows = result.rows as Array<{
      name: string;
      brandLogoUrl: string | null;
      pdfHeaderText: string | null;
      pdfFooterText: string | null;
    }>;

    if (!rows || rows.length === 0) {
      return {};
    }

    return {
      orgName: rows[0].name,
      brandLogoUrl: rows[0].brandLogoUrl ?? undefined,
      pdfHeaderText: rows[0].pdfHeaderText ?? undefined,
      pdfFooterText: rows[0].pdfFooterText ?? undefined,
    };
  }

  // No valid query method available
  return {};
}

/**
 * Generate PDF metadata
 */
export function generatePDFMetadata(
  title: string,
  options?: {
    author?: string;
    subject?: string;
  }
): PDFMetadata {
  return {
    title,
    author: options?.author || "SkaiScraper",
    subject: options?.subject,
    creator: "SkaiScraper PDF Engine",
    producer: "React-PDF",
  };
}

/**
 * Sanitize filename for download
 */
export function sanitizeFilename(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9_-]/g, "_");
}

/**
 * Format date for PDF display
 */
export function formatPDFDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * Format section title
 */
export function formatSectionTitle(key: string): string {
  return key
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Render content safely for PDF
 */
export function renderContentSafely(content: unknown): string {
  if (typeof content === "string") {
    return content;
  }
  if (typeof content === "object" && content !== null) {
    return JSON.stringify(content, null, 2);
  }
  return String(content);
}
