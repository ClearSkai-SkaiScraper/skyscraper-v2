/**
 * POST /api/scopes/build
 *
 * AI-powered scope builder. Parses carrier estimates, contractor scopes,
 * and notes into a structured scope with areas and line items.
 * Called from /scopes/new page.
 *
 * Body: { title, sourceType, lossType, dol, address, claim_id?,
 *         carrierEstimateText?, contractorScopeText?, notesText?,
 *         options: { tryMapCodes, flagSupplementCandidates } }
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

import { createId } from "@paralleldrive/cuid2";

import { getOpenAI } from "@/lib/ai/client";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { safeOrgContext } from "@/lib/safeOrgContext";

export async function POST(req: NextRequest) {
  try {
    const ctx = await safeOrgContext();
    if (!ctx.ok || !ctx.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      title,
      sourceType,
      lossType,
      dol,
      address,
      claim_id,
      carrierEstimateText,
      contractorScopeText,
      notesText,
      options = {},
    } = body;

    if (!title || !sourceType) {
      return NextResponse.json(
        { error: "title and sourceType are required" },
        { status: 400 }
      );
    }

    const { tryMapCodes = false, flagSupplementCandidates = false } = options;

    // Combine all source texts
    const sourceTexts: string[] = [];
    if (carrierEstimateText) sourceTexts.push(`CARRIER ESTIMATE:\n${carrierEstimateText}`);
    if (contractorScopeText) sourceTexts.push(`CONTRACTOR SCOPE:\n${contractorScopeText}`);
    if (notesText) sourceTexts.push(`NOTES:\n${notesText}`);

    if (sourceTexts.length === 0) {
      return NextResponse.json(
        { error: "At least one source text is required" },
        { status: 400 }
      );
    }

    const systemPrompt = `You are an expert construction scope parser for storm restoration.
Parse the provided text into structured areas and line items.
${tryMapCodes ? "Map line items to Xactimate codes where possible." : ""}
${flagSupplementCandidates ? "Flag items that are likely supplement candidates (commonly missed by carriers)." : ""}

Output valid JSON with this shape:
{
  "areas": [
    {
      "name": "Area name (e.g., 'Main Roof', 'Gutters', 'Interior - Kitchen')",
      "type": "exterior|interior|misc",
      "trade_hint": "roofing|siding|gutters|interior|general",
      "items": [
        {
          "description": "Line item description",
          "code": "${tryMapCodes ? "Xactimate code or null" : "null"}",
          "trade": "roofing|siding|gutters|interior|painting|general",
          "unit": "SQ|LF|SF|EA|HR",
          "quantity": 0,
          "category": "removal|install|repair|code_upgrade|misc",
          "is_demolition": false,
          "is_install": false,
          "is_repair": false,
          "is_code_required": false,
          "is_supplement_candidate": false
        }
      ]
    }
  ],
  "confidence": 0.0 to 1.0,
  "issues": ["any parsing issues or ambiguities"]
}`;

    const userPrompt = `Parse this scope for a ${lossType || "storm"} loss at ${address || "unknown location"}:

${sourceTexts.join("\n\n---\n\n")}`;

    let parsedScope;
    try {
      const client = getOpenAI();
      const completion = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.2,
        response_format: { type: "json_object" },
      });

      const raw = completion.choices[0]?.message?.content || "{}";
      parsedScope = JSON.parse(raw);
    } catch (aiError) {
      logger.error("[SCOPES_BUILD] AI parsing failed:", aiError);
      // Return a minimal fallback so UI doesn't crash
      parsedScope = {
        areas: [
          {
            name: "General",
            type: "misc",
            trade_hint: "general",
            items: [
              {
                description: "See source text for details",
                code: null,
                trade: "general",
                unit: "EA",
                quantity: 1,
                category: "misc",
                is_demolition: false,
                is_install: false,
                is_repair: false,
                is_code_required: false,
                is_supplement_candidate: false,
              },
            ],
          },
        ],
        confidence: 0.1,
        issues: ["AI parsing unavailable — manual review required"],
      };
    }

    // Save scope to database
    const scopeId = createId();
    const now = new Date();

    await prisma.scopes.create({
      data: {
        id: scopeId,
        org_id: ctx.orgId,
        claim_id: claim_id || null,
        title,
        source_type: sourceType,
        loss_type: lossType || null,
        dol: dol ? new Date(dol) : null,
        confidence: parsedScope.confidence || 0,
        raw_sources: { carrierEstimateText, contractorScopeText, notesText },
        issues: parsedScope.issues || [],
        status: "draft",
        created_at: now,
        updated_at: now,
      },
    });

    // Create areas and items
    const areasWithIds: Array<Record<string, unknown>> = [];
    for (let aIdx = 0; aIdx < (parsedScope.areas || []).length; aIdx++) {
      const area = parsedScope.areas[aIdx];
      const areaId = createId();

      await prisma.scope_areas.create({
        data: {
          id: areaId,
          scope_id: scopeId,
          name: area.name || `Area ${aIdx + 1}`,
          type: area.type || null,
          trade_hint: area.trade_hint || null,
          sort_order: aIdx,
          created_at: now,
          updated_at: now,
        },
      });

      const itemsWithIds: Array<Record<string, unknown>> = [];
      for (let iIdx = 0; iIdx < (area.items || []).length; iIdx++) {
        const item = area.items[iIdx];
        const itemId = createId();

        await prisma.scope_items.create({
          data: {
            id: itemId,
            scope_area_id: areaId,
            code: item.code || null,
            description: item.description || "No description",
            trade: item.trade || null,
            unit: item.unit || null,
            quantity: item.quantity || null,
            category: item.category || null,
            is_demolition: item.is_demolition || false,
            is_install: item.is_install || false,
            is_repair: item.is_repair || false,
            is_code_required: item.is_code_required || false,
            is_supplement_candidate: item.is_supplement_candidate || false,
            included: true,
            sort_order: iIdx,
            created_at: now,
            updated_at: now,
          },
        });

        itemsWithIds.push({ id: itemId, included: true, ...item });
      }

      areasWithIds.push({ id: areaId, ...area, lineItems: itemsWithIds });
    }

    logger.info("[SCOPES_BUILD] Scope built", {
      orgId: ctx.orgId,
      scopeId,
      areas: areasWithIds.length,
      totalItems: areasWithIds.reduce((s, a) => s + (Array.isArray(a.lineItems) ? a.lineItems.length : 0), 0),
    });

    return NextResponse.json({
      success: true,
      scope: {
        id: scopeId,
        title,
        sourceType,
        lossType,
        confidence: parsedScope.confidence,
        issues: parsedScope.issues,
        areas: areasWithIds,
      },
    });
  } catch (error) {
    logger.error("[SCOPES_BUILD] Error:", error);
    return NextResponse.json({ error: "Failed to build scope" }, { status: 500 });
  }
}
