export const dynamic = "force-dynamic";

/**
 * @deprecated Use POST /api/ai/damage/analyze or POST /api/ai/vision/pipeline instead.
 * This route uses an external SKAI_VISION_ENDPOINT which is being phased out.
 * All new code should use the canonical damage analysis endpoints.
 */

import { NextResponse } from "next/server";

import { withAuth } from "@/lib/auth/withAuth";
import {
  requireActiveSubscription,
  SubscriptionRequiredError,
} from "@/lib/billing/requireActiveSubscription";
import { logger } from "@/lib/logger";
import { getRateLimitIdentifier, rateLimiters } from "@/lib/rate-limit";
import { analyzeDamageFormDataSchema, validateAIRequest } from "@/lib/validation/aiSchemas";

// Retry configuration for AI service calls
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const POST = withAuth(async (request, { orgId, userId }) => {
  const startTime = Date.now();

  try {
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

    // Rate limiting check (10 requests per minute for AI endpoints)
    const identifier = getRateLimitIdentifier(userId, request);
    const allowed = await rateLimiters.ai.check(10, identifier);

    if (!allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please wait a moment and try again." },
        { status: 429 }
      );
    }

    const formData = await request.formData();
    const image = formData.get("image") as File;
    const claimId = formData.get("claimId") as string;

    // ── Zod validation for FormData fields ──
    const validation = validateAIRequest(analyzeDamageFormDataSchema, {
      claimId: claimId || undefined,
    });
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error, details: validation.details },
        { status: 422 }
      );
    }

    if (!image) {
      logger.error("[AI_VISION] ❌ No image provided");
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    // Convert image to base64 for AI service
    const bytes = await image.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Image = buffer.toString("base64");

    // Verify API configuration
    const endpoint =
      // eslint-disable-next-line no-restricted-syntax
      process.env.SKAI_VISION_ENDPOINT || "https://api.skaiscrape.com/v1/vision/analyze";
    // eslint-disable-next-line no-restricted-syntax
    const apiKey = process.env.SKAI_AI_API_KEY;

    if (!apiKey) {
      logger.error("[AI_VISION] ❌ CRITICAL: SKAI_AI_API_KEY not configured!");
      return NextResponse.json(
        { error: "AI service configuration error. Please contact support." },
        { status: 503 }
      );
    }

    let lastError: Error | null = null;
    let aiResponse: Response | null = null;

    // Retry loop with exponential backoff
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        // Call SkaiPDF Vision Service
        aiResponse = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            image: base64Image,
            imageType: image.type,
            analysisType: "damage_detection",
            features: ["damage_type", "severity", "confidence", "recommendations"],
            metadata: {
              orgId,
              claimId,
              timestamp: new Date().toISOString(),
            },
          }),
        });

        if (aiResponse.ok) {
          break; // Success!
        }

        // Log error response
        const errorText = await aiResponse.text();
        logger.error(`[AI_VISION] Attempt ${attempt} failed: ${aiResponse.status} - ${errorText}`);
        lastError = new Error(`HTTP ${aiResponse.status}: ${errorText}`);

        // Retry on 5xx errors or network issues
        if (attempt < MAX_RETRIES && aiResponse.status >= 500) {
          const delay = RETRY_DELAY * Math.pow(2, attempt - 1);
          await sleep(delay);
          continue;
        }

        break; // Don't retry on 4xx errors
      } catch (fetchError) {
        logger.error(`[AI_VISION] Attempt ${attempt} failed:`, fetchError);
        lastError = fetchError instanceof Error ? fetchError : new Error(String(fetchError));

        if (attempt < MAX_RETRIES) {
          const delay = RETRY_DELAY * Math.pow(2, attempt - 1);
          await sleep(delay);
        }
      }
    }

    if (!aiResponse || !aiResponse.ok) {
      logger.error(`[AI_VISION] All retry attempts exhausted. Last error:`, lastError);
      return NextResponse.json(
        {
          error: "AI Vision service unavailable. Please try again later.",
          details: lastError?.message,
        },
        { status: 503 }
      );
    }

    const aiData = await aiResponse.json();

    // Parse and format AI response
    const processingTime = Date.now() - startTime;

    const response = {
      success: true,
      analysis: {
        damageType: aiData.damage_type || "Unknown",
        confidence: aiData.confidence || 0,
        severity: aiData.severity || "Unknown",
        affectedArea: aiData.affected_area || "Not specified",
        recommendations: aiData.recommendations || [],
        detectedFeatures: aiData.features || [],
      },
      metadata: {
        imageSize: image.size,
        imageType: image.type,
        processedAt: new Date().toISOString(),
        processingTimeMs: processingTime,
        claimId,
        orgId,
      },
    };

    return NextResponse.json(response);
  } catch (error: unknown) {
    const processingTime = Date.now() - startTime;
    logger.error(`[AI_VISION] Error after ${processingTime}ms:`, error);

    return NextResponse.json(
      {
        error: "Failed to analyze image",
        details: error instanceof Error ? error.message : "Unknown error",
        processingTimeMs: processingTime,
      },
      { status: 500 }
    );
  }
});
