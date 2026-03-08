export const dynamic = "force-dynamic";

// ORG-SCOPE: GET public browse filters by visibility:"public" (cross-org job board by design). Own requests scoped by clientId. No orgId column on ClientWorkRequest.
/**
 * Client Job Request API
 * Allows clients to post job requests with photos, summary, and requirements
 */

import prisma from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

// GET - List job requests (for contractors to browse, or for client to see their own)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const city = searchParams.get("city");
    const state = searchParams.get("state");
    const status = searchParams.get("status") || "pending";
    const myRequests = searchParams.get("mine") === "true";
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");

    const { userId } = await auth();

    // Build where clause
    const where: any = {
      status,
      visibility: "public",
    };

    // If viewing own requests, filter by client
    if (myRequests && userId) {
      const client = await prisma.client.findUnique({
        where: { userId },
        select: { id: true },
      });
      if (client) {
        where.clientId = client.id;
        delete where.visibility; // Show all own requests regardless of visibility
      }
    }

    if (category) where.category = category;
    if (city) where.city = { contains: city, mode: "insensitive" };
    if (state) where.state = state;

    const [jobRequests, total] = await Promise.all([
      prisma.clientWorkRequest.findMany({
        where,
        include: {
          Client: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatarUrl: true,
              city: true,
              state: true,
            },
          },
          _count: {
            select: { ClientJobResponse: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.clientWorkRequest.count({ where }),
    ]);

    return NextResponse.json({
      jobRequests,
      total,
      hasMore: offset + jobRequests.length < total,
    });
  } catch (error) {
    logger.error("Error fetching job requests:", error);
    return NextResponse.json({ error: "Failed to fetch job requests" }, { status: 500 });
  }
}

// POST - Create a new job request
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    const user = await currentUser();

    if (!userId || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      title,
      description,
      category,
      urgency = "normal",
      preferredDate,
      propertyAddress,
      propertyPhotos = [],
      coverPhoto,
      summary,
      budget,
      budgetMin,
      budgetMax,
      timeline,
      lookingFor = [],
      requirements = [],
      preferredTypes = [],
      city,
      state,
      zip,
      serviceArea,
      visibility = "public",
      expiresAt,
      targetProId,
    } = body;

    if (!title || !description || !category) {
      return NextResponse.json(
        { error: "Title, description, and category are required" },
        { status: 400 }
      );
    }

    // Get or create client
    const email = user.emailAddresses?.[0]?.emailAddress || "";
    const firstName = user.firstName || "";
    const lastName = user.lastName || "";
    const slug = `client-${userId.slice(-8)}`;

    const client = await prisma.client.upsert({
      where: { userId },
      update: { lastActiveAt: new Date() },
      create: {
        id: crypto.randomUUID(),
        userId,
        slug,
        email,
        firstName,
        lastName,
        name: `${firstName} ${lastName}`.trim() || email.split("@")[0],
      },
    });

    // Create the job request
    const jobRequest = await prisma.clientWorkRequest.create({
      data: {
        id: crypto.randomUUID(),
        clientId: client.id,
        title,
        description,
        category,
        urgency,
        preferredDate: preferredDate ? new Date(preferredDate) : null,
        propertyAddress,
        propertyPhotos,
        coverPhoto,
        summary,
        budget,
        budgetMin: budgetMin ? parseFloat(budgetMin) : null,
        budgetMax: budgetMax ? parseFloat(budgetMax) : null,
        timeline,
        lookingFor,
        requirements,
        preferredTypes,
        city,
        state,
        zip,
        serviceArea,
        visibility,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        targetProId,
      },
      include: {
        Client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      jobRequest,
    });
  } catch (error) {
    logger.error("Error creating job request:", error);
    return NextResponse.json({ error: "Failed to create job request" }, { status: 500 });
  }
}
