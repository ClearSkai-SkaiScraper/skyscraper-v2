// eslint-disable-next-line no-restricted-imports
import { currentUser } from "@clerk/nextjs/server";
import {
  ArrowLeft,
  Briefcase,
  FileSignature,
  FileText,
  HardHat,
  Shield,
  Upload,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { NoOrgMembershipBanner } from "@/components/guards/NoOrgMembershipBanner";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUserPermissions } from "@/lib/permissions";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "New Contract | SkaiScraper",
  description: "Upload and manage a new contract document",
};

export default async function NewContractPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");
  const { orgId } = await getCurrentUserPermissions();

  if (!orgId) {
    return <NoOrgMembershipBanner title="New Contract" />;
  }

  // Fetch claims and jobs for dropdown
  const [claims, jobs] = await Promise.all([
    prisma.claims.findMany({
      where: { orgId },
      orderBy: { updatedAt: "desc" },
      take: 50,
      select: { id: true, claimNumber: true, title: true },
    }),
    prisma.jobs.findMany({
      where: { orgId },
      orderBy: { updatedAt: "desc" },
      take: 50,
      select: { id: true, title: true, jobType: true },
    }),
  ]);

  return (
    <PageContainer maxWidth="5xl">
      <div className="mb-6">
        <Link
          href="/contracts"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Contracts
        </Link>
      </div>

      <PageHero
        section="reports"
        title="New Contract"
        subtitle="Upload a contract document for signature collection"
        icon={<FileSignature className="h-6 w-6" />}
      />

      <div className="mt-8 space-y-6">
        {/* Contract Type Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Select Contract Type
            </CardTitle>
            <CardDescription>Choose the type of contract you&apos;re uploading</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <ContractTypeCard
                icon={Shield}
                title="Insurance Claim"
                description="Contract for insurance-backed restoration work"
                color="blue"
              />
              <ContractTypeCard
                icon={Briefcase}
                title="Retail / Out-of-Pocket"
                description="Direct customer contract for paid work"
                color="emerald"
              />
              <ContractTypeCard
                icon={HardHat}
                title="Bid / Sales Package"
                description="Proposal or bid document for prospective work"
                color="amber"
              />
              <ContractTypeCard
                icon={FileSignature}
                title="Warranty Agreement"
                description="Warranty or guarantee documentation"
                color="purple"
              />
              <ContractTypeCard
                icon={FileText}
                title="Upgrade Contract"
                description="Upgrade or additional work agreement"
                color="rose"
              />
              <ContractTypeCard
                icon={FileText}
                title="Other"
                description="Any other contract type"
                color="slate"
              />
            </div>
          </CardContent>
        </Card>

        {/* Upload Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload Contract Document
            </CardTitle>
            <CardDescription>Upload a PDF contract to collect signatures</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl border-2 border-dashed border-slate-300 p-12 text-center dark:border-slate-700">
              <Upload className="mx-auto h-12 w-12 text-slate-400" />
              <h3 className="mt-4 text-lg font-semibold">
                Drop your contract here, or click to browse
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Supports PDF, DOC, DOCX up to 25MB
              </p>
              <Button className="mt-4" size="lg">
                Choose File
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Link to Job/Claim */}
        <Card>
          <CardHeader>
            <CardTitle>Link to Job or Claim (Optional)</CardTitle>
            <CardDescription>Associate this contract with an existing job or claim</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {claims.length} claims and {jobs.length} jobs available to link
            </p>
            <p className="mt-4 text-center text-sm text-amber-600 dark:text-amber-400">
              ⚠️ Full contract builder with signature pad and e-signature collection coming soon!
            </p>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button variant="outline" asChild>
            <Link href="/contracts">Cancel</Link>
          </Button>
          <Button disabled>
            <FileSignature className="mr-2 h-4 w-4" />
            Create Contract
          </Button>
        </div>
      </div>
    </PageContainer>
  );
}

function ContractTypeCard({
  icon: Icon,
  title,
  description,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  color: string;
}) {
  const colorMap: Record<string, { bg: string; border: string; icon: string }> = {
    blue: {
      bg: "bg-blue-50 dark:bg-blue-950/30",
      border: "border-blue-200 dark:border-blue-800",
      icon: "text-blue-600",
    },
    emerald: {
      bg: "bg-emerald-50 dark:bg-emerald-950/30",
      border: "border-emerald-200 dark:border-emerald-800",
      icon: "text-emerald-600",
    },
    amber: {
      bg: "bg-amber-50 dark:bg-amber-950/30",
      border: "border-amber-200 dark:border-amber-800",
      icon: "text-amber-600",
    },
    purple: {
      bg: "bg-purple-50 dark:bg-purple-950/30",
      border: "border-purple-200 dark:border-purple-800",
      icon: "text-purple-600",
    },
    rose: {
      bg: "bg-rose-50 dark:bg-rose-950/30",
      border: "border-rose-200 dark:border-rose-800",
      icon: "text-rose-600",
    },
    slate: {
      bg: "bg-slate-50 dark:bg-slate-800/50",
      border: "border-slate-200 dark:border-slate-700",
      icon: "text-slate-600",
    },
  };

  const c = colorMap[color] || colorMap.slate;

  return (
    <button
      type="button"
      className={`rounded-xl border ${c.border} ${c.bg} p-4 text-left transition-all hover:shadow-md`}
    >
      <Icon className={`h-6 w-6 ${c.icon}`} />
      <h4 className="mt-2 font-semibold">{title}</h4>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
    </button>
  );
}
