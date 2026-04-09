export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

import { AIModels, callOpenAI } from "@/lib/ai/client";
import { withAuth } from "@/lib/auth/withAuth";
import { logger } from "@/lib/logger";
import { requirePermission } from "@/lib/permissions";
import { checkRateLimit, getClientIdentifier } from "@/lib/security/ratelimit";

export const POST = withAuth(async (req: NextRequest, { orgId, userId }) => {
  try {
    const identifier = getClientIdentifier(req, userId);
    const rl = await checkRateLimit(identifier, "API");
    if (!rl.success) {
      return NextResponse.json({ ok: false, error: "Rate limit exceeded" }, { status: 429 });
    }
    await requirePermission("use_ai_features" as any);
    const form = await req.formData();
    const files = form.getAll("photos") as File[];
    const claimId = form.get("claimId") as string | null;

    if (!files.length) {
      return NextResponse.json(
        { ok: false, error: "No photos provided (multipart form 'photos')" },
        { status: 400 }
      );
    }
    if (!claimId) {
      return NextResponse.json(
        { ok: false, error: "claimId required in form data" },
        { status: 400 }
      );
    }

    const results: Array<{
      fileName: string;
      damageTypes: string[];
      rawLabel: string;
    }> = [];

    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const base64 = buffer.toString("base64");

      const result = await callOpenAI<string[]>({
        tag: "damage_detection",
        model: AIModels.VISION,
        system:
          "You are an expert HAAG-trained roof inspector. Detect damage types in images. Return a JSON array of detected damage types. Examples: hail bruising, wind-lift, missing shingles, soft-metal dents, pipe boot damage, flashing issues, exposed nails, granule loss, creased shingles.",
        messages: [
          {
            role: "user" as const,
            content: [
              {
                type: "text",
                text: "Identify all observable roofing damage in this image. Return a JSON array of damage types found.",
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${base64}`,
                },
              },
            ] as any,
          },
        ] as any,
        parseJson: true,
        maxTokens: 500,
        context: { claimId, fileName: file.name },
      });

      let damageTypes: string[] = [];
      const response = result.success ? result.raw || "[]" : "[]";

      if (result.success && Array.isArray(result.data)) {
        damageTypes = result.data;
      } else {
        try {
          damageTypes = JSON.parse(response);
        } catch {
          // If not JSON, treat as comma-separated string
          damageTypes = response.split(",").map((s) => s.trim());
        }
      }

      results.push({
        fileName: file.name,
        damageTypes,
        rawLabel: response,
      });
    }

    return NextResponse.json({ ok: true, results });
  } catch (error) {
    // Sentry captured via wrapper; still return structured error
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
});
