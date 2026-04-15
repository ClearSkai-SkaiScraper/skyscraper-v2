import { NextResponse } from "next/server";

import { getOpenAI } from "@/lib/ai/client";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { safeOrgContext } from "@/lib/safeOrgContext";

export const dynamic = "force-dynamic";

/**
 * POST /api/v1/property-profiles/[id]/autofill
 *
 * Scans all claims, jobs, damage assessments, inspections, measurement orders,
 * scopes, and estimates linked to this property and uses AI to extract every
 * property detail it can find.
 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await safeOrgContext();
    if (ctx.status !== "ok" || !ctx.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // 1. Find the property profile or base property
    const profile = await prisma.property_profiles
      .findFirst({ where: { OR: [{ id }, { propertyId: id }] } })
      .catch(() => null);

    const propertyId = profile?.propertyId ?? id;

    // 2. Gather all related records in parallel
    const [baseProp, claims, jobs, inspections, measurementOrders] = await Promise.all([
      prisma.properties.findUnique({ where: { id: propertyId } }).catch(() => null),
      prisma.claims
        .findMany({
          where: { propertyId, orgId: ctx.orgId },
          select: {
            id: true,
            title: true,
            description: true,
            damageType: true,
            carrier: true,
            dateOfLoss: true,
          },
          take: 20,
        })
        .catch(() => [] as never[]),
      prisma.jobs
        .findMany({
          where: { propertyId, orgId: ctx.orgId },
          select: {
            id: true,
            title: true,
            description: true,
            jobType: true,
            materials: true,
            equipment: true,
          },
          take: 20,
        })
        .catch(() => [] as never[]),
      prisma.inspections
        .findMany({
          where: { propertyId, orgId: ctx.orgId },
          select: {
            id: true,
            title: true,
            type: true,
            notes: true,
          },
          take: 20,
        })
        .catch(() => [] as never[]),
      prisma.measurement_orders
        .findMany({
          where: {
            org_id: ctx.orgId,
            OR: [
              { claim_id: { in: [] as string[] } }, // will be populated below
              { job_id: { in: [] as string[] } },
            ],
          },
          select: {
            id: true,
            measurements: true,
            order_type: true,
            provider: true,
          },
          take: 10,
        })
        .catch(() => [] as never[]),
    ]);

    // 2b. Get measurement orders by claim/job IDs now that we have them
    const claimIds = claims.map((c: { id: string }) => c.id);
    const jobIds = jobs.map((j: { id: string }) => j.id);

    let measurements: Array<{
      id: string;
      measurements: unknown;
      order_type: string | null;
      provider: string | null;
    }> = [];
    if (claimIds.length > 0 || jobIds.length > 0) {
      measurements = await prisma.measurement_orders
        .findMany({
          where: {
            org_id: ctx.orgId,
            OR: [
              ...(claimIds.length > 0 ? [{ claim_id: { in: claimIds } }] : []),
              ...(jobIds.length > 0 ? [{ job_id: { in: jobIds } }] : []),
            ],
          },
          select: {
            id: true,
            measurements: true,
            order_type: true,
            provider: true,
          },
          take: 10,
        })
        .catch(() => []);
    }

    // 2c. Damage assessments by claim IDs
    let damageAssessments: Array<{
      id: string;
      summary: string | null;
      primaryPeril: string | null;
      overall_recommendation: string | null;
      address: string | null;
    }> = [];
    if (claimIds.length > 0) {
      damageAssessments = await prisma.damage_assessments
        .findMany({
          where: { claim_id: { in: claimIds } },
          select: {
            id: true,
            summary: true,
            primaryPeril: true,
            overall_recommendation: true,
            address: true,
          },
          take: 10,
        })
        .catch(() => []);
    }

    // 3. Build context string for AI
    const chunks: string[] = [];

    if (baseProp) {
      chunks.push(
        `BASE PROPERTY: ${JSON.stringify({
          street: baseProp.street,
          city: baseProp.city,
          state: baseProp.state,
          zipCode: baseProp.zipCode,
          yearBuilt: baseProp.yearBuilt,
          squareFootage: baseProp.squareFootage,
          roofType: baseProp.roofType,
          roofAge: baseProp.roofAge,
          propertyType: baseProp.propertyType,
        })}`
      );
    }

    if (profile) {
      chunks.push(
        `EXISTING PROFILE: ${JSON.stringify({
          yearBuilt: profile.yearBuilt,
          squareFootage: profile.squareFootage,
          roofType: profile.roofType,
          roofAge: profile.roofAge,
          hvacAge: profile.hvacAge,
          hvacType: profile.hvacType,
          foundationType: profile.foundationType,
          numStories: profile.numStories,
          numBedrooms: profile.numBedrooms,
          numBathrooms: profile.numBathrooms,
        })}`
      );
    }

    if (claims.length > 0) {
      chunks.push(
        `CLAIMS:\n${claims
          .map(
            (c: {
              title: string | null;
              description: string | null;
              damageType: string | null;
              carrier: string | null;
            }) =>
              `- ${c.title}: ${c.description || ""} (type: ${c.damageType || "unknown"}, carrier: ${c.carrier || "unknown"})`
          )
          .join("\n")}`
      );
    }

    if (jobs.length > 0) {
      chunks.push(
        `JOBS:\n${jobs
          .map(
            (j: {
              title: string | null;
              description: string | null;
              jobType: string | null;
              materials: unknown;
            }) =>
              `- ${j.title}: ${j.description || ""} (type: ${j.jobType || "unknown"}, materials: ${j.materials ? JSON.stringify(j.materials).slice(0, 200) : "none"})`
          )
          .join("\n")}`
      );
    }

    if (inspections.length > 0) {
      chunks.push(
        `INSPECTIONS:\n${inspections
          .map(
            (i: { title: string | null; type: string | null; notes: string | null }) =>
              `- ${i.title}: ${i.notes || ""} (type: ${i.type || "unknown"})`
          )
          .join("\n")}`
      );
    }

    if (measurements.length > 0) {
      chunks.push(
        `MEASUREMENT REPORTS:\n${measurements
          .map(
            (m) =>
              `- ${m.provider || "unknown"} ${m.order_type || ""}: ${m.measurements ? JSON.stringify(m.measurements).slice(0, 500) : "none"}`
          )
          .join("\n")}`
      );
    }

    if (damageAssessments.length > 0) {
      chunks.push(
        `DAMAGE ASSESSMENTS:\n${damageAssessments
          .map(
            (d) =>
              `- ${d.summary || "no summary"} (peril: ${d.primaryPeril || "unknown"}, rec: ${d.overall_recommendation || "none"})`
          )
          .join("\n")}`
      );
    }

    const context = chunks.join("\n\n");

    if (context.length < 20) {
      return NextResponse.json({
        success: true,
        suggestions: {},
        message: "No related data found to autofill from.",
      });
    }

    // 4. Call AI to extract property details
    const openai = getOpenAI();
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.1,
      max_tokens: 2000,
      messages: [
        {
          role: "system",
          content: `You are a property data extraction assistant for a storm restoration contractor platform.
Given claims data, job details, inspection notes, measurement reports, and damage assessments for a property,
extract as many property details as you can find or reasonably infer.

Return a JSON object with ONLY the fields you have evidence for. Do NOT guess. Leave out fields you can't determine.

Available fields (use exact keys):
- yearBuilt (number)
- squareFootage (number)
- lotSize (number, sq ft)
- numBedrooms (number)
- numBathrooms (number, allows .5)
- numStories (number)
- garageSpaces (number)
- roofType (string: "Asphalt Shingle", "Metal", "Tile", "Flat/TPO", "Slate", "Wood Shake")
- roofAge (number, years)
- roofSquares (number)
- roofPitch (string, e.g. "6/12")
- roofColor (string)
- hvacType (string: "Central Air", "Heat Pump", "Mini-Split", "Window Unit", "Geothermal")
- hvacAge (number, years)
- hvacManufacturer (string)
- hvacModel (string)
- hvacTonnage (number)
- waterHeaterType (string: "Tank", "Tankless", "Heat Pump", "Solar")
- waterHeaterAge (number, years)
- waterHeaterGallons (number)
- waterHeaterFuel (string: "Electric", "Natural Gas", "Propane", "Solar")
- plumbingType (string: "Copper", "PEX", "PVC", "Galvanized", "Cast Iron")
- plumbingAge (number, years)
- sewerType (string: "Municipal", "Septic", "Cesspool")
- waterSource (string: "Municipal", "Well", "Spring")
- electricalPanelType (string: "Circuit Breaker", "Fuse Box", "Sub-Panel")
- electricalPanelAge (number, years)
- wiringType (string: "Copper", "Aluminum", "Knob & Tube")
- foundationType (string: "Slab", "Crawl Space", "Basement", "Pier & Beam")
- foundationAge (number, years)
- hasGeneratorHookup (boolean)
- hasSmartHome (boolean)
- hasLowEWindows (boolean)
- hasSolarPanels (boolean)
- insulationRating (string: "R-13", "R-19", "R-30", "R-38", "R-49")
- windowType (string: "Single Pane", "Double Pane", "Triple Pane", "Impact Rated")
- floodZone (string)
- county (string)

Also include a "confidence" object mapping each suggested field to "high", "medium", or "low".
Return format: { "suggestions": { ... }, "confidence": { ... }, "reasoning": "brief explanation" }`,
        },
        {
          role: "user",
          content: `Extract property details from the following data:\n\n${context}`,
        },
      ],
    });

    const content = response.choices[0]?.message?.content ?? "{}";

    // Parse AI response
    let parsed: {
      suggestions?: Record<string, unknown>;
      confidence?: Record<string, string>;
      reasoning?: string;
    };
    try {
      // Strip markdown code fences if present
      const clean = content
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      parsed = JSON.parse(clean);
    } catch {
      logger.error("[PROPERTY_AUTOFILL] Failed to parse AI response", { content });
      return NextResponse.json(
        {
          success: false,
          error: "AI returned unparseable response",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      suggestions: parsed.suggestions || {},
      confidence: parsed.confidence || {},
      reasoning: parsed.reasoning || "",
      sourceCounts: {
        claims: claims.length,
        jobs: jobs.length,
        inspections: inspections.length,
        measurements: measurements.length,
        damageAssessments: damageAssessments.length,
      },
    });
  } catch (error) {
    logger.error("[PROPERTY_AUTOFILL]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
