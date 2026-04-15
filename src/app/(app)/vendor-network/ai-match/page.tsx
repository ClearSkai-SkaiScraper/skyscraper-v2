/**
 * VIN — AI Vendor Match Page
 * Input trade, zip, urgency, budget → get scored vendor matches
 */

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";

import { AiMatchClient } from "./_components/AiMatchClient";

export const metadata = { title: "AI Vendor Match — Vendor Network" };

export default function AiMatchPage() {
  return (
    <PageContainer>
      <PageHero
        section="build"
        title="AI Vendor Match"
        subtitle="Enter your project requirements and let AI find the best-fit vendors from the network."
      />
      <AiMatchClient />
    </PageContainer>
  );
}
