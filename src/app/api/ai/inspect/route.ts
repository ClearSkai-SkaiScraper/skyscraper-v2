export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

// src/app/api/ai/inspect/route.ts
// eslint-disable-next-line no-restricted-imports
import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { getOpenAI } from "@/lib/ai/client";
import { withAuth } from "@/lib/auth/withAuth";
import {
  requireActiveSubscription,
  SubscriptionRequiredError,
} from "@/lib/billing/requireActiveSubscription";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";

export const POST = withAuth(async (request, { userId, orgId }) => {
  try {
    const openai = getOpenAI();

    // Get user details for inspection record
    const user = await currentUser();

    // ── Billing guard ──
    try {
      await requireActiveSubscription(orgId);
    } catch (error) {
      if (error instanceof SubscriptionRequiredError) {
        return NextResponse.json(
          { error: "subscription_required", message: "Active subscription required" },
          { status: 402 }
        );
      }
      throw error;
    }

    // ── Rate limit ──
    const rl = await checkRateLimit(userId, "AI");
    if (!rl.success) {
      return NextResponse.json(
        {
          error: "rate_limit_exceeded",
          message: "Too many requests. Please try again later.",
          retryAfter: rl.reset,
        },
        {
          status: 429,
          headers: { "Retry-After": String(Math.ceil((rl.reset - Date.now()) / 1000)) },
        }
      );
    }

    const formData = await request.formData();
    const image = formData.get("image") as File;
    const propertyId = formData.get("propertyId") as string;

    // Validation — validateAIRequest removed, inline if needed
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const validation = { success: true, data: { propertyId: propertyId || undefined } };

    if (!image) {
      return NextResponse.json({ error: "Image is required" }, { status: 400 });
    }

    // Convert image to base64 for OpenAI Vision API
    const bytes = await image.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");
    const mimeType = image.type;

    // orgId already resolved above

    // Get property context if provided
    let propertyContext = "";
    if (propertyId) {
      const property = await prisma.properties.findFirst({
        where: { id: propertyId, orgId },
        include: { claims: true },
      });

      if (property) {
        propertyContext = `Property Context:
- Address: ${property.street}, ${property.city}, ${property.state} ${property.zipCode}
- Type: ${property.propertyType}
- Year Built: ${property.yearBuilt || "Unknown"}
- Active Claims: ${property.claims.length}
`;
      }
    }

    // Analyze image with OpenAI Vision
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are SkaiInspect, an AI-powered HAAG-certified roofing damage assessment specialist. Your mission is COMPREHENSIVE damage detection.

CRITICAL RULE: When in doubt, INCLUDE the finding. It is better to over-report than to miss damage.

SYSTEMATIC SCAN: Analyze each image in a 3×3 grid pattern. Report ALL damage from every region.

Analyze the provided image for:

1. **Damage Types**: Identify ALL roofing damage (hail impacts, wind damage, granule loss, bruising, nail pops, lifted tabs, creasing, missing shingles, flashing issues, pipe boot cracks, vent damage, gutter dents)
2. **Severity Assessment**: Rate damage severity (Minor, Moderate, Severe, Critical)
3. **Measurements**: Estimate dimensions in inches where possible (use shingle tabs ≈ 5" as reference)
4. **Repair Recommendations**: Suggest appropriate repair/replacement actions with Xactimate codes
5. **Insurance Claims**: Provide guidance for insurance documentation
6. **Safety Concerns**: Highlight any immediate safety issues
7. **Cost Estimation**: Provide rough cost estimates when possible

${propertyContext}

Be exhaustive — every finding matters for the claim. Format your response as a structured analysis with clear sections. Be specific and professional.`,
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Please analyze this roofing image for damage assessment. Provide a comprehensive report. Scan systematically and report ALL damage found.",
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${base64}`,
                detail: "high",
              },
            },
          ],
        },
      ],
      temperature: 0.5,
      top_p: 0.95,
      max_tokens: 4096,
    });

    const analysis =
      completion.choices[0]?.message?.content || "Unable to analyze image at this time.";

    // Store the inspection result in database
    let inspectionId: string | null = null;
    if (propertyId) {
      try {
        const inspectionRecord = await prisma.inspections.create({
          data: {
            orgId,
            propertyId,
            inspectorId: userId,
            inspectorName: user?.firstName || "AI Inspector",
            title: "AI Damage Assessment",
            type: "ai_damage_assessment",
            status: "completed",
            notes: analysis,
            scheduledAt: new Date(),
            completedAt: new Date(),
            weatherData: {
              conditions: "Clear",
              note: "AI Analysis - No weather data available",
            },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any,
        });
        inspectionId = inspectionRecord.id;
      } catch (error) {
        logger.error("Failed to store inspection record:", error);
        // Continue without storing - don't fail the analysis
      }
    }

    return NextResponse.json({
      analysis,
      inspectionId: inspectionId,
      metadata: {
        imageSize: image.size,
        imageType: mimeType,
        confidence: "high",
        processingTime: Date.now(),
      },
    });
  } catch (error: unknown) {
    logger.error("AI Inspect Error:", error);
    return NextResponse.json({ error: "Failed to analyze image" }, { status: 500 });
  }
});
