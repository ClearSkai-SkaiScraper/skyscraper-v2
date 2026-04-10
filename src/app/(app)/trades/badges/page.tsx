/**
 * #183 — Vendor Badges & Certifications
 * Server component showing earned badges, progress toward next badges,
 * and a certification upload section.
 */

import {
  Award,
  CheckCircle,
  ChevronRight,
  Clock,
  FileCheck,
  Lock,
  Shield,
  ShieldCheck,
  Star,
  TrendingUp,
  Upload,
  Verified,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import { PageSectionCard } from "@/components/layout/PageSectionCard";
import prisma from "@/lib/prisma";
import { safeOrgContext } from "@/lib/safeOrgContext";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/* ------------------------------------------------------------------ */
/*  Badge definitions                                                  */
/* ------------------------------------------------------------------ */
type BadgeDef = {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  criteria: string;
  check: (ctx: BadgeContext) => boolean;
};

type BadgeContext = {
  member: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  company: any;
  reviewCount: number;
  avgRating: number;
  jobsCompleted: number;
  portfolioCount: number;
};

const BADGES: BadgeDef[] = [
  {
    id: "profile-complete",
    name: "Profile Complete",
    description: "All profile fields are filled out",
    icon: CheckCircle,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    criteria: "Fill out bio, photo, trade type, and service area",
    check: (ctx) =>
      !!(ctx.member.bio && ctx.member.avatar && ctx.member.tradeType && ctx.member.serviceArea),
  },
  {
    id: "verified-pro",
    name: "Verified Pro",
    description: "Identity and business verified",
    icon: Verified,
    color: "text-emerald-600",
    bgColor: "bg-emerald-50",
    criteria: "Complete identity verification process",
    check: (ctx) => ctx.company?.isVerified === true,
  },
  {
    id: "insured",
    name: "Insured",
    description: "Active insurance on file",
    icon: ShieldCheck,
    color: "text-sky-600",
    bgColor: "bg-sky-50",
    criteria: "Upload proof of insurance",
    check: (ctx) => ctx.member.isInsured === true || ctx.company?.insuranceVerified === true,
  },
  {
    id: "licensed",
    name: "Licensed",
    description: "Valid contractor license verified",
    icon: FileCheck,
    color: "text-indigo-600",
    bgColor: "bg-indigo-50",
    criteria: "Add your license / ROC number",
    check: (ctx) =>
      !!(ctx.member.licenseNumber || ctx.member.rocNumber || ctx.company?.licenseNumber),
  },
  {
    id: "five-star",
    name: "5-Star Rated",
    description: "Average rating of 4.8 or higher",
    icon: Star,
    color: "text-amber-600",
    bgColor: "bg-amber-50",
    criteria: "Maintain a 4.8+ average with at least 3 reviews",
    check: (ctx) => ctx.reviewCount >= 3 && ctx.avgRating >= 4.8,
  },
  {
    id: "top-rated",
    name: "Top Rated",
    description: "Consistently high ratings across 10+ jobs",
    icon: Award,
    color: "text-orange-600",
    bgColor: "bg-orange-50",
    criteria: "Complete 10+ jobs with 4.5+ average rating",
    check: (ctx) => ctx.jobsCompleted >= 10 && ctx.avgRating >= 4.5,
  },
  {
    id: "portfolio-pro",
    name: "Portfolio Pro",
    description: "Showcase your work with 5+ portfolio items",
    icon: TrendingUp,
    color: "text-purple-600",
    bgColor: "bg-purple-50",
    criteria: "Upload at least 5 portfolio items",
    check: (ctx) => ctx.portfolioCount >= 5,
  },
  {
    id: "fast-responder",
    name: "Fast Responder",
    description: "Responds to inquiries within 2 hours",
    icon: Clock,
    color: "text-teal-600",
    bgColor: "bg-teal-50",
    criteria: "Maintain < 2 hour average response time",
    check: () => false, // requires message timestamp analysis
  },
];

/* ------------------------------------------------------------------ */
/*  Progress ring (SVG)                                                */
/* ------------------------------------------------------------------ */
function ProgressRing({ earned, total }: { earned: number; total: number }) {
  const pct = total > 0 ? (earned / total) * 100 : 0;
  const r = 40;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={100} height={100} className="-rotate-90">
        <circle cx={50} cy={50} r={r} fill="none" stroke="#e2e8f0" strokeWidth={8} />
        <circle
          cx={50}
          cy={50}
          r={r}
          fill="none"
          stroke="#3b82f6"
          strokeWidth={8}
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute text-center">
        <span className="text-xl font-bold text-slate-800">{earned}</span>
        <span className="text-xs text-slate-400">/{total}</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default async function BadgesPage() {
  const orgCtx = await safeOrgContext();
  if (orgCtx.status === "unauthenticated" || !orgCtx.userId) redirect("/sign-in");

  const userId = orgCtx.userId;

  const member = await prisma.tradesCompanyMember
    .findUnique({
      where: { userId },
      include: { company: true },
    })
    .catch(() => null);

  if (!member) {
    return (
      <PageContainer>
        <PageHero
          title="Badges & Certifications"
          subtitle="Set up your trades profile to earn badges"
          icon={<Award className="h-5 w-5" />}
          section="trades"
        />
        <PageSectionCard>
          <div className="py-10 text-center">
            <Award className="mx-auto mb-4 h-12 w-12 text-slate-300" />
            <h2 className="mb-2 text-lg font-semibold">No Profile Found</h2>
            <p className="mb-4 text-sm text-slate-500">
              Create your trades profile to start earning badges.
            </p>
            <Link
              href="/trades/setup"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
            >
              Set Up Profile →
            </Link>
          </div>
        </PageSectionCard>
      </PageContainer>
    );
  }

  // Gather context for badge evaluation
  const companyId = member.companyId;
  const company = member.company;

  const [reviews, jobsCompleted, portfolioCount] = await Promise.all([
    prisma.trade_reviews
      .findMany({ where: { contractorId: member.id }, select: { rating: true } })
      .catch(() => []),
    companyId
      ? prisma.clientJob
          .count({ where: { proCompanyId: companyId, status: "completed" } })
          .catch(() => 0)
      : Promise.resolve(0),
    prisma.tradesFeaturedWork.count({ where: { userId } }).catch(() => 0),
  ]);

  const avgRating =
    reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;

  const ctx: BadgeContext = {
    member,
    company,
    reviewCount: reviews.length,
    avgRating,
    jobsCompleted,
    portfolioCount: portfolioCount + (member.portfolioImages?.length ?? 0),
  };

  const earnedBadges = BADGES.filter((b) => b.check(ctx));
  const lockedBadges = BADGES.filter((b) => !b.check(ctx));

  // Member certifications from profile
  const certifications = member.certifications ?? [];

  return (
    <PageContainer maxWidth="7xl">
      <PageHero
        title="Badges & Certifications"
        subtitle="Earn badges to build trust and stand out to homeowners"
        icon={<Award className="h-5 w-5" />}
        section="trades"
      >
        <Link
          href="/trades/analytics"
          className="rounded-lg bg-white/20 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm transition hover:bg-white/30"
        >
          View Analytics
        </Link>
      </PageHero>

      {/* Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <PageSectionCard>
          <div className="flex flex-col items-center py-2">
            <ProgressRing earned={earnedBadges.length} total={BADGES.length} />
            <p className="mt-3 text-sm font-semibold text-slate-700">Badges Earned</p>
            <p className="text-xs text-slate-400">
              {BADGES.length - earnedBadges.length} more to unlock
            </p>
          </div>
        </PageSectionCard>

        <PageSectionCard>
          <div className="flex flex-col items-center py-2">
            <div className="flex h-[100px] items-center justify-center">
              <span className="text-4xl font-bold text-slate-800">{certifications.length}</span>
            </div>
            <p className="mt-3 text-sm font-semibold text-slate-700">Certifications</p>
            <p className="text-xs text-slate-400">On your profile</p>
          </div>
        </PageSectionCard>

        <PageSectionCard>
          <div className="flex flex-col items-center py-2">
            <div className="flex h-[100px] items-center justify-center">
              <Shield
                className={`h-12 w-12 ${company?.isVerified ? "text-emerald-500" : "text-slate-300"}`}
              />
            </div>
            <p className="mt-3 text-sm font-semibold text-slate-700">
              {company?.isVerified ? "Verified Business" : "Not Yet Verified"}
            </p>
            <p className="text-xs text-slate-400">
              {company?.isVerified ? "Your business is verified" : "Complete verification"}
            </p>
          </div>
        </PageSectionCard>
      </div>

      {/* Earned Badges */}
      <PageSectionCard
        title={`Earned Badges (${earnedBadges.length})`}
        subtitle="Badges you've already unlocked"
      >
        {earnedBadges.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">
            No badges earned yet — complete your profile to start!
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {earnedBadges.map((badge) => (
              <div
                key={badge.id}
                className="flex items-center gap-3 rounded-xl border border-emerald-100 bg-emerald-50/50 p-4"
              >
                <div className={`rounded-lg p-2.5 ${badge.bgColor}`}>
                  <badge.icon className={`h-5 w-5 ${badge.color}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-800">{badge.name}</p>
                  <p className="text-xs text-slate-500">{badge.description}</p>
                </div>
                <CheckCircle className="h-5 w-5 flex-shrink-0 text-emerald-500" />
              </div>
            ))}
          </div>
        )}
      </PageSectionCard>

      {/* Locked Badges */}
      <PageSectionCard
        title={`Locked Badges (${lockedBadges.length})`}
        subtitle="Complete these to earn new badges"
      >
        {lockedBadges.length === 0 ? (
          <p className="py-6 text-center text-sm font-medium text-emerald-600">
            🎉 Congratulations! You&apos;ve earned all badges!
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {lockedBadges.map((badge) => (
              <div
                key={badge.id}
                className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/50 p-4 opacity-75"
              >
                <div className="rounded-lg bg-slate-100 p-2.5">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-600">{badge.name}</p>
                  <p className="text-[11px] text-slate-400">{badge.criteria}</p>
                </div>
                <ChevronRight className="h-4 w-4 flex-shrink-0 text-slate-300" />
              </div>
            ))}
          </div>
        )}
      </PageSectionCard>

      {/* Certifications */}
      <PageSectionCard
        title="Certifications & Licenses"
        subtitle="Upload and manage your professional certifications"
      >
        {certifications.length > 0 ? (
          <div className="mb-4 space-y-2">
            {certifications.map((cert, i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3"
              >
                <FileCheck className="h-4 w-4 text-blue-500" />
                <span className="flex-1 text-sm text-slate-700">{cert}</span>
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-600">
                  Active
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="mb-4 text-sm text-slate-400">No certifications uploaded yet.</p>
        )}

        {/* License info from profile */}
        {(member.licenseNumber || member.rocNumber) && (
          <div className="mb-4 rounded-lg border border-blue-100 bg-blue-50/50 p-3">
            <p className="text-xs font-semibold text-blue-700">License Information</p>
            {member.licenseNumber && (
              <p className="mt-1 text-xs text-blue-600">
                License: {member.licenseNumber}
                {member.licenseState ? ` (${member.licenseState})` : ""}
              </p>
            )}
            {member.rocNumber && (
              <p className="mt-1 text-xs text-blue-600">
                ROC: {member.rocNumber}
                {member.rocExpiration
                  ? ` — Expires ${new Date(member.rocExpiration).toLocaleDateString()}`
                  : ""}
              </p>
            )}
          </div>
        )}

        {/* Upload section */}
        <div className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-6 text-center">
          <Upload className="mx-auto mb-3 h-8 w-8 text-slate-400" />
          <p className="mb-1 text-sm font-medium text-slate-600">Upload Certifications</p>
          <p className="mb-4 text-xs text-slate-400">
            PDF, JPG, or PNG up to 10MB. Supported: contractor licenses, insurance certificates,
            trade certifications.
          </p>
          <Link
            href="/trades/profile/edit"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Upload className="h-4 w-4" />
            Upload Certificate
          </Link>
        </div>
      </PageSectionCard>

      {/* Insurance info */}
      {(member.isInsured || member.isBonded) && (
        <PageSectionCard title="Insurance & Bonding">
          <div className="grid gap-3 sm:grid-cols-2">
            {member.isInsured && (
              <div className="rounded-lg border border-emerald-100 bg-emerald-50/50 p-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-emerald-600" />
                  <span className="text-sm font-semibold text-emerald-700">Insured</span>
                </div>
                {member.insuranceProvider && (
                  <p className="mt-1 text-xs text-emerald-600">
                    Provider: {member.insuranceProvider}
                  </p>
                )}
                {member.insuranceExpiration && (
                  <p className="mt-0.5 text-xs text-emerald-500">
                    Expires: {new Date(member.insuranceExpiration).toLocaleDateString()}
                  </p>
                )}
              </div>
            )}
            {member.isBonded && (
              <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-4">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-blue-600" />
                  <span className="text-sm font-semibold text-blue-700">Bonded</span>
                </div>
                {member.bondAmount && (
                  <p className="mt-1 text-xs text-blue-600">Amount: {member.bondAmount}</p>
                )}
                {member.bondExpiration && (
                  <p className="mt-0.5 text-xs text-blue-500">
                    Expires: {new Date(member.bondExpiration).toLocaleDateString()}
                  </p>
                )}
              </div>
            )}
          </div>
        </PageSectionCard>
      )}
    </PageContainer>
  );
}
