#!/usr/bin/env node
/**
 * ============================================================================
 * Admin Repair Script — Fix Orphaned / Phantom Org Memberships
 * ============================================================================
 *
 * This script fixes users who were auto-onboarded into phantom orgs because
 * the team invite acceptance route was missing the user_organizations INSERT.
 *
 * WHAT IT DOES:
 *   1. Finds the user by Clerk ID or email
 *   2. Lists all their org memberships
 *   3. Identifies phantom/empty orgs (0 claims, auto-created)
 *   4. Optionally deletes phantom org + membership (with --fix flag)
 *   5. Checks for pending invitations that should be accepted
 *   6. Optionally creates the correct membership (with --fix --target-org=<orgId>)
 *
 * USAGE:
 *   node scripts/repair-user-org.mjs <clerkUserId|email> [--fix] [--target-org=<orgId>]
 *
 * EXAMPLES:
 *   # Dry-run: show the user's state
 *   node scripts/repair-user-org.mjs user_2abc123
 *
 *   # Fix: delete phantom orgs and create correct membership
 *   node scripts/repair-user-org.mjs user_2abc123 --fix --target-org=clxxxxxxxx
 *
 * ============================================================================
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const args = process.argv.slice(2);
const userIdentifier = args.find((a) => !a.startsWith("--"));
const doFix = args.includes("--fix");
const targetOrgArg = args.find((a) => a.startsWith("--target-org="));
const targetOrgId = targetOrgArg?.split("=")[1] || null;

if (!userIdentifier) {
  console.error(
    "Usage: node scripts/repair-user-org.mjs <clerkUserId|email> [--fix] [--target-org=<orgId>]"
  );
  process.exit(1);
}

async function main() {
  console.log("\n🔧 User Org Repair Tool");
  console.log("═".repeat(60));

  // 1. Find the user
  let user;
  if (userIdentifier.startsWith("user_")) {
    user = await prisma.users.findFirst({ where: { clerkUserId: userIdentifier } });
  } else {
    user = await prisma.users.findFirst({ where: { email: userIdentifier } });
  }

  if (!user) {
    console.error(`❌ User not found: ${userIdentifier}`);
    process.exit(1);
  }

  const clerkUserId = user.clerkUserId;
  console.log(`\n👤 User: ${user.name || user.email} (${clerkUserId})`);
  console.log(`   Email: ${user.email}`);
  console.log(`   Legacy orgId: ${user.orgId || "(none)"}`);

  // 2. List all memberships
  const memberships = await prisma.user_organizations.findMany({
    where: { userId: clerkUserId },
    include: { Org: true },
  });

  console.log(`\n📋 Memberships (${memberships.length}):`);

  for (const m of memberships) {
    const claimsCount = m.organizationId
      ? await prisma.claims.count({ where: { orgId: m.organizationId } })
      : 0;
    const isPhantom = m.Org?.clerkOrgId?.startsWith("org_") && claimsCount === 0;

    console.log(`   ${isPhantom ? "🗑️" : "✅"} Org: ${m.Org?.name || "(deleted)"}`);
    console.log(`      ID: ${m.organizationId}`);
    console.log(`      ClerkOrgId: ${m.Org?.clerkOrgId || "(none)"}`);
    console.log(`      Role: ${m.role}`);
    console.log(`      Claims: ${claimsCount}`);
    console.log(`      Created: ${m.createdAt}`);
    console.log(`      ${isPhantom ? "⚠️  PHANTOM — auto-created, empty" : ""}`);
  }

  // 3. Check team_members (raw SQL table)
  const teamMembers = await prisma.$queryRaw`
    SELECT tm.*, ti.org_id as invite_org_id, ti.email as invite_email, ti.status as invite_status
    FROM team_members tm
    LEFT JOIN team_invitations ti ON ti.org_id = tm.org_id AND ti.status = 'accepted'
    WHERE tm.user_id = ${clerkUserId}
  `.catch(() => []);

  console.log(`\n🏢 Team Members (raw SQL): ${teamMembers.length}`);
  for (const tm of teamMembers) {
    console.log(`   Org: ${tm.org_id}, Role: ${tm.role}, Joined: ${tm.joined_at}`);
  }

  // 4. Check pending invitations
  const pendingInvites = await prisma.$queryRaw`
    SELECT id, org_id, email, role, expires_at, created_at
    FROM team_invitations
    WHERE email = ${user.email} AND status = 'pending' AND expires_at > NOW()
  `.catch(() => []);

  console.log(`\n📨 Pending Invitations: ${pendingInvites.length}`);
  for (const inv of pendingInvites) {
    const org = await prisma.org.findUnique({ where: { id: inv.org_id }, select: { name: true } });
    console.log(
      `   Org: ${org?.name || inv.org_id}, Role: ${inv.role}, Expires: ${inv.expires_at}`
    );
  }

  // 5. Check tradesCompanyMember records
  const companyMembers = await prisma.tradesCompanyMember.findMany({
    where: { userId: clerkUserId },
    include: { company: { select: { name: true } } },
  });

  console.log(`\n🏗️ Trades Company Members: ${companyMembers.length}`);
  for (const cm of companyMembers) {
    console.log(
      `   Company: ${cm.company?.name || "(unknown)"}, OrgId: ${cm.orgId}, Role: ${cm.role}`
    );
  }

  // 6. Diagnosis
  console.log("\n" + "═".repeat(60));
  console.log("📊 DIAGNOSIS:");

  const phantomMemberships = [];
  for (const m of memberships) {
    if (!m.organizationId || !m.Org) continue;
    const claimsCount = await prisma.claims.count({ where: { orgId: m.organizationId } });
    if (m.Org.clerkOrgId?.startsWith("org_") && claimsCount === 0) {
      phantomMemberships.push(m);
    }
  }

  if (phantomMemberships.length > 0) {
    console.log(
      `   🗑️  Found ${phantomMemberships.length} phantom org(s) — auto-created with no data`
    );
  }
  if (pendingInvites.length > 0) {
    console.log(`   📨 Has ${pendingInvites.length} pending invitation(s) — should accept`);
  }
  if (companyMembers.length > 0 && memberships.length === 0) {
    console.log(`   ⚠️  Has tradesCompanyMember but no org membership — data leak risk`);
  }

  // 7. Fix mode
  if (!doFix) {
    console.log("\n💡 Run with --fix to apply repairs");
    console.log("   --fix --target-org=<orgId> to add membership to a specific org");
    process.exit(0);
  }

  console.log("\n🔧 APPLYING FIXES...");

  // Delete phantom orgs and their memberships
  for (const pm of phantomMemberships) {
    console.log(`   Deleting phantom membership: ${pm.organizationId}`);
    await prisma.user_organizations.delete({ where: { id: pm.id } });

    // Check if any other users are in this org
    const otherMembers = await prisma.user_organizations.count({
      where: { organizationId: pm.organizationId },
    });
    if (otherMembers === 0) {
      console.log(`   Deleting phantom org (no other members): ${pm.organizationId}`);
      await prisma.org.delete({ where: { id: pm.organizationId } }).catch(() => {
        console.log(`   ⚠️  Could not delete org (may have cascading refs)`);
      });
    }
  }

  // Create correct membership if target org specified
  if (targetOrgId) {
    const targetOrg = await prisma.org.findUnique({
      where: { id: targetOrgId },
      select: { id: true, name: true },
    });

    if (!targetOrg) {
      console.error(`   ❌ Target org not found: ${targetOrgId}`);
    } else {
      const existing = await prisma.user_organizations.findFirst({
        where: { userId: clerkUserId, organizationId: targetOrgId },
      });

      if (existing) {
        console.log(`   ✅ Already has membership in ${targetOrg.name}`);
      } else {
        await prisma.user_organizations.create({
          data: {
            id: crypto.randomUUID(),
            userId: clerkUserId,
            organizationId: targetOrgId,
            role: "MEMBER",
          },
        });
        console.log(`   ✅ Created membership in ${targetOrg.name} (role: MEMBER)`);
      }

      // Also update legacy users.orgId
      await prisma.users.updateMany({
        where: { clerkUserId },
        data: { orgId: targetOrgId },
      });
      console.log(`   ✅ Updated users.orgId → ${targetOrgId}`);
    }
  }

  console.log("\n✅ Repair complete!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
