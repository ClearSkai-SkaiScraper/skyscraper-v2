import * as Sentry from "@sentry/nextjs";

import { withDbSpan } from "@/lib/monitoring/dbSpan";
import { incrementDrift } from "@/lib/monitoring/driftMetrics";
import prisma from "@/lib/prisma";

export async function safeLeadsSelect(orgId: string, take = 100) {
  try {
    const leads = await withDbSpan("leads.select.full", () =>
      prisma.leads.findMany({
        where: { orgId },
        select: { id: true, title: true, stage: true, source: true },
        orderBy: { createdAt: "desc" },
        take,
      })
    );
    Sentry.addBreadcrumb({
      category: "leads",
      level: "info",
      message: "leads.full.success",
      data: { count: leads.length, orgId },
    });
    return leads;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (e: any) {
    const msg = String(e?.message || "").toLowerCase();
    const drift =
      msg.includes("does not exist") ||
      msg.includes("column") ||
      msg.includes("title") ||
      msg.includes("status") ||
      msg.includes("source");
    if (!drift) throw e;
    Sentry.captureMessage("safeLeadsSelect: drift detected; applying fallback", {
      level: "warning",
      contexts: { error: { message: e?.message } },
    });
    incrementDrift("leads");
    Sentry.addBreadcrumb({
      category: "leads",
      level: "warning",
      message: "leads.fallback.start",
      data: { orgId },
    });
    try {
      const raw = await withDbSpan("leads.select.fallback", () =>
        prisma.leads.findMany({
          where: { orgId },
          select: { id: true },
          orderBy: { createdAt: "desc" },
          take,
        })
      );
      const mapped = raw.map((r) => ({ id: r.id, title: null, status: null, source: null }));
      Sentry.addBreadcrumb({
        category: "leads",
        level: "info",
        message: "leads.fallback.success",
        data: { count: mapped.length },
      });
      return mapped;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (fallbackErr: any) {
      Sentry.captureMessage("safeLeadsSelect: fallback failed", {
        level: "error",
        contexts: { fallback: { message: fallbackErr?.message } },
      });
      return [];
    }
  }
}
