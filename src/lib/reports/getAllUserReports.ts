"use server";

import { getDelegate } from "@/lib/db/modelAliases";
import { resolveOrgSafe } from "@/lib/org/resolveOrg";
import prisma from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export type UnifiedReportType =
  | "AI_CLAIM_SCOPE"
  | "CLAIM_PDF"
  | "RETAIL_PROPOSAL"
  | "WEATHER_REPORT"
  | "VIDEO_REPORT"
  | "DAMAGE_REPORT"
  | "REBUTTAL"
  | "SUPPLEMENT"
  | "CONTRACTOR_PACKET"
  | "BID_PACKAGE"
  | "MATERIALS_ESTIMATE"
  | "PROJECT_PLAN"
  | "BAD_FAITH"
  | "CLAIMS_PACKET"
  | "OTHER";
export type UnifiedReport = {
  id: string;
  type: UnifiedReportType;
  claimId?: string | null;
  leadId?: string | null;
  title: string;
  createdAt: string;
  url: string | null;
  source: string;
  metadata?: Record<string, any> | null;
  claimNumber?: string | null;
  address?: string | null;
};

export async function getAllUserReports(params?: {
  type?: UnifiedReportType;
  from?: Date;
  to?: Date;
  search?: string;
  claimId?: string;
  leadId?: string;
}): Promise<UnifiedReport[]> {
  const resolved = await resolveOrgSafe();
  if (!resolved) return [];
  const { orgId, userId } = resolved;

  const { type, from, to, search, claimId, leadId } = params || {};

  const dateFilter: any = {};
  if (from) dateFilter.gte = from;
  if (to) dateFilter.lte = to;

  // Each data source is wrapped in try-catch so one failure
  // doesn't prevent the others from returning results.

  // 1. ai_reports — primary source for all AI-generated report history
  let historyUnified: UnifiedReport[] = [];
  try {
    const history = await prisma.ai_reports.findMany({
      where: {
        orgId,
        ...(claimId ? { claimId } : {}),
        ...(Object.keys(dateFilter).length ? { createdAt: dateFilter } : {}),
      },
      orderBy: { createdAt: "desc" },
    });

    historyUnified = history.map((r) => {
      const mappedType: UnifiedReportType =
        r.type === "claim_pdf"
          ? "CLAIM_PDF"
          : r.type.startsWith("AI_CLAIM_SCOPE") || r.type === "claim_scope"
            ? "AI_CLAIM_SCOPE"
            : r.type.includes("retail")
              ? "RETAIL_PROPOSAL"
              : r.type.includes("weather")
                ? "WEATHER_REPORT"
                : r.type.includes("video") || r.type === "video_report"
                  ? "VIDEO_REPORT"
                  : r.type.includes("rebuttal")
                    ? "REBUTTAL"
                    : r.type.includes("supplement")
                      ? "SUPPLEMENT"
                      : r.type.includes("bad_faith")
                        ? "BAD_FAITH"
                        : r.type.includes("damage")
                          ? "DAMAGE_REPORT"
                          : r.type.includes("project_plan")
                            ? "PROJECT_PLAN"
                            : "OTHER";
      return {
        id: r.id,
        type: mappedType,
        claimId: r.claimId || null,
        title: r.title || fallbackTitle(mappedType),
        createdAt: r.createdAt.toISOString(),
        url: null,
        source: sourceLabel(mappedType),
        metadata: {
          ...((r.attachments as Record<string, any>) || {}),
          status: r.status,
          tokensUsed: r.tokensUsed,
          model: r.model,
        },
      };
    });
  } catch (e) {
    console.warn(
      "[getAllUserReports] ai_reports fetch failed:",
      e instanceof Error ? e.message : e
    );
  }

  // 2. reports table — PDF reports generated from pdf-builder
  let pdfUnified: UnifiedReport[] = [];
  try {
    const pdfReports = await prisma.reports.findMany({
      where: {
        orgId,
        ...(claimId ? { claimId } : {}),
        ...(Object.keys(dateFilter).length ? { createdAt: dateFilter } : {}),
      },
      orderBy: { createdAt: "desc" },
    });

    pdfUnified = pdfReports.map((r) => ({
      id: r.id,
      type: "CLAIM_PDF" as UnifiedReportType,
      claimId: r.claimId || null,
      title: r.title || "Claim Report",
      createdAt: r.createdAt.toISOString(),
      url: r.pdfUrl || null,
      source: "PDF Builder",
      metadata: { type: r.type, sections: r.sections, pdfUrl: r.pdfUrl },
      claimNumber: null,
    }));
  } catch (e) {
    console.warn("[getAllUserReports] reports fetch failed:", e instanceof Error ? e.message : e);
  }

  // 3. weather_reports (scoped by createdById membership)
  let weatherUnified: UnifiedReport[] = [];
  try {
    const weatherReports = await prisma.weather_reports.findMany({
      where: {
        ...(claimId ? { claimId } : {}),
        ...(leadId ? { leadId } : {}),
        ...(Object.keys(dateFilter).length ? { createdAt: dateFilter } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    weatherUnified = weatherReports.map((w) => ({
      id: w.id,
      type: "WEATHER_REPORT",
      claimId: w.claimId ?? null,
      leadId: w.leadId ?? null,
      title: "Weather Verification",
      createdAt: w.createdAt.toISOString(),
      url: null,
      source: "Weather Verify",
      metadata: { address: w.address, mode: w.mode, overallAssessment: w.overallAssessment },
    }));
  } catch (e) {
    console.warn(
      "[getAllUserReports] weather_reports fetch failed:",
      e instanceof Error ? e.message : e
    );
  }

  // 4. file_assets (claim/lead attachments)
  let fileUnified: UnifiedReport[] = [];
  try {
    const files = await getDelegate("fileAsset").findMany({
      where: {
        orgId,
        OR: [{ claimId: { not: null } }, { leadId: { not: null } }],
        ...(claimId ? { claimId } : {}),
        ...(leadId ? { leadId } : {}),
        ...(Object.keys(dateFilter).length ? { createdAt: dateFilter } : {}),
      },
      orderBy: { createdAt: "desc" },
    });
    fileUnified = files.map((f) => ({
      id: f.id,
      type: "OTHER",
      claimId: f.claimId || null,
      leadId: f.leadId || null,
      title: f.filename,
      createdAt: f.createdAt.toISOString(),
      url: f.publicUrl,
      source: "File Asset",
      metadata: { mimeType: f.mimeType, sizeBytes: f.sizeBytes, category: f.category },
    }));
  } catch (e) {
    console.warn(
      "[getAllUserReports] file_assets fetch failed:",
      e instanceof Error ? e.message : e
    );
  }

  // 5. Retail Proposal Packets (Supabase)
  let retailUnified: UnifiedReport[] = [];
  try {
    const { supabase } = await createSupabaseServerClient();
    const { data: retailPackets } = await supabase
      .from("retail_packets")
      .select("id, org_id, userId, claim_id, status, current_step, created_at, updated_at, title")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (retailPackets) {
      retailUnified = retailPackets.map((p: any) => ({
        id: p.id,
        type: "RETAIL_PROPOSAL",
        claimId: p.claim_id || null,
        title: p.title || "Retail Proposal Draft",
        createdAt: new Date(p.created_at).toISOString(),
        url: null,
        source: sourceLabel("RETAIL_PROPOSAL"),
        metadata: { status: p.status, step: p.current_step },
        claimNumber: null,
        address: null,
      }));
    }
  } catch (e) {
    console.warn(
      "[getAllUserReports] Retail packets fetch failed:",
      e instanceof Error ? e.message : e
    );
  }

  // 6. report_history (raw SQL table — damage reports, rebuttals, supplements, etc.)
  let reportHistoryUnified: UnifiedReport[] = [];
  try {
    const rows: any[] = await prisma.$queryRawUnsafe(
      `SELECT id, org_id, user_id, type, source_id, title, file_url, metadata, created_at
       FROM report_history
       WHERE org_id = $1
       ORDER BY created_at DESC
       LIMIT 200`,
      orgId
    );
    reportHistoryUnified = rows.map((r: any) => {
      const mappedType = mapRawTypeToUnified(r.type);
      return {
        id: r.id,
        type: mappedType,
        claimId: r.source_id || null,
        title: r.title || fallbackTitle(mappedType),
        createdAt: new Date(r.created_at).toISOString(),
        url: r.file_url || null,
        source: sourceLabel(mappedType),
        metadata: typeof r.metadata === "string" ? JSON.parse(r.metadata) : r.metadata,
      };
    });
  } catch (e) {
    console.warn(
      "[getAllUserReports] report_history fetch failed:",
      e instanceof Error ? e.message : e
    );
  }

  let combined = [
    ...historyUnified,
    ...pdfUnified,
    ...weatherUnified,
    ...fileUnified,
    ...retailUnified,
    ...reportHistoryUnified,
  ];

  // Deduplicate: For weather reports, prefer entries from report_history (have URLs)
  // over entries from weather_reports table (no URLs)
  const seen = new Map<string, UnifiedReport>();
  for (const r of combined) {
    // Create a unique key based on type + rough timestamp (within 5 seconds)
    const timeKey = Math.floor(new Date(r.createdAt).getTime() / 5000);
    const key = `${r.type}-${r.claimId || ""}-${timeKey}`;
    const existing = seen.get(key);
    // Keep the one with a URL, or the newer one
    if (!existing || (r.url && !existing.url)) {
      seen.set(key, r);
    }
  }
  combined = Array.from(seen.values());

  // Enrich with claimNumber + address for search
  const claimIds = Array.from(new Set(combined.filter((c) => c.claimId).map((c) => c.claimId!)));
  if (claimIds.length) {
    const claims = await prisma.claims.findMany({
      where: { id: { in: claimIds } },
      select: { id: true, claimNumber: true, propertyId: true },
    });
    const propertyIds = Array.from(
      new Set(claims.filter((c) => c.propertyId).map((c) => c.propertyId!))
    );
    const properties = propertyIds.length
      ? await prisma.properties.findMany({
          where: { id: { in: propertyIds } },
          select: { id: true, street: true, city: true, state: true },
        })
      : [];
    const claimMap: Record<string, { claimNumber?: string | null; address?: string | null }> = {};
    claims.forEach((c) => {
      const prop = properties.find((p) => p.id === c.propertyId);
      claimMap[c.id] = {
        claimNumber: c.claimNumber || null,
        address: prop ? `${prop.street}, ${prop.city}, ${prop.state}` : null,
      };
    });
    combined = combined.map((c) =>
      c.claimId && claimMap[c.claimId]
        ? {
            ...c,
            claimNumber: claimMap[c.claimId].claimNumber || null,
            address: claimMap[c.claimId].address || null,
          }
        : c
    );
  }

  if (type) combined = combined.filter((r) => r.type === type);
  if (claimId) combined = combined.filter((r) => r.claimId === claimId);
  if (leadId) combined = combined.filter((r) => r.leadId === leadId);
  if (search) {
    const q = search.toLowerCase();
    combined = combined.filter((r) => {
      return (
        r.title.toLowerCase().includes(q) ||
        (r.claimNumber && r.claimNumber.toLowerCase().includes(q)) ||
        (r.address && r.address.toLowerCase().includes(q)) ||
        (r.claimId && r.claimId.toLowerCase().includes(q)) ||
        (r.metadata && JSON.stringify(r.metadata).toLowerCase().includes(q))
      );
    });
  }

  return combined.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function fallbackTitle(t: UnifiedReportType): string {
  switch (t) {
    case "AI_CLAIM_SCOPE":
      return "AI Claim Scope (Draft)";
    case "CLAIM_PDF":
      return "Claim PDF";
    case "RETAIL_PROPOSAL":
      return "Retail Proposal";
    case "WEATHER_REPORT":
      return "Weather Verification";
    case "VIDEO_REPORT":
      return "Video Report";
    case "DAMAGE_REPORT":
      return "Damage Report";
    case "REBUTTAL":
      return "Rebuttal Letter";
    case "SUPPLEMENT":
      return "Supplement";
    case "CONTRACTOR_PACKET":
      return "Contractor Packet";
    case "BID_PACKAGE":
      return "Bid Package";
    case "MATERIALS_ESTIMATE":
      return "Materials Estimate";
    case "PROJECT_PLAN":
      return "Project Plan";
    case "BAD_FAITH":
      return "Bad Faith Analysis";
    case "CLAIMS_PACKET":
      return "Claims Packet";
    default:
      return "Report";
  }
}

function sourceLabel(t: UnifiedReportType): string {
  switch (t) {
    case "AI_CLAIM_SCOPE":
      return "AI Claims Builder";
    case "CLAIM_PDF":
      return "AI Claims Builder";
    case "RETAIL_PROPOSAL":
      return "Retail Builder";
    case "WEATHER_REPORT":
      return "Weather Verify";
    case "VIDEO_REPORT":
      return "Video Intelligence";
    case "DAMAGE_REPORT":
      return "Damage Inspector";
    case "REBUTTAL":
      return "Rebuttal Builder";
    case "SUPPLEMENT":
      return "Supplement Builder";
    case "CONTRACTOR_PACKET":
      return "Contractor Packet";
    case "BID_PACKAGE":
      return "Bid Package";
    case "MATERIALS_ESTIMATE":
      return "Material Estimator";
    case "PROJECT_PLAN":
      return "Project Planner";
    case "BAD_FAITH":
      return "Bad Faith Detector";
    case "CLAIMS_PACKET":
      return "Claims Packet";
    default:
      return "Reports";
  }
}

/** Map raw type strings from report_history table to UnifiedReportType */
function mapRawTypeToUnified(raw: string): UnifiedReportType {
  switch (raw) {
    case "damage_report":
      return "DAMAGE_REPORT";
    case "weather_report":
      return "WEATHER_REPORT";
    case "rebuttal":
      return "REBUTTAL";
    case "supplement":
      return "SUPPLEMENT";
    case "contractor_packet":
    case "contractor-packet":
      return "CONTRACTOR_PACKET";
    case "bid_package":
      return "BID_PACKAGE";
    case "materials_estimate":
      return "MATERIALS_ESTIMATE";
    case "project_plan":
      return "PROJECT_PLAN";
    case "bad_faith":
      return "BAD_FAITH";
    case "claim_pdf":
      return "CLAIM_PDF";
    case "retail_proposal":
      return "RETAIL_PROPOSAL";
    case "claims_packet":
      return "CLAIMS_PACKET";
    default:
      return "OTHER";
  }
}
