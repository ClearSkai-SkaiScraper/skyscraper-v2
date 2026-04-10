import { ArrowRight, Star, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: { orgSlug: string };
}): Promise<Metadata> {
  const org = await prisma.org.findFirst({
    where: { referralCode: params.orgSlug },
    select: { name: true },
  });

  return {
    title: org ? `Referred by ${org.name} | SkaiScrape` : "Referral | SkaiScrape",
    description: org
      ? `You've been referred by ${org.name}. Sign up for SkaiScrape to manage your property and connect with trusted contractors.`
      : "Join SkaiScrape through a referral link.",
  };
}

export default async function ReferralLandingPage({ params }: { params: { orgSlug: string } }) {
  // Look up org by referral code
  const org = await prisma.org.findFirst({
    where: { referralCode: params.orgSlug },
    select: {
      id: true,
      name: true,
      brandLogoUrl: true,
      referralCode: true,
    },
  });

  if (!org) {
    notFound();
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-sky-50 px-4 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900">
      <div className="w-full max-w-md space-y-8 rounded-2xl border bg-white p-8 shadow-xl dark:border-slate-700 dark:bg-slate-800">
        {/* Logo */}
        <div className="text-center">
          {org.brandLogoUrl ? (
            <img src={org.brandLogoUrl} alt={org.name} className="mx-auto mb-4 h-16 w-auto" />
          ) : (
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-2xl font-bold text-white">
              {org.name[0]}
            </div>
          )}
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            {org.name} invited you!
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            You&apos;ve been referred by a trusted contractor. Create your free account to manage
            your property projects and stay connected.
          </p>
        </div>

        {/* Benefits */}
        <div className="space-y-3">
          <div className="flex items-center gap-3 rounded-lg bg-emerald-50 p-3 dark:bg-emerald-900/20">
            <Star className="h-5 w-5 text-emerald-600" />
            <span className="text-sm text-emerald-800 dark:text-emerald-300">
              Track your project progress in real-time
            </span>
          </div>
          <div className="flex items-center gap-3 rounded-lg bg-blue-50 p-3 dark:bg-blue-900/20">
            <Users className="h-5 w-5 text-blue-600" />
            <span className="text-sm text-blue-800 dark:text-blue-300">
              Message your contractor directly
            </span>
          </div>
        </div>

        {/* CTA */}
        <div className="space-y-3">
          <Link
            href={`/client/sign-up?redirect_url=/portal&ref=${org.referralCode}`}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-3 font-semibold text-white shadow-lg transition-all hover:shadow-xl"
          >
            Create Free Account <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href={`/client/sign-in?redirect_url=/portal&ref=${org.referralCode}`}
            className="block w-full rounded-xl border border-slate-200 px-6 py-3 text-center text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-700"
          >
            Already have an account? Sign in
          </Link>
        </div>

        <p className="text-center text-xs text-slate-400">
          By signing up, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}
