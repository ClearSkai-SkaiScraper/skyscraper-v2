#!/usr/bin/env node

/**
 * CLI: Seed Demo Data
 *
 * Creates realistic demo data for product demos and testing.
 * Includes: Contacts, Properties, Claims, Leads, Branding, Activities
 *
 * Usage:
 *   node scripts/seed-demo-cli.ts --orgId <orgId> --userId <userId>
 *   node scripts/seed-demo-cli.ts --orgId <orgId> --clean
 *
 * Quick seed (uses env vars):
 *   TEST_AUTH_ORG_ID=xxx TEST_AUTH_USER_ID=yyy node scripts/seed-demo-cli.ts --auto
 *
 * Requires: DATABASE_URL env var set (uses Prisma directly)
 */

/* eslint-disable @typescript-eslint/no-var-requires */
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const DEMO_MARKER = "DEMO_SEED";

const AZ_ADDRESSES = [
  { street: "4521 W Thunderbird Rd", city: "Glendale", state: "AZ", zip: "85306" },
  { street: "2901 N Central Ave", city: "Phoenix", state: "AZ", zip: "85012" },
  { street: "8744 E Shea Blvd", city: "Scottsdale", state: "AZ", zip: "85260" },
  { street: "1622 S Dobson Rd", city: "Mesa", state: "AZ", zip: "85202" },
  { street: "3380 W Chandler Blvd", city: "Chandler", state: "AZ", zip: "85226" },
  { street: "6802 E Greenway Pkwy", city: "Scottsdale", state: "AZ", zip: "85254" },
  { street: "9201 N 29th Ave", city: "Phoenix", state: "AZ", zip: "85051" },
  { street: "1420 W Southern Ave", city: "Tempe", state: "AZ", zip: "85282" },
  { street: "14050 N 83rd Ave", city: "Peoria", state: "AZ", zip: "85381" },
  { street: "5102 E Shea Blvd", city: "Scottsdale", state: "AZ", zip: "85254" },
  { street: "2801 W Camelback Rd", city: "Phoenix", state: "AZ", zip: "85017" },
  { street: "7330 W Thomas Rd", city: "Phoenix", state: "AZ", zip: "85033" },
];

const CARRIERS = [
  "State Farm",
  "Allstate",
  "USAA",
  "Farmers Insurance",
  "Liberty Mutual",
  "Progressive",
  "Nationwide",
  "Travelers",
  "American Family",
  "Erie Insurance",
  "Hartford",
  "Amica Mutual",
];

const FIRST_NAMES = [
  "Michael",
  "Sarah",
  "James",
  "Emily",
  "Robert",
  "Jennifer",
  "David",
  "Jessica",
  "William",
  "Amanda",
  "Richard",
  "Maria",
];

const LAST_NAMES = [
  "Johnson",
  "Martinez",
  "Thompson",
  "Garcia",
  "Williams",
  "Anderson",
  "Taylor",
  "Brown",
  "Wilson",
  "Davis",
  "Miller",
  "Lopez",
];

const DAMAGE_TYPES = [
  "wind",
  "hail",
  "water",
  "fire",
  "flood",
  "storm",
  "roof",
  "siding",
  "window",
  "gutter",
  "fence",
  "structural",
];

const STATUSES = [
  "new",
  "inspection_scheduled",
  "estimate_sent",
  "approved",
  "in_progress",
  "awaiting_payment",
  "completed",
  "supplement_needed",
  "pending_review",
  "adjuster_meeting",
  "signed",
  "negotiation",
];

const LEAD_SOURCES = [
  "door_knock",
  "door_knock",
  "door_knock",
  "referral",
  "referral",
  "canvass",
  "canvass",
  "website",
  "social_media",
  "google_ads",
  "storm_chaser",
  "insurance_agent",
];

const JOB_VALUES = [
  8500, 12000, 15750, 18200, 22000, 25500, 28000, 31000, 35200, 38000, 42000, 45000,
];

function cuid() {
  return "c" + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

async function seedDemo(orgId, userId) {
  console.log(`\n🌱 Seeding demo data for org: ${orgId}\n`);
  let created = 0;

  // Step 1: Seed branding (if not exists)
  console.log("📋 Step 1/2: Setting up demo branding...");
  try {
    const existingBranding = await prisma.org_branding.findUnique({
      where: { orgId },
    });

    if (!existingBranding) {
      await prisma.org_branding.create({
        data: {
          id: orgId,
          orgId,
          ownerId: userId,
          companyName: "SkaiScraper Demo Roofing LLC",
          license: "ROC-123456",
          phone: "(602) 555-DEMO",
          email: "demo@skaiscraper.com",
          website: "https://skaiscraper.com",
          colorPrimary: "#117CFF",
          colorAccent: "#FFC838",
          companyAddress: "123 Demo Street, Phoenix, AZ 85001",
          updatedAt: new Date(),
        },
      });
      console.log("  ✅ Branding created");
    } else {
      console.log("  ⏭️  Branding already exists");
    }
  } catch (err) {
    console.log(`  ⚠️  Branding: ${err.message}`);
  }

  // Step 2: Seed claims pipeline data
  console.log("\n📋 Step 2/2: Creating demo claims...");
  for (let i = 0; i < 12; i++) {
    const addr = AZ_ADDRESSES[i];
    const firstName = FIRST_NAMES[i];
    const lastName = LAST_NAMES[i];
    const contactId = cuid();
    const propertyId = cuid();
    const claimId = cuid();

    try {
      await prisma.contacts.create({
        data: {
          id: contactId,
          orgId,
          firstName,
          lastName,
          email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`,
          phone: `(602) ${String(200 + i).padStart(3, "0")}-${String(1000 + i * 111).slice(0, 4)}`,
          type: "homeowner",
          notes: DEMO_MARKER,
          createdBy: userId,
        },
      });

      await prisma.properties.create({
        data: {
          id: propertyId,
          orgId,
          contactId,
          address: addr.street,
          city: addr.city,
          state: addr.state,
          zipCode: addr.zip,
          propertyType: i % 3 === 0 ? "commercial" : "residential",
          notes: DEMO_MARKER,
        },
      });

      const daysAgo = Math.floor(Math.random() * 60) + 5;
      await prisma.claims.create({
        data: {
          id: claimId,
          orgId,
          contactId,
          propertyId,
          title: `${addr.street} — ${DAMAGE_TYPES[i]} Damage`,
          claimNumber: `CLM-DEMO-${String(i + 1).padStart(3, "0")}`,
          description: `${DEMO_MARKER}: ${DAMAGE_TYPES[i]} damage from recent storm event`,
          insured_name: `${firstName} ${lastName}`,
          carrier: CARRIERS[i],
          damageType: DAMAGE_TYPES[i],
          status: STATUSES[i],
          signingStatus: i % 3 === 0 ? "signed" : i % 3 === 1 ? "pending" : "not_sent",
          estimatedJobValue: JOB_VALUES[i],
          jobValueStatus: i < 4 ? "approved" : i < 8 ? "pending" : "draft",
          dateOfLoss: new Date(Date.now() - daysAgo * 86400000),
          createdBy: userId,
        },
      });

      await prisma.leads.create({
        data: {
          id: cuid(),
          orgId,
          contactId,
          propertyId,
          claimId,
          source: LEAD_SOURCES[i],
          status: i < 6 ? "converted" : i < 10 ? "qualified" : "new",
          notes: DEMO_MARKER,
          createdBy: userId,
        },
      });

      created++;
      process.stdout.write(`  ✅ ${i + 1}/12  ${firstName} ${lastName} — ${addr.street}\n`);
    } catch (err) {
      console.error(`  ❌ ${i + 1}/12  ${err.message}`);
    }
  }

  console.log(
    `\n🎉 Done! Created ${created * 4} records (${created} contacts, properties, claims, leads)\n`
  );
}

async function cleanDemo(orgId) {
  console.log(`\n🧹 Cleaning demo data for org: ${orgId}\n`);

  const leads = await prisma.leads.deleteMany({
    where: { orgId, notes: { contains: DEMO_MARKER } },
  });
  console.log(`  Leads deleted: ${leads.count}`);

  const claims = await prisma.claims.deleteMany({
    where: { orgId, description: { contains: DEMO_MARKER } },
  });
  console.log(`  Claims deleted: ${claims.count}`);

  const props = await prisma.properties.deleteMany({
    where: { orgId, notes: { contains: DEMO_MARKER } },
  });
  console.log(`  Properties deleted: ${props.count}`);

  const contacts = await prisma.contacts.deleteMany({
    where: { orgId, notes: { contains: DEMO_MARKER } },
  });
  console.log(`  Contacts deleted: ${contacts.count}`);

  console.log(
    `\n✅ Total: ${leads.count + claims.count + props.count + contacts.count} records removed\n`
  );
}

async function main() {
  const args = process.argv.slice(2);

  // Auto mode: use env vars
  const isAuto = args.includes("--auto");
  const orgId = isAuto ? process.env.TEST_AUTH_ORG_ID : args[args.indexOf("--orgId") + 1];
  const userId = isAuto
    ? process.env.TEST_AUTH_USER_ID
    : args.includes("--userId")
      ? args[args.indexOf("--userId") + 1]
      : null;
  const isClean = args.includes("--clean");

  if (!orgId) {
    console.error(`
Usage: 
  node scripts/seed-demo-cli.ts --orgId <orgId> --userId <userId>
  node scripts/seed-demo-cli.ts --orgId <orgId> --clean
  
  Or use --auto with env vars:
  TEST_AUTH_ORG_ID=xxx TEST_AUTH_USER_ID=yyy node scripts/seed-demo-cli.ts --auto
`);
    process.exit(1);
  }

  console.log(`
╔════════════════════════════════════════════════════════════════╗
║               SKAISCRAPER DEMO DATA SEEDER                    ║
╚════════════════════════════════════════════════════════════════╝
`);

  try {
    if (isClean) {
      await cleanDemo(orgId);
    } else {
      if (!userId) {
        console.error("--userId is required for seeding (use --clean to remove data)");
        process.exit(1);
      }
      await seedDemo(orgId, userId);

      console.log(`
📊 Demo data summary:
   • 12 Contacts (homeowners across Phoenix metro)
   • 12 Properties (residential & commercial)
   • 12 Claims (various stages: new → completed)
   • 12 Leads (door knocks, referrals, canvass)
   • 1 Branding setup (company profile)

🎯 Ready for your demo! Key scenarios:
   1. Pipeline view: See claims at different stages
   2. Map view: All properties plotted on map
   3. Branding: Company name appears on reports
   4. Reports: Generate damage assessment for any claim
`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
