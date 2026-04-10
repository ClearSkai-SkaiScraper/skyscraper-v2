/**
 * Demo Data Seeding System
 *
 * Automatically creates realistic demo data for new organizations.
 * Idempotent - safe to call multiple times, only seeds if org is empty.
 *
 * FK ORDER GUARANTEE: Contact → Property → Claim
 * All NOT NULL constraints satisfied.
 */

import crypto from "crypto";

import { logger } from "@/lib/logger";
import { EnsuredOrg } from "@/lib/org/ensureOrgForUser";
import prisma from "@/lib/prisma";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const DEMO_SEED_KEY = "demo-seed-v1";

const buildDemoIds = (orgId: string) => {
  const orgShort = orgId.slice(0, 8);
  return {
    contactId: `demo-contact-${orgId}`,
    propertyId: `demo-property-${orgId}`,
    claimId: `demo-claim-john-smith-${orgId}`,
    claimNumber: `CLM-${orgShort}-001`,
  };
};

export interface DemoSeedResult {
  seeded: boolean;
  reason: string;
  claimId?: string;
  claimNumber?: string;
  propertyId?: string;
  counts?: {
    leads: number;
    claims: number;
    trades: number;
    messages: number;
  };
  errors?: string[];
}

export interface SeedStatus {
  contactCreated: boolean;
  propertyCreated: boolean;
  claimCreated: boolean;
  errors: Array<{
    stage: string;
    error: string;
    constraint?: string;
  }>;
}

/**
 * Ensures demo data exists for the given org.
 * GUARANTEES at least ONE claim exists (test-claim-diagnostic) for the active org.
 *
 * CRITICAL: This function now UPSERTS the org first to prevent FK violations.
 *
 * @param input - Can be EnsuredOrg object, { orgId, userId }, or just orgId string
 */
export async function ensureDemoDataForOrg(
  input: EnsuredOrg | { orgId: string; userId?: string } | string
): Promise<DemoSeedResult> {
  // Normalize input to extract orgId and userId
  let orgId: string;
  let userId: string | undefined;

  if (typeof input === "string") {
    orgId = input;
    userId = undefined;
  } else {
    orgId = input.orgId;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    userId = input.userId;
  }

  logger.debug(`[DEMO_SEED] Ensuring demo data for org: ${orgId}`);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const demoIds = buildDemoIds(orgId);

  try {
    // 🔥 CRITICAL: Ensure org exists FIRST to prevent FK violations
    // This is mandatory - contacts/claims/leads all have orgId FK
    const orgExists = await prisma.org.findUnique({
      where: { id: orgId },
      select: { id: true },
    });

    if (!orgExists) {
      logger.debug(`[DEMO_SEED] Org ${orgId} does not exist - creating it first`);
      await prisma.org.create({
        data: {
          id: orgId,
          name: "Demo Organization",
          clerkOrgId: `demo_${orgId.slice(0, 8)}`,
          planKey: "SOLO",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
      logger.debug(`[DEMO_SEED] ✅ Created org ${orgId}`);
    }

    // 🛑 DEMO SEEDING COMPLETELY DISABLED
    // Database has been manually curated to exactly 3 demo items:
    // - lead-john-smith-claim (claim)
    // - lead-jane-damien (out_of_pocket/retail)
    // - lead-bob-smith-demo (repair/lead)
    // DO NOT CREATE ANY MORE DEMO DATA AUTOMATICALLY

    // Check if ANY leads exist - if so, don't seed anything
    const existingLeads = await prisma.leads.count({ where: { orgId } });
    if (existingLeads > 0) {
      logger.debug(
        `[DEMO_SEED] Org ${orgId} already has ${existingLeads} leads - SKIPPING all demo seeding`
      );
      return {
        seeded: false,
        reason: `Org already has ${existingLeads} leads - demo seeding disabled`,
        counts: { leads: existingLeads, claims: 0, trades: 0, messages: 0 },
      };
    }

    // Check if ANY claims exist
    const existingClaims = await prisma.claims.count({ where: { orgId } });
    if (existingClaims > 0) {
      logger.debug(
        `[DEMO_SEED] Org ${orgId} already has ${existingClaims} claims - SKIPPING all demo seeding`
      );
      return {
        seeded: false,
        reason: `Org already has ${existingClaims} claims - demo seeding disabled`,
        counts: { leads: 0, claims: existingClaims, trades: 0, messages: 0 },
      };
    }

    // If we get here, org has 0 leads AND 0 claims - this is a brand new org
    // For now, return without seeding - manual setup required
    logger.debug(`[DEMO_SEED] ⚠️ Org ${orgId} is empty but demo seeding is DISABLED`);
    return {
      seeded: false,
      reason: "Demo seeding disabled - manual data setup required",
      counts: { leads: 0, claims: 0, trades: 0, messages: 0 },
    };
  } catch (error: any) {
    logger.error("[DEMO_SEED] Fatal error", { error: error?.message || error });
    return {
      seeded: false,
      reason: `Error: ${error?.message || "Unknown error"}`,
      errors: [error?.message || "Unknown error"],
    };
  }
}

/**
 * Create 3 demo leads with realistic data
 * Note: Schema requires contacts first, then leads that reference them
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function createDemoLeads(orgId: string, userId: string) {
  const demoContactsData = [
    {
      id: crypto.randomUUID(),
      orgId: orgId,
      isDemo: true,
      slug: `john-granville-${orgId.slice(0, 8)}`,
      firstName: "John",
      lastName: "Granville",
      email: "john.granville@email.com",
      phone: "(928) 555-0101",
      street: "1234 Oak Ridge Drive",
      city: "Prescott",
      state: "AZ",
      zipCode: "86301",
      source: "referral",
      notes: "Interested in roof replacement after hail damage",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: crypto.randomUUID(),
      orgId: orgId,
      isDemo: true,
      slug: `sarah-stoneridge-${orgId.slice(0, 8)}`,
      firstName: "Sarah",
      lastName: "StoneRidge",
      email: "sarah.stoneridge@email.com",
      phone: "(928) 555-0202",
      street: "5678 Mountain View Circle",
      city: "Prescott Valley",
      state: "AZ",
      zipCode: "86314",
      source: "google",
      notes: "Wind damage inspection needed",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: crypto.randomUUID(),
      orgId: orgId,
      isDemo: true,
      slug: `michael-torreon-${orgId.slice(0, 8)}`,
      firstName: "Michael",
      lastName: "Torreon",
      email: "m.torreon@email.com",
      phone: "(928) 555-0303",
      street: "9012 Sunset Trail",
      city: "Show Low",
      state: "AZ",
      zipCode: "85901",
      source: "facebook",
      notes: "Multiple storm events, ready to proceed",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  // First create contacts
  const contacts: Awaited<ReturnType<typeof prisma.contacts.create>>[] = [];
  for (const contactData of demoContactsData) {
    // Use findFirst + create instead of upsert to avoid unique constraint issues
    let contact = await prisma.contacts.findFirst({
      where: {
        orgId,
        slug: contactData.slug,
      },
    });

    if (!contact) {
      contact = await prisma.contacts.create({
        data: {
          ...contactData,
          id: contactData.id || crypto.randomUUID(),
        },
      });
    }
    contacts.push(contact);
  }

  // Then create leads referencing those contacts
  const leads: Awaited<ReturnType<typeof prisma.leads.create>>[] = [];
  const leadStages = ["NEW", "CONTACTED", "QUALIFIED", "PROPOSAL", "WON", "NEW", "NEW"];
  const leadTemps = ["warm", "hot", "hot", "warm", "hot", "hot", "warm"];
  const leadTitles = [
    "Hail Damage - Roof Replacement",
    "Wind Damage - Shingles & Gutters",
    "Storm Damage - Full Assessment",
    "Kitchen Remodel - Cash Project",
    "Solar Panel Installation - Financed",
    "Jane Smith - Retail Roof Repair",
    "Bob Smith - New Roof Inquiry",
  ];
  // Mix of ALL job categories for demo visibility in pipeline
  const leadCategories = [
    "claim",
    "repair",
    "claim",
    "out_of_pocket",
    "financed",
    "out_of_pocket",
    "lead",
  ];
  // Values in cents for pipeline display
  const leadValues = [1850000, 1200000, 2500000, 4500000, 3200000, 850000, 1425000]; // $18,500, $12,000, $25,000, $45,000, $32,000, $8,500, $14,250

  // Create additional contacts for out_of_pocket and financed leads (includes Jane Smith for retail)
  const additionalContacts = [
    {
      id: crypto.randomUUID(),
      orgId: orgId,
      isDemo: true,
      slug: `emily-hartwell-${orgId.slice(0, 8)}`,
      firstName: "Emily",
      lastName: "Hartwell",
      email: "emily.hartwell@email.com",
      phone: "(928) 555-0404",
      street: "4521 Pinecrest Lane",
      city: "Flagstaff",
      state: "AZ",
      zipCode: "86001",
      source: "website",
      notes: "Kitchen remodel - paying out of pocket",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: crypto.randomUUID(),
      orgId: orgId,
      isDemo: true,
      slug: `robert-jenkins-${orgId.slice(0, 8)}`,
      firstName: "Robert",
      lastName: "Jenkins",
      email: "r.jenkins@email.com",
      phone: "(928) 555-0505",
      street: "7890 Solar Vista Drive",
      city: "Sedona",
      state: "AZ",
      zipCode: "86336",
      source: "facebook",
      notes: "Solar installation with financing",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: crypto.randomUUID(),
      orgId: orgId,
      isDemo: true,
      slug: `jane-smith-${orgId.slice(0, 8)}`,
      firstName: "Jane",
      lastName: "Smith",
      email: "jane.smith@email.com",
      phone: "(928) 555-0606",
      street: "456 Retail Lane",
      city: "Phoenix",
      state: "AZ",
      zipCode: "85002",
      source: "referral",
      notes: "Retail roof repair - paying out of pocket. Great customer for Job Center demo.",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: crypto.randomUUID(),
      orgId: orgId,
      isDemo: true,
      slug: `bob-smith-${orgId.slice(0, 8)}`,
      firstName: "Bob",
      lastName: "Smith",
      email: "bob.smith@email.com",
      phone: "(928) 555-0707",
      street: "789 Canyon View Drive",
      city: "Flagstaff",
      state: "AZ",
      zipCode: "86004",
      source: "website",
      notes: "New roof inquiry. Needs a scheduled inspection.",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  // Create additional contacts
  for (const contactData of additionalContacts) {
    // Use findFirst + create to avoid unique constraint issues
    let contact = await prisma.contacts.findFirst({
      where: {
        orgId,
        slug: contactData.slug,
      },
    });

    if (!contact) {
      contact = await prisma.contacts.create({
        data: {
          ...contactData,
          id: contactData.id || crypto.randomUUID(),
        },
      });
    }
    contacts.push(contact);
  }

  for (let i = 0; i < Math.min(contacts.length, leadTitles.length); i++) {
    const leadId = `demo-lead-${i}-${orgId}`;
    // Jane Smith (index 5) is a RETAIL job for Job Center demo
    const isRetail = leadCategories[i] === "out_of_pocket" && leadTitles[i].includes("Jane Smith");
    const jobType = isRetail
      ? "RETAIL"
      : leadCategories[i] === "financed"
        ? "FINANCED"
        : leadCategories[i] === "claim"
          ? "CLAIM"
          : "LEAD";
    const followUpDate = leadTitles[i].includes("Bob Smith")
      ? new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
      : null;

    // Use findFirst + create to avoid upsert issues
    let lead = await prisma.leads.findFirst({
      where: { id: leadId },
    });

    if (!lead) {
      lead = await prisma.leads.create({
        data: {
          id: leadId,
          orgId,
          isDemo: true,
          contactId: contacts[i].id,
          title: leadTitles[i],
          description: contacts[i].notes,
          source: contacts[i].source || "referral",
          stage: leadStages[i],
          temperature: leadTemps[i],
          jobCategory: leadCategories[i],
          jobType: jobType,
          value: leadValues[i],
          followUpDate,
          // createdBy omitted to avoid FK constraint - nullable field
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
    }
    leads.push(lead);
  }

  return { leads, contacts };
}

/**
 * Create demo claim with GUARANTEED FK order and constraint satisfaction
 *
 * ORDER: Contact → Property → Claim
 * CONSTRAINTS SATISFIED:
 * - contacts: firstName, lastName, org_id (all NOT NULL)
 * - properties: propertyType, street, contactId (all NOT NULL)
 * - claims: damageType, propertyId (all NOT NULL)
 *
 * Returns structured status for debugging constraint violations.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function createDemoClaims(
  orgId: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  userId: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  leads: any[],
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  contacts: any[]
): Promise<{ claims: any[]; status: SeedStatus }> {
  const demoIds = buildDemoIds(orgId);
  const status: SeedStatus = {
    contactCreated: false,
    propertyCreated: false,
    claimCreated: false,
    errors: [],
  };

  const claims: Awaited<ReturnType<typeof prisma.claims.create>>[] = [];

  try {
    // STEP 1: Create Contact (REQUIRED FIRST)
    let contact;
    try {
      // Generate deterministic ID for this org's demo contact
      // Use findFirst + create to avoid unique constraint issues
      contact = await prisma.contacts.findFirst({
        where: { id: demoIds.contactId },
      });

      if (!contact) {
        contact = await prisma.contacts.create({
          data: {
            id: demoIds.contactId,
            orgId: orgId, // NOT NULL - satisfied
            isDemo: true,
            slug: `john-smith-${orgId.slice(0, 8)}`,
            firstName: "John", // NOT NULL - satisfied
            lastName: "Smith", // NOT NULL - satisfied
            email: "john.smith@example.com",
            phone: "(555) 123-4567",
            street: "123 Main Street",
            city: "Phoenix",
            state: "AZ",
            zipCode: "85001",
            source: "demo",
            notes: "Demo contact for diagnostic claim",
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });
      }
      status.contactCreated = true;
      logger.debug(`[DEMO_SEED] ✅ Contact created/updated: ${contact.id}`);
    } catch (error: any) {
      status.errors.push({
        stage: "contact",
        error: error.message,
        constraint: error.code === "23502" ? "NOT NULL violation" : error.code,
      });
      logger.error("[DEMO_SEED] ❌ Contact creation failed:", error);
      throw error; // Cannot continue without contact
    }

    // STEP 2: Create Property (REQUIRES contactId)
    let property;
    try {
      // Use findFirst + create to avoid unique constraint issues
      property = await prisma.properties.findFirst({
        where: { id: demoIds.propertyId },
      });

      if (!property) {
        property = await prisma.properties.create({
          data: {
            id: demoIds.propertyId,
            orgId,
            isDemo: true,
            contactId: contact.id, // FK - satisfied
            name: "John Smith Residence",
            propertyType: "Residential", // NOT NULL - satisfied
            street: "123 Main Street", // NOT NULL - satisfied
            city: "Phoenix", // NOT NULL - satisfied
            state: "AZ", // NOT NULL - satisfied
            zipCode: "85001", // NOT NULL - satisfied
            yearBuilt: 2015,
            squareFootage: 2400,
            roofType: "Composition Shingle",
            roofAge: 9,
            carrier: "State Farm",
            policyNumber: "SF-2024-DEMO-001",
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });
      }
      status.propertyCreated = true;
      logger.debug(`[DEMO_SEED] ✅ Property created/updated: ${property.id}`);
    } catch (error: any) {
      status.errors.push({
        stage: "property",
        error: error.message,
        constraint:
          error.code === "23502"
            ? "NOT NULL violation"
            : error.code === "23503"
              ? "FK violation"
              : error.code,
      });
      logger.error("[DEMO_SEED] ❌ Property creation failed:", error);
      throw error; // Cannot continue without property
    }

    // STEP 3: Create ONE Demo Claim (REQUIRES propertyId)
    // NORMALIZED: Only create ONE canonical demo claim (John Smith, 123 Memory Ln, American Insurance)
    try {
      // DEFENSIVE DEFAULTS: Prevent future NOT NULL failures
      // Use findFirst + create to avoid unique constraint issues
      let claim = await prisma.claims.findFirst({
        where: { id: demoIds.claimId },
      });

      if (!claim) {
        claim = await prisma.claims.create({
          data: {
            id: demoIds.claimId,
            claimNumber: demoIds.claimNumber,
            isDemo: true,
            orgId,
            propertyId: property.id, // FK - satisfied
            title: "John Smith Roof Damage Claim",
            description:
              "Comprehensive storm damage claim. Hail and wind damage from severe weather event. Demo claim for training and onboarding.",
            damageType: "HAIL",
            status: "new",
            priority: "high",
            carrier: "American Insurance",
            dateOfLoss: new Date("2024-11-15"),
            createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
            updatedAt: new Date(),
          },
        });
      }
      claims.push(claim);
      status.claimCreated = true;
      logger.debug(`[DEMO_SEED] ✅ Claim created/updated: ${claim.claimNumber} - John Smith`);
    } catch (error: any) {
      status.errors.push({
        stage: "claim",
        error: error.message,
        constraint:
          error.code === "23502"
            ? "NOT NULL violation"
            : error.code === "23503"
              ? "FK violation"
              : error.code,
      });
      logger.error("[DEMO_SEED] ❌ Claim creation failed:", error);
      throw error;
    }
  } catch (error: any) {
    logger.error("[DEMO_SEED] ❌ Fatal error in createDemoClaims:", error);
    logger.error("[DEMO_SEED] Seed status", { status });
  }

  return { claims, status };
}

/**
 * Create 2 demo trade companies
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function createDemoTrades(orgId: string) {
  const tradesData = [
    {
      name: "Elite Roofing Supply",
      slug: `elite-roofing-supply-${orgId.slice(0, 8)}`,
      licenseNumber: "ROC-123456",
      phone: "(928) 555-7001",
      email: "dwilson@eliteroofing.com",
      specialties: ["Roofing", "Supplies", "Materials"],
    },
    {
      name: "Pro Gutter Services",
      slug: `pro-gutter-services-${orgId.slice(0, 8)}`,
      licenseNumber: "ROC-789012",
      phone: "(928) 555-8002",
      email: "arodriguez@progutter.com",
      specialties: ["Gutters", "Installation", "Repair"],
    },
  ];

  const trades: Awaited<ReturnType<typeof prisma.tradesCompany.create>>[] = [];
  for (const tradeData of tradesData) {
    // Use findFirst + create to avoid unique constraint issues
    let trade = await prisma.tradesCompany.findFirst({
      where: { slug: tradeData.slug },
    });

    if (!trade) {
      trade = await prisma.tradesCompany.create({
        data: tradeData,
      });
    }
    trades.push(trade);
  }

  return trades;
}

/**
 * Create 2 demo messages for the first claim
 * Uses MessageThread and Message models
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function createDemoMessages(orgId: string, userId: string, claims: any[]) {
  if (claims.length === 0) return [];

  const firstClaim = claims[0];

  // If a thread already exists for this claim, skip creating duplicates
  const existingThread = await prisma.messageThread.findFirst({
    where: { orgId, claimId: firstClaim.id },
  });

  if (existingThread) {
    const existingMessages = await prisma.message.findMany({
      where: { threadId: existingThread.id },
    });
    if (existingMessages.length > 0) {
      return existingMessages;
    }
  }

  // Create a message thread for the first claim
  const thread = existingThread
    ? existingThread
    : await prisma.messageThread.create({
        data: {
          id: crypto.randomUUID(),
          orgId,
          claimId: firstClaim.id,
          participants: [userId],
          subject: `Claim: ${firstClaim.claimNumber}`,
        },
      });

  const messagesData = [
    {
      threadId: thread.id,
      senderUserId: userId,
      senderType: "pro",
      body: "Initial inspection completed. Photos uploaded to claim file.",
      read: true,
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    },
    {
      threadId: thread.id,
      senderUserId: userId,
      senderType: "pro",
      body: "Adjuster confirmed approval. Scheduling work for next week.",
      read: false,
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
    },
  ];

  const messages: Awaited<ReturnType<typeof prisma.message.create>>[] = [];
  for (const msgData of messagesData) {
    const message = await prisma.message.create({
      data: {
        id: crypto.randomUUID(),
        ...msgData,
      },
    });
    messages.push(message);
  }

  return messages;
}

/**
 * Create 2-3 demo AI reports per claim (weather + rebuttal)
 * These show up in the AI History Panel on claim detail pages
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function createDemoAIReports(orgId: string, userId: string, claims: any[]) {
  if (claims.length === 0) return [];

  const aiReports: Awaited<ReturnType<typeof prisma.ai_reports.create>>[] = [];

  for (const claim of claims.slice(0, 2)) {
    // Weather report
    const weatherReport = await prisma.ai_reports.create({
      data: {
        id: crypto.randomUUID(),
        orgId,
        claimId: claim.id,
        userId,
        userName: "Demo User",
        type: "weather",
        title: `Weather Report - ${claim.claimNumber}`,
        prompt: JSON.stringify({
          address: claim.title,
          dateOfLoss: claim.dateOfLoss?.toISOString(),
        }),
        content: JSON.stringify({
          summary: `Weather analysis for claim ${claim.claimNumber}`,
          events: [
            {
              date: claim.dateOfLoss?.toISOString(),
              type: "HAIL",
              severity: "Moderate",
              description: "Hail stones 1-1.5 inches reported in the area",
            },
          ],
          confidence: 0.92,
        }),
        tokensUsed: 500,
        status: "completed",
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
        updatedAt: new Date(),
      },
    });
    aiReports.push(weatherReport);

    // Rebuttal report
    const rebuttalReport = await prisma.ai_reports.create({
      data: {
        id: crypto.randomUUID(),
        orgId,
        claimId: claim.id,
        userId,
        userName: "Demo User",
        type: "rebuttal",
        title: `Rebuttal Report - ${claim.claimNumber}`,
        prompt: JSON.stringify({
          claimNumber: claim.claimNumber,
          denialReason: "Insufficient evidence of storm damage",
        }),
        content: JSON.stringify({
          rebuttal: `Based on weather data from ${claim.dateOfLoss?.toLocaleDateString()}, there is strong evidence of hail activity in the area. NOAA storm reports confirm hail stones exceeding 1 inch in diameter...`,
          evidence: ["NOAA storm reports", "Satellite imagery", "Local weather station data"],
          recommendedActions: [
            "Request reinspection with supplemental photos",
            "Submit weather verification report",
            "Provide timeline correlation",
          ],
        }),
        tokensUsed: 750,
        status: "completed",
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
        updatedAt: new Date(),
      },
    });
    aiReports.push(rebuttalReport);
  }

  return aiReports;
}
