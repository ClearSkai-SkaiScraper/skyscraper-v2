import { FileStack, Lock } from "lucide-react";
import type { Metadata } from "next";
import dynamic from "next/dynamic";
import Link from "next/link";

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import { PageSectionCard } from "@/components/layout/PageSectionCard";
import { safeOrgContext } from "@/lib/safeOrgContext";

const SafeBuilder = dynamic(() => import("@/modules/reports/ui/Builder"), {
  ssr: false,
  loading: () => (
    <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
      Loading packet builder…
    </div>
  ),
});

export const metadata: Metadata = {
  title: "Bid Package Builder • SkaiScraper",
  description:
    "Comprehensive packet builder with all options - insurance claims, retail proposals, documentation, specifications, and more",
};

export default async function ContractorPacketBuilderPage() {
  // SINGLE SOURCE OF TRUTH: Use safeOrgContext() for ALL auth checks
  const orgCtx = await safeOrgContext();

  // Check authentication status
  if (orgCtx.status === "unauthenticated") {
    return (
      <PageContainer>
        <PageHero
          section="reports"
          title="Bid Package Builder"
          subtitle="Sign in to build bid packages"
          icon={<FileStack className="h-5 w-5" />}
        />
        <PageSectionCard>
          <div className="py-8 text-center">
            <Lock className="mx-auto mb-4 h-12 w-12 text-slate-400" />
            <h2 className="mb-2 text-xl font-bold">Sign In Required</h2>
            <p className="mb-4 text-sm text-slate-500">
              Please sign in to access the Bid Package builder.
            </p>
            <Link
              href="/sign-in?redirect_url=/reports/contractor-packet"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              Sign In →
            </Link>
          </div>
        </PageSectionCard>
      </PageContainer>
    );
  }

  // Always show the builder — it has its own context selector + branding check
  return (
    <PageContainer maxWidth="7xl">
      <PageHero
        section="reports"
        title="Bid Package Builder"
        subtitle="The ultimate all-in-one builder — select any sections, use any templates, generate comprehensive bid packages for retail proposals and contractor documentation"
        icon={<FileStack className="h-5 w-5" />}
      >
        <div className="flex gap-2">
          <a href="/reports/history">
            <button className="rounded border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">
              View History
            </button>
          </a>
          <a href="/reports/templates">
            <button className="flex items-center gap-1 rounded border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">
              <FileStack className="h-4 w-4" />
              All Templates
            </button>
          </a>
        </div>
      </PageHero>

      <SafeBuilder />
    </PageContainer>
  );
}
