/**
 * My Network Page (Smart Onboarding Gate)
 * - Demo mode: never hard-block navigation behind onboarding
 * - If member exists → show social profile (even if onboarding incomplete)
 * - If member missing → show a non-blocking CTA to start onboarding
 */

import { currentUser } from "@clerk/nextjs/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import ProfileStrengthBanner from "@/components/ProfileStrengthBanner";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { calculateProStrength } from "@/lib/profile-strength";

import TradesSocialProfile from "./_components/TradesSocialProfile";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export default async function MyNetworkPage() {
  // Force no caching for this page
  headers();

  const user = await currentUser();
  if (!user) redirect("/sign-in");

  // Internal employee profile (Teams) - used to fill gaps + link to edit details
  const employee = await prisma.users
    .findUnique({
      where: { clerkUserId: user.id },
      select: {
        id: true,
        name: true,
        email: true,
        headshot_url: true,
      },
    })
    .catch(() => null);

  // Check if user has a TradesCompanyMember profile
  let member = await prisma.tradesCompanyMember
    .findUnique({
      where: { userId: user.id },
      include: {
        company: true,
      },
    })
    .catch((err: Error) => {
      logger.error(`[Trades Profile] Query ERROR for ${user.id}: ${err.message}`);
      return null;
    });

  // ── Self-healing: auto-create profile if user is authenticated but has no member record ──
  // This fixes the "profile not showing" bug when the userId drifts or fix scripts weren't run.
  // Also heals members that exist but have no company linked.
  if (!member || !member.company) {
    if (!member) {
      logger.warn(
        `[Trades Profile] ⚠️ No tradesCompanyMember for userId=${user.id} (${user.firstName} ${user.lastName}) — auto-creating...`
      );
    } else {
      logger.warn(
        `[Trades Profile] ⚠️ Member ${member.id} exists but has no company linked — healing...`
      );
    }

    // Look up org from Clerk metadata or internal users table
    const orgId =
      (user.publicMetadata?.orgId as string) ||
      (await prisma.users
        .findFirst({ where: { clerkUserId: user.id }, select: { orgId: true } })
        .then((u) => u?.orgId)
        .catch(() => null));

    // ── Step 1: Try to find existing company FIRST (by orgId) ──
    // This is the most reliable method — orgId directly links to the company
    let existingCompany = orgId
      ? await prisma.tradesCompany
          .findFirst({
            where: { orgId },
            select: { id: true, name: true },
          })
          .catch(() => null)
      : null;

    logger.debug(
      `[Trades Profile] 🔍 Company lookup by orgId=${orgId}: ${existingCompany?.name || "NOT FOUND"}`
    );

    // ── Step 2: If no orgId match, resolve company name from Clerk metadata ──
    let resolvedCompanyName: string | null = null;
    if (!existingCompany) {
      resolvedCompanyName =
        (user.publicMetadata?.companyName as string) ||
        ((user as any).organizationMemberships?.[0]?.organization?.name as string) ||
        null;

      // If no company name from Clerk, check if there's an existing company
      // linked to any prior member record for this user (e.g., via email match)
      if (!resolvedCompanyName) {
        const existingByEmail = await prisma.tradesCompanyMember
          .findFirst({
            where: {
              email: user.emailAddresses?.[0]?.emailAddress || "no-match",
              companyId: { not: null },
            },
            select: { companyName: true, company: { select: { name: true } } },
          })
          .catch(() => null);
        resolvedCompanyName =
          existingByEmail?.company?.name || existingByEmail?.companyName || null;
      }

      // If still no company name, check the org's existing company
      if (!resolvedCompanyName && orgId) {
        const orgCompany = await prisma.tradesCompany
          .findFirst({
            where: { orgId },
            select: { name: true },
          })
          .catch(() => null);
        resolvedCompanyName = orgCompany?.name || null;
      }

      // ── Step 3: Find company by name (case-insensitive) ──
      if (resolvedCompanyName) {
        existingCompany = await prisma.tradesCompany
          .findFirst({
            where: { name: { equals: resolvedCompanyName, mode: "insensitive" } },
            select: { id: true, name: true },
          })
          .catch(() => null);
      }

      logger.debug(
        `[Trades Profile] 🔍 Company lookup by name="${resolvedCompanyName}": ${existingCompany?.name || "NOT FOUND"}`
      );
    }

    // ── Step 4: If member already exists with a companyName text, try finding that company ──
    if (!existingCompany && member?.companyName) {
      existingCompany = await prisma.tradesCompany
        .findFirst({
          where: { name: { equals: member.companyName, mode: "insensitive" } },
          select: { id: true, name: true },
        })
        .catch(() => null);

      logger.debug(
        `[Trades Profile] 🔍 Company lookup by member.companyName="${member.companyName}": ${existingCompany?.name || "NOT FOUND"}`
      );
    }

    // Determine display name (prefer real company, avoid ghost names like "X's Company")
    const companyName =
      existingCompany?.name ||
      resolvedCompanyName ||
      member?.companyName ||
      `${user.firstName || "My"}'s Company`;

    try {
      // IMPORTANT: Never overwrite firstName/lastName with Clerk data during self-heal.
      // Clerk may have a different name (e.g. "Damien Ray" from Google login)
      // while the trades profile should be "Damien Willingham". Only use Clerk
      // names for brand-new profile creation.
      const existingMemberNames = member
        ? { firstName: member.firstName, lastName: member.lastName }
        : null;

      member = await prisma.tradesCompanyMember.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          orgId: orgId || undefined,
          firstName: user.firstName || "",
          lastName: user.lastName || "",
          email: user.emailAddresses?.[0]?.emailAddress || "",
          companyName: existingCompany?.name || companyName,
          companyId: existingCompany?.id || undefined,
          role: "owner",
          isOwner: true,
          isAdmin: true,
          isActive: true,
          status: "active",
          tradeType: "GENERAL_CONTRACTOR",
          onboardingStep: "profile",
        },
        update: {
          // NEVER overwrite names — preserve what the user set in their trades profile
          // Only fill if currently blank (using || '' to treat null as blank)
          ...(existingMemberNames?.firstName ? {} : { firstName: user.firstName || undefined }),
          ...(existingMemberNames?.lastName ? {} : { lastName: user.lastName || undefined }),
          // Email can be refreshed — it's not a display name issue
          email: user.emailAddresses?.[0]?.emailAddress || undefined,
          isActive: true,
          status: "active",
          // If member exists but has no company, link them now
          ...(existingCompany
            ? {
                companyId: existingCompany.id,
                companyName: existingCompany.name,
              }
            : {}),
        },
        include: { company: true },
      });
      logger.debug(
        `[Trades Profile] ✅ Healed member ${member.id} for ${user.firstName} ${user.lastName} (company: ${member.company?.name || "none"}, companyId: ${member.companyId || "null"})`
      );

      // ── Auto-sync legacy TradesProfile so messaging, avatar, and other subsystems work ──
      try {
        await prisma.tradesProfile.upsert({
          where: { userId: user.id },
          create: {
            id: `tp-${member.id.slice(0, 20)}`,
            userId: user.id,
            orgId: orgId || member.orgId || "",
            companyName: member.companyName || companyName,
            contactName:
              `${member.firstName || ""} ${member.lastName || ""}`.trim() || "Contractor",
            email: member.email || user.emailAddresses?.[0]?.emailAddress || "",
            phone: member.phone || null,
            city: member.city || null,
            state: member.state || null,
            zip: member.zip || null,
            specialties: (member.specialties as string[]) || [],
            certifications: (member.certifications as string[]) || [],
            bio: member.bio || null,
            logoUrl: member.avatar || null,
            website: member.companyWebsite || null,
            yearsInBusiness: member.yearsExperience || null,
            verified: true,
            active: true,
            rating: 5.0,
            reviewCount: 0,
            projectCount: 0,
            updatedAt: new Date(),
          },
          update: {
            companyName: member.companyName || companyName,
            contactName:
              `${member.firstName || ""} ${member.lastName || ""}`.trim() || "Contractor",
            email: member.email || user.emailAddresses?.[0]?.emailAddress || "",
            active: true,
          },
        });
        logger.debug(`[Trades Profile] ✅ Synced legacy TradesProfile for ${user.id}`);
      } catch (syncErr) {
        // Non-fatal — member profile still works without legacy sync
        logger.warn("[Trades Profile] ⚠️ Legacy TradesProfile sync failed:", syncErr);
      }
    } catch (createErr) {
      logger.error("[Trades Profile] ❌ Auto-create/heal failed:", createErr);
      // If upsert failed but we had a pre-existing member, keep it
      // so the page can still render (without company link)
      if (!member) {
        member = await prisma.tradesCompanyMember
          .findUnique({
            where: { userId: user.id },
            include: { company: true },
          })
          .catch(() => null);
      }
    }
  }

  // If still no member after auto-create attempt, show onboarding CTA
  if (!member) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/40 to-amber-50/30 p-6">
        <div className="mx-auto max-w-4xl space-y-6">
          <div className="rounded-2xl border border-blue-200/60 bg-gradient-to-r from-[#117CFF] to-[#00C2FF] p-8 text-white shadow-xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-white/70">
              Trades Network
            </p>
            <h1 className="mt-2 text-3xl font-bold">Create your trades profile</h1>
            <p className="mt-2 max-w-2xl text-white/80">
              Build your professional profile and get discovered by other tradesmen. Upload photos,
              showcase your work, and connect with the network.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href="/trades/onboarding"
                className="inline-flex items-center justify-center rounded-xl bg-white px-4 py-2 text-sm font-semibold text-[#0B4AC9] shadow-md transition hover:-translate-y-0.5 hover:shadow-lg"
              >
                Create Profile
              </a>
              <a
                href="/trades"
                className="inline-flex items-center justify-center rounded-xl border border-white/50 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Browse Trades Network
              </a>
            </div>
          </div>

          <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-6 text-sm text-slate-700 shadow-sm">
            Your profile is saved instantly. You can edit anytime and add more details later.
          </div>
        </div>
      </main>
    );
  }

  const employeeName = typeof employee?.name === "string" ? employee.name : "";
  const [employeeFirstName = "", employeeLastName = ""] = employeeName
    ? employeeName.split(" ")
    : [];

  // Since employee doesn't have publicSkills or jobHistory in select, default to empty
  const employeeSkills: string[] = [];
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const employeeWorkHistory = null;

  // ── Serialize Prisma objects for client component transfer ──
  // Prisma returns Decimal, Date, and BigInt types that Next.js CANNOT serialize
  // when passing from server components to client components.
  // This caused the "Something went wrong" crash on every profile load.
  // Using JSON round-trip as a bulletproof serializer — handles ALL non-serializable types.
  const safeCompany = member.company
    ? JSON.parse(
        JSON.stringify(member.company, (_, v) =>
          v instanceof Date ? v.toISOString() : typeof v === "bigint" ? v.toString() : v
        )
      )
    : null;

  // JSON round-trip the member to strip Prisma class instances, Decimals, etc.
  const safeMember = JSON.parse(
    JSON.stringify({ ...member, company: safeCompany }, (_, v) =>
      v instanceof Date ? v.toISOString() : typeof v === "bigint" ? v.toString() : v
    )
  );

  const mergedMember = {
    ...safeMember,
    // Fill common fields from employee profile if missing
    // Use || instead of ?? so empty strings also fall through to employee data
    firstName: member.firstName || employeeFirstName || user.firstName || "",
    lastName: member.lastName || employeeLastName || user.lastName || "",
    email: member.email || employee?.email || user.emailAddresses?.[0]?.emailAddress,
    avatar: member.avatar || member.profilePhoto || employee?.headshot_url || user.imageUrl,
    jobTitle: member.jobTitle ?? null,
    phone: member.phone ?? null,
    bio: member.bio ?? null,
    yearsExperience: member.yearsExperience ?? null,
    specialties:
      Array.isArray(member.specialties) && member.specialties.length > 0
        ? member.specialties
        : employeeSkills,
    workHistory: member.workHistory ?? null,
    certifications: member.certifications ?? null,
  };

  const editEmployeeHref = employee?.id ? `/team/member/${employee.id}/edit` : null;

  // Calculate profile strength for banner
  const strength = calculateProStrength(mergedMember as unknown as Record<string, unknown>);

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/40 to-amber-50/30 p-6">
      <div className="mx-auto mb-6 max-w-5xl rounded-2xl border border-blue-200/50 bg-white/90 p-6 shadow-lg backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">My Network</p>
            <h1 className="text-2xl font-bold text-slate-900">Your trades profile</h1>
            <p className="text-sm text-slate-600">
              Keep this updated—it&apos;s what appears in the Trades Network and contractor search.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              href="/trades/profile/edit"
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
            >
              Edit Profile
            </a>
            {mergedMember.company && (
              <a
                href={`/trades/companies/${mergedMember.companyId}/public`}
                className="flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md"
              >
                👁️ Company Client View
              </a>
            )}
            <a
              href={`/trades/profiles/${mergedMember.id}/public`}
              className="flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md"
            >
              👁️ Profile Client View
            </a>
            <a
              href="/trades"
              className="rounded-lg bg-[#117CFF] px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
            >
              Open Trades Network
            </a>
          </div>
        </div>
      </div>

      {/* ── Profile Strength Banner ── */}
      {strength.percent < 95 && (
        <div className="mx-auto mb-6 max-w-5xl">
          <ProfileStrengthBanner
            percent={strength.percent}
            missing={strength.missing}
            editHref="/trades/profile/edit"
            variant="pro"
          />
        </div>
      )}

      <TradesSocialProfile
        member={mergedMember}
        isOwnProfile={true}
        editEmployeeHref={editEmployeeHref}
      />
    </main>
  );
}
