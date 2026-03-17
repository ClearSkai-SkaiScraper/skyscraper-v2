/**
 * NoOrgMembershipBanner — Shared empty state for pages that require org membership.
 *
 * Replaces the old pattern of `redirect("/dashboard")` which caused an infinite
 * redirect loop or confusing UX for users who are authenticated but don't have
 * a valid org membership (e.g., invited but not yet accepted, or orphaned accounts).
 *
 * If `pendingInvite` is passed, shows a prominent "Accept Invitation" button
 * instead of the generic "check your email" message.
 */

import { Building2, CheckCircle, Mail, UserPlus } from "lucide-react";
import Link from "next/link";

export interface PendingInviteInfo {
  id: string;
  orgName: string | null;
  role: string;
}

interface NoOrgMembershipBannerProps {
  /** The page title to display above the banner */
  title?: string;
  /** Custom description */
  description?: string;
  /** If the user has a pending invite, pass it here for a direct accept button */
  pendingInvite?: PendingInviteInfo | null;
}

export function NoOrgMembershipBanner({
  title,
  description,
  pendingInvite,
}: NoOrgMembershipBannerProps) {
  return (
    <div className="mx-auto max-w-lg py-16">
      <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-8 text-center shadow-sm backdrop-blur-sm dark:border-amber-800 dark:bg-amber-950/30">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/40">
          <Building2 className="h-7 w-7 text-amber-600 dark:text-amber-400" />
        </div>

        {title && (
          <h2 className="mb-2 text-xl font-bold text-amber-900 dark:text-amber-100">{title}</h2>
        )}

        <p className="mb-6 text-amber-800 dark:text-amber-200">
          {description || "You need to be a member of an organization to access this page."}
        </p>

        {/* ── Pending Invite: prominent accept CTA ─────────────────── */}
        {pendingInvite && (
          <div className="mb-6 rounded-xl border-2 border-green-300 bg-green-50/80 p-4 dark:border-green-700 dark:bg-green-950/30">
            <div className="mb-2 flex items-center justify-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
              <p className="text-sm font-semibold text-green-800 dark:text-green-200">
                You&apos;ve been invited to{" "}
                <span className="font-bold">{pendingInvite.orgName || "a team"}</span> as{" "}
                {pendingInvite.role || "member"}
              </p>
            </div>
            <Link
              href={`/api/team/invitations/accept?id=${pendingInvite.id}`}
              className="inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:scale-[1.02] hover:shadow-md"
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              Accept Invitation
            </Link>
          </div>
        )}

        <div className="space-y-3 text-left">
          {!pendingInvite && (
            <div className="flex items-start gap-3 rounded-lg bg-white/60 p-3 dark:bg-slate-900/40">
              <Mail className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
              <div>
                <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                  Check your email
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  If someone invited you, look for an invitation email and click &quot;Accept
                  Invitation&quot;.
                </p>
              </div>
            </div>
          )}

          <div className="flex items-start gap-3 rounded-lg bg-white/60 p-3 dark:bg-slate-900/40">
            <UserPlus className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
            <div>
              <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                Create your own company
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-300">
                Set up your own organization to start managing claims and crews.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link
            href="/onboarding"
            className="inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:scale-[1.02]"
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Create Organization
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-lg border border-amber-300 bg-white px-5 py-2.5 text-sm font-medium text-amber-800 transition hover:bg-amber-50 dark:border-amber-700 dark:bg-slate-900 dark:text-amber-200 dark:hover:bg-slate-800"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
