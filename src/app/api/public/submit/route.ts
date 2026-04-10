export const dynamic = "force-dynamic";
/**
 * PHASE 5 — PUBLIC INTAKE → CRM + AI WIRING
 * POST /api/public/submit — Public job requests → Full CRM pipeline
 *
 * NO AUTHENTICATION REQUIRED - Public endpoint
 *
 * Now creates:
 * - CustomerAccount
 * - CustomerProperty (if address provided)
 * - PublicLead
 * - CRM Lead
 * - Queues AI intake job
 */

import { NextRequest, NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import { handlePublicSubmit } from "@/lib/trades/public-intake";

export async function POST(req: NextRequest) {
  try {
    // Rate limit by IP — public endpoint, prevent abuse
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const rateLimitKey = `public-submit:${ip}`;

    // Simple in-memory rate limit (5 submissions per minute per IP)
    // For production, this is backed by the Upstash rate limiter if available
    const { Ratelimit } = await import("@upstash/ratelimit");
    const { upstash } = await import("@/lib/upstash");
    if (upstash) {
      const limiter = new Ratelimit({
        redis: upstash,
        limiter: Ratelimit.slidingWindow(5, "1 m"),
      });
      const { success } = await limiter.limit(rateLimitKey);
      if (!success) {
        return NextResponse.json(
          { error: "Too many submissions. Please try again in a minute." },
          { status: 429 }
        );
      }
    }

    const body = await req.json();

    const {
      contractorSlug,
      contractorId, // Legacy support
      name,
      email,
      phone,
      address,
      details,
      photos,
      trade,
    } = body as {
      contractorSlug?: string;
      contractorId?: string;
      name: string;
      email?: string;
      phone?: string;
      address?: string;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      details?: Record<string, any>;
      photos?: string[];
      trade?: string;
    };

    // Support both slug and ID for backwards compatibility
    const slug = contractorSlug || contractorId;

    if (!slug || !name) {
      return NextResponse.json({ error: "contractorSlug and name are required" }, { status: 400 });
    }

    // 🔥 Phase 5: Wire into full CRM pipeline
    const result = await handlePublicSubmit({
      contractorSlug: slug,
      name,
      email,
      phone,
      address,
      details,
      photos,
      trade,
    });

    // Handle disabled feature gracefully
    const publicLead = result.publicLead as { id: string } | null;
    const crmLead = result.crmLead as { id: string } | null;
    const customer = result.customer as { id: string } | null;
    const property = result.property as { id: string } | null;

    return NextResponse.json(
      {
        success: true,
        publicLeadId: publicLead?.id ?? null,
        leadId: crmLead?.id ?? null,
        customerId: customer?.id ?? null,
        property_id: property?.id ?? null,
        message: "Thank you! Your request has been submitted.",
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error("[POST /api/public/submit] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
