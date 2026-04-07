/**
 * Evidence Page
 * Photo/video evidence management with section-based organization
 */

import { notFound } from "next/navigation";
import { Suspense } from "react";

import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import prisma from "@/lib/prisma";
import { REPORT_SECTION_REGISTRY } from "@/lib/reports/sectionRegistry";
import { safeOrgContext } from "@/lib/safeOrgContext";

import type { EvidenceAsset } from "./_components/EvidenceGrid";
import { EvidenceGrid } from "./_components/EvidenceGrid";
import { EvidenceUpload } from "./_components/EvidenceUpload";

// 🔥 CRITICAL: Force dynamic rendering - data is user/org specific
export const dynamic = "force-dynamic";
export const revalidate = 0;

interface EvidencePageProps {
  params: { claimId: string };
}

async function getClaimEvidence(claimId: string, orgId: string) {
  const claim = await prisma.claims.findFirst({
    where: { id: claimId, orgId },
    select: {
      id: true,
      claimNumber: true,
      title: true,
    },
  });

  if (!claim) return null;

  const allAssets = await prisma.file_assets.findMany({
    where: { claimId, orgId },
    orderBy: { createdAt: "asc" },
  });

  const toEvidenceAsset = (asset: (typeof allAssets)[0]): EvidenceAsset => ({
    id: asset.id,
    fileName: asset.filename,
    originalName: asset.filename,
    mimeType: asset.mimeType,
    sizeBytes: asset.sizeBytes,
    title: asset.note,
    description: asset.note,
    tags: asset.category ? [asset.category] : [],
    uploadedAt: asset.createdAt,
  });

  const groupedAssets = allAssets.reduce(
    (acc, asset) => {
      const category = asset.category || "ungrouped";
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(toEvidenceAsset(asset));
      return acc;
    },
    {} as Record<string, EvidenceAsset[]>
  );

  const ungroupedAssets = groupedAssets["ungrouped"] || [];

  return { claim, groupedAssets, ungroupedAssets };
}

export default async function EvidencePage({ params }: EvidencePageProps) {
  const ctx = await safeOrgContext();
  if (ctx.status !== "ok" || !ctx.orgId) {
    notFound();
  }

  const data = await getClaimEvidence(params.claimId, ctx.orgId);
  if (!data) {
    notFound();
  }

  const { claim, groupedAssets, ungroupedAssets } = data;

  // Get section keys from registry
  const sections = Object.values(REPORT_SECTION_REGISTRY).filter((s) =>
    ["roof", "siding", "gutters", "windows", "interior", "overview"].includes(s.key)
  );

  const allAssetsCount = Object.values(groupedAssets).reduce(
    (sum, assets) => sum + assets.length,
    0
  );

  return (
    <div className="container mx-auto space-y-6 py-6">
      <PageHeader title={`Evidence — ${claim.claimNumber}`} subtitle={claim.title} />

      <SectionCard title="Evidence Manager">
        <p className="mb-4 text-sm text-slate-600">Organize photos and videos by damage section</p>
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="all">All ({allAssetsCount})</TabsTrigger>
            {sections.map((section) => {
              const assets = groupedAssets[section.key] || [];
              const count = assets.length;
              return (
                <TabsTrigger key={section.key} value={section.key}>
                  {section.label} ({count})
                </TabsTrigger>
              );
            })}
            {ungroupedAssets.length > 0 && (
              <TabsTrigger value="ungrouped">Ungrouped ({ungroupedAssets.length})</TabsTrigger>
            )}
          </TabsList>

          {/* All Tab */}
          <TabsContent value="all" className="space-y-6">
            <EvidenceUpload claimId={params.claimId} />

            <div className="space-y-4">
              <h3 className="text-sm font-semibold">All Evidence</h3>
              <Suspense fallback={<Skeleton className="h-64" />}>
                <EvidenceGrid
                  claimId={params.claimId}
                  assets={Object.values(groupedAssets).flat()}
                />
              </Suspense>
            </div>
          </TabsContent>

          {/* Section Tabs */}
          {sections.map((section) => {
            const assets = groupedAssets[section.key] || [];

            return (
              <TabsContent key={section.key} value={section.key} className="space-y-6">
                <EvidenceUpload claimId={params.claimId} sectionKey={section.key} />

                <div className="space-y-4">
                  <h3 className="text-sm font-semibold">{section.label} Evidence</h3>
                  <Suspense fallback={<Skeleton className="h-64" />}>
                    <EvidenceGrid claimId={params.claimId} assets={assets} />
                  </Suspense>
                </div>
              </TabsContent>
            );
          })}
          {/* Ungrouped Tab */}
          {ungroupedAssets.length > 0 && (
            <TabsContent value="ungrouped" className="space-y-6">
              <EvidenceUpload claimId={params.claimId} />

              <div className="space-y-4">
                <h3 className="text-sm font-semibold">Ungrouped Evidence</h3>
                <p className="text-sm text-gray-600">
                  These photos haven't been organized into sections yet.
                </p>
                <Suspense fallback={<Skeleton className="h-64" />}>
                  <EvidenceGrid
                    claimId={params.claimId}
                    assets={ungroupedAssets.map((a) => ({
                      ...a,
                      sizeBytes: Number(a.sizeBytes),
                    }))}
                  />
                </Suspense>
              </div>
            </TabsContent>
          )}
        </Tabs>
      </SectionCard>
    </div>
  );
}
