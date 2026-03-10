export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { requireApiOrg, verifyClaimAccess } from "@/lib/auth/apiAuth";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

const createSupplementSchema = z.object({
  claimId: z.string().min(1),
  items: z.array(
    z.object({
      id: z.string(),
      category: z.string(),
      code: z.string().optional(),
      description: z.string(),
      quantity: z.number(),
      unit: z.string(),
      unitPrice: z.number(),
      total: z.number(),
      disputed: z.boolean().optional(),
    })
  ),
  total: z.number(),
  status: z
    .enum(["draft", "pending", "submitted", "in_review", "approved", "denied", "paid"])
    .default("draft"),
  title: z.string().optional(),
});

/**
 * POST /api/supplements
 * Create a new supplement from the Supplement Builder
 */
export async function POST(req: NextRequest) {
  try {
    const authResult = await requireApiOrg();
    if (authResult instanceof NextResponse) return authResult;

    const { userId, orgId } = authResult;
    if (!orgId) {
      return NextResponse.json({ error: "Organization required." }, { status: 400 });
    }

    const body = await req.json();
    const validated = createSupplementSchema.parse(body);

    // Verify claim access
    const accessResult = await verifyClaimAccess(validated.claimId, orgId, userId);
    if (accessResult instanceof NextResponse) return accessResult;

    // Convert total to cents
    const totalCents = Math.round(validated.total * 100);

    // Create supplement record
    const supplement = await prisma.claim_supplements.create({
      data: {
        id: crypto.randomUUID(),
        claim_id: validated.claimId,
        total_cents: totalCents,
        status:
          validated.status.toUpperCase() === "DRAFT"
            ? "REQUESTED"
            : (validated.status.toUpperCase() as any),
        data: {
          title: validated.title || `Supplement - ${new Date().toLocaleDateString()}`,
          items: validated.items,
          createdBy: userId,
          createdAt: new Date().toISOString(),
        },
        updated_at: new Date(),
      },
    });

    // Log activity
    await prisma.claim_activities.create({
      data: {
        id: crypto.randomUUID(),
        claim_id: validated.claimId,
        user_id: userId,
        type: "SUPPLEMENT",
        message: `Created supplement "${validated.title || "Untitled"}" for $${validated.total.toFixed(2)}`,
        metadata: {
          supplementId: supplement.id,
          totalCents,
          itemCount: validated.items.length,
        },
      },
    });

    logger.info("[SUPPLEMENT_CREATE]", {
      userId,
      orgId,
      claimId: validated.claimId,
      supplementId: supplement.id,
      total: validated.total,
      itemCount: validated.items.length,
    });

    return NextResponse.json(
      {
        success: true,
        supplementId: supplement.id,
        message: "Supplement saved to tracker",
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }

    logger.error("[SUPPLEMENT_CREATE_ERROR]", error);
    return NextResponse.json({ error: "Failed to create supplement" }, { status: 500 });
  }
}

/**
 * GET /api/supplements
 * List all supplements for the organization
 */
export async function GET(req: NextRequest) {
  try {
    const authResult = await requireApiOrg();
    if (authResult instanceof NextResponse) return authResult;

    const { orgId } = authResult;
    if (!orgId) {
      return NextResponse.json({ error: "Organization required." }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const claimId = searchParams.get("claimId");
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    // Get all claims for the org
    const claims = await prisma.claims.findMany({
      where: { orgId },
      select: { id: true },
    });

    const claimIds = claims.map((c) => c.id);

    // Build where clause
    const where: any = {
      claim_id: claimId ? claimId : { in: claimIds },
    };

    if (status) {
      where.status = status.toUpperCase();
    }

    const supplements = await prisma.claim_supplements.findMany({
      where,
      orderBy: { updated_at: "desc" },
      take: limit,
      include: {
        claims: {
          select: {
            claimNumber: true,
            insured_name: true,
            carrier: true,
          },
        },
      },
    });

    return NextResponse.json({
      supplements: supplements.map((s) => ({
        id: s.id,
        claimId: s.claim_id,
        claimNumber: s.claims?.claimNumber,
        homeownerName: s.claims?.insured_name,
        carrier: s.claims?.carrier,
        status: s.status,
        total: (s.total_cents || 0) / 100,
        data: s.data,
        updatedAt: s.updated_at,
      })),
    });
  } catch (error) {
    logger.error("[SUPPLEMENT_LIST_ERROR]", error);
    return NextResponse.json({ error: "Failed to list supplements" }, { status: 500 });
  }
}
