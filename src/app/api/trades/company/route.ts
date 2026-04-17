export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

import { isAdminRole } from "@/lib/auth/roleCompare";
import { withAuth } from "@/lib/auth/withAuth";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { isPlatformAdmin } from "@/lib/security/roles";
import { isValidationError, validateBody } from "@/lib/validation/middleware";
import { tradesCompanyUpdateSchema } from "@/lib/validation/trades-schemas";

// Minimum members to unlock company page (can be overridden by plan)
// Set to 1 so every registered user can access their company page
const MIN_MEMBERS_FOR_COMPANY_PAGE = 1;

// Plans that unlock company page regardless of member count
// Solo: 1 seat ($29.99) - needs upgrade or 3+ members
// Business: 10 seats ($80/seat) - unlocked
// Enterprise: 25 seats ($80/seat) - unlocked
const COMPANY_PAGE_PLANS = [
  "free", // Free tier — always show company page
  "solo", // Solo plan — your company page is yours
  "solo_plus", // Solo with addon seats
  "business",
  "enterprise",
  // Legacy plan mappings
  "starter",
  "pro",
  "pro_plus",
  "team",
  "unlimited",
];

export const GET = withAuth(async (req: NextRequest, { orgId, userId }) => {
  try {
    // Find the user's company membership
    let membership = await prisma.tradesCompanyMember.findFirst({
      where: { userId },
      include: {
        company: {
          include: {
            members: {
              where: { isActive: true, status: "active" },
              select: {
                id: true,
                userId: true,
                firstName: true,
                lastName: true,
                avatar: true,
                profilePhoto: true,
                role: true,
                isOwner: true,
                isAdmin: true,
                title: true,
                tradeType: true,
              },
            },
          },
        },
      },
    });

    // =====================================================================
    // SELF-HEALING: If no member by userId, try email + orgId before creating
    // This prevents ghost records when Clerk userId drifts across accounts
    // =====================================================================
    const memberInclude = {
      company: {
        include: {
          members: {
            where: { isActive: true, status: "active" },
            select: {
              id: true,
              userId: true,
              firstName: true,
              lastName: true,
              avatar: true,
              profilePhoto: true,
              role: true,
              isOwner: true,
              isAdmin: true,
              title: true,
              tradeType: true,
            },
          },
        },
      },
    } as const;

    if (!membership) {
      const { currentUser } = await import("@clerk/nextjs/server");
      const user = await currentUser();
      const email = user?.emailAddresses?.[0]?.emailAddress || "";

      // ── HEAL 1: Find by email (handles userId drift / account recreation) ──
      if (email) {
        const byEmail = await prisma.tradesCompanyMember.findFirst({
          where: { email },
          include: memberInclude,
        });
        if (byEmail) {
          try {
            membership = await prisma.tradesCompanyMember.update({
              where: { id: byEmail.id },
              data: { userId },
              include: memberInclude,
            });
            logger.info(
              `[trades/company] Healed userId via email: ${email}, old=${byEmail.userId}, new=${userId}`
            );
          } catch {
            // Unique constraint on userId — another record already has it; use found record as-is
            membership = byEmail;
          }
        }
      }

      // ── HEAL 2: Find by orgId (owner record in same org with wrong userId) ──
      if (!membership && orgId) {
        const byOrg = await prisma.tradesCompanyMember.findFirst({
          where: { orgId, isOwner: true },
          include: memberInclude,
        });
        if (byOrg) {
          try {
            membership = await prisma.tradesCompanyMember.update({
              where: { id: byOrg.id },
              data: { userId },
              include: memberInclude,
            });
            logger.info(
              `[trades/company] Healed userId via orgId: orgId=${orgId}, old=${byOrg.userId}, new=${userId}`
            );
          } catch {
            membership = byOrg;
          }
        }
      }

      // ── HEAL 3: Check if this email has a pending invite to an existing company ──
      if (!membership && email) {
        const invite = await prisma.tradesOnboardingInvite.findFirst({
          where: { email, status: "pending" },
          orderBy: { createdAt: "desc" },
        });

        if (invite?.companyName) {
          // Find the company by name
          const invitedCompany = await prisma.tradesCompany.findFirst({
            where: { name: invite.companyName },
            select: { id: true },
          });

          if (invitedCompany) {
            try {
              const firstName = user?.firstName || "";
              const lastName = user?.lastName || "";

              membership = await prisma.tradesCompanyMember.create({
                data: {
                  userId,
                  companyId: invitedCompany.id,
                  orgId: orgId || undefined,
                  firstName: firstName || null,
                  lastName: lastName || null,
                  email,
                  status: "active",
                  isActive: true,
                  isOwner: false,
                  isAdmin: false,
                  canEditCompany: false,
                  role: "member",
                  onboardingStep: "complete",
                },
                include: memberInclude,
              });

              // Mark invite as accepted
              await prisma.tradesOnboardingInvite.update({
                where: { id: invite.id },
                data: { status: "accepted", acceptedAt: new Date() },
              });

              logger.info(
                `[trades/company] Linked user to invited company: ${invite.companyName}, userId=${userId}`
              );
            } catch {
              // May fail if unique constraint — continue to auto-create
            }
          }
        }
      }

      // ── HEAL 4: Check if there's already a member record with this email in another company ──
      if (!membership && email) {
        const memberByEmail = await prisma.tradesCompanyMember.findFirst({
          where: { email, companyId: { not: null }, isActive: true },
          include: memberInclude,
        });

        if (memberByEmail?.companyId) {
          try {
            // Create a new member record for this userId linked to that company
            membership = await prisma.tradesCompanyMember.create({
              data: {
                userId,
                companyId: memberByEmail.companyId,
                orgId: orgId || undefined,
                firstName: memberByEmail.firstName,
                lastName: memberByEmail.lastName,
                email,
                status: "active",
                isActive: true,
                isOwner: false,
                isAdmin: false,
                canEditCompany: false,
                role: "member",
                onboardingStep: "complete",
              },
              include: memberInclude,
            });

            logger.info(
              `[trades/company] Linked userId to existing email-matched company member, userId=${userId}, email=${email}`
            );
          } catch {
            // Unique constraint — the email-matched record might be for a different person
          }
        }
      }

      // ── LAST RESORT: Auto-create a new member record ──
      if (!membership) {
        try {
          const firstName = user?.firstName || "";
          const lastName = user?.lastName || "";
          const displayName = [firstName, lastName].filter(Boolean).join(" ") || "Unknown";

          await prisma.tradesCompanyMember.create({
            data: {
              userId,
              orgId: orgId || undefined,
              firstName: firstName || null,
              lastName: lastName || null,
              email: email || `${userId}@unknown.invalid`,
              status: "active",
              isActive: true,
              isOwner: true,
              isAdmin: true,
              role: "owner",
              onboardingStep: "company",
              companyName: `${displayName}'s Company`,
            },
          });

          logger.info(`[trades/company] Auto-created member for user ${userId}`);

          membership = await prisma.tradesCompanyMember.findFirst({
            where: { userId },
            include: memberInclude,
          });
        } catch (autoCreateError) {
          logger.error("[trades/company] Auto-create member failed:", autoCreateError);
          return NextResponse.json(
            {
              ok: false,
              error: "No profile found. Please complete your profile setup.",
              hasCompany: false,
              hasProfile: false,
              companyPageUnlocked: false,
              requiresOnboarding: true,
            },
            { status: 404 }
          );
        }
      }
    }

    // Check if company page is unlocked
    let companyPageUnlocked = false;
    let unlockReason: string | null = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let requirementsToUnlock: Record<string, any> | null = null;
    let planKey = "solo";

    // Platform admin always has access (bypasses plan/seat requirements)
    const platformAdmin = await isPlatformAdmin();
    if (platformAdmin) {
      companyPageUnlocked = true;
      unlockReason = "platform_admin";
    }

    // Use orgId from withAuth — already DB-backed and server-resolved
    try {
      const org = await prisma.org.findUnique({
        where: { id: orgId },
        select: { planKey: true },
      });
      planKey = org?.planKey || "solo";
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_e) {
      // Org lookup may fail for edge cases, use default
    }

    const memberCount = membership?.company?.members?.length || 1;

    if (!companyPageUnlocked) {
      const planUnlocksCompanyPage = COMPANY_PAGE_PLANS.includes(planKey);
      const memberCountUnlocksPage = memberCount >= MIN_MEMBERS_FOR_COMPANY_PAGE;
      companyPageUnlocked = planUnlocksCompanyPage || memberCountUnlocksPage;

      if (companyPageUnlocked) {
        unlockReason = planUnlocksCompanyPage ? "plan" : "member_count";
      } else {
        requirementsToUnlock = {
          needsPlan: COMPANY_PAGE_PLANS[0],
          orNeedsMembers: MIN_MEMBERS_FOR_COMPANY_PAGE,
          currentMembers: memberCount,
          currentPlan: planKey,
        };
      }
    }

    if (!membership?.company) {
      // Auto-link or auto-create a company for users who have a member profile but no company
      if (membership) {
        try {
          // STEP 1: Look for an existing company already associated with this org
          // This prevents ghost companies when the member→company FK is missing
          let existingCompany = await prisma.tradesCompany.findFirst({
            where: {
              members: { some: { orgId } },
            },
            include: {
              members: {
                where: { isActive: true, status: "active" },
                select: {
                  id: true,
                  userId: true,
                  firstName: true,
                  lastName: true,
                  avatar: true,
                  profilePhoto: true,
                  role: true,
                  isOwner: true,
                  isAdmin: true,
                  title: true,
                  tradeType: true,
                },
              },
            },
          });

          if (existingCompany) {
            // Link this member to the existing company
            await prisma.tradesCompanyMember.update({
              where: { id: membership.id },
              data: { companyId: existingCompany.id, isOwner: true, isAdmin: true, role: "owner" },
            });
            logger.debug(
              `[trades/company] Linked member to existing company "${existingCompany.name}" for user ${userId}`
            );

            return NextResponse.json({
              ok: true,
              company: {
                ...existingCompany,
                coverPhoto: existingCompany.coverimage || null,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                members: existingCompany.members.map((m: any) => ({
                  ...m,
                  avatar: m.avatar || m.profilePhoto || null,
                })),
              },
              memberSettings: {},
              hasCompany: true,
              isAdmin: true,
              companyPageUnlocked: true,
              unlockReason: "auto_linked",
            });
          }

          // STEP 2: No existing company found — create a new one
          const companyName = membership.companyName || "My Company";

          const newCompany = await prisma.tradesCompany.create({
            data: {
              name: companyName,
              slug: `company-${membership.id.slice(-8)}`,
              description: "",
              members: {
                connect: { id: membership.id },
              },
            },
            include: {
              members: {
                where: { isActive: true, status: "active" },
                select: {
                  id: true,
                  userId: true,
                  firstName: true,
                  lastName: true,
                  avatar: true,
                  profilePhoto: true,
                  role: true,
                  isOwner: true,
                  isAdmin: true,
                  title: true,
                  tradeType: true,
                },
              },
            },
          });

          // Make this user the owner
          await prisma.tradesCompanyMember.update({
            where: { id: membership.id },
            data: { isOwner: true, isAdmin: true, role: "owner" },
          });

          logger.debug(`[trades/company] Auto-created company "${companyName}" for user ${userId}`);

          return NextResponse.json({
            ok: true,
            company: {
              ...newCompany,
              coverPhoto: newCompany.coverimage || null,
              // Merge profilePhoto fallback into avatar for each member
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              members: newCompany.members.map((m: any) => ({
                ...m,
                avatar: m.avatar || m.profilePhoto || null,
              })),
            },
            memberSettings: {},
            hasCompany: true,
            isAdmin: true,
            isOwner: true,
            canEditCompany: true,
            companyPageUnlocked: true,
            unlockReason: "auto_created",
            requirementsToUnlock: null,
            memberCount: 1,
          });
        } catch (autoCreateError) {
          logger.error("[trades/company] Auto-create failed:", autoCreateError);
        }
      }

      return NextResponse.json(
        {
          ok: false,
          error: "No company found for user",
          hasCompany: false,
          hasProfile: !!membership,
          companyPageUnlocked,
          unlockReason,
          requirementsToUnlock,
        },
        { status: 404 }
      );
    }

    // Also fetch the requesting member's extended fields (tagline, hours, etc.)
    const memberExtended = await prisma.tradesCompanyMember.findFirst({
      where: { userId },
      select: {
        tagline: true,
        aboutCompany: true,
        foundedYear: true,
        teamSize: true,
        hoursOfOperation: true,
        officePhone: true,
        mobilePhone: true,
        emergencyAvailable: true,
        freeEstimates: true,
        warrantyInfo: true,
        socialLinks: true,
        paymentMethods: true,
        languages: true,
        rocNumber: true,
        insuranceProvider: true,
        coverPhoto: true,
      },
    });

    // For cover photo: use company-level coverimage first, then try the owner's coverPhoto
    let companyCoverPhoto = membership.company.coverimage || memberExtended?.coverPhoto || null;
    if (!companyCoverPhoto) {
      // Fallback: look for the owner/admin's coverPhoto so all members see the same one
      const ownerMember = await prisma.tradesCompanyMember.findFirst({
        where: { companyId: membership.companyId, isOwner: true },
        select: { coverPhoto: true },
      });
      companyCoverPhoto = ownerMember?.coverPhoto || null;
    }

    return NextResponse.json({
      ok: true,
      company: {
        ...membership.company,
        // Map coverimage -> coverPhoto for frontend
        coverPhoto: companyCoverPhoto,
        // Merge profilePhoto fallback into avatar so team photos always render
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        members: membership.company.members.map((m: any) => ({
          ...m,
          avatar: m.avatar || m.profilePhoto || null,
        })),
      },
      // Include member-level extended settings
      memberSettings: memberExtended || {},
      hasCompany: true,
      isAdmin: isAdminRole(membership.role) || membership.isOwner || membership.isAdmin,
      isOwner: membership.isOwner,
      canEditCompany: membership.isOwner || membership.isAdmin || membership.canEditCompany,
      companyPageUnlocked,
      unlockReason,
      requirementsToUnlock,
      memberCount,
    });
  } catch (error) {
    logger.error("[trades/company] GET Error:", error);
    return NextResponse.json({ error: "Failed to fetch company" }, { status: 500 });
  }
});

export const PATCH = withAuth(async (req: NextRequest, { orgId, userId }) => {
  try {
    const body = await validateBody(req, tradesCompanyUpdateSchema);
    if (isValidationError(body)) return body;
    const {
      name,
      description,
      logo,
      coverPhoto,
      website,
      phone,
      email,
      address,
      city,
      state,
      zip,
      specialties,
      yearsInBusiness,
      licenseNumber,
      // Extended member-level fields (saved to member profile)
      tagline,
      aboutCompany,
      motto,
      foundedYear,
      teamSize,
      hoursOfOperation,
      officePhone,
      mobilePhone,
      emergencyAvailable,
      freeEstimates,
      warrantyInfo,
      socialLinks,
      paymentMethods,
      languages,
      rocNumber,
      insuranceProvider,
    } = body;

    // Find the user's company membership
    const membership = await prisma.tradesCompanyMember.findFirst({
      where: { userId },
      include: { company: true },
    });

    if (!membership?.companyId) {
      return NextResponse.json({ error: "No company found for user" }, { status: 404 });
    }

    // Check if user has admin privileges
    const isAdminUser = isAdminRole(membership.role) || membership.isOwner || membership.isAdmin;
    if (!isAdminUser) {
      return NextResponse.json({ error: "Only admins can edit company details" }, { status: 403 });
    }

    // Build update data for TradesCompany — only include provided fields
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: Record<string, any> = {
      updatedAt: new Date(),
    };

    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (logo !== undefined) updateData.logo = logo;
    // Schema column is 'coverimage' (not 'coverPhoto')
    if (coverPhoto !== undefined) updateData.coverimage = coverPhoto;
    if (website !== undefined) updateData.website = website;
    if (phone !== undefined) updateData.phone = phone;
    if (email !== undefined) updateData.email = email;
    if (address !== undefined) updateData.address = address;
    if (city !== undefined) updateData.city = city;
    if (state !== undefined) updateData.state = state;
    if (zip !== undefined) updateData.zip = zip;
    if (specialties !== undefined) updateData.specialties = specialties;
    if (yearsInBusiness !== undefined)
      updateData.yearsInBusiness = parseInt(String(yearsInBusiness)) || null;
    if (licenseNumber !== undefined) updateData.licenseNumber = licenseNumber;

    const updated = await prisma.tradesCompany.update({
      where: { id: membership.companyId },
      data: updateData,
    });

    // Also update member-level extended fields (tagline, hours, etc.)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const memberUpdate: Record<string, any> = {};
    if (tagline !== undefined) memberUpdate.tagline = tagline;
    if (aboutCompany !== undefined) memberUpdate.aboutCompany = aboutCompany;
    if (motto !== undefined) memberUpdate.tagline = motto; // motto maps to tagline
    if (foundedYear !== undefined) memberUpdate.foundedYear = parseInt(String(foundedYear)) || null;
    if (teamSize !== undefined) memberUpdate.teamSize = teamSize;
    if (hoursOfOperation !== undefined) memberUpdate.hoursOfOperation = hoursOfOperation;
    if (officePhone !== undefined) memberUpdate.officePhone = officePhone;
    if (mobilePhone !== undefined) memberUpdate.mobilePhone = mobilePhone;
    if (emergencyAvailable !== undefined) memberUpdate.emergencyAvailable = emergencyAvailable;
    if (freeEstimates !== undefined) memberUpdate.freeEstimates = freeEstimates;
    if (warrantyInfo !== undefined) memberUpdate.warrantyInfo = warrantyInfo;
    if (socialLinks !== undefined) memberUpdate.socialLinks = socialLinks;
    if (paymentMethods !== undefined) memberUpdate.paymentMethods = paymentMethods;
    if (languages !== undefined) memberUpdate.languages = languages;
    if (rocNumber !== undefined) memberUpdate.rocNumber = rocNumber;
    if (insuranceProvider !== undefined) memberUpdate.insuranceProvider = insuranceProvider;
    // NOTE: coverPhoto is NOT dual-written to member — company cover photo
    // lives only on tradesCompany.coverimage. Member coverPhoto is for
    // individual pro profile cover photos (separate surface).

    if (Object.keys(memberUpdate).length > 0) {
      memberUpdate.updatedAt = new Date();
      await prisma.tradesCompanyMember.update({
        where: { id: membership.id },
        data: memberUpdate,
      });
    }

    // Audit log — track company profile edits
    const changedFields = Object.keys(updateData).filter((k) => k !== "updatedAt");
    const changedMemberFields = Object.keys(memberUpdate).filter((k) => k !== "updatedAt");
    const allChanges = [...changedFields, ...changedMemberFields];

    if (allChanges.length > 0) {
      try {
        await prisma.audit_logs.create({
          data: {
            id: crypto.randomUUID(),
            org_id: orgId,
            user_id: userId,
            user_name: membership.company?.name ?? "Unknown",
            action: "company_profile_updated",
            payload: {
              companyId: membership.companyId,
              changedFields: allChanges,
              changes: Object.fromEntries(
                allChanges.map((k) => [k, updateData[k] ?? memberUpdate[k]])
              ),
            },
          },
        });
      } catch (auditErr) {
        // Non-blocking: don't fail the request if audit logging fails
        logger.warn("[trades/company] Audit log write failed:", auditErr);
      }
    }

    return NextResponse.json({
      ok: true,
      company: { ...updated, coverPhoto: updated.coverimage },
    });
  } catch (error) {
    logger.error("[trades/company] PATCH Error:", error);
    return NextResponse.json({ error: "Failed to update company" }, { status: 500 });
  }
});
