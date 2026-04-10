import { ExternalLink, FileIcon, FileSpreadsheet, FileText, Image } from "lucide-react";
import Link from "next/link";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

interface ClientSharedPageProps {
  params: { slug: string };
}

export const dynamic = "force-dynamic";

export default async function ClientSharedPage({ params }: ClientSharedPageProps) {
  const { slug } = params;

  // Fetch client-visible documents for this network
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let documents: any[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let reports: any[] = [];

  try {
    // Look up the client by slug to scope queries
    const client = await prisma.client.findFirst({
      where: { slug },
      select: { id: true, orgId: true },
    });

    if (!client) {
      return (
        <div className="space-y-6">
          <header className="space-y-2">
            <h1 className="text-2xl font-semibold text-foreground">Shared with You</h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">No shared items found.</p>
          </header>
        </div>
      );
    }

    documents = [];

    // SECURITY: Only fetch reports scoped to this client's org
    reports = await prisma.ai_reports.findMany({
      where: {
        orgId: client.orgId ?? undefined,
        status: { in: ["finalized", "submitted"] },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
  } catch (error) {
    logger.error("[ClientSharedPage] Error fetching shared items:", error);
    // Gracefully handle DB errors - show empty state
  }

  const allItems = [
    ...documents.map((doc) => ({
      id: doc.id,
      type: "document" as const,
      title: doc.title,
      description: doc.description,
      url: doc.publicUrl,
      mimeType: doc.mimeType,
      createdAt: doc.createdAt,
      claimInfo: doc.claim
        ? `${doc.claim.claimNumber || "Claim"} - ${doc.claim.propertyAddress || "Unknown"}`
        : "Unknown claim",
    })),
    ...reports.map((rep) => ({
      id: rep.id,
      type: "report" as const,
      title: rep.title,
      description: rep.subtitle || `${rep.type} report`,
      url: rep.pdfUrl || "",
      mimeType: "application/pdf",
      createdAt: rep.createdAt,
      claimInfo: rep.address || "Report",
    })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  function getFileIcon(mimeType: string) {
    if (mimeType.startsWith("image/")) return <Image className="h-5 w-5" />;
    if (mimeType.includes("pdf")) return <FileText className="h-5 w-5" />;
    if (mimeType.includes("spreadsheet") || mimeType.includes("excel"))
      return <FileSpreadsheet className="h-5 w-5" />;
    return <FileIcon className="h-5 w-5" />;
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-foreground">Shared with You</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Reports, documents, and files your contractor has shared with you.
        </p>
      </header>

      {allItems.length === 0 ? (
        <div className="rounded-lg border bg-card p-8">
          <div className="space-y-3 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
              <FileText className="h-6 w-6 text-slate-600 dark:text-slate-400" />
            </div>
            <div>
              <h3 className="font-medium text-foreground">Nothing shared yet</h3>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                When your contractor shares reports, documents, or photos with you, they&apos;ll appear
                here.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {allItems.map((item) => (
            <div
              key={item.id}
              className="rounded-lg border bg-card p-4 transition-shadow hover:shadow-md"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                  {getFileIcon(item.mimeType)}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-medium text-foreground">{item.title}</h3>
                  {item.description && (
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                      {item.description}
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-500">
                    <span className="capitalize">{item.type}</span>
                    <span>•</span>
                    <span>{item.claimInfo}</span>
                    <span>•</span>
                    <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                {item.url && (
                  <Link
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-9 items-center gap-2 rounded-md border bg-background px-3 text-sm font-medium transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    View
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
