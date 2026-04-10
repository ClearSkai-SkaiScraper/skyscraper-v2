/**
 * Demo Seed Engine — Standalone Library
 *
 * Generates realistic demo data (contacts, properties, claims, leads)
 * scoped to a single tenant. All records are tagged with DEMO_SEED
 * in their notes/description for safe identification and cleanup.
 *
 * Usage:
 *   import { seedDemoData, cleanDemoData } from "@/lib/seed/demoSeedEngine";
 *   await seedDemoData(orgId, userId);
 *   await cleanDemoData(orgId);
 */

import { createId } from "@paralleldrive/cuid2";

import prisma from "@/lib/prisma";

// ── Demo Data Templates ─────────────────────────────────────────

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

const CLAIM_STATUSES = [
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

const SIGNING_STATUSES = [
  "signed",
  "signed",
  "signed",
  "pending",
  "pending",
  "not_sent",
  "not_sent",
  "declined",
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

// ── Engine Functions ────────────────────────────────────────────

export interface SeedResult {
  success: boolean;
  counts: { contacts: number; properties: number; claims: number; leads: number };
  errors: string[];
}

export async function seedDemoData(orgId: string, userId: string): Promise<SeedResult> {
  const errors: string[] = [];
  let contactCount = 0;
  let propertyCount = 0;
  let claimCount = 0;
  let leadCount = 0;

  for (let i = 0; i < 12; i++) {
    const addr = AZ_ADDRESSES[i];
    const firstName = FIRST_NAMES[i];
    const lastName = LAST_NAMES[i];
    const contactId = createId();
    const propertyId = createId();
    const claimId = createId();

    try {
      // ── Contact ───────────────────────────────────────────────
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any,
      });
      contactCount++;

      // ── Property ──────────────────────────────────────────────
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any,
      });
      propertyCount++;

      // ── Claim ──────────────────────────────────────────────────
      const claimNumber = `CLM-DEMO-${String(i + 1).padStart(3, "0")}`;
      const daysAgo = Math.floor(Math.random() * 60) + 5;
      const dateOfLoss = new Date(Date.now() - daysAgo * 86400000);

      await prisma.claims.create({
        data: {
          id: claimId,
          orgId,
          contactId,
          propertyId,
          title: `${addr.street} — ${DAMAGE_TYPES[i]} Damage`,
          claimNumber,
          description: `${DEMO_MARKER}: ${DAMAGE_TYPES[i]} damage from recent storm event`,
          insured_name: `${firstName} ${lastName}`,
          carrier: CARRIERS[i],
          damageType: DAMAGE_TYPES[i],
          status: CLAIM_STATUSES[i],
          signingStatus: SIGNING_STATUSES[i % SIGNING_STATUSES.length],
          estimatedJobValue: JOB_VALUES[i],
          jobValueStatus: i < 4 ? "approved" : i < 8 ? "pending" : "draft",
          dateOfLoss,
          createdBy: userId,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any,
      });
      claimCount++;

      // ── Lead ───────────────────────────────────────────────────
      await prisma.leads.create({
        data: {
          id: createId(),
          orgId,
          contactId,
          propertyId,
          claimId,
          source: LEAD_SOURCES[i],
          status: i < 6 ? "converted" : i < 10 ? "qualified" : "new",
          notes: DEMO_MARKER,
          createdBy: userId,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any,
      });
      leadCount++;
    } catch (err) {
      errors.push(`Row ${i}: ${(err as Error).message}`);
    }
  }

  return {
    success: errors.length === 0,
    counts: {
      contacts: contactCount,
      properties: propertyCount,
      claims: claimCount,
      leads: leadCount,
    },
    errors,
  };
}

export async function cleanDemoData(orgId: string): Promise<{ deleted: number; errors: string[] }> {
  const errors: string[] = [];
  let deleted = 0;

  try {
    // Delete in reverse dependency order using raw SQL for fields not in Prisma schema
    const leadsDel = await prisma.$executeRaw`
      DELETE FROM leads WHERE "orgId" = ${orgId}
        AND id IN (SELECT l.id FROM leads l JOIN contacts c ON c.id = l."contactId" WHERE c.notes LIKE ${"%" + DEMO_MARKER + "%"} AND l."orgId" = ${orgId})
    `;
    deleted += Number(leadsDel) || 0;

    const claimsDel = await prisma.claims.deleteMany({
      where: { orgId, description: { contains: DEMO_MARKER } },
    });
    deleted += claimsDel.count;

    const propsDel = await prisma.$executeRaw`
      DELETE FROM properties WHERE "orgId" = ${orgId}
        AND "contactId" IN (SELECT id FROM contacts WHERE notes LIKE ${"%" + DEMO_MARKER + "%"} AND "orgId" = ${orgId})
    `;
    deleted += Number(propsDel) || 0;

    const contactsDel = await prisma.contacts.deleteMany({
      where: { orgId, notes: { contains: DEMO_MARKER } },
    });
    deleted += contactsDel.count;
  } catch (err) {
    errors.push((err as Error).message);
  }

  return { deleted, errors };
}
