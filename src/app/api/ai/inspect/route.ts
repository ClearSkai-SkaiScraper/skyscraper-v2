export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

// src/app/api/ai/inspect/route.ts
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
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are SkaiInspect, an AI-powered roofing damage assessment specialist. Analyze the provided image for:

1. **Damage Types**: Identify specific roofing damage (hail, wind, storm, wear, impact, etc.)
2. **Severity Assessment**: Rate damage severity (Minor, Moderate, Severe, Critical)
3. **Repair Recommendations**: Suggest appropriate repair/replacement actions
4. **Insurance Claims**: Provide guidance for insurance documentation
5. **Safety Concerns**: Highlight any immediate safety issues
6. **Cost Estimation**: Provide rough cost estimates when possible

${propertyContext}

Format your response as a structured analysis with clear sections. Be specific and professional - this will be used for insurance claims and customer reports.`,
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Please analyze this roofing image for damage assessment. Provide a comprehensive report.",
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
      temperature: 0.3,
      max_tokens: 1000,
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
