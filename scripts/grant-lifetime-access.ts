#!/usr/bin/env npx tsx
/**
 * Grant Lifetime Access to an Organization
 *
 * Usage:
 *   npx tsx scripts/grant-lifetime-access.ts <orgId>
 *
 * This script:
 * 1. Sets org.planTier = "enterprise" and org.subscriptionStatus = "active"
 * 2. Creates/updates a Subscription record with status = "active", no expiry
 * 3. Grants 999 seats so all members are covered
 *
 * Safe to run multiple times (idempotent).
 */

import { createId } from "@paralleldrive/cuid2";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const orgId = process.argv[2];

  if (!orgId) {
    // If no orgId provided, list all orgs so user can pick
    const orgs = await prisma.org.findMany({
      select: { id: true, name: true, planKey: true, subscriptionStatus: true },
      take: 20,
    });
    console.log("\n📋 Available organizations:\n");
    for (const org of orgs) {
      console.log(
        `  ${org.id}  |  ${org.name || "(unnamed)"}  |  plan: ${org.planKey || "none"}  |  status: ${org.subscriptionStatus || "none"}`
      );
    }
    console.log("\n⚡ Usage: npx tsx scripts/grant-lifetime-access.ts <orgId>\n");
    process.exit(0);
  }

  // 1. Verify org exists
  const org = await prisma.org.findUnique({ where: { id: orgId } });
  if (!org) {
    console.error(`❌ Org not found: ${orgId}`);
    process.exit(1);
  }

  console.log(`\n🏢 Granting lifetime access to: ${org.name || orgId}\n`);

  // 2. Update org billing fields
  await prisma.org.update({
    where: { id: orgId },
    data: {
      planKey: "enterprise",
      subscriptionStatus: "active",
      seatsLimit: 999,
    },
  });
  console.log("  ✅ org.planKey = enterprise, subscriptionStatus = active, seatsLimit = 999");

  // 3. Upsert subscription record
  const existing = await prisma.subscription.findFirst({ where: { orgId } });
  if (existing) {
    await prisma.subscription.update({
      where: { id: existing.id },
      data: {
        status: "active",
        seatCount: 999,
        currentPeriodEnd: new Date("2099-12-31"),
        updatedAt: new Date(),
      },
    });
    console.log("  ✅ Subscription updated: active, 999 seats, expires 2099");
  } else {
    await prisma.subscription.create({
      data: {
        id: createId(),
        orgId,
        stripeCustomerId: `manual_lifetime_${orgId}`,
        status: "active",
        seatCount: 999,
        pricePerSeat: 0,
        currentPeriodEnd: new Date("2099-12-31"),
        updatedAt: new Date(),
      },
    });
    console.log("  ✅ Subscription created: active, 999 seats, $0, expires 2099");
  }

  // 4. Show current members
  const members = await prisma.tradesCompanyMember.findMany({
    where: {
      company: { orgId },
      OR: [{ isActive: true }, { status: "pending" }],
    },
    select: { email: true, firstName: true, lastName: true, status: true, role: true },
  });

  console.log(`\n👥 Company members (${members.length}):`);
  for (const m of members) {
    console.log(
      `  ${m.email || "(no email)"}  |  ${m.firstName || ""} ${m.lastName || ""}  |  ${m.status}  |  ${m.role}`
    );
  }

  console.log("\n🎉 Done! All members of this org now have lifetime enterprise access.\n");
}

main()
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
