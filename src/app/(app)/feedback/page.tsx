import { currentUser } from "@clerk/nextjs/server";
import { MessageSquare } from "lucide-react";
import { redirect } from "next/navigation";

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import { PageSectionCard } from "@/components/layout/PageSectionCard";

import FeedbackForm from "./FeedbackForm";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Feedback • SkaiScraper",
  description: "Help us improve by sharing your experience",
};

export default async function FeedbackPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  return (
    <PageContainer maxWidth="6xl">
      <PageHero
        section="settings"
        title="Share Your Feedback"
        subtitle="Help us improve SkaiScraper by telling us what works and what doesn't"
        icon={<MessageSquare className="h-5 w-5" />}
      />

      <PageSectionCard>
        <div className="space-y-6">
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
            <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
              🎯 We&apos;re actively building based on your input
            </p>
            <p className="mt-1 text-sm text-blue-700 dark:text-blue-300">
              Every piece of feedback helps us prioritize what matters most to you.
            </p>
          </div>

          <FeedbackForm userId={user.id} userEmail={user.emailAddresses[0]?.emailAddress} />

          <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
            <h3 className="font-semibold text-slate-900 dark:text-white">
              What kind of feedback is helpful?
            </h3>
            <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
              <li className="flex gap-2">
                <span>✅</span>
                <span>&quot;I was trying to [action] but [problem happened]&quot;</span>
              </li>
              <li className="flex gap-2">
                <span>✅</span>
                <span>&quot;I expected [X] to happen, but [Y] happened instead&quot;</span>
              </li>
              <li className="flex gap-2">
                <span>✅</span>
                <span>&quot;I couldn&apos;t figure out how to [do something]&quot;</span>
              </li>
              <li className="flex gap-2">
                <span>✅</span>
                <span>&quot;This tool saved me [X hours/dollars]&quot;</span>
              </li>
              <li className="flex gap-2">
                <span>✅</span>
                <span>&quot;I wish I could [feature request]&quot;</span>
              </li>
            </ul>
          </div>
        </div>
      </PageSectionCard>
    </PageContainer>
  );
}
