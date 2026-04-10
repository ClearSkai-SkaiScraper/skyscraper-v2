/**
 * User Referral Tracker
 * /settings/referrals - Track your referral rewards and invites
 */

import { currentUser } from "@clerk/nextjs/server";
import { Award, Gift, Share2, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { PageHero } from "@/components/layout/PageHero";
import prisma from "@/lib/prisma";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { getOrCreateCurrentOrganization } from "@/lib/organizations";
import { getOrgIdFromClerkOrgId } from "@/lib/referrals/utils";

export const metadata: Metadata = {
  title: "Referral Rewards | SkaiScraper",
  description: "Track your referral rewards and invites",
};

export default async function ReferralsSettingsPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");
  const clerkOrgIdFromMeta = user.publicMetadata?.orgId as string | undefined;
  const clerkOrgId = clerkOrgIdFromMeta;

  let orgId = await getOrgIdFromClerkOrgId(clerkOrgId ?? "");
  if (!orgId) {
    const Org = await getOrCreateCurrentOrganization({
      requireOrg: false,
      bootstrapIfMissing: true,
    });
    orgId = Org?.id || null;
  }
  if (!orgId) {
    return (
      <main className="mx-auto max-w-4xl p-6">
        <div className="rounded-xl border border-[color:var(--border)] bg-[var(--surface-1)] p-8">
          <h2 className="mb-2 text-xl font-semibold">Referral System Setup Required</h2>
          <p className="mb-4 text-sm text-slate-700 dark:text-slate-300">
            No organization context yet. Complete onboarding to enable referral tracking.
          </p>
          <div className="flex gap-3">
            <a
              href="/onboarding/start"
              className="rounded bg-[var(--primary)] px-4 py-2 text-white"
            >
              🚀 Start Onboarding
            </a>
            <a href="/settings" className="rounded border border-[color:var(--border)] px-4 py-2">
              ← Back to Settings
            </a>
          </div>
        </div>
      </main>
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [rewards, referrals, Org] = await Promise.all([
    prisma.referral_rewards.findMany({
      where: { org_id: orgId },
      orderBy: { created_at: "desc" },
    }),
    prisma.referrals.findMany({
      where: { org_id: orgId },
      orderBy: { created_at: "desc" },
    }),
    prisma.org.findUnique({
      where: { id: orgId },
      select: { referralCode: true },
    }),
  ]);

  const totalMonths = rewards
    .filter((r) => r.type === "month")
    .reduce((sum, r) => sum + (r.months_awarded || 0), 0);

  const totalTokens = rewards
    .filter((r) => r.type === "tokens")
    .reduce((sum, r) => sum + (r.tokens_awarded || 0), 0);

  const successfulReferrals = referrals.filter((r) => r.status === "subscribed").length;
  const pendingReferrals = referrals.filter((r) => r.status !== "subscribed").length;

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6">
      {/* Header */}
      <PageHero
        section="settings"
        title="Referral Rewards"
        subtitle="Track your referral earnings and share your link"
        icon={<Gift className="h-6 w-6" />}
      >
        <Link
          href="/settings"
          className="rounded-lg bg-white/20 px-4 py-2 text-white transition-colors hover:bg-white/30"
        >
          ← Back to Settings
        </Link>
      </PageHero>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100 p-6">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium text-blue-700">Total Months Earned</span>
            <Award className="h-5 w-5 text-blue-600" />
          </div>
          <div className="text-3xl font-bold text-blue-900">{totalMonths}</div>
          <p className="mt-1 text-xs text-blue-600">Subscription extensions</p>
        </div>

        <div className="rounded-xl border border-sky-200 bg-gradient-to-br from-sky-50 to-sky-100 p-6">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium text-purple-700">Bonus Tokens</span>
            <Award className="h-5 w-5 text-purple-600" />
          </div>
          <div className="text-3xl font-bold text-purple-900">{totalTokens.toLocaleString()}</div>
          <p className="mt-1 text-xs text-purple-600">From referrals</p>
        </div>

        <div className="rounded-xl border border-green-200 bg-gradient-to-br from-green-50 to-green-100 p-6">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium text-green-700">Successful</span>
            <Users className="h-5 w-5 text-green-600" />
          </div>
          <div className="text-3xl font-bold text-green-900">{successfulReferrals}</div>
          <p className="mt-1 text-xs text-green-600">Subscribed contractors</p>
        </div>

        <div className="rounded-xl border border-orange-200 bg-gradient-to-br from-orange-50 to-orange-100 p-6">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium text-orange-700">Pending</span>
            <Share2 className="h-5 w-5 text-orange-600" />
          </div>
          <div className="text-3xl font-bold text-orange-900">{pendingReferrals}</div>
          <p className="mt-1 text-xs text-orange-600">Awaiting signup</p>
        </div>
      </div>

      {/* Rewards Section */}
      <section className="rounded-xl border border-[color:var(--border)] bg-[var(--surface-1)] shadow-sm">
        <div className="border-b border-[color:var(--border)] p-6">
          <h2 className="text-xl font-semibold text-[color:var(--text)]">Your Rewards</h2>
          <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
            History of earned rewards
          </p>
        </div>
        <div className="p-6">
          {rewards.length === 0 ? (
            <div className="py-12 text-center">
              <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-[var(--surface-1)]">
                <Award className="h-8 w-8 text-slate-700 dark:text-slate-300" />
              </div>
              <p className="font-medium text-slate-700 dark:text-slate-300">No rewards yet</p>
              <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
                Share your referral link to start earning!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {rewards.map((reward) => (
                <div
                  key={reward.id}
                  className="flex items-center justify-between rounded-lg border border-[color:var(--border)] bg-[var(--surface-2)] p-4"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                        reward.type === "month"
                          ? "bg-blue-100 text-blue-600"
                          : "bg-purple-100 text-purple-600"
                      }`}
                    >
                      {reward.type === "month" ? "📅" : "🔷"}
                    </div>
                    <div>
                      <div className="font-semibold text-[color:var(--text)]">
                        {reward.type === "month"
                          ? `+${reward.months_awarded} month${
                              reward.months_awarded === 1 ? "" : "s"
                            } subscription extension`
                          : `+${reward.tokens_awarded?.toLocaleString()} tokens`}
                      </div>
                      <div className="text-sm text-slate-700 dark:text-slate-300">
                        {new Date(reward.created_at).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Invites Section */}
      <section className="rounded-xl border border-[color:var(--border)] bg-[var(--surface-1)] shadow-sm">
        <div className="border-b border-[color:var(--border)] p-6">
          <h2 className="text-xl font-semibold text-[color:var(--text)]">Your Invites</h2>
          <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
            Track who you&apos;ve invited
          </p>
        </div>
        <div className="p-6">
          {referrals.length === 0 ? (
            <div className="py-12 text-center">
              <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-[var(--surface-1)]">
                <Users className="h-8 w-8 text-slate-700 dark:text-slate-300" />
              </div>
              <p className="font-medium text-slate-700 dark:text-slate-300">No invites sent yet</p>
              <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
                Use the referral button to start inviting contractors
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[color:var(--border)]">
                    <th className="px-4 py-3 text-left text-sm font-semibold text-[color:var(--text)]">
                      Email / Code
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-[color:var(--text)]">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-[color:var(--text)]">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {referrals.map((referral) => (
                    <tr
                      key={referral.id}
                      className="border-b border-slate-100 hover:bg-[var(--surface-2)]"
                    >
                      <td className="px-4 py-3">
                        <span className="font-medium text-[color:var(--text)]">
                          {referral.invited_email || (
                            <code className="rounded bg-[var(--surface-1)] px-2 py-0.5 text-sm text-slate-700 dark:text-slate-300">
                              {referral.ref_code}
                            </code>
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            referral.status === "subscribed"
                              ? "bg-green-100 text-green-800"
                              : referral.status === "signed_up"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-[var(--surface-1)] text-[color:var(--text)]"
                          }`}
                        >
                          {referral.status === "subscribed"
                            ? "✓ Subscribed"
                            : referral.status === "signed_up"
                              ? "Signed Up"
                              : "Invited"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                        {new Date(referral.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* How it Works */}
      <section className="rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50 to-purple-50 p-6">
        <h3 className="mb-4 text-lg font-semibold text-[color:var(--text)]">How Referrals Work</h3>
        <div className="grid gap-4 text-sm text-[color:var(--text)] md:grid-cols-2">
          <div className="flex gap-3">
            <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-sky-600 text-xs font-bold text-white">
              1
            </div>
            <div>
              <strong>Share your link:</strong> Send your unique referral link to contractors
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-sky-600 text-xs font-bold text-white">
              2
            </div>
            <div>
              <strong>They subscribe:</strong> When they sign up and pay for any plan
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-sky-600 text-xs font-bold text-white">
              3
            </div>
            <div>
              <strong>First reward:</strong> Your first successful referral earns +30 days
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-sky-600 text-xs font-bold text-white">
              4
            </div>
            <div>
              <strong>Additional rewards:</strong> Each additional referral earns 500 tokens
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
