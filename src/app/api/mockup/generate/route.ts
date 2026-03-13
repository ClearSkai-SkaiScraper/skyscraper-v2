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
            content: `You are an expert architectural photographer specializing in real estate photography. Your task is to analyze a property photo and write a highly detailed DALL-E 3 prompt that will generate a HYPER-REALISTIC photograph of the SAME building after renovations.

PHOTOREALISM IS MANDATORY. The generated image must be indistinguishable from an actual photograph.

CRITICAL RULES:
1. ALWAYS START WITH: "Ultra-realistic professional real estate photograph, shot on Canon EOS R5, 24mm lens, f/8, natural afternoon sunlight, high dynamic range, 8K resolution, showing..."
2. DESCRIBE EXACT ARCHITECTURE: precise roof pitch and shape, exact window count and placement (left to right, floor by floor), door style and position, siding type and direction, any architectural trim, gutters, downspouts, foundation visible.
3. DESCRIBE EXACT CAMERA POSITION: distance from house, height (eye-level/elevated/ground), angle (straight on/3/4 view), what appears at frame edges.
4. DESCRIBE ENVIRONMENT IN DETAIL: exact sky (clear blue/partly cloudy/overcast), sun direction (shadows cast where), trees (species, size, placement), lawn condition, driveway material, neighboring homes visible, power lines if any.
5. FOR THE RENOVATION: describe pristine NEW materials with photographic detail - visible shingle granules, paint sheen, wood grain, mortar lines, metal flashing, etc.
6. ABSOLUTELY FORBIDDEN WORDS: illustration, render, drawing, cartoon, digital art, concept art, 3D model, CGI, stylized, artistic, painting, sketch, graphic.
7. The result must look like the photographer returned 6 months later and photographed the completed renovation.`,
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Study this property photo with extreme precision. Document EVERY architectural detail:

- Roof: exact shape, pitch, dormers, valleys, ridges, overhangs
- Windows: count each floor left-to-right, note sizes and styles
- Siding/exterior: material, color, pattern direction
- Entry: door style, steps, porch, railings
- Garage: if visible, style and placement
- Trim: fascia, soffit, corner boards, window surrounds
- Foundation: visible portion
- Camera: exact angle and distance from building
- Environment: sky, landscaping, driveway, neighboring structures

Now write a DALL-E 3 prompt for a HYPER-REALISTIC photograph of this IDENTICAL property after a completed renovation: ${aiPrompt}

The building must have the IDENTICAL footprint, proportions, and surrounding environment. Only the renovation materials should appear new and pristine.`,
              },
              {
                type: "image_url",
                image_url: { url: beforeImageDataUrl, detail: "high" },
              },
            ],
          },
        ],
        max_tokens: 700,
      });

      const enhancedPrompt = descriptionResponse.choices[0]?.message?.content || aiPrompt;

      // Generate the "after" image with DALL-E 3 (HD quality, natural style)
      const imageResponse = await openai.images.generate({
        model: "dall-e-3",
        prompt: `${enhancedPrompt}

PHOTOREALISM REQUIREMENTS - THIS MUST LOOK LIKE A REAL PHOTOGRAPH:
- Shot on professional DSLR camera (Canon EOS R5 or Sony A7R IV), 24-35mm lens, f/8, ISO 100
- Natural afternoon sunlight creating soft shadows, golden hour warmth
- 8K resolution with extreme detail visible: individual shingle granules, wood grain textures, mortar lines
- Realistic lens characteristics: subtle vignette, proper depth of field, natural bokeh on background
- Atmospheric perspective: slight haze in distance, natural sky gradients
- Authentic material textures: glossy paint with subtle reflections, matte shingles absorbing light, visible brick pitting
- Real landscaping: individual grass blades, leaf details, natural growth patterns
- True photographic colors: no oversaturation, proper white balance, accurate material colors
- Professional real estate photography composition: level horizon, balanced framing, optimal exposure

ABSOLUTELY NOT: illustration, digital art, render, 3D model, CGI, drawing, painting, artistic interpretation, stylized, concept art, cartoon, anime, graphic design. This must be indistinguishable from an actual photograph taken by a professional real estate photographer.`,
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
      "Show the completed roof with brand-new, pristine architectural shingles in perfect condition. Clean ridge caps, straight lines, uniform color, visible granule texture, no damage, no wear. Fresh drip edge, clean gutters, flashing properly sealed. A freshly installed roof that looks magazine-ready. ",
    "Kitchen Remodel":
      "Show the finished kitchen with brand-new installed cabinets, quartz countertops, modern stainless steel appliances, pendant lighting, and subway tile backsplash. Everything looks pristine and freshly installed with clean grout lines. ",
    "Bathroom Remodel":
      "Show the completed bathroom with new fixtures, pristine porcelain tile work, modern floating vanity with undermount sink, frameless glass shower enclosure, and fresh chrome/brushed nickel finishes. Spotlessly clean and newly installed. ",
    "Exterior Paint":
      "Show the house with a fresh, perfect paint job — razor-sharp trim lines, uniform satin/semi-gloss finish, professional masking, no drips or brush marks. Fresh caulking around all windows and doors. ",
    Flooring:
      "Show the room with brand-new luxury vinyl plank or hardwood flooring freshly installed, including perfect transitions, quarter-round trim, and clean baseboards. Natural wood grain visible. ",
    "Solar Installation":
      "Show the roof with new solar panels cleanly and professionally installed with micro-rail mounting, perfectly aligned rows, flush to roof surface with proper flashing. Conduit neatly routed. ",
    HVAC: "Show the completed HVAC installation with brand-new modern Carrier/Trane equipment, clean ductwork connections, proper refrigerant lines with insulation, and neat electrical connections. ",
    "General Contractor":
      "Show the completed renovation with all new finishes, pristine materials, professional craftsmanship throughout, clean lines, and attention to detail. ",
    Landscaping:
      "Show the finished landscape with healthy sod, mature plantings, clean hardscape borders, decorative mulch, irrigation heads visible, and beautiful curb appeal. ",
    Siding:
      "Show the completed siding installation with brand-new vinyl/fiber cement/LP SmartSide panels, perfectly aligned courses, clean J-channel around windows, fresh corner posts, and new fascia/soffit. No gaps, uniform color, factory-fresh appearance. ",
    Windows:
      "Show brand-new energy-efficient vinyl or fiberglass windows installed with clean interior/exterior trim, factory-fresh glass, operational hardware, and proper caulking. ",
    Gutters:
      "Show brand-new seamless aluminum gutters and downspouts, properly pitched, with fresh hangers, end caps, and splash blocks. Clean metallic finish. ",
    Fencing:
      "Show a brand-new fence installation — clean posts, level rails, uniform pickets/panels, no gaps, with fresh stain or paint and proper hardware. ",
    Decking:
      "Show a completed composite or wood deck with new boards, clean railing system, proper post connections, fresh stain or factory finish, and no visible fasteners. ",
    Concrete:
      "Show freshly poured and finished concrete — clean control joints, proper slope, broom finish texture, and clean edges. No cracks, stains, or imperfections. ",
    Painting:
      "Show perfectly painted interior walls with flawless roller texture, sharp-cut edges at ceiling and trim, uniform sheen, and clean baseboards. Professional quality. ",
    Drywall:
      "Show seamless Level 5 drywall finish — no visible seams, joints, or fastener dimples. Smooth, ready-for-paint surface with clean corners and edges. ",
  };

  const context = typeContext[projectType] || "";
  const userDescription = description ? `Specific requirements: ${description}. ` : "";

  return `${basePrompt}${context}${userDescription}High quality, professional photograph, realistic, well-lit, before-after comparison ready.`;
}
