// eslint-disable-next-line no-restricted-imports
import { currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import { getRateLimitIdentifier, rateLimiters } from "@/lib/rate-limit";
import { damageAssessmentSchema, validateAIRequest } from "@/lib/validation/aiSchemas";

export const runtime = "edge";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    // Rate limit AI requests
    const identifier = getRateLimitIdentifier(user.id, req);
    const allowed = await rateLimiters.ai.check(10, identifier);
    if (!allowed) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }

    const body = await req.json();

    // ── Zod validation ──
    const validation = validateAIRequest(damageAssessmentSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error, details: validation.details },
        { status: 422 }
      );
    }

    const {
      propertyAddress,
      propertyType,
      yearBuilt,
      squareFootage,
      dateOfLoss,
      damageType,
      damageDescription,
      affectedAreas,
      estimatedRepairCost,
      estimatedReplacementCost,
    } = validation.data;

    // Build AI prompt
    const prompt = `You are an expert property damage assessment specialist. Generate a comprehensive damage assessment report based on the following information:

PROPERTY INFORMATION:
- Address: ${propertyAddress}
- Type: ${propertyType || "Not specified"}
- Year Built: ${yearBuilt || "Not specified"}
- Square Footage: ${squareFootage || "Not specified"}

INCIDENT DETAILS:
- Date of Loss: ${dateOfLoss || "Not specified"}
- Type of Damage: ${damageType}
- Description: ${damageDescription}

AFFECTED AREAS:
${affectedAreas && affectedAreas.length > 0 ? affectedAreas.join(", ") : "Not specified"}

PRELIMINARY ESTIMATES:
- Repair Cost: $${estimatedRepairCost || "Not provided"}
- Replacement Cost: $${estimatedReplacementCost || "Not provided"}

Please provide:
1. Executive Summary
2. Detailed Damage Assessment by Area
3. Recommended Repairs and Timeline
4. Cost Breakdown
5. Safety Concerns and Immediate Actions
6. Long-term Recommendations

Format the response in a professional, structured manner suitable for insurance submission.`;

    // Call OpenAI API
    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // eslint-disable-next-line no-restricted-syntax
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content:
              "You are an expert property damage assessment specialist with 20+ years of experience. Provide detailed, accurate, and professional damage assessments.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 3000,
      }),
    });

    if (!openaiResponse.ok) {
      const error = await openaiResponse.json();
      logger.error("OpenAI API error:", error);
      return NextResponse.json({ error: "Failed to generate damage assessment" }, { status: 500 });
    }

    const data = await openaiResponse.json();
    const assessment = data.choices[0]?.message?.content;

    if (!assessment) {
      return NextResponse.json({ error: "No assessment generated" }, { status: 500 });
    }

    // Return the assessment
    return NextResponse.json({
      success: true,
      assessment,
      metadata: {
        propertyAddress,
        damageType,
        dateOfLoss,
        generatedAt: new Date().toISOString(),
        userId: user.id,
      },
    });
  } catch (error) {
    logger.error("Error generating damage assessment:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
