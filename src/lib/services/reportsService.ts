import prisma from "@/lib/prisma";

export interface ReportDTO {
  id: string;
  orgId: string;
  type: string;
  title: string | null;
  status: string | null;
  createdAt: string;
  updatedAt: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapReport(report: any): ReportDTO {
  return {
    id: report.id,
    orgId: report.orgId,
    type: report.type,
    title: report.title || null,
    status: report.status || null,
    createdAt: report.createdAt?.toISOString() || new Date().toISOString(),
    updatedAt: report.updatedAt?.toISOString() || new Date().toISOString(),
  };
}

export async function getReportById(id: string, orgId: string): Promise<ReportDTO | null> {
  const report = await prisma.ai_reports.findFirst({ where: { id, orgId } });
  return report ? mapReport(report) : null;
}

export async function listReports(params: { orgId: string; type?: string; limit?: number; offset?: number }): Promise<{ reports: ReportDTO[]; total: number; limit: number; offset: number }> {
  const { orgId, type, limit = 50, offset = 0 } = params;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { orgId };
  if (type) where.type = type;
  const [reports, total] = await Promise.all([
    prisma.ai_reports.findMany({ where, orderBy: { createdAt: "desc" }, take: limit, skip: offset }),
    prisma.ai_reports.count({ where }),
  ]);
  return { reports: reports.map(mapReport), total, limit, offset };
}
