/**
 * POST /api/claims/parse-scope
 *
 * Accepts a Scope of Work document (PDF or image) and uses GPT-4o
 * to extract structured claim data: loss type, property address,
 * contact info, policy info, damage description, line items, etc.
 */

import { NextResponse } from "next/server";
import type OpenAI from "openai";

import { getOpenAI } from "@/lib/ai/client";
import { requireAuth } from "@/lib/auth/requireAuth";
import { logger } from "@/lib/observability/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SYSTEM_PROMPT = `You are a construction insurance scope-of-work parser for a claims management platform.
Given a Scope of Work document (photo or text), extract ALL available information into structured JSON.

Return a JSON object with these fields (all optional — omit any you can't determine):
{
  "lossType": "FIRE" | "WATER" | "WIND_HAIL" | "STORM" | "SMOKE" | "MOLD" | "BIOHAZARD" | "OTHER",
  "tradeType": "ROOFING" | "PLUMBING" | "RESTORATION" | "MOLD_REMEDIATION" | "FIRE_RESTORATION" | "GENERAL_CONTRACTOR" | "ELECTRICAL" | "HVAC" | "WATER_MITIGATION" | "BIOHAZARD_CLEANUP" | "OTHER",
  "contactName": "Full name of the insured / homeowner",
  "contactPhone": "Phone number if found",
  "contactEmail": "Email if found",
  "carrier": "Insurance carrier name",
  "policyNumber": "Policy number",
  "deductible": "Deductible amount (number only, no $)",
  "agentName": "Adjuster or agent name",
  "propertyAddress": "Full street address of the property",
  "structureType": "SINGLE_FAMILY" | "DUPLEX" | "MULTI_FAMILY" | "COMMERCIAL" | "MOBILE_HOME" | "OTHER",
  "stories": "Number of stories (string)",
  "roofType": "SHINGLE" | "TILE" | "METAL" | "TPO" | "FOAM" | "MODBIT" | "OTHER",
  "squareFootage": "Total affected square footage (string)",
  "dateOfLoss": "YYYY-MM-DD format if found",
  "claimNumber": "Existing claim/reference number from the scope",
  "totalEstimate": "Total estimated cost from the scope (number)",
  "lineItems": [
    { "description": "Line item description", "quantity": 1, "unit": "SQ/LF/EA", "unitPrice": 0.00, "total": 0.00 }
  ],
  "summary": "Brief 1-2 sentence summary of the scope of work"
}

RULES:
- Extract everything you can confidently identify
- For line items, include as many as you can find
- For lossType/tradeType, infer from the work described if not explicitly stated
- Return ONLY valid JSON, no markdown code fences
- If the document is unreadable or not a scope of work, return: {"error": "Could not parse this document as a scope of work"}`;

export async function POST(req: Request) {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;
    const { orgId, userId } = auth;

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "image/heic",
    ];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Unsupported file type. Please upload a PDF or image." },
        { status: 400 }
      );
    }

    // Validate file size (20MB max)
    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large. Max 20MB." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = buffer.toString("base64");
    const isPdf = file.type === "application/pdf";

    // Build message content based on file type
    let userContent: OpenAI.Chat.Completions.ChatCompletionContentPart[];

    if (isPdf) {
      // Extract text from PDF — GPT-4o vision rejects application/pdf MIME type
      let pdfText = "";
      try {
        // Lazy load pdf-parse at runtime only
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const pdfParse = require("pdf-parse");
        const pdfData = await pdfParse(buffer);
        pdfText = pdfData.text;
      } catch (pdfErr) {
        logger.error("[parse-scope] PDF text extraction failed:", pdfErr);
        return NextResponse.json(
          { error: "Failed to read PDF. Please try uploading an image instead." },
          { status: 422 }
        );
      }

      if (!pdfText || pdfText.trim().length < 20) {
        return NextResponse.json(
          {
            error:
              "PDF appears to be scanned/image-only with no extractable text. Please upload a photo of the document instead.",
          },
          { status: 422 }
        );
      }

      userContent = [
        {
          type: "text",
          text: `Parse this Scope of Work document and extract all claim information as JSON. File name: ${file.name}\n\n--- DOCUMENT TEXT ---\n${pdfText}`,
        },
      ];
    } else {
      // Image files — send as data URI to GPT-4o vision
      const dataUri = `data:${file.type};base64,${base64}`;
      userContent = [
        {
          type: "text",
          text: `Parse this Scope of Work document and extract all claim information as JSON. File name: ${file.name}`,
        },
        {
          type: "image_url",
          image_url: {
            url: dataUri,
            detail: "high",
          },
        },
      ];
    }

    // Lazy load OpenAI client at runtime only
    const openai = getOpenAI();
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: userContent,
        },
      ],
      max_tokens: 4096,
      temperature: 0.1,
    });

    const raw = response.choices[0]?.message?.content || "";

    // Parse JSON from response (handle potential markdown wrapping)
    let parsed: Record<string, unknown>;
    try {
      const jsonStr = raw
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      parsed = JSON.parse(jsonStr);
    } catch {
      logger.error(`[parse-scope] Failed to parse AI response: ${String(raw).substring(0, 200)}`);
      return NextResponse.json(
        { error: "AI could not extract structured data from this document." },
        { status: 422 }
      );
    }

    if (parsed.error) {
      return NextResponse.json({ error: parsed.error as string }, { status: 422 });
    }

    return NextResponse.json({ success: true, data: parsed });
  } catch (error) {
    logger.error("[parse-scope] Error:", error);
    return NextResponse.json(
      { error: "Failed to parse scope of work" },
      { status: 500 }
    );
  }
}
