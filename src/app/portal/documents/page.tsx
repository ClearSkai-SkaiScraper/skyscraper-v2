"use client";

import { useUser } from "@clerk/nextjs";
import { Clock, Download, Eye, FileText } from "lucide-react";
import { useEffect, useState } from "react";

import PortalPageHero from "@/components/portal/portal-page-hero";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Document {
  id: string;
  name: string;
  type: string;
  category: string;
  url: string;
  createdAt: string;
  claimId?: string;
  claimNumber?: string;
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function PortalDocumentsPage() {
  const { user } = useUser();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchDocs = async () => {
      try {
        const res = await fetch("/api/portal/documents");
        if (res.ok) {
          const data = await res.json();
          setDocuments(data.documents ?? []);
        }
      } catch {
        // silently fail — empty state will show
      } finally {
        setLoading(false);
      }
    };
    void fetchDocs();
  }, [user]);

  /* ── Loading ─────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-400 border-t-transparent" />
      </div>
    );
  }

  const claimDocs = documents.filter((d) => d.category === "claim");
  const projectDocs = documents.filter((d) => d.category === "project");

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6">
      <PortalPageHero
        title="My Documents"
        subtitle="View and download documents related to your claims and projects."
        icon={FileText}
        gradient="violet"
        stats={[
          { label: "Total", value: documents.length },
          { label: "Claims", value: claimDocs.length },
          { label: "Projects", value: projectDocs.length },
        ]}
      />

      {documents.length === 0 ? (
        /* ── Empty state ───────────────────────────────────── */
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 rounded-full bg-gradient-to-br from-violet-100 to-purple-100 p-4 dark:from-violet-900/40 dark:to-purple-900/40">
              <FileText className="h-8 w-8 text-violet-600 dark:text-violet-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              No documents yet
            </h3>
            <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">
              Documents from your claims, inspections, and projects will appear here once
              they&apos;re generated.
            </p>
          </CardContent>
        </Card>
      ) : (
        /* ── Tabbed document list ──────────────────────────── */
        <Tabs defaultValue="all" className="w-full">
          <TabsList>
            <TabsTrigger value="all">All ({documents.length})</TabsTrigger>
            <TabsTrigger value="claims">Claims ({claimDocs.length})</TabsTrigger>
            <TabsTrigger value="projects">Projects ({projectDocs.length})</TabsTrigger>
          </TabsList>

          {(["all", "claims", "projects"] as const).map((tab) => {
            const list = tab === "all" ? documents : tab === "claims" ? claimDocs : projectDocs;
            return (
              <TabsContent key={tab} value={tab} className="space-y-3">
                {list.map((doc) => (
                  <DocumentRow key={doc.id} doc={doc} />
                ))}
                {list.length === 0 && (
                  <p className="py-8 text-center text-sm text-slate-400">
                    No documents in this category.
                  </p>
                )}
              </TabsContent>
            );
          })}
        </Tabs>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Document Row                                                       */
/* ------------------------------------------------------------------ */

function DocumentRow({ doc }: { doc: Document }) {
  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="flex items-center gap-4 py-3">
        <div className="rounded-lg bg-violet-100 p-2 dark:bg-violet-900/40">
          <FileText className="h-5 w-5 text-violet-600 dark:text-violet-400" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-slate-900 dark:text-white">{doc.name}</p>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <Clock className="h-3 w-3" />
            {new Date(doc.createdAt).toLocaleDateString()}
            {doc.claimNumber && (
              <Badge variant="outline" className="text-[10px]">
                Claim #{doc.claimNumber}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {doc.url && (
            <>
              <Button variant="ghost" size="sm" asChild>
                <a href={doc.url} target="_blank" rel="noopener noreferrer">
                  <Eye className="h-4 w-4" />
                </a>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <a href={doc.url} download>
                  <Download className="h-4 w-4" />
                </a>
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
