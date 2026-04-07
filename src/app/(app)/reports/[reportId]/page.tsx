// src/app/(app)/reports/[reportId]/page.tsx
// Session 9: Fixed tenant isolation — added orgId to Prisma WHERE clause
// and removed conditional bypass that allowed access when orgId was null.
import Link from "next/link";
import { notFound } from "next/navigation";

import { ReportPreviewLayout } from "@/components/report/ReportPreviewLayout";
import { resolveOrg } from "@/lib/org/resolveOrg";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  params: { reportId: string };
};

export default async function ReportViewerPage({ params }: PageProps) {
  let orgId: string;
  try {
    const ctx = await resolveOrg();
    orgId = ctx.orgId;
  } catch {
    notFound();
  }

  const { reportId } = params;

  const report = await prisma.ai_reports.findFirst({
    where: { id: reportId, orgId },
    include: {
      claims: {
        include: {
          properties: true,
        },
      },
    },
  });

  if (!report) {
    notFound();
  }

  // Parse the content field as JSON to get the GeneratedReport
  let reportJson: any = null;
  try {
    reportJson = report.content ? JSON.parse(report.content) : null;
  } catch {
    // If content is not valid JSON, treat it as plain text
    reportJson = {
      title: report.title,
      subtitle: null,
      executiveSummary: report.content,
      sections: [],
      meta: {},
    };
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4 py-6">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
            <Link href={`/claims/${report.claimId}`} className="hover:underline">
              ← Back to Claim
            </Link>
            <span>•</span>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 uppercase">{report.type}</span>
          </div>
          <h1 className="text-xl font-semibold">{report.title}</h1>
          <p className="text-xs text-muted-foreground">
            Generated {new Date(report.createdAt).toLocaleString()}
          </p>
        </div>
      </header>

      {/* Report Content */}
      <ReportPreviewLayout report={reportJson} />
    </div>
  );
}
