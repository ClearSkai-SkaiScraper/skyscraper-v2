export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { apiError, apiOk } from "@/lib/apiError";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { createLead } from "@/lib/services/leadsService";

// ---------------------------------------------------------------------------
// POST /api/v1/leads/ingest — Public lead ingestion webhook
// Auth: x-api-key header validated against api_keys table (hashed with SHA-256)
// ---------------------------------------------------------------------------

const IngestSchema = z.object({
  firstName: z.string().min(1, "firstName required"),
  lastName: z.string().min(1, "lastName required"),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  company: z.string().optional().nullable(),
  street: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  zipCode: z.string().optional().nullable(),
  source: z.string().default("api"),
  title: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  jobType: z.string().optional().nullable(),
  workType: z.string().optional().nullable(),
  urgency: z.enum(["low", "medium", "high", "critical"]).optional().nullable(),
  budget: z.number().optional().nullable(),
  externalId: z.string().optional().nullable(),
  externalSource: z.string().optional().nullable(),
});

async function hashKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function resolveApiKey(req: NextRequest) {
  const raw = req.headers.get("x-api-key");
  if (!raw) return null;

  const keyHash = await hashKey(raw);
  const apiKey = await prisma.api_keys.findUnique({ where: { key_hash: keyHash } });
  if (!apiKey) return null;
  if (apiKey.revoked_at) return null;
  if (apiKey.expires_at && apiKey.expires_at < new Date()) return null;

  // Touch last_used_at
  await prisma.api_keys
    .update({
      where: { id: apiKey.id },
      data: { last_used_at: new Date(), updated_at: new Date() },
    })
    .catch((e) => {
      // Non-blocking — log but don't fail auth
      logger.warn(`[LEADS_INGEST] API key last_used_at touch failed: ${e?.message}`);
    });

  return apiKey;
}

export async function POST(req: NextRequest) {
  try {
    // 1. Auth via API key
    const apiKey = await resolveApiKey(req);
    if (!apiKey) {
      return apiError(401, "UNAUTHORIZED", "Invalid or missing API key. Provide x-api-key header.");
    }

    // 2. Parse & validate body
    const body = await req.json().catch(() => null);
    if (!body) {
      return apiError(400, "INVALID_BODY", "Request body must be valid JSON.");
    }
    const parsed = IngestSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(400, "VALIDATION_ERROR", "Validation failed", parsed.error.errors);
    }
    const data = parsed.data;
    const orgId = apiKey.org_id;

    // 3. Upsert contact by email or phone (deduplicate)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let contact: any = null;
    if (data.email) {
      contact = await prisma.contacts.findFirst({
        where: { orgId, email: data.email },
      });
    }
    if (!contact && data.phone) {
      contact = await prisma.contacts.findFirst({
        where: { orgId, phone: data.phone },
      });
    }
    if (!contact) {
      contact = await prisma.contacts.create({
        data: {
          id: crypto.randomUUID(),
          orgId,
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email ?? null,
          phone: data.phone ?? null,
          company: data.company ?? null,
          street: data.street ?? null,
          city: data.city ?? null,
          state: data.state ?? null,
          zipCode: data.zipCode ?? null,
          source: data.source,
          notes: data.notes ?? null,
          updatedAt: new Date(),
          externalId: data.externalId ?? null,
          externalSource: data.externalSource ?? null,
        },
      });
    }

    // 4. Create lead
    const lead = await createLead({
      orgId,
      title: data.title || `${data.firstName} ${data.lastName} — ${data.source}`,
      description: data.description ?? null,
      source: data.source,
      contactId: contact.id,
      stage: "new",
      temperature: data.urgency === "critical" ? "hot" : data.urgency === "high" ? "hot" : "warm",
      jobType: data.jobType ?? null,
      workType: data.workType ?? null,
      urgency: data.urgency ?? null,
      budget: data.budget ?? null,
    });

    return apiOk({ lead, contactId: contact.id }, { status: 201 });
  } catch (err) {
    logger.error("[lead-ingest]", err);
    return apiError(500, "INTERNAL_ERROR", err.message || "Lead ingestion failed");
  }
}

// GET — health check for the v1 leads endpoint
export async function GET() {
  return NextResponse.json({ ok: true, endpoint: "/api/v1/leads/ingest", version: "1.0" });
}
