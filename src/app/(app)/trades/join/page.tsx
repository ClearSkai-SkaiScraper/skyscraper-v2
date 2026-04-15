/*
 * Trades Network - Profile Creation Wizard / Invite Acceptance
 * /trades/join
 * /trades/join?token=xxx (accept invite)
 *
 * If ?token is present, renders the invite acceptance client component.
 * Otherwise, shows the multi-step profile creation wizard.
 */

import Link from "next/link";
import { redirect } from "next/navigation";

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import { PageSectionCard } from "@/components/layout/PageSectionCard";
import { getCurrentUserPermissions } from "@/lib/permissions";

import AcceptInviteClient from "./AcceptInviteClient";

export const dynamic = "force-dynamic";

export default async function TradesJoinPage({
  searchParams,
}: {
  searchParams: { token?: string; accepted?: string };
}) {
  const { orgId, userId } = await getCurrentUserPermissions();

  if (!orgId && !userId) {
    redirect("/sign-in");
  }

  // ── Invite acceptance flow ──
  const token = searchParams?.token;
  if (token) {
    return <AcceptInviteClient token={token} />;
  }

  // ── Already accepted (URL cleaned after success) ──
  if (searchParams?.accepted === "true") {
    return <AcceptInviteClient token="__already_accepted__" />;
  }

  // ── Profile creation wizard (original) ──
  return (
    <PageContainer>
      <PageHero
        title="Create Your Trades Profile"
        description="Join the SkaiTrades Network and connect with opportunities"
        section="build"
      />

      <div className="mx-auto max-w-2xl">
        <PageSectionCard>
          <form action="/api/trades/profile" method="POST" className="space-y-6">
            {/* Step 1: Basic Info */}
            <div>
              <h3 className="mb-4 text-lg font-semibold text-foreground">Basic Information</h3>
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">
                    Contact Name *
                  </label>
                  <input
                    type="text"
                    name="contactName"
                    required
                    className="w-full rounded-xl border border-border bg-background px-4 py-3 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">
                    Company Name (Optional)
                  </label>
                  <input
                    type="text"
                    name="companyName"
                    className="w-full rounded-xl border border-border bg-background px-4 py-3 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder="ABC Roofing LLC"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-foreground">
                      Email *
                    </label>
                    <input
                      type="email"
                      name="email"
                      required
                      className="w-full rounded-xl border border-border bg-background px-4 py-3 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      placeholder="john@example.com"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-foreground">Phone</label>
                    <input
                      type="tel"
                      name="phone"
                      className="w-full rounded-xl border border-border bg-background px-4 py-3 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      placeholder="(555) 123-4567"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Step 2: Location */}
            <div>
              <h3 className="mb-4 text-lg font-semibold text-foreground">Service Location</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <label className="mb-2 block text-sm font-medium text-foreground">City</label>
                  <input
                    type="text"
                    name="city"
                    className="w-full rounded-xl border border-border bg-background px-4 py-3 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder="Phoenix"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">State</label>
                  <input
                    type="text"
                    name="state"
                    className="w-full rounded-xl border border-border bg-background px-4 py-3 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder="AZ"
                    maxLength={2}
                  />
                </div>
              </div>
            </div>

            {/* Step 3: Specialties */}
            <div>
              <h3 className="mb-4 text-lg font-semibold text-foreground">
                Specialties & Certifications
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">
                    Specialties (comma separated) *
                  </label>
                  <input
                    type="text"
                    name="specialties"
                    required
                    className="w-full rounded-xl border border-border bg-background px-4 py-3 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder="Roofing, Siding, Storm Damage"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">
                    Certifications (comma separated)
                  </label>
                  <input
                    type="text"
                    name="certifications"
                    className="w-full rounded-xl border border-border bg-background px-4 py-3 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder="GAF Certified, HAAG Certified"
                  />
                </div>
              </div>
            </div>

            {/* Step 4: Bio */}
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">
                Bio (Tell us about yourself)
              </label>
              <textarea
                name="bio"
                rows={4}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="Experienced roofing contractor with 15+ years in storm damage restoration..."
              />
            </div>

            {/* Buttons */}
            <div className="flex gap-4">
              <Link
                href="/trades"
                className="flex-1 rounded-xl border border-border bg-background px-6 py-3 text-center font-semibold text-foreground transition hover:bg-secondary"
              >
                Cancel
              </Link>
              <button
                type="submit"
                className="flex-1 rounded-xl bg-sky-600 px-6 py-3 font-semibold text-white shadow-md transition hover:bg-sky-700"
              >
                Create Profile
              </button>
            </div>
          </form>
        </PageSectionCard>
      </div>
    </PageContainer>
  );
}
