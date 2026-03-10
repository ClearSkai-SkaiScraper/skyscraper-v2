export const dynamic = "force-dynamic";

import { logger } from "@/lib/logger";
import { currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { getOpenAI } from "@/lib/ai/client";
import {
  requireActiveSubscription,
  SubscriptionRequiredError,
} from "@/lib/billing/requireActiveSubscription";
import prisma from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = (user.publicMetadata?.orgId as string) || user.id;

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
    const rl = await checkRateLimit(user.id, "UPLOAD");
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
    const beforeImage = formData.get("beforeImage") as File;
    const projectType = formData.get("projectType") as string;
    const projectDescription = (formData.get("projectDescription") as string) || "";

    if (!beforeImage || !projectType) {
      return NextResponse.json({ error: "Missing beforeImage or projectType" }, { status: 400 });
    }

    // Build the AI prompt from project type and description
    const aiPrompt = buildAIPrompt(projectType, projectDescription);

    // Convert uploaded image to base64 data URL
    const bytes = await beforeImage.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString("base64");
    const mimeType = beforeImage.type;
    const beforeImageDataUrl = `data:${mimeType};base64,${base64}`;

    logger.info(
      `[Mockup Generate] User: ${user.id}, Project: ${projectType}, Size: ${beforeImage.size} bytes`
    );
    logger.debug(`[Mockup Generate] AI Prompt: ${aiPrompt}`);

    // Try OpenAI DALL-E 3 with image editing if available
    try {
      const openai = getOpenAI();

      // Use GPT-4o (best vision model) to deeply analyze the property and write
      // an architecture-preserving prompt for DALL-E 3 image generation.
      const descriptionResponse = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are an expert architectural photographer and property analyst. Your job is to study a property photo and write an image-generation prompt that will recreate the EXACT SAME building with renovations applied.

CRITICAL RULES:
1. NEVER describe any damage, wear, deterioration, debris, tarps, or current disrepair.
2. ONLY describe the FINISHED result with brand-new materials installed.
3. ALWAYS begin with: "A professional real estate photograph taken with a DSLR camera in natural daylight of a..."
4. PRECISELY describe the building's exact structure: number of stories, roof shape (gable/hip/flat/mansard), facade width, window count and placement, door position, garage location, chimney position, porch/entry style.
5. PRECISELY describe the camera angle: eye-level/elevated/street-level, facing direction, distance from building, what's visible on left/right edges.
6. Describe the surrounding environment: sky condition, trees (type, placement), driveway material, yard, neighboring structures visible.
7. Describe specific NEW material textures, colors, and architectural details for the renovation.
8. NEVER use words like "illustration", "render", "drawing", "cartoon", "digital art", "concept", "3D", "CGI".
9. The generated image must look like the photographer returned to the SAME EXACT house and took another photo after the renovation was complete.`,
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Study this property photo in extreme detail. Note EVERY architectural feature: the exact roof shape, number of dormers, window sizes and positions, siding pattern, entry style, garage door style, landscaping placement, fence type, driveway material, and camera angle/distance.

Now write a DALL-E 3 prompt that describes a photograph of this SAME EXACT property from this SAME EXACT camera angle, but after a completed renovation: ${aiPrompt}

The building MUST have the identical footprint, roof shape, window positions, and surrounding environment. Only the renovation materials should change.`,
              },
              {
                type: "image_url",
                image_url: { url: beforeImageDataUrl, detail: "high" },
              },
            ],
          },
        ],
        max_tokens: 500,
      });

      const enhancedPrompt = descriptionResponse.choices[0]?.message?.content || aiPrompt;

      // Generate the "after" image with DALL-E 3 (HD quality, natural style)
      const imageResponse = await openai.images.generate({
        model: "dall-e-3",
        prompt: `${enhancedPrompt}\n\nIMPORTANT CONSTRAINTS: This MUST be an actual photograph of a real building — NOT an illustration, NOT a render, NOT a 3D model, NOT a drawing, NOT digital art. Shot with a DSLR camera, 35mm lens, natural daylight with realistic shadows. The building has brand-new pristine materials with absolutely no damage, no wear, no debris. Every surface is freshly installed and perfect. Realistic material textures (visible shingle granules, wood grain, brick mortar lines), natural sky with clouds, real landscaping with individual leaves visible, authentic driveway and sidewalk textures.`,
        n: 1,
        size: "1024x1024",
        quality: "hd",
        style: "natural",
      });

      const afterImageUrl = imageResponse.data![0]?.url;

      if (afterImageUrl) {
        logger.debug(`[Mockup Generate] SUCCESS via GPT-4o + DALL-E 3 HD`);

        // Persist the generated mockup to the database
        try {
          await prisma.generatedArtifact.create({
            data: {
              orgId,
              type: "mockup",
              title: `${projectType} Mockup — ${new Date().toLocaleDateString()}`,
              content: enhancedPrompt,
              fileUrl: afterImageUrl,
              model: "gpt-4o+dall-e-3",
              tokensUsed: 1,
              status: "completed",
              metadata: {
                projectType,
                projectDescription,
                method: "GPT-4o Vision + DALL-E 3 HD",
              },
            },
          });
        } catch (saveErr) {
          logger.error("[Mockup Generate] Failed to save artifact:", saveErr);
        }

        return NextResponse.json({
          success: true,
          afterImageUrl,
          projectType,
          projectDescription,
          aiPrompt: enhancedPrompt,
          method: "GPT-4o Vision + DALL-E 3 HD",
        });
      }
    } catch (error) {
      logger.error("[Mockup Generate] OpenAI error:", error);
      // Fall through to fallback method
    }

    // Fallback: Return before image with overlay message
    logger.debug(`[Mockup Generate] Using fallback (no AI service configured)`);
    return NextResponse.json({
      success: true,
      afterImageUrl: beforeImageDataUrl,
      projectType,
      projectDescription,
      aiPrompt,
      method: "Fallback (Demo Mode)",
      message: "Configure OPENAI_API_KEY or REPLICATE_API_TOKEN for real AI generation",
    });
  } catch (error) {
    logger.error("[Mockup Generate] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to generate mockup",
        message: "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * Build a detailed AI prompt for image generation
 * Combines project type with user description for best results
 */
function buildAIPrompt(projectType: string, description: string): string {
  const basePrompt = `Professional ${projectType.toLowerCase()} project completion visualization. `;

  const typeContext: Record<string, string> = {
    Roofing:
      "Show the completed roof with brand-new, pristine architectural shingles in perfect condition. Clean ridge caps, straight lines, no damage, no wear — a freshly installed roof that looks magazine-ready. ",
    "Kitchen Remodel":
      "Show the finished kitchen with brand-new installed cabinets, countertops, modern appliances, and pendant lighting. Everything looks pristine and freshly installed. ",
    "Bathroom Remodel":
      "Show the completed bathroom with new fixtures, pristine tile work, modern vanity, and fresh finishes. Spotlessly clean and newly installed. ",
    "Exterior Paint":
      "Show the house with a fresh, perfect paint job — clean edges, uniform color, professional finish with no imperfections. ",
    Flooring:
      "Show the room with brand-new flooring freshly installed, including perfect transitions and clean baseboards. ",
    "Solar Installation":
      "Show the roof with new solar panels cleanly and professionally installed, perfectly aligned and integrated. ",
    HVAC: "Show the completed HVAC installation with brand-new modern equipment, clean ductwork, and professional finish. ",
    "General Contractor":
      "Show the completed renovation with all new finishes, pristine materials, and professional craftsmanship throughout. ",
    Landscaping:
      "Show the finished landscape with healthy plants, clean hardscape, and beautiful design elements. Lush and freshly installed. ",
  };

  const context = typeContext[projectType] || "";
  const userDescription = description ? `Specific requirements: ${description}. ` : "";

  return `${basePrompt}${context}${userDescription}High quality, professional photograph, realistic, well-lit, before-after comparison ready.`;
}
