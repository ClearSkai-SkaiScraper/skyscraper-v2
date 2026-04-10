// eslint-disable-next-line no-restricted-imports
import { currentUser } from "@clerk/nextjs/server";
import { UserCircle } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Trade Professional Profile | SkaiScraper",
  description: "View trade professional details and portfolio.",
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default async function ProDetailPage({ params }: { params: { id: string } }) {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  return (
    <PageContainer maxWidth="5xl">
      <PageHero
        section="network"
        title="Trade Professional Profile"
        subtitle="View contractor details, portfolio, and connection status"
        icon={<UserCircle className="h-5 w-5" />}
      />

      <div className="rounded-2xl border border-slate-200/50 bg-white/80 p-8 text-center backdrop-blur-xl dark:border-slate-700/50 dark:bg-slate-900/80">
        <UserCircle className="mx-auto mb-3 h-12 w-12 text-slate-400" />
        <h3 className="text-lg font-semibold">Professional Profile</h3>
        <p className="mt-1 text-sm text-slate-500">
          Detailed contractor profile with portfolio, reviews, certifications, and contact
          information.
        </p>
      </div>
    </PageContainer>
  );
}
