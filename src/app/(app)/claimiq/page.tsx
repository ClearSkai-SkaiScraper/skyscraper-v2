import { Brain } from "lucide-react";
import type { Metadata } from "next";

import { ClaimIQAnalyticsDashboard } from "@/components/claimiq/ClaimIQAnalyticsDashboard";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";

export const metadata: Metadata = {
  title: "ClaimIQ Analytics | SkaiScraper",
  description:
    "Org-wide claim readiness analytics — score distributions, missing fields, blocked sections, and autopilot opportunity.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function ClaimIQPage() {
  return (
    <PageContainer maxWidth="7xl">
      <PageHero
        section="claims"
        title="ClaimIQ Analytics"
        subtitle="Org-wide readiness overview — identify gaps, blocked sections, and autopilot opportunity across all claims."
        icon={<Brain className="h-5 w-5" />}
      />

      <div className="mt-8">
        <ClaimIQAnalyticsDashboard />
      </div>
    </PageContainer>
  );
}
