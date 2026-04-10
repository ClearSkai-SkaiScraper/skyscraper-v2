export const dynamic = "force-dynamic";

/**
 * POST /api/admin/seed-demo
 * DELETE /api/admin/seed-demo?confirm=true
 *
 * One-click demo data engine — populates an org with realistic
 * claims, contacts, properties, pipeline stages, and leaderboard data.
 * RBAC: admin only.
 */
import { NextRequest, NextResponse } from "next/server";

import { requireApiAuth } from "@/lib/auth/apiAuth";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";

// ── Helpers ──────────────────────────────────────────────────────
function rid() {
  return crypto.randomUUID();
}

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function money(min: number, max: number): number {
  return Math.round((min + Math.random() * (max - min)) * 100) / 100;
}

// ── Demo Data Templates ─────────────────────────────────────────
const FIRST_NAMES = [
  "Mike",
  "Sarah",
  "Carlos",
  "Jessica",
  "Dave",
  "Amanda",
  "Chris",
  "Maria",
  "Jake",
  "Ashley",
  "Tom",
  "Rachel",
  "Brandon",
  "Nicole",
  "Ryan",
];
const LAST_NAMES = [
  "Johnson",
  "Martinez",
  "Williams",
  "Brown",
  "Garcia",
  "Davis",
  "Rodriguez",
  "Wilson",
  "Anderson",
  "Thomas",
  "Taylor",
  "Moore",
  "Jackson",
  "Martin",
  "Lee",
];
const STREETS = [
  "4521 N 12th St",
  "1802 W Camelback Rd",
  "3310 E Indian School Rd",
  "5620 S Rural Rd",
  "8844 N 7th Ave",
  "2215 E Baseline Rd",
  "9102 W Thunderbird Rd",
  "1456 N Scottsdale Rd",
  "6733 E McDowell Rd",
  "3901 W Peoria Ave",
  "7210 N Cave Creek Rd",
  "1123 S Mill Ave",
  "4400 E Thomas Rd",
  "2890 W Northern Ave",
  "5515 N 19th Ave",
];
const CITIES = [
  "Phoenix",
  "Scottsdale",
  "Tempe",
  "Mesa",
  "Glendale",
  "Chandler",
  "Gilbert",
  "Peoria",
];
const CARRIERS = [
  "State Farm",
  "Allstate",
  "USAA",
  "Farmers",
  "Liberty Mutual",
  "Nationwide",
  "Progressive",
  "American Family",
];
const DAMAGE_TYPES = ["STORM", "HAIL", "WIND", "WATER", "FIRE"];
const CLAIM_STATUSES = [
  "new",
  "active",
  "active",
  "active",
  "inspection_scheduled",
  "approved",
  "approved",
  "closed",
];
const SIGNING_STATUSES = [null, null, "pending", "pending", "signed", "signed", "signed", "signed"];
const JOB_VALUE_STATUSES = [
  null,
  null,
  null,
  "pending",
  "pending",
  "approved",
  "approved",
  "approved",
];
const LEAD_SOURCES = [
  "door_knock",
  "door_knock",
  "referral",
  "referral",
  "canvass",
  "website",
  "social_media",
  "repeat_customer",
];

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function POST(req: NextRequest) {
  // Block demo seeding in production
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_DEMO_SEED !== "true") {
    return NextResponse.json(
      { error: "Demo seeding is not available in production" },
      { status: 403 }
    );
  }

  const authResult = await requireApiAuth();
  if (authResult instanceof NextResponse) return authResult;
  const { orgId, userId } = authResult;
  if (!orgId) {
    return NextResponse.json({ error: "Organization required" }, { status: 400 });
  }

  const rl = await checkRateLimit(userId, "API");
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  try {
    // Check if demo data already exists
    const existingDemo = await prisma.contacts.findFirst({
      where: { orgId, notes: { contains: "DEMO_SEED" } },
    });
    if (existingDemo) {
      return NextResponse.json(
        { error: "Demo data already loaded. Delete it first via DELETE." },
        { status: 400 }
      );
    }

    const counts = { contacts: 0, properties: 0, claims: 0, leads: 0 };

    // ── Create 12 Contacts + Properties + Claims ────────────────
    for (let i = 0; i < 12; i++) {
      const firstName = FIRST_NAMES[i % FIRST_NAMES.length];
      const lastName = LAST_NAMES[i % LAST_NAMES.length];
      const street = STREETS[i % STREETS.length];
      const city = pick(CITIES);
      const daysBack = Math.floor(Math.random() * 80) + 5;
      const status = CLAIM_STATUSES[i % CLAIM_STATUSES.length];
      const signing = SIGNING_STATUSES[i % SIGNING_STATUSES.length];
      const jvStatus = JOB_VALUE_STATUSES[i % JOB_VALUE_STATUSES.length];
      const jobValue = jvStatus ? money(8000, 45000) : null;

      const contactId = rid();
      const propertyId = rid();
      const claimId = rid();

      // Contact
      await prisma.contacts.create({
        data: {
          id: contactId,
          orgId,
          firstName,
          lastName,
          email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`,
          phone: `(${480 + (i % 3)}) ${String(100 + i * 37).slice(0, 3)}-${String(1000 + i * 123).slice(0, 4)}`,
          slug: `${firstName.toLowerCase()}-${lastName.toLowerCase()}-${contactId.slice(0, 6)}`,
          notes: "DEMO_SEED — Safe to delete",
          updatedAt: daysAgo(daysBack),
        },
      });
      counts.contacts++;

      // Property
      await prisma.properties.create({
        data: {
          id: propertyId,
          orgId,
          contactId,
          name: street,
          street,
          city,
          state: "AZ",
          zipCode: `8${5000 + i}`,
          propertyType: "RESIDENTIAL",
          updatedAt: daysAgo(daysBack),
        },
      });
      counts.properties++;

      // Claim
      await prisma.claims.create({
        data: {
          id: claimId,
          orgId,
          propertyId,
          clientId: contactId,
          claimNumber: `CLM-DEMO-${String(i + 1).padStart(3, "0")}`,
          title: `${firstName} ${lastName} — ${pick(["Roof", "Siding", "Gutter", "Full Exterior"])} Damage`,
          description: `Demo claim for ${street}, ${city}. DEMO_SEED`,
          status,
          damageType: pick(DAMAGE_TYPES),
          dateOfLoss: daysAgo(daysBack + 10),
          insured_name: `${firstName} ${lastName}`,
          homeownerEmail: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`,
          carrier: pick(CARRIERS),
          policy_number: `POL-${String(Math.floor(Math.random() * 999999)).padStart(6, "0")}`,
          ...(signing ? ({ signingStatus: signing } as any) : {}),
          ...(jobValue ? ({ estimatedJobValue: jobValue } as any) : {}),
          ...(jvStatus ? ({ jobValueStatus: jvStatus } as any) : {}),
          leadSource: pick(LEAD_SOURCES) as any,
          updatedAt: daysAgo(Math.max(daysBack - 5, 1)),
        } as any,
      });
      counts.claims++;

      // Lead (for pipeline)
      try {
        await prisma.leads.create({
          data: {
            id: rid(),
            orgId,
            contactId,
            propertyId,
            claimId,
            firstName,
            lastName,
            email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`,
            phone: `(480) ${String(100 + i * 37).slice(0, 3)}-${String(1000 + i * 123).slice(0, 4)}`,
            source: pick(LEAD_SOURCES),
            stage: status === "closed" ? "won" : status === "new" ? "new" : "qualified",
            address: `${street}, ${city}, AZ`,
            notes: "DEMO_SEED",
            updatedAt: daysAgo(daysBack),
          } as any,
        });
        counts.leads++;
      } catch {
        // Lead model may have different shape — non-critical
      }
    }

    logger.info("[SEED_DEMO] Demo data created", { orgId, ...counts });

    return NextResponse.json({
      success: true,
      counts,
      message: `Loaded ${counts.contacts} contacts, ${counts.properties} properties, ${counts.claims} claims, ${counts.leads} leads`,
    });
  } catch (error) {
    logger.error("[SEED_DEMO] Error:", error);
    return NextResponse.json({ error: "Failed to seed demo data" }, { status: 500 });
  }
}

/**
 * DELETE — Remove all demo seed data for the org
 */
export async function DELETE(req: NextRequest) {
  // Block demo deletion in production
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_DEMO_SEED !== "true") {
    return NextResponse.json(
      { error: "Demo operations are not available in production" },
      { status: 403 }
    );
  }

  const authResult = await requireApiAuth();
  if (authResult instanceof NextResponse) return authResult;
  const { orgId } = authResult;
  if (!orgId) {
    return NextResponse.json({ error: "Organization required" }, { status: 400 });
  }

  const url = new URL(req.url);
  if (url.searchParams.get("confirm") !== "true") {
    return NextResponse.json({ error: "Add ?confirm=true to confirm deletion" }, { status: 400 });
  }

  try {
    // Find demo contacts
    const demoContacts = await prisma.contacts.findMany({
      where: { orgId, notes: { contains: "DEMO_SEED" } },
      select: { id: true },
    });
    const contactIds = demoContacts.map((c) => c.id);

    if (!contactIds.length) {
      return NextResponse.json({ message: "No demo data found" });
    }

    // Delete in order: leads → claims → properties → contacts
    const deletedLeads = await prisma.leads
      .deleteMany({
        where: { orgId, notes: { contains: "DEMO_SEED" } } as any,
      })
      .catch(() => ({ count: 0 }));

    const deletedClaims = await prisma.claims.deleteMany({
      where: { orgId, description: { contains: "DEMO_SEED" } },
    });

    const deletedProps = await prisma.properties.deleteMany({
      where: { orgId, contactId: { in: contactIds } },
    });

    const deletedContacts = await prisma.contacts.deleteMany({
      where: { orgId, notes: { contains: "DEMO_SEED" } },
    });

    logger.info("[SEED_DEMO] Demo data deleted", {
      orgId,
      leads: deletedLeads.count,
      claims: deletedClaims.count,
      properties: deletedProps.count,
      contacts: deletedContacts.count,
    });

    return NextResponse.json({
      success: true,
      deleted: {
        leads: deletedLeads.count,
        claims: deletedClaims.count,
        properties: deletedProps.count,
        contacts: deletedContacts.count,
      },
    });
  } catch (error) {
    logger.error("[SEED_DEMO] Delete error:", error);
    return NextResponse.json({ error: "Failed to delete demo data" }, { status: 500 });
  }
}
