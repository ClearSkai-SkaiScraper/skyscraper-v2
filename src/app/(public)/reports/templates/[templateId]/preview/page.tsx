"use client";

import { SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { ClaimSelect } from "@/components/claims/ClaimSelect";
import { TemplateIntelligencePanel } from "@/components/templates/TemplateIntelligencePanel";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { logger } from "@/lib/logger";

interface TemplateData {
  id: string;
  slug: string;
  name: string;
  description?: string;
  previewPdfUrl?: string;
  // Intelligence metadata
  hasHtml: boolean;
  previewReady: boolean;
  generateReady: boolean;
  batchReady: boolean;
  aiEnriched: boolean;
  intendedUse: string | null;
  requiredData: Record<string, string[]> | null;
  autoFillMap: Record<string, string> | null;
}

interface TemplateListItem {
  slug: string;
  title: string;
}

export default function PublicTemplatePreviewPage() {
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const templateId = params?.templateId as string;
  const [template, setTemplate] = useState<TemplateData | null>(null);
  const [allTemplates, setAllTemplates] = useState<TemplateListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedClaimId, setSelectedClaimId] = useState<string>("");
  const [brandingOnly, setBrandingOnly] = useState<boolean>(false);
  const [refreshNonce, setRefreshNonce] = useState<number>(0);

  // Fetch all templates for navigation
  useEffect(() => {
    async function fetchAllTemplates() {
      try {
        const res = await fetch("/api/templates/marketplace", {
          credentials: "include",
          cache: "no-store",
        });
        if (res.ok) {
          const data = await res.json();
          if (data.ok && data.templates) {
            setAllTemplates(
              data.templates.map((t: any) => ({
                slug: t.slug,
                title: t.title,
              }))
            );
          }
        }
      } catch (err) {
        logger.error("[TEMPLATE_PREVIEW] Failed to fetch templates list:", err);
      }
    }
    void fetchAllTemplates();
  }, []);

  useEffect(() => {
    async function fetchTemplate() {
      try {
        setLoading(true);
        logger.debug("[TEMPLATE_PREVIEW] Fetching template:", templateId);

        // Fetch from marketplace API by slug
        const res = await fetch(`/api/templates/marketplace/${templateId}`, {
          credentials: "include",
          cache: "no-store",
        });

        if (!res.ok) {
          logger.error("[TEMPLATE_PREVIEW] Slug fetch failed, trying ID fallback");
          // Fallback: try as template ID if slug fails
          const idRes = await fetch(`/api/templates/marketplace?id=${templateId}`, {
            credentials: "include",
            cache: "no-store",
          });

          if (!idRes.ok) {
            logger.error("[TEMPLATE_PREVIEW] Both fetch attempts failed");
            throw new Error("Failed to load template");
          }

          const idData = await idRes.json();
          if (idData.templates && idData.templates[0]) {
            setTemplate({
              id: idData.templates[0].id,
              slug: idData.templates[0].slug,
              name: idData.templates[0].title,
              description: idData.templates[0].description,
              previewPdfUrl: idData.templates[0].previewPdfUrl,
            } as any);
            setLoading(false);
            return;
          }
          throw new Error("Template not found");
        }

        const data = await res.json();
        logger.debug("[TEMPLATE_PREVIEW] Fetched template:", data.template?.title);

        if (data.ok && data.template) {
          setTemplate({
            id: data.template.id,
            slug: data.template.slug,
            name: data.template.title,
            description: data.template.description,
            previewPdfUrl: data.template.previewPdfUrl,
            hasHtml: data.template.hasHtml || false,
            previewReady: data.template.previewReady || false,
            generateReady: data.template.generateReady || false,
            batchReady: data.template.batchReady || false,
            aiEnriched: data.template.aiEnriched || false,
            intendedUse: data.template.intendedUse || null,
            requiredData: data.template.requiredData || null,
            autoFillMap: data.template.autoFillMap || null,
          });
        } else {
          throw new Error(data.error || "Template not found");
        }
      } catch (err) {
        logger.error("[TEMPLATE_PREVIEW] Error:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    void fetchTemplate();
  }, [templateId]);

  // Calculate prev/next templates
  const currentIndex = allTemplates.findIndex((t) => t.slug === template?.slug);
  const prevTemplate = currentIndex > 0 ? allTemplates[currentIndex - 1] : null;
  const nextTemplate =
    currentIndex >= 0 && currentIndex < allTemplates.length - 1
      ? allTemplates[currentIndex + 1]
      : null;

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading preview...</span>
        </div>
      </div>
    );
  }

  if (error || !template) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="max-w-md rounded-lg border border-destructive/20 bg-destructive/5 p-6 text-center">
          <h3 className="mb-2 text-lg font-semibold">Preview Error</h3>
          <p className="mb-4 text-sm text-muted-foreground">{error || "Template not found"}</p>
          <div className="flex justify-center gap-2">
            <Link
              href="/reports/templates/marketplace"
              className="rounded-lg border bg-background px-4 py-2 text-sm hover:bg-muted"
            >
              Back to Marketplace
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const previewParams = new URLSearchParams();
  previewParams.set("preview", "1");
  if (brandingOnly) {
    previewParams.set("mode", "branding-only");
  } else if (selectedClaimId) {
    previewParams.set("claimId", selectedClaimId);
  }
  // Bust iframe/object caching when user hits refresh.
  previewParams.set("_", String(refreshNonce));

  const basePreviewUrl = template.previewPdfUrl || `/api/templates/${template.id}/pdf`;
  const proxyPreviewUrl = `${basePreviewUrl}?${previewParams.toString()}`;

  const downloadParams = new URLSearchParams(previewParams);
  downloadParams.set("download", "1");
  const proxyDownloadUrl = `${basePreviewUrl}?${downloadParams.toString()}`;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
      {/* Hero Header - Raven UI */}
      <div className="mb-6 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 p-6 text-white shadow-xl">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <Link
              href="/reports/templates/marketplace"
              className="mb-2 inline-flex items-center text-sm text-indigo-200 transition-colors hover:text-white"
            >
              ← Back to Marketplace
            </Link>
            <h1 className="text-2xl font-bold">{template.name}</h1>
            {template.description && (
              <p className="mt-1 text-sm text-indigo-100">{template.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() =>
                prevTemplate && router.push(`/reports/templates/${prevTemplate.slug}/preview`)
              }
              disabled={!prevTemplate}
              className="inline-flex items-center gap-1 rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-sm text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-40"
              title={prevTemplate ? `Previous: ${prevTemplate.title}` : "No previous template"}
            >
              <ChevronLeft className="h-4 w-4" />
              Prev
            </button>
            <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-medium">
              {currentIndex + 1} / {allTemplates.length}
            </span>
            <button
              onClick={() =>
                nextTemplate && router.push(`/reports/templates/${nextTemplate.slug}/preview`)
              }
              disabled={!nextTemplate}
              className="inline-flex items-center gap-1 rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-sm text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-40"
              title={nextTemplate ? `Next: ${nextTemplate.title}` : "No next template"}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-6 px-4 pb-8">
        {/* Template Intelligence Panel */}
        {template.slug && (
          <TemplateIntelligencePanel
            templateSlug={template.slug}
            hasHtml={template.hasHtml}
            previewReady={template.previewReady}
            generateReady={template.generateReady}
            batchReady={template.batchReady}
            aiEnriched={template.aiEnriched}
            intendedUse={template.intendedUse}
            requiredData={template.requiredData}
            autoFillMap={template.autoFillMap}
            isPreview={true}
          />
        )}

        {/* PDF Preview */}
        {template.previewPdfUrl ? (
          <div className="rounded-2xl border border-slate-200/50 bg-white/80 p-6 shadow-lg backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/80">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                Template Preview
              </h2>
              <div className="flex gap-2">
                <a
                  href={proxyDownloadUrl}
                  download
                  className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                    />
                  </svg>
                  Download
                </a>
                <a
                  href={proxyPreviewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                  </svg>
                  Full Page View
                </a>
              </div>
            </div>

            <div className="mb-4 rounded-lg border border-indigo-200 bg-indigo-50 p-3 text-sm text-indigo-800 dark:border-indigo-800 dark:bg-indigo-950 dark:text-indigo-200">
              Preview mode uses neutral placeholders (no company branding). Real org and claim data
              are injected when generating a report from a real claim.
            </div>

            <SignedIn>
              <div className="mb-4 grid gap-3 rounded-lg border bg-slate-50 p-4 dark:bg-slate-800 md:grid-cols-3 md:items-end">
                <div className="space-y-1">
                  <Label>Claim</Label>
                  <ClaimSelect
                    value={selectedClaimId}
                    onValueChange={(value) => {
                      setSelectedClaimId(value);
                      setBrandingOnly(false);
                      setRefreshNonce((n) => n + 1);
                    }}
                    placeholder="Select a claim for dynamic preview"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <Switch
                    checked={brandingOnly}
                    onCheckedChange={(checked) => {
                      setBrandingOnly(Boolean(checked));
                      setRefreshNonce((n) => n + 1);
                    }}
                    aria-label="Branding only"
                  />
                  <div>
                    <div className="text-sm font-medium">Branding Only</div>
                    <div className="text-xs text-muted-foreground">
                      Show org branding without claim data
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    variant="secondary"
                    onClick={() => setRefreshNonce((n) => n + 1)}
                    className="w-full md:w-auto"
                  >
                    Refresh Preview
                  </Button>
                </div>
              </div>
            </SignedIn>

            {/* Safari-safe PDF preview with fallback */}
            <div className="relative overflow-hidden rounded-xl border bg-slate-50">
              <object data={proxyPreviewUrl} type="application/pdf" className="h-[600px] w-full">
                <iframe
                  src={`${proxyPreviewUrl}#view=FitH`}
                  className="h-[600px] w-full"
                  title="Template Preview"
                >
                  {/* Fallback if both object and iframe fail */}
                  <div className="flex h-[600px] flex-col items-center justify-center gap-4 p-8 text-center">
                    <svg
                      className="h-16 w-16 text-slate-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                      />
                    </svg>
                    <div>
                      <p className="mb-2 font-semibold text-slate-700">
                        PDF preview not available in your browser
                      </p>
                      <p className="mb-4 text-sm text-slate-500">
                        Please use the buttons above to download or open in a new tab
                      </p>
                    </div>
                  </div>
                </iframe>
              </object>
            </div>

            <div className="mt-4 text-center">
              <SignedIn>
                <Link
                  href={`/reports/templates/marketplace?add=${template.id}`}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 font-semibold text-primary-foreground transition hover:bg-primary/90"
                >
                  Add to My Library
                </Link>
              </SignedIn>
              <SignedOut>
                <SignInButton mode="modal" forceRedirectUrl={pathname}>
                  <button className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 font-semibold text-primary-foreground transition hover:bg-primary/90">
                    Sign In to Add Template
                  </button>
                </SignInButton>
              </SignedOut>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-12 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
              <svg
                className="h-8 w-8 text-amber-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h3 className="mb-2 text-lg font-semibold text-amber-900">Preview Not Available Yet</h3>
            <p className="mb-4 text-sm text-amber-700">
              PDF preview for this template is being generated and will be available soon.
            </p>
            <p className="text-xs text-amber-600">Template ID: {template.id}</p>
          </div>
        )}
      </div>
    </div>
  );
}
