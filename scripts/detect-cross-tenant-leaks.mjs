#!/usr/bin/env node
/**
 * ============================================================================
 * Cross-Tenant Leak Detection Script
 * ============================================================================
 *
 * Scans the database for evidence of tenant isolation violations:
 *
 * 1. Users who can see data from orgs they don't belong to
 * 2. tradesCompanyMember records linking to wrong orgId
 * 3. Orphaned user_organizations rows (org deleted but membership remains)
 * 4. team_members rows without matching user_organizations
 * 5. users.orgId pointing to an org they have no membership in
 * 6. Pending invitations for already-accepted members
 *
 * USAGE:
 *   node scripts/detect-cross-tenant-leaks.mjs [--fix]
 *
 * ============================================================================
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const doFix = process.argv.includes("--fix");

async function main() {
  console.log("\n🔍 Cross-Tenant Leak Detection");
  console.log("═".repeat(60));

  let totalIssues = 0;

  // ── 1. Users with orgId but no matching user_organizations row ──────
  console.log("\n📋 CHECK 1: users.orgId without matching membership...");
  try {
    const usersWithOrg = await prisma.users.findMany({
      where: { orgId: { not: "" } },
      select: { id: true, clerkUserId: true, email: true, orgId: true, name: true },
    });

    for (const user of usersWithOrg) {
      if (!user.clerkUserId || !user.orgId) continue;

      const membership = await prisma.user_organizations.findFirst({
        where: { userId: user.clerkUserId, organizationId: user.orgId },
      });

      if (!membership) {
        totalIssues++;
        console.log(`   ⚠️  ${user.email || user.name} (${user.clerkUserId})`);
        console.log(`      orgId: ${user.orgId} — NO matching user_organizations row`);

        if (doFix) {
          // Check if the org exists
          const org = await prisma.org.findUnique({ where: { id: user.orgId } });
          if (org) {
            console.log(`      🔧 Creating missing membership...`);
            await prisma.user_organizations.create({
              data: {
                id: crypto.randomUUID(),
                userId: user.clerkUserId,
                organizationId: user.orgId,
                role: "MEMBER",
              },
            });
            console.log(`      ✅ Created membership`);
          } else {
            console.log(`      🔧 Org ${user.orgId} doesn't exist — clearing users.orgId`);
            await prisma.$executeRaw`
              UPDATE users SET "orgId" = '' WHERE id = ${user.id}
            `;
          }
        }
      }
    }
  } catch (err) {
    console.log(`   ❌ Error: ${err.message}`);
  }

  // ── 2. Orphaned user_organizations (org doesn't exist) ─────────────
  console.log("\n📋 CHECK 2: Orphaned memberships (org deleted)...");
  try {
    const allMemberships = await prisma.user_organizations.findMany({
      include: { Org: { select: { id: true } } },
    });

    const orphaned = allMemberships.filter((m) => !m.Org);
    for (const m of orphaned) {
      totalIssues++;
      console.log(
        `   ⚠️  Membership ${m.id}: user=${m.userId} org=${m.organizationId} — ORG MISSING`
      );

      if (doFix) {
        console.log(`      🔧 Deleting orphaned membership...`);
        await prisma.user_organizations.delete({ where: { id: m.id } });
        console.log(`      ✅ Deleted`);
      }
    }

    if (orphaned.length === 0) console.log("   ✅ No orphaned memberships");
  } catch (err) {
    console.log(`   ❌ Error: ${err.message}`);
  }

  // ── 3. team_members without matching user_organizations ─────────────
  console.log("\n📋 CHECK 3: team_members without canonical membership...");
  try {
    const teamMembers = await prisma.$queryRaw`
      SELECT tm.user_id, tm.org_id, tm.role
      FROM team_members tm
      LEFT JOIN user_organizations uo
        ON uo."userId" = tm.user_id AND uo."organizationId" = tm.org_id
      WHERE uo.id IS NULL
    `;

    for (const tm of teamMembers) {
      totalIssues++;
      console.log(
        `   ⚠️  team_member user=${tm.user_id} org=${tm.org_id} — NO user_organizations row`
      );

      if (doFix) {
        const org = await prisma.org.findUnique({ where: { id: tm.org_id } });
        if (org) {
          console.log(`      🔧 Creating missing membership...`);
          await prisma.user_organizations.create({
            data: {
              id: crypto.randomUUID(),
              userId: tm.user_id,
              organizationId: tm.org_id,
              role: tm.role === "admin" ? "ADMIN" : "MEMBER",
            },
          });
          console.log(`      ✅ Created`);
        }
      }
    }

    if (teamMembers.length === 0) console.log("   ✅ All team_members have canonical memberships");
  } catch (err) {
    console.log(`   ❌ Error: ${err.message}`);
  }

  // ── 4. tradesCompanyMember with wrong orgId ─────────────────────────
  console.log("\n📋 CHECK 4: tradesCompanyMember with mismatched orgId...");
  try {
    const companyMembers = await prisma.tradesCompanyMember.findMany({
      where: { userId: { not: undefined } },
      select: { id: true, userId: true, orgId: true, email: true },
    });

    for (const cm of companyMembers) {
      if (!cm.userId || !cm.orgId) continue;

      const membership = await prisma.user_organizations.findFirst({
        where: { userId: cm.userId, organizationId: cm.orgId },
      });

      if (!membership) {
        totalIssues++;
        console.log(`   ⚠️  tradesCompanyMember ${cm.email || cm.userId}`);
        console.log(`      orgId=${cm.orgId} — user has NO membership in this org`);
        console.log(`      This means they could see data from an org they don't belong to`);
      }
    }
  } catch (err) {
    console.log(`   ❌ Error: ${err.message}`);
  }

  // ── 5. Pending invites for already-accepted members ─────────────────
  console.log("\n📋 CHECK 5: Stale pending invitations...");
  try {
    const staleInvites = await prisma.$queryRaw`
      SELECT ti.id, ti.email, ti.org_id, ti.status, ti.created_at
      FROM team_invitations ti
      INNER JOIN users u ON u.email = ti.email
      INNER JOIN user_organizations uo
        ON uo."userId" = u."clerkUserId" AND uo."organizationId" = ti.org_id
      WHERE ti.status = 'pending'
    `;

    for (const inv of staleInvites) {
      totalIssues++;
      console.log(`   ⚠️  Invite ${inv.id} for ${inv.email} to org ${inv.org_id}`);
      console.log(`      Status is 'pending' but user already has membership`);

      if (doFix) {
        console.log(`      🔧 Marking as accepted...`);
        await prisma.$executeRaw`
          UPDATE team_invitations SET status = 'accepted', accepted_at = NOW()
          WHERE id = ${inv.id}
        `;
        console.log(`      ✅ Updated`);
      }
    }

    if (staleInvites.length === 0) console.log("   ✅ No stale pending invitations");
  } catch (err) {
    console.log(`   ❌ Error: ${err.message}`);
  }

  // ── 6. Phantom orgs (auto-created with no real data) ────────────────
  console.log("\n📋 CHECK 6: Phantom orgs (0 claims, auto-created)...");
  try {
    const allOrgs = await prisma.org.findMany({
      select: { id: true, name: true, clerkOrgId: true, createdAt: true },
    });

    for (const org of allOrgs) {
      const claimsCount = await prisma.claims.count({ where: { orgId: org.id } });
      const memberCount = await prisma.user_organizations.count({
        where: { organizationId: org.id },
      });

      if (claimsCount === 0 && memberCount <= 1) {
        const isAutoCreated = org.clerkOrgId?.startsWith("org_") || !org.clerkOrgId;
        if (isAutoCreated) {
          totalIssues++;
          console.log(`   ⚠️  Phantom org: "${org.name}" (${org.id})`);
          console.log(
            `      Claims: ${claimsCount}, Members: ${memberCount}, Created: ${org.createdAt}`
          );
        }
      }
    }
  } catch (err) {
    console.log(`   ❌ Error: ${err.message}`);
  }

  // ── Summary ─────────────────────────────────────────────────────────
  console.log("\n" + "═".repeat(60));
  if (totalIssues === 0) {
    console.log("✅ No cross-tenant issues detected!");
  } else {
    console.log(`⚠️  Found ${totalIssues} issue(s)`);
    if (!doFix) {
      console.log("💡 Run with --fix to attempt automatic repairs");
    }
  }
  console.log("");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
