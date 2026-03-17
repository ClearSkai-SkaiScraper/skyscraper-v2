/**
 * /claims/[claimId]/carrier — Carrier Intelligence Page
 *
 * AI-generated carrier-specific information to help build damage reports,
 * supplements, and rebuttals inline with the specific carrier's policies,
 * coverage guidelines, and rules.
 *
 * Uses the existing `ai_reports` table with type="carrier-intelligence"
 * and stores structured JSON in the `content` field.
 */

import {
  AlertTriangle,
  BookOpen,
  Building2,
  Clock,
  FileText,
  RefreshCw,
  Shield,
  Sparkles,
  Zap,
} from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { NoOrgMembershipBanner } from "@/components/guards/NoOrgMembershipBanner";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import prisma from "@/lib/prisma";
import { safeOrgContext } from "@/lib/safeOrgContext";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Carrier Intelligence | SkaiScraper",
  description:
    "AI-generated carrier-specific policies, coverage guidelines, and rules to support claim documentation.",
};

interface CarrierIntelligenceData {
  guidelines?: string;
  coverageNotes?: string;
  policyRules?: string;
  supplementTips?: string;
  rebuttalNotes?: string;
  commonDenials?: string;
}

interface Props {
  params: { claimId: string };
}

export default async function CarrierPage({ params }: Props) {
  const { claimId } = params;
  const ctx = await safeOrgContext();

  if (ctx.status !== "ok" || !ctx.orgId) {
    return <NoOrgMembershipBanner title="Carrier Intelligence" />;
  }

  const orgId = ctx.orgId;

  // Fetch claim with property relation to get carrier + location
  const claim = await prisma.claims.findFirst({
    where: { id: claimId, orgId },
    select: {
      id: true,
      carrier: true,
      damageType: true,
      properties: {
        select: { propertyType: true, city: true, state: true },
      },
    },
  });

  if (!claim) {
    notFound();
  }

  const carrierName = claim.carrier || "Unknown Carrier";

  // Look for existing carrier intelligence in ai_reports
  const existingReport = await prisma.ai_reports.findFirst({
    where: { claimId, orgId, type: "carrier-intelligence" },
    orderBy: { createdAt: "desc" },
    select: { id: true, content: true, createdAt: true },
  });

  let carrierData: CarrierIntelligenceData | null = null;
  if (existingReport) {
    try {
      carrierData = JSON.parse(existingReport.content) as CarrierIntelligenceData;
    } catch {
      carrierData = null;
    }
  }

  const hasData = !!carrierData;

  const infoSections = [
    {
      key: "guidelines",
      title: "Coverage Guidelines",
      description:
        "Carrier-specific coverage policies, inclusions, exclusions, and documentation requirements.",
      icon: BookOpen,
      color: "from-blue-500 to-blue-600",
      content: carrierData?.guidelines,
    },
    {
      key: "coverageNotes",
      title: "Coverage & Policy Notes",
      description:
        "Key policy details, coverage limits, deductible structures, and endorsement info.",
      icon: Shield,
      color: "from-emerald-500 to-emerald-600",
      content: carrierData?.coverageNotes,
    },
    {
      key: "policyRules",
      title: "Claim Filing Rules",
      description:
        "Filing deadlines, required documentation, adjuster protocols, and process rules.",
      icon: FileText,
      color: "from-violet-500 to-violet-600",
      content: carrierData?.policyRules,
    },
    {
      key: "supplementTips",
      title: "Supplement Strategy",
      description:
        "Best practices for writing supplements to this carrier — formatting, language, and evidence.",
      icon: Zap,
      color: "from-amber-500 to-amber-600",
      content: carrierData?.supplementTips,
    },
    {
      key: "rebuttalNotes",
      title: "Rebuttal Playbook",
      description: "Common denial reasons and effective rebuttal strategies for this carrier.",
      icon: AlertTriangle,
      color: "from-red-500 to-red-600",
      content: carrierData?.rebuttalNotes,
    },
    {
      key: "commonDenials",
      title: "Common Denials & Pitfalls",
      description: "Frequent denial triggers, documentation gaps, and pitfalls to avoid.",
      icon: AlertTriangle,
      color: "from-rose-500 to-rose-600",
      content: carrierData?.commonDenials,
    },
  ];

  return (
    <PageContainer maxWidth="6xl">
      {/* Header */}
      <div className="mb-8">
        <div className="mb-2 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-lg">
            <Building2 className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              {carrierName} — Carrier Intelligence
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              AI-generated carrier-specific policies, coverage info, and claim strategy
            </p>
          </div>
        </div>

        {existingReport?.createdAt && (
          <div className="mt-3 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <Clock className="h-3.5 w-3.5" />
            <span>
              Last generated:{" "}
              {new Date(existingReport.createdAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </span>
          </div>
        )}

        {/* Action buttons */}
        <div className="mt-4 flex flex-wrap gap-3">
          <CarrierGenerateButton claimId={claimId} carrierName={carrierName} hasData={hasData} />
        </div>
      </div>

      {/* Content */}
      {!hasData ? (
        <Card className="border-2 border-dashed border-slate-300 dark:border-slate-700">
          <CardContent className="py-16 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-900/20">
              <Sparkles className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              No Carrier Data Yet
            </h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">
              Click &quot;Generate Carrier Intelligence&quot; to have AI research {carrierName}
              &apos;s policies, coverage guidelines, claim rules, and build a strategy playbook for
              this claim.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {infoSections.map((section) => {
            const Icon = section.icon;
            return (
              <Card key={section.key} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ${section.color} shadow-sm`}
                    >
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{section.title}</CardTitle>
                      <CardDescription className="text-xs">{section.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {section.content ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                      {section.content}
                    </div>
                  ) : (
                    <p className="text-sm italic text-slate-400 dark:text-slate-500">
                      Not yet generated — click Generate above to populate.
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </PageContainer>
  );
}

/* ─────────────── Client-side Generate Button ─────────────── */

function CarrierGenerateButton({
  claimId,
  carrierName,
  hasData,
}: {
  claimId: string;
  carrierName: string;
  hasData: boolean;
}) {
  "use client";
  return (
    <form action={`/api/claims/${claimId}/carrier-intelligence`} method="POST">
      <Button type="submit" className="gap-2 bg-indigo-600 text-white hover:bg-indigo-700">
        {hasData ? (
          <>
            <RefreshCw className="h-4 w-4" />
            Regenerate Carrier Intelligence
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" />
            Generate Carrier Intelligence
          </>
        )}
      </Button>
    </form>
  );
}
