// ============================================================================
// AI CODE COMPLIANCE ENGINE
// ============================================================================
// Pulls real code citations from the code_requirements table.
// Falls back to empty state when no DB data is available.

import prisma from "@/lib/prisma";

import type { AIField, AISectionKey, AISectionState } from "../types";

export async function runCodes(
  reportId: string,
  sectionKey: AISectionKey,
  _context?: { orgId?: string }
): Promise<AISectionState> {
  const now = new Date().toISOString();

  // Attempt to resolve orgId from reportId
  let orgId = _context?.orgId;
  if (!orgId && reportId) {
    try {
      const report = await prisma.reports.findFirst({
        where: { id: reportId },
        select: { orgId: true },
      });
      orgId = report?.orgId || undefined;
    } catch {
      // Non-fatal
    }
  }

  // Pull real code citations from DB
  if (orgId) {
    try {
      const codes = await prisma.code_requirements.findMany({
        where: { orgId },
      });

      if (codes.length > 0) {
        const citations = codes.map((c) => ({
          code: c.code,
          description: c.summary,
          jurisdictionType: c.region?.includes("IRC")
            ? "IRC"
            : c.region?.includes("IBC")
              ? "IBC"
              : c.region?.includes("Local") || c.region?.includes("local")
                ? "Local"
                : "Manufacturer",
          excerpt: c.summary,
          applicability: c.summary,
        }));

        const fields: Record<string, AIField> = {
          citations: {
            value: citations,
            aiGenerated: false,
            approved: true,
            source: "code_requirements",
            confidence: 1.0,
            generatedAt: now,
          },
          jurisdictionSummary: {
            value: `${codes.length} code requirement(s) on file for this organization.`,
            aiGenerated: false,
            approved: true,
            source: "code_requirements",
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
      console.warn("[AI Codes Engine] DB query failed:", err);
    }
  }

  // Fallback: no codes on file
  const fields: Record<string, AIField> = {
    citations: {
      value: [],
      aiGenerated: true,
      approved: false,
      source: "codes",
      confidence: 0,
      generatedAt: now,
    },
    jurisdictionSummary: {
      value:
        "No code requirements on file. Add IRC/IBC citations via Settings → Code Requirements " +
        "or use the AI Code Compliance tool to auto-detect requirements for your jurisdiction.",
      aiGenerated: true,
      approved: false,
      source: "codes",
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
