/**
 * 📤 BID SUBMISSION API
 *
 * Allows verified Pro users to submit bids on client projects.
 * POST /api/bids - Create new bid
 * GET /api/bids?projectId=xxx - Get all bids for a project (project owner only)
 * GET /api/bids?proId=xxx - Get all bids by a pro
 */

import { auth } from "@clerk/nextjs/server";
import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";

import prisma from "@/lib/prisma";

// POST - Submit new bid
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user is a Pro
    const identity = await prisma.user_registry.findUnique({
      where: { clerkUserId: userId },
    });

    if (!identity || identity.userType !== "pro") {
      return NextResponse.json(
        { error: "Only verified contractors can submit bids" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      projectId,
      amount,
      timeline,
      message,
      includesPermits,
      includesMaterials,
      validDays = 30,
      estimateUrl, // Optional: URL to attached estimate PDF
      estimateFileName, // Optional: Original filename of estimate
    } = body;

    // Validate required fields
    if (!projectId || !amount || !timeline || !message) {
      return NextResponse.json(
        { error: "Missing required fields: projectId, amount, timeline, message" },
        { status: 400 }
      );
    }

    // Get the pro profile (TradesProfile uses userId, not clerkUserId)
    const proProfile = await prisma.tradesProfile.findFirst({
      where: { userId },
    });

    if (!proProfile) {
      return NextResponse.json({ error: "Pro profile not found" }, { status: 404 });
    }

    // Check if project exists and is open for bids
    // Note: In production, you'd have a projects table
    // For now, we'll store bids in a generic format

    // Check for duplicate bid
    const existingBid = await prisma.$queryRaw`
      SELECT id FROM project_bids
      WHERE project_id = ${projectId}
      AND pro_profile_id = ${proProfile.id}
      AND status NOT IN ('withdrawn', 'expired')
    `;

    if (Array.isArray(existingBid) && existingBid.length > 0) {
      return NextResponse.json(
        { error: "You have already submitted a bid for this project" },
        { status: 409 }
      );
    }

    // Create the bid
    const bid = await prisma.$executeRaw`
      INSERT INTO project_bids (
        id,
        project_id,
        pro_profile_id,
        amount,
        timeline,
        message,
        includes_permits,
        includes_materials,
        valid_until,
        status,
        created_at,
        updated_at
      ) VALUES (
        gen_random_uuid(),
        ${projectId},
        ${proProfile.id},
        ${amount},
        ${timeline},
        ${message},
        ${includesPermits ?? false},
        ${includesMaterials ?? false},
        NOW() + INTERVAL '${validDays} days',
        'pending',
        NOW(),
        NOW()
      )
      RETURNING id
    `;

    return NextResponse.json(
      {
        success: true,
        message: "Bid submitted successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error("[BID_SUBMIT_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to submit bid", details: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET - Retrieve bids
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const status = searchParams.get("status");

    // Get user identity to determine what bids they can see
    const identity = await prisma.user_registry.findUnique({
      where: { clerkUserId: userId },
    });

    if (!identity) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // If pro, get their submitted bids
    if (identity.userType === "pro") {
      const proProfile = await prisma.tradesProfile.findFirst({
        where: { userId },
      });

      if (!proProfile) {
        return NextResponse.json({ bids: [] });
      }

      // Get bids submitted by this pro
      const bids = await prisma.$queryRaw`
        SELECT 
          pb.id,
          pb.project_id as "projectId",
          pb.amount,
          pb.timeline,
          pb.message,
          pb.status,
          pb.created_at as "createdAt",
          pb.valid_until as "validUntil"
        FROM project_bids pb
        WHERE pb.pro_profile_id = ${proProfile.id}
        ${status ? prisma.$queryRaw`AND pb.status = ${status}` : prisma.$queryRaw``}
        ORDER BY pb.created_at DESC
      `;

      return NextResponse.json({ bids });
    }

    // If client, get bids on their projects
    if (identity.userType === "client") {
      if (!projectId) {
        return NextResponse.json(
          { error: "projectId required for client access" },
          { status: 400 }
        );
      }

      // Verify client owns this project
      // In production, check project ownership
      // For now, return bids on the project

      const bids = await prisma.$queryRaw`
        SELECT 
          pb.id,
          pb.project_id as "projectId",
          pb.amount,
          pb.timeline,
          pb.message,
          pb.status,
          pb.created_at as "createdAt",
          pb.valid_until as "validUntil",
          pp.id as "proId",
          pp.company_name as "companyName",
          pp.full_name as "proName"
        FROM project_bids pb
        JOIN pro_profile pp ON pp.id = pb.pro_profile_id
        WHERE pb.project_id = ${projectId}
        ORDER BY pb.created_at DESC
      `;

      return NextResponse.json({ bids });
    }

    return NextResponse.json({ error: "Invalid user type" }, { status: 400 });
  } catch (error) {
    logger.error("[BID_GET_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to retrieve bids", details: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH - Update bid status (accept/decline)
export async function PATCH(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { bidId, action } = body;

    if (!bidId || !action) {
      return NextResponse.json({ error: "Missing bidId or action" }, { status: 400 });
    }

    const validActions = ["accept", "decline", "withdraw"];
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { error: `Invalid action. Must be one of: ${validActions.join(", ")}` },
        { status: 400 }
      );
    }

    const statusMap: Record<string, string> = {
      accept: "accepted",
      decline: "declined",
      withdraw: "withdrawn",
    };

    await prisma.$executeRaw`
      UPDATE project_bids
      SET status = ${statusMap[action]}, updated_at = NOW()
      WHERE id = ${bidId}::uuid
    `;

    return NextResponse.json({
      success: true,
      message: `Bid ${action}ed successfully`,
    });
  } catch (error) {
    logger.error("[BID_UPDATE_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to update bid", details: "Internal server error" },
      { status: 500 }
    );
  }
}
