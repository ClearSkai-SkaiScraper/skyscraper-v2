#!/usr/bin/env npx tsx
/**
 * Golden Demo Seed — Intelligence Layer Showcase
 *
 * Creates 6 claims with full supporting data designed to exercise every
 * intelligence engine at its best. Each claim is a distinct scenario:
 *
 *   1. Hail Powerhouse — massive hail, tons of evidence, strong corroboration
 *   2. Wind Warrior — high-wind event, clean documentation, solid carrier history
 *   3. Mixed Storm — hail + wind + water, moderate evidence, partial corroboration
 *   4. Early Stage — just filed, minimal evidence, highlights gap detector
 *   5. Supplement Fighter — denied first round, supplement built, re-simulation
 *   6. Corroboration Cluster — 3 nearby claims in same storm, high density
 *
 * Run:
 *   npx tsx scripts/seed-intelligence-demo.ts
 *   CLEAN=1 npx tsx scripts/seed-intelligence-demo.ts   # wipe + re-seed
 *
 * After running, use:
 *   npx tsx scripts/validate-intelligence.ts              # validate all engines
 */

import { createId } from "@paralleldrive/cuid2";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEMO_ORG_NAME = "SkaiScraper Intelligence Demo";

// ─── IDs ─────────────────────────────────────────────────────────────────────
const ids = {
  org: createId(),
  user: createId(),
  contact1: createId(),
  contact2: createId(),
  contact3: createId(),
  contact4: createId(),
  contact5: createId(),
  contact6: createId(),
  prop1: createId(),
  prop2: createId(),
  prop3: createId(),
  prop4: createId(),
  prop5: createId(),
  prop6: createId(),
  claim1: createId(),
  claim2: createId(),
  claim3: createId(),
  claim4: createId(),
  claim5: createId(),
  claim6: createId(),
  storm1: createId(),
  storm2: createId(),
};

// ─── Cleanup ─────────────────────────────────────────────────────────────────

async function cleanup() {
  const existing = await prisma.org.findFirst({
    where: { name: DEMO_ORG_NAME },
  });
  if (!existing) return;

  console.log("🧹 Cleaning existing demo data...");

  // Reverse dependency order
  const orgId = existing.id;
  await prisma.claim_simulations.deleteMany({ where: { orgId } });
  await prisma.simulation_history.deleteMany({ where: { orgId } });
  await prisma.storm_clusters.deleteMany({ where: { orgId } });
  await prisma.carrier_playbooks.deleteMany({ where: { orgId } });
  await prisma.claim_outcomes.deleteMany({ where: { claims: { orgId } } });
  await prisma.claim_detections.deleteMany({ where: { claims: { orgId } } });
  await prisma.weather_reports.deleteMany({ where: { claims: { orgId } } });
  await prisma.claims.deleteMany({ where: { orgId } });
  await prisma.properties.deleteMany({ where: { orgId } });
  await prisma.contacts.deleteMany({ where: { orgId } });
  await prisma.storm_events.deleteMany({ where: { orgId } });
  await prisma.users.deleteMany({ where: { orgId } });
  await prisma.org.delete({ where: { id: existing.id } });

  console.log("  ✅ Cleaned\n");
}

// ─── Seed ────────────────────────────────────────────────────────────────────

async function seed() {
  console.log("\n╔═══════════════════════════════════════════════════════════╗");
  console.log("║      Golden Demo Seed — Intelligence Showcase           ║");
  console.log("╚═══════════════════════════════════════════════════════════╝\n");

  if (process.env.CLEAN === "1") {
    await cleanup();
  }

  // Check for existing
  const existCheck = await prisma.org.findFirst({
    where: { name: DEMO_ORG_NAME },
  });
  if (existCheck) {
    console.log("⚠️  Demo org already exists. Run with CLEAN=1 to re-seed.");
    return;
  }

  // ── 1. Organization ─────────────────────────────────────────────────────────
  console.log("🏢 Creating demo organization...");
  await prisma.org.create({
    data: {
      id: ids.org,
      name: DEMO_ORG_NAME,
      clerkOrgId: `org_intel_demo_${ids.org.slice(0, 8)}`,
      updatedAt: new Date(),
      subscriptionStatus: "active",
      planKey: "pro",
    },
  });

  // ── 2. Demo user ────────────────────────────────────────────────────────────
  console.log("👤 Creating demo user...");
  await prisma.users.create({
    data: {
      id: ids.user,
      clerkUserId: `user_intel_demo_${ids.user.slice(0, 8)}`,
      email: "demo@skaiscraperIntelligence.demo",
      name: "Intelligence Demo User",
      orgId: ids.org,
      role: "ADMIN",
    },
  });

  // ── 3. Storm events ─────────────────────────────────────────────────────────
  console.log("🌩️ Creating storm events...");
  const now = new Date();
  const storm1Date = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000); // 14 days ago
  const storm2Date = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days ago

  await prisma.storm_events.create({
    data: {
      id: ids.storm1,
      orgId: ids.org,
      eventType: "hail",
      severity: 8,
      centerLat: 34.5401,
      centerLng: -112.4685,
      radiusMiles: 15,
      affectedZipCodes: ["86301", "86303", "86305"],
      affectedCities: ["Prescott", "Prescott Valley"],
      hailSizeMin: 1.0,
      hailSizeMax: 2.5,
      hailSizeAvg: 1.75,
      windSpeedMax: 65,
      stormStartTime: storm1Date,
      stormEndTime: new Date(storm1Date.getTime() + 3 * 60 * 60 * 1000),
      duration: 180,
      estimatedPropertiesImpacted: 450,
      highRiskProperties: 120,
      mediumRiskProperties: 200,
      lowRiskProperties: 130,
      impactSummary:
        "Significant hail event with golf-ball to tennis-ball sized hail across Prescott metro area",
      damageProjection: "Expected roof replacements: 80-120. Estimated total exposure: $3.2M-$4.8M",
      deploymentRecommendation: "Deploy 3 teams to 86301 and 86303 zip codes immediately",
      aiConfidence: 92,
      status: "CONFIRMED",
      updatedAt: new Date(),
    },
  });

  await prisma.storm_events.create({
    data: {
      id: ids.storm2,
      orgId: ids.org,
      eventType: "wind",
      severity: 7,
      centerLat: 34.5801,
      centerLng: -112.4285,
      radiusMiles: 10,
      affectedZipCodes: ["86301", "86314"],
      affectedCities: ["Prescott", "Prescott Valley"],
      hailSizeMin: 0.5,
      hailSizeMax: 0.75,
      hailSizeAvg: 0.6,
      windSpeedMax: 85,
      stormStartTime: storm2Date,
      stormEndTime: new Date(storm2Date.getTime() + 2 * 60 * 60 * 1000),
      duration: 120,
      estimatedPropertiesImpacted: 280,
      highRiskProperties: 60,
      mediumRiskProperties: 150,
      lowRiskProperties: 70,
      impactSummary: "Severe straight-line winds with microburst activity and minor hail",
      damageProjection:
        "Expected siding/fence damage: 40-60 properties. Estimated exposure: $1.5M-$2.2M",
      deploymentRecommendation: "Deploy 2 teams focusing on elevated properties in 86301",
      aiConfidence: 88,
      status: "CONFIRMED",
      updatedAt: new Date(),
    },
  });

  // ── 4. Contacts ─────────────────────────────────────────────────────────────
  console.log("📇 Creating contacts...");
  const contacts = [
    {
      id: ids.contact1,
      firstName: "Sarah",
      lastName: "Henderson",
      email: "sarah.h@demo.test",
      phone: "+1-928-555-1001",
    },
    {
      id: ids.contact2,
      firstName: "James",
      lastName: "Ortega",
      email: "james.o@demo.test",
      phone: "+1-928-555-1002",
    },
    {
      id: ids.contact3,
      firstName: "Emily",
      lastName: "Chen",
      email: "emily.c@demo.test",
      phone: "+1-928-555-1003",
    },
    {
      id: ids.contact4,
      firstName: "Robert",
      lastName: "Blackwell",
      email: "robert.b@demo.test",
      phone: "+1-928-555-1004",
    },
    {
      id: ids.contact5,
      firstName: "Maria",
      lastName: "Santos",
      email: "maria.s@demo.test",
      phone: "+1-928-555-1005",
    },
    {
      id: ids.contact6,
      firstName: "David",
      lastName: "Whitaker",
      email: "david.w@demo.test",
      phone: "+1-928-555-1006",
    },
  ];
  for (const c of contacts) {
    await prisma.contacts.create({
      data: { ...c, orgId: ids.org, updatedAt: new Date() },
    });
  }

  // ── 5. Properties ───────────────────────────────────────────────────────────
  console.log("🏠 Creating properties...");
  const properties = [
    {
      id: ids.prop1,
      contactId: ids.contact1,
      name: "Henderson Residence",
      street: "1234 Thumb Butte Rd",
      city: "Prescott",
      state: "AZ",
      zipCode: "86301",
      yearBuilt: 2005,
      squareFootage: 2400,
      roofType: "Asphalt Shingle",
      roofAge: 8,
      carrier: "State Farm",
      propertyType: "residential",
    },
    {
      id: ids.prop2,
      contactId: ids.contact2,
      name: "Ortega Ranch House",
      street: "890 Iron Springs Rd",
      city: "Prescott",
      state: "AZ",
      zipCode: "86305",
      yearBuilt: 1998,
      squareFootage: 3200,
      roofType: "Tile",
      roofAge: 15,
      carrier: "Allstate",
      propertyType: "residential",
    },
    {
      id: ids.prop3,
      contactId: ids.contact3,
      name: "Chen Mountain Home",
      street: "456 Copper Basin Rd",
      city: "Prescott",
      state: "AZ",
      zipCode: "86303",
      yearBuilt: 2012,
      squareFootage: 1800,
      roofType: "Asphalt Shingle",
      roofAge: 5,
      carrier: "USAA",
      propertyType: "residential",
    },
    {
      id: ids.prop4,
      contactId: ids.contact4,
      name: "Blackwell Cottage",
      street: "2200 Willow Creek Rd",
      city: "Prescott",
      state: "AZ",
      zipCode: "86301",
      yearBuilt: 2018,
      squareFootage: 1500,
      roofType: "Metal",
      roofAge: 2,
      carrier: "Travelers",
      propertyType: "residential",
    },
    {
      id: ids.prop5,
      contactId: ids.contact5,
      name: "Santos Adobe",
      street: "775 Senator Hwy",
      city: "Prescott",
      state: "AZ",
      zipCode: "86303",
      yearBuilt: 2000,
      squareFootage: 2800,
      roofType: "Asphalt Shingle",
      roofAge: 12,
      carrier: "State Farm",
      propertyType: "residential",
    },
    {
      id: ids.prop6,
      contactId: ids.contact6,
      name: "Whitaker Estate",
      street: "1500 Williamson Valley Rd",
      city: "Prescott",
      state: "AZ",
      zipCode: "86305",
      yearBuilt: 2010,
      squareFootage: 3600,
      roofType: "Asphalt Shingle",
      roofAge: 7,
      carrier: "Allstate",
      propertyType: "residential",
    },
  ];
  for (const p of properties) {
    await prisma.properties.create({
      data: { ...p, orgId: ids.org, updatedAt: new Date(), isDemo: true },
    });
  }

  // ── 6. Claims ───────────────────────────────────────────────────────────────
  console.log("📋 Creating claims (6 scenarios)...");

  const claimDefs = [
    {
      id: ids.claim1,
      propertyId: ids.prop1,
      claimNumber: "INTEL-DEMO-001",
      title: "Henderson Hail Powerhouse",
      description:
        "Massive hail impact — 2.5in stones, full roof replacement warranted. Photos, weather data, and inspector report all confirm severe damage.",
      damageType: "hail",
      dateOfLoss: storm1Date,
      carrier: "State Farm",
      status: "in_review",
      priority: "high",
      estimatedValue: 28500,
      catStormEventId: ids.storm1,
      isDemo: true,
    },
    {
      id: ids.claim2,
      propertyId: ids.prop2,
      claimNumber: "INTEL-DEMO-002",
      title: "Ortega Wind Warrior",
      description:
        "85mph straight-line winds tore off ridge caps, damaged siding, and uprooted landscaping. Clean documentation, strong carrier history with Allstate.",
      damageType: "wind",
      dateOfLoss: storm2Date,
      carrier: "Allstate",
      status: "in_review",
      priority: "high",
      estimatedValue: 18200,
      catStormEventId: ids.storm2,
      isDemo: true,
    },
    {
      id: ids.claim3,
      propertyId: ids.prop3,
      claimNumber: "INTEL-DEMO-003",
      title: "Chen Mixed Storm",
      description:
        "Combined hail, wind, and water intrusion damage from monsoon event. Moderate evidence — some detection gaps remain.",
      damageType: "hail",
      dateOfLoss: storm1Date,
      carrier: "USAA",
      status: "in_progress",
      priority: "medium",
      estimatedValue: 14800,
      catStormEventId: ids.storm1,
      isDemo: true,
    },
    {
      id: ids.claim4,
      propertyId: ids.prop4,
      claimNumber: "INTEL-DEMO-004",
      title: "Blackwell Early Stage",
      description:
        "Just filed — minimal evidence uploaded so far. Gap detector should flag multiple missing categories.",
      damageType: "wind",
      dateOfLoss: storm2Date,
      carrier: "Travelers",
      status: "new",
      priority: "medium",
      estimatedValue: null,
      catStormEventId: ids.storm2,
      isDemo: true,
    },
    {
      id: ids.claim5,
      propertyId: ids.prop5,
      claimNumber: "INTEL-DEMO-005",
      title: "Santos Supplement Fighter",
      description:
        "Initially denied by State Farm. Supplement built with additional evidence. Re-run simulation should show score improvement.",
      damageType: "hail",
      dateOfLoss: storm1Date,
      carrier: "State Farm",
      status: "supplement_submitted",
      priority: "high",
      estimatedValue: 22400,
      catStormEventId: ids.storm1,
      isDemo: true,
    },
    {
      id: ids.claim6,
      propertyId: ids.prop6,
      claimNumber: "INTEL-DEMO-006",
      title: "Whitaker Corroboration Cluster",
      description:
        "Part of a 3-claim cluster in the same storm cell. High geographic density — corroboration engine should light up.",
      damageType: "hail",
      dateOfLoss: storm1Date,
      carrier: "Allstate",
      status: "in_review",
      priority: "high",
      estimatedValue: 31200,
      catStormEventId: ids.storm1,
      isDemo: true,
    },
  ];

  for (const c of claimDefs) {
    await prisma.claims.create({
      data: {
        ...c,
        orgId: ids.org,
        updatedAt: new Date(),
      },
    });
  }

  // ── 7. Pre-populate simulation results ──────────────────────────────────────
  console.log("🧠 Seeding simulation results...");

  const simulations = [
    {
      claimId: ids.claim1,
      approvalProbability: 88,
      predictedOutcome: "approved",
      confidenceLevel: "high",
      stormEvidenceScore: 95,
      damageEvidenceScore: 90,
      collateralEvidenceScore: 75,
      repairabilityScore: 85,
      documentationScore: 92,
      codeComplianceScore: 80,
      carrierHistoryScore: 70,
      stormGraphCorroboration: 85,
      nearbyVerifiedClaims: 4,
      clusterConfidence: "high",
      positiveFactors: [
        {
          category: "Storm Evidence",
          description: "2.5-inch hail confirmed by NOAA",
          impact: "high",
          icon: "✓",
        },
        {
          category: "Documentation",
          description: "Complete photo set with timestamps",
          impact: "high",
          icon: "✓",
        },
        {
          category: "Corroboration",
          description: "4 nearby claims with verified damage",
          impact: "high",
          icon: "✓",
        },
      ],
      negativeFactors: [
        {
          category: "Carrier History",
          description: "State Farm historically contests 35% of claims",
          impact: "medium",
          icon: "⚠",
        },
      ],
      recommendations: [
        {
          priority: 1,
          action: "Add close-up photos of soft metal damage",
          estimatedImpact: 5,
          category: "Evidence",
          effort: "quick",
        },
      ],
    },
    {
      claimId: ids.claim2,
      approvalProbability: 76,
      predictedOutcome: "approved",
      confidenceLevel: "high",
      stormEvidenceScore: 80,
      damageEvidenceScore: 82,
      collateralEvidenceScore: 60,
      repairabilityScore: 90,
      documentationScore: 85,
      codeComplianceScore: 75,
      carrierHistoryScore: 65,
      stormGraphCorroboration: 60,
      nearbyVerifiedClaims: 2,
      clusterConfidence: "medium",
      positiveFactors: [
        {
          category: "Storm Evidence",
          description: "85mph winds confirmed by NWS",
          impact: "high",
          icon: "✓",
        },
        {
          category: "Repairability",
          description: "Clear scope of work defined",
          impact: "medium",
          icon: "✓",
        },
      ],
      negativeFactors: [
        {
          category: "Collateral",
          description: "Limited neighbor corroboration for wind damage",
          impact: "medium",
          icon: "⚠",
        },
      ],
      recommendations: [
        {
          priority: 1,
          action: "Document fence and landscaping damage for collateral evidence",
          estimatedImpact: 8,
          category: "Collateral",
          effort: "moderate",
        },
      ],
    },
    {
      claimId: ids.claim3,
      approvalProbability: 52,
      predictedOutcome: "partial",
      confidenceLevel: "medium",
      stormEvidenceScore: 70,
      damageEvidenceScore: 55,
      collateralEvidenceScore: 40,
      repairabilityScore: 60,
      documentationScore: 50,
      codeComplianceScore: 65,
      carrierHistoryScore: 75,
      stormGraphCorroboration: 45,
      nearbyVerifiedClaims: 1,
      clusterConfidence: "low",
      positiveFactors: [
        {
          category: "Carrier",
          description: "USAA has 72% approval rate historically",
          impact: "medium",
          icon: "✓",
        },
      ],
      negativeFactors: [
        {
          category: "Documentation",
          description: "Missing water intrusion timeline",
          impact: "high",
          icon: "✗",
        },
        {
          category: "Damage Evidence",
          description: "Only exterior photos — no interior documentation",
          impact: "medium",
          icon: "⚠",
        },
      ],
      recommendations: [
        {
          priority: 1,
          action: "Document interior water damage with moisture readings",
          estimatedImpact: 12,
          category: "Evidence",
          effort: "moderate",
        },
        {
          priority: 2,
          action: "Add timeline of water intrusion events",
          estimatedImpact: 8,
          category: "Documentation",
          effort: "quick",
        },
      ],
    },
    {
      claimId: ids.claim4,
      approvalProbability: 22,
      predictedOutcome: "denied",
      confidenceLevel: "low",
      stormEvidenceScore: 40,
      damageEvidenceScore: 15,
      collateralEvidenceScore: 10,
      repairabilityScore: 20,
      documentationScore: 10,
      codeComplianceScore: 50,
      carrierHistoryScore: 55,
      stormGraphCorroboration: null,
      nearbyVerifiedClaims: 0,
      clusterConfidence: "none",
      positiveFactors: [
        {
          category: "Storm Event",
          description: "Storm event confirmed in the area",
          impact: "low",
          icon: "✓",
        },
      ],
      negativeFactors: [
        {
          category: "Documentation",
          description: "No photos uploaded yet",
          impact: "high",
          icon: "✗",
        },
        {
          category: "Damage Evidence",
          description: "No inspection completed",
          impact: "high",
          icon: "✗",
        },
        {
          category: "Collateral",
          description: "No collateral evidence gathered",
          impact: "medium",
          icon: "✗",
        },
      ],
      recommendations: [
        {
          priority: 1,
          action: "Upload roof photos from at least 4 angles",
          estimatedImpact: 20,
          category: "Evidence",
          effort: "quick",
        },
        {
          priority: 2,
          action: "Complete full property inspection",
          estimatedImpact: 25,
          category: "Evidence",
          effort: "involved",
        },
        {
          priority: 3,
          action: "Gather weather report for storm date",
          estimatedImpact: 10,
          category: "Documentation",
          effort: "quick",
        },
      ],
    },
    {
      claimId: ids.claim5,
      approvalProbability: 71,
      predictedOutcome: "approved",
      confidenceLevel: "medium",
      stormEvidenceScore: 85,
      damageEvidenceScore: 78,
      collateralEvidenceScore: 65,
      repairabilityScore: 72,
      documentationScore: 80,
      codeComplianceScore: 70,
      carrierHistoryScore: 55,
      stormGraphCorroboration: 70,
      nearbyVerifiedClaims: 3,
      clusterConfidence: "medium",
      positiveFactors: [
        {
          category: "Storm Evidence",
          description: "Strong hail confirmed across area",
          impact: "high",
          icon: "✓",
        },
        {
          category: "Supplement",
          description: "Supplement includes 12 additional photos",
          impact: "medium",
          icon: "✓",
        },
      ],
      negativeFactors: [
        {
          category: "Carrier",
          description: "State Farm initially denied — supplement history indicates resistance",
          impact: "medium",
          icon: "⚠",
        },
      ],
      recommendations: [
        {
          priority: 1,
          action: "Include engineer report in supplement packet",
          estimatedImpact: 10,
          category: "Documentation",
          effort: "involved",
        },
      ],
    },
    {
      claimId: ids.claim6,
      approvalProbability: 82,
      predictedOutcome: "approved",
      confidenceLevel: "high",
      stormEvidenceScore: 90,
      damageEvidenceScore: 85,
      collateralEvidenceScore: 88,
      repairabilityScore: 78,
      documentationScore: 82,
      codeComplianceScore: 70,
      carrierHistoryScore: 60,
      stormGraphCorroboration: 92,
      nearbyVerifiedClaims: 5,
      clusterConfidence: "high",
      positiveFactors: [
        {
          category: "Corroboration",
          description: "5 verified claims within 3 miles",
          impact: "high",
          icon: "✓",
        },
        {
          category: "Storm Evidence",
          description: "NOAA-confirmed severe hail path",
          impact: "high",
          icon: "✓",
        },
        {
          category: "Collateral",
          description: "Consistent damage pattern across cluster",
          impact: "high",
          icon: "✓",
        },
      ],
      negativeFactors: [
        {
          category: "Carrier",
          description: "Allstate has moderate denial rate (38%)",
          impact: "low",
          icon: "⚠",
        },
      ],
      recommendations: [
        {
          priority: 1,
          action: "Reference cluster data in carrier submission",
          estimatedImpact: 5,
          category: "Strategy",
          effort: "quick",
        },
      ],
    },
  ];

  for (const sim of simulations) {
    await prisma.claim_simulations.create({
      data: {
        id: createId(),
        orgId: ids.org,
        claimId: sim.claimId,
        approvalProbability: sim.approvalProbability,
        predictedOutcome: sim.predictedOutcome,
        confidenceLevel: sim.confidenceLevel,
        stormEvidenceScore: sim.stormEvidenceScore,
        damageEvidenceScore: sim.damageEvidenceScore,
        collateralEvidenceScore: sim.collateralEvidenceScore,
        repairabilityScore: sim.repairabilityScore,
        documentationScore: sim.documentationScore,
        codeComplianceScore: sim.codeComplianceScore,
        carrierHistoryScore: sim.carrierHistoryScore,
        stormGraphCorroboration: sim.stormGraphCorroboration,
        nearbyVerifiedClaims: sim.nearbyVerifiedClaims,
        clusterConfidence: sim.clusterConfidence,
        positiveFactors: sim.positiveFactors,
        negativeFactors: sim.negativeFactors,
        recommendations: sim.recommendations,
        engineVersion: "1.0.0",
      },
    });
  }

  // ── 8. Seed simulation history for the supplement claim ─────────────────────
  console.log("📈 Seeding simulation history for supplement claim...");
  const historyEntries = [
    {
      claimId: ids.claim5,
      approvalProbability: 35,
      triggerEvent: "initial_submission",
      triggerDescription: "First simulation after claim filing",
      stormEvidenceScore: 60,
      damageEvidenceScore: 40,
      collateralEvidenceScore: 30,
      documentationScore: 35,
    },
    {
      claimId: ids.claim5,
      approvalProbability: 48,
      triggerEvent: "photos_uploaded",
      triggerDescription: "12 additional roof photos uploaded",
      stormEvidenceScore: 70,
      damageEvidenceScore: 55,
      collateralEvidenceScore: 40,
      documentationScore: 55,
    },
    {
      claimId: ids.claim5,
      approvalProbability: 58,
      triggerEvent: "weather_verified",
      triggerDescription: "NOAA weather data linked to claim",
      stormEvidenceScore: 85,
      damageEvidenceScore: 65,
      collateralEvidenceScore: 50,
      documentationScore: 65,
    },
    {
      claimId: ids.claim5,
      approvalProbability: 71,
      triggerEvent: "supplement_built",
      triggerDescription: "Supplement with additional evidence submitted",
      stormEvidenceScore: 85,
      damageEvidenceScore: 78,
      collateralEvidenceScore: 65,
      documentationScore: 80,
    },
  ];

  for (let i = 0; i < historyEntries.length; i++) {
    const h = historyEntries[i];
    await prisma.simulation_history.create({
      data: {
        id: createId(),
        orgId: ids.org,
        claimId: h.claimId,
        approvalProbability: h.approvalProbability,
        triggerEvent: h.triggerEvent,
        triggerDescription: h.triggerDescription,
        stormEvidenceScore: h.stormEvidenceScore,
        damageEvidenceScore: h.damageEvidenceScore,
        collateralEvidenceScore: h.collateralEvidenceScore,
        documentationScore: h.documentationScore,
        // Space entries 2 days apart
        createdAt: new Date(storm1Date.getTime() + i * 2 * 24 * 60 * 60 * 1000),
      },
    });
  }

  // ── 9. Seed carrier playbooks ───────────────────────────────────────────────
  console.log("🎯 Seeding carrier playbooks...");
  const carrierPlaybooks = [
    {
      carrierName: "State Farm",
      totalClaims: 24,
      approvedCount: 15,
      partialCount: 5,
      deniedCount: 4,
      approvalRate: 62.5,
      avgDaysToResolve: 42,
      avgSupplementRounds: 1.8,
      supplementWinRate: 65,
      commonDenialReasons: [
        "Pre-existing damage",
        "Insufficient documentation",
        "Below deductible",
      ],
      keyEvidenceNeeded: [
        "Timestamped photos",
        "Weather data match",
        "Engineering report for larger claims",
      ],
      carrierBehaviorNotes:
        "State Farm typically requests a 2nd inspection before approving claims over $15K. Supplement with strong photo evidence.",
      preferredStrategy: "documentation-first",
      typicalResponse: "Requests re-inspection, then negotiates partial approval",
    },
    {
      carrierName: "Allstate",
      totalClaims: 18,
      approvedCount: 11,
      partialCount: 4,
      deniedCount: 3,
      approvalRate: 61.1,
      avgDaysToResolve: 38,
      avgSupplementRounds: 1.3,
      supplementWinRate: 72,
      commonDenialReasons: ["Wear and tear", "Cosmetic only", "No interior damage"],
      keyEvidenceNeeded: [
        "Close-up hail impact photos",
        "Soft metal analysis",
        "Timeline documentation",
      ],
      carrierBehaviorNotes:
        "Allstate responds well to organized packet submissions. Include soft metal evidence upfront.",
      preferredStrategy: "supplement-heavy",
      typicalResponse: "Initial partial approval, then supplements close the gap",
    },
    {
      carrierName: "USAA",
      totalClaims: 12,
      approvedCount: 9,
      partialCount: 2,
      deniedCount: 1,
      approvalRate: 75.0,
      avgDaysToResolve: 28,
      avgSupplementRounds: 0.8,
      supplementWinRate: 85,
      commonDenialReasons: ["Insufficient evidence of storm damage"],
      keyEvidenceNeeded: ["Weather verification", "Before/after photos if available"],
      carrierBehaviorNotes:
        "USAA is generally cooperative. Fast turnaround, rarely requires supplements.",
      preferredStrategy: "documentation-first",
      typicalResponse: "Quick approval for well-documented claims",
    },
    {
      carrierName: "Travelers",
      totalClaims: 8,
      approvedCount: 4,
      partialCount: 2,
      deniedCount: 2,
      approvalRate: 50.0,
      avgDaysToResolve: 55,
      avgSupplementRounds: 2.1,
      supplementWinRate: 55,
      commonDenialReasons: [
        "Pre-existing condition",
        "Material age depreciation",
        "Maintenance neglect",
      ],
      keyEvidenceNeeded: [
        "Manufacturer documentation",
        "Code compliance proof",
        "Full damage scope",
      ],
      carrierBehaviorNotes:
        "Travelers applies aggressive depreciation. Counter with manufacturer specs and code requirements.",
      preferredStrategy: "escalation",
      typicalResponse: "Heavy depreciation on first pass, requires strong supplement evidence",
    },
  ];

  for (const pb of carrierPlaybooks) {
    await prisma.carrier_playbooks.create({
      data: {
        id: createId(),
        orgId: ids.org,
        carrierName: pb.carrierName,
        totalClaims: pb.totalClaims,
        approvedCount: pb.approvedCount,
        partialCount: pb.partialCount,
        deniedCount: pb.deniedCount,
        approvalRate: pb.approvalRate,
        avgDaysToResolve: pb.avgDaysToResolve,
        avgSupplementRounds: pb.avgSupplementRounds,
        supplementWinRate: pb.supplementWinRate,
        commonDenialReasons: pb.commonDenialReasons,
        keyEvidenceNeeded: pb.keyEvidenceNeeded,
        carrierBehaviorNotes: pb.carrierBehaviorNotes,
        preferredStrategy: pb.preferredStrategy,
        typicalResponse: pb.typicalResponse,
      },
    });
  }

  // ── 10. Seed storm cluster ──────────────────────────────────────────────────
  console.log("🗺️ Seeding storm cluster...");
  await prisma.storm_clusters.create({
    data: {
      id: createId(),
      stormEventId: ids.storm1,
      orgId: ids.org,
      centerLat: 34.54,
      centerLng: -112.468,
      radiusMiles: 5,
      totalProperties: 8,
      inspectedProperties: 5,
      claimsInCluster: 4,
      verifiedDamage: 3,
      hailDamageCount: 4,
      windDamageCount: 1,
      waterDamageCount: 1,
      collateralDamageCount: 2,
      corroborationScore: 82,
      corroborationLevel: "high",
      corroborationNarrative:
        "4 claims within 5 miles all report hail damage from the same storm event. Consistent damage patterns and NOAA confirmation provide strong corroboration.",
      avgHailSize: 1.75,
      avgWindSpeed: 65,
      avgDamageEvidence: 14,
      avgClaimStrength: 78,
      heatmapData: [
        { lat: 34.5401, lng: -112.4685, intensity: 0.9 },
        { lat: 34.545, lng: -112.46, intensity: 0.8 },
        { lat: 34.535, lng: -112.475, intensity: 0.7 },
        { lat: 34.55, lng: -112.455, intensity: 0.6 },
      ],
    },
  });

  // ── Summary ─────────────────────────────────────────────────────────────────
  console.log("\n╔═══════════════════════════════════════════════════════════╗");
  console.log("║                  ✅ Seed Complete!                       ║");
  console.log("╠═══════════════════════════════════════════════════════════╣");
  console.log(`║  Organization:  ${DEMO_ORG_NAME.padEnd(39)}║`);
  console.log(`║  Storm Events:  2 (hail + wind)                         ║`);
  console.log(`║  Properties:    6                                        ║`);
  console.log(`║  Claims:        6 scenarios                              ║`);
  console.log(`║  Simulations:   6 pre-computed                           ║`);
  console.log(`║  History:       4 entries (supplement claim)             ║`);
  console.log(`║  Playbooks:     4 carriers                               ║`);
  console.log(`║  Clusters:      1 (4-claim hail cluster)                ║`);
  console.log("╠═══════════════════════════════════════════════════════════╣");
  console.log("║  Next steps:                                            ║");
  console.log("║  npx tsx scripts/validate-intelligence.ts               ║");
  console.log("╚═══════════════════════════════════════════════════════════╝\n");

  // Print claim IDs for easy copy-paste
  console.log("Claim IDs for validation:");
  for (const c of claimDefs) {
    console.log(`  ${c.claimNumber}: ${c.id}`);
  }
}

seed()
  .catch(async (e) => {
    console.error("Fatal error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
