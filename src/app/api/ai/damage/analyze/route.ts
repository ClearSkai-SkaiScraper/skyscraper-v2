import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";

import { ensureOpenAI } from "@/lib/ai/client";
import { aiFail, aiOk } from "@/lib/api/aiResponse";
import { withAuth } from "@/lib/auth/withAuth";
import { logger } from "@/lib/logger";
import { getRateLimitIdentifier, rateLimiters } from "@/lib/rate-limit";
import { convertHeicToJpeg, isHeicImage } from "@/modules/photos/utils/heic";

// Force Node.js runtime for sharp/native modules
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

// Approximate token cost per analysis call
const TOKEN_COST = 1;

interface DamageFinding {
  type: string;
  severity: "Low" | "Medium" | "High" | "Critical";
  description: string;
  location: string;
  code?: string;
  materialSpec?: string;
}

interface AnalysisResult {
  findings: DamageFinding[];
  codeCompliance?: string[];
  materialSpecs?: string[];
  summary: string;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const POST = withAuth(async (req, { userId, orgId }) => {
  try {
    const identifier = getRateLimitIdentifier(userId, req);
    const allowed = await rateLimiters.ai.check(5, identifier);
    if (!allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please wait a moment and try again." },
        { status: 429 }
      );
    }

    const formData = await req.formData();
    const photos = formData.getAll("photos") as File[];
    const leadId = formData.get("leadId") as string | null;
    const jobId = formData.get("jobId") as string | null;
    const includeCodeCompliance = formData.get("includeCodeCompliance") === "true";
    const includeMaterialSpecs = formData.get("includeMaterialSpecs") === "true";
    const propertyAddress = formData.get("propertyAddress") as string | null;

    if (!photos || photos.length === 0) {
      return NextResponse.json(aiFail("No photos provided", "NO_PHOTOS"), { status: 400 });
    }

    // Convert HEIC/HEIF images to JPEG (fallback — client should convert first)
    const convertedPhotos: File[] = [];
    for (const photo of photos) {
      if (isHeicImage(photo.type)) {
        try {
          const buffer = Buffer.from(await photo.arrayBuffer());
          const result = await convertHeicToJpeg(buffer);

          if (result.success && result.buffer) {
            // Convert Node.js Buffer to Uint8Array for web File API
            const uint8Array = new Uint8Array(result.buffer);
            const convertedFile = new File(
              [uint8Array],
              photo.name.replace(/\.(heic|heif)$/i, ".jpg"),
              { type: "image/jpeg" }
            );
            convertedPhotos.push(convertedFile);
            Sentry.addBreadcrumb({
              category: "heic-conversion",
              message: `Converted ${photo.name} (${photo.type}) to JPEG`,
              level: "info",
            });
          } else {
            // Graceful fallback: try sending the original file to the AI
            // OpenAI Vision can sometimes handle HEIC natively
            logger.warn(
              `HEIC conversion failed for ${photo.name}, sending original: ${result.error}`
            );
            convertedPhotos.push(photo);
          }
        } catch (error) {
          Sentry.captureException(error, {
            tags: { operation: "heic-conversion" },
            extra: { fileName: photo.name, mimeType: photo.type },
          });
          // Graceful fallback instead of hard failure
          logger.warn(`HEIC processing exception for ${photo.name}, sending original`);
          convertedPhotos.push(photo);
        }
      } else {
        convertedPhotos.push(photo);
      }
    }

    // Initialize OpenAI
    const openai = ensureOpenAI();

    // Build vision analysis prompt
    const analysisInstructions = buildAnalysisPrompt(
      includeCodeCompliance,
      includeMaterialSpecs,
      propertyAddress
    );

    // Convert photos to base64 for Vision API
    const imageContents: Array<{
      type: "image_url";
      image_url: { url: string; detail: "high" | "low" | "auto" };
    }> = [];

    for (const photo of convertedPhotos) {
      const buffer = Buffer.from(await photo.arrayBuffer());
      const base64 = buffer.toString("base64");
      const mimeType = photo.type || "image/jpeg";
      imageContents.push({
        type: "image_url",
        image_url: {
          url: `data:${mimeType};base64,${base64}`,
          detail: "high", // Use high detail for damage assessment
        },
      });
    }

    // Call OpenAI Vision API
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // gpt-4o has vision capabilities
      max_tokens: 4096,
      messages: [
        {
          role: "system",
          content: `You are an expert property damage assessor and insurance claims specialist. 
Analyze photos to identify damage with precise descriptions suitable for insurance documentation.
Always respond with valid JSON matching the requested schema.`,
        },
        {
          role: "user",
          content: [{ type: "text", text: analysisInstructions }, ...imageContents],
        },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json(aiFail("AI returned empty response", "EMPTY_RESPONSE"), {
        status: 500,
      });
    }

    // Parse JSON response
    let analysisResult: AnalysisResult;
    try {
      // Extract JSON from response (handle markdown code blocks)
      let jsonStr = content;
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1].trim();
      }
      analysisResult = JSON.parse(jsonStr);

      // Validate the parsed structure has the required fields
      if (!analysisResult || typeof analysisResult !== "object") {
        throw new Error("Response is not a valid object");
      }
      if (!Array.isArray(analysisResult.findings)) {
        // If findings came back as a single object, wrap it
        if (analysisResult.findings && typeof analysisResult.findings === "object") {
          analysisResult.findings = [analysisResult.findings as unknown as DamageFinding];
        } else {
          analysisResult.findings = [];
        }
      }
      if (!analysisResult.summary) {
        analysisResult.summary = "Analysis complete";
      }
    } catch (parseError) {
      logger.error("Failed to parse AI response:", content);
      Sentry.captureException(parseError, {
        extra: { rawContent: content },
      });
      return NextResponse.json(
        aiFail(
          "Could not interpret the damage analysis. Try uploading a clearer photo of the damage.",
          "PARSE_ERROR",
          {
            hint: "Ensure the photo clearly shows property damage (roof, siding, water intrusion, etc.)",
          }
        ),
        { status: 500 }
      );
    }

    // Log telemetry
    Sentry.addBreadcrumb({
      category: "damage-analysis",
      message: `Analyzed ${convertedPhotos.length} photos, found ${analysisResult.findings?.length || 0} findings`,
      level: "info",
      data: { leadId, jobId, findingsCount: analysisResult.findings?.length || 0 },
    });

    // Return structured analysis result
    return NextResponse.json(
      aiOk({
        findings: analysisResult.findings || [],
        codeCompliance: analysisResult.codeCompliance || [],
        materialSpecs: analysisResult.materialSpecs || [],
        summary: analysisResult.summary || "Analysis complete",
        tokensUsed: TOKEN_COST,
        model: response.model,
        photoCount: convertedPhotos.length,
      })
    );
  } catch (error: unknown) {
    logger.error("Damage analysis error:", error);
    Sentry.captureException(error);
    return NextResponse.json(aiFail("Analysis failed", "ANALYSIS_ERROR"), { status: 500 });
  }
});

function buildAnalysisPrompt(
  includeCodeCompliance: boolean,
  includeMaterialSpecs: boolean,
  propertyAddress: string | null
): string {
  let prompt = `Analyze the uploaded photos for property damage. For each photo, identify all visible damage.

Return a JSON object with this exact structure:
{
  "findings": [
    {
      "type": "string - damage type (e.g., 'Roof Shingle Damage', 'Water Intrusion', 'Hail Impact', 'Wind Damage', 'Structural Crack')",
      "severity": "Low" | "Medium" | "High" | "Critical",
      "description": "string - detailed description of the damage observed",
      "location": "string - where on the property the damage is located"`;

  if (includeCodeCompliance) {
    prompt += `,
      "code": "string - relevant building code or IRC reference if applicable"`;
  }

  if (includeMaterialSpecs) {
    prompt += `,
      "materialSpec": "string - material specification for repair (e.g., 'CertainTeed Landmark PRO Shingles', '30-year architectural shingles')"`;
  }

  prompt += `
    }
  ],
  "summary": "string - overall assessment summary"`;

  if (includeCodeCompliance) {
    prompt += `,
  "codeCompliance": ["string - array of code/compliance notes for each photo"]`;
  }

  if (includeMaterialSpecs) {
    prompt += `,
  "materialSpecs": ["string - array of material specifications for each photo"]`;
  }

  prompt += `
}

${propertyAddress ? `Property Address: ${propertyAddress}` : ""}

Guidelines:
- Be specific and detailed in descriptions
- Use professional insurance terminology
- Severity levels:
  * Low: Cosmetic damage, no immediate action needed
  * Medium: Moderate damage, should be addressed soon
  * High: Significant damage, requires prompt attention
  * Critical: Severe damage, immediate action required
- Include all visible damage types (water, structural, weather-related, wear)
- Reference applicable building codes when relevant (IRC, local codes)
- Provide specific material recommendations for repairs`;

  return prompt;
}
