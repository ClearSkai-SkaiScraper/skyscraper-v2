/**
 * Migration Preflight API
 * POST /api/migrations/[source]/preflight
 *
 * Validates credentials and returns a preview of what will be imported.
 * This is the first step in the enterprise migration wizard:
 * 1. Preflight (validate + preview) ← THIS
 * 2. Dry-run (simulate import)
 * 3. Execute (actual import)
 * 4. Report (summary)
 */

import { NextRequest, NextResponse } from "next/server";

import { withAuth } from "@/lib/auth/withAuth";
import { logger } from "@/lib/logger";
import { AccuLynxClient } from "@/lib/migrations/acculynx-client";
import type { MigrationSource } from "@/lib/migrations/base-engine";
import { JobNimbusClient } from "@/lib/migrations/jobnimbus-client";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Supported sources
const SUPPORTED_SOURCES: MigrationSource[] = ["JOBNIMBUS", "ACCULYNX"];

interface PreflightResult {
  success: boolean;
  source: MigrationSource;
  connectionValid: boolean;
  connectionError?: string;
  preview: {
    contacts: { total: number; sample: Record<string, unknown>[] };
    jobs: { total: number; sample: Record<string, unknown>[] };
    documents: { total: number };
    tasks?: { total: number };
  };
  duplicates: {
    emailMatches: number;
    addressMatches: number;
    phoneMatches: number;
  };
  estimatedDuration: string;
  warnings: string[];
}

export const POST = withAuth(async (request: NextRequest, { orgId }) => {
  const url = new URL(request.url);
  const pathParts = url.pathname.split("/");
  const source = pathParts[pathParts.indexOf("migrations") + 1];
  const upperSource = source.toUpperCase() as MigrationSource;

  // Validate source
  if (!SUPPORTED_SOURCES.includes(upperSource)) {
    return NextResponse.json({ error: `Unsupported migration source: ${source}` }, { status: 400 });
  }

  // Parse body
  let body: { apiKey?: string; accessToken?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.apiKey && !body.accessToken) {
    return NextResponse.json({ error: "API key or access token is required" }, { status: 400 });
  }

  try {
    const result = await runPreflight(upperSource, orgId, body);
    return NextResponse.json(result);
  } catch (error) {
    logger.error(`[Migration Preflight] ${upperSource} error:`, error);
    return NextResponse.json({ error: "Preflight check failed" }, { status: 500 });
  }
});

async function runPreflight(
  source: MigrationSource,
  orgId: string,
  credentials: { apiKey?: string; accessToken?: string }
): Promise<PreflightResult> {
  const warnings: string[] = [];
  let preview = {
    contacts: { total: 0, sample: [] as Record<string, unknown>[] },
    jobs: { total: 0, sample: [] as Record<string, unknown>[] },
    documents: { total: 0 },
    tasks: { total: 0 },
  };
  let connectionValid = false;
  let connectionError: string | undefined;

  // Test connection and fetch counts
  if (source === "JOBNIMBUS") {
    const client = new JobNimbusClient({
      apiKey: credentials.apiKey || credentials.accessToken || "",
    });

    try {
      // Test connection by fetching first page of contacts
      const contactsResult = await client.getContacts(1, 5);
      connectionValid = true;
      preview.contacts.total = contactsResult.totalCount;
      preview.contacts.sample = contactsResult.data.slice(0, 3).map((c) => ({
        name: `${c.first_name || ""} ${c.last_name || ""}`.trim() || "Unknown",
        email: c.email,
        phone: c.mobile_phone || c.home_phone || c.work_phone,
      }));

      // Fetch jobs count
      const jobsResult = await client.getJobs(1, 5);
      preview.jobs.total = jobsResult.totalCount;
      preview.jobs.sample = jobsResult.data.slice(0, 3).map((j) => ({
        name: j.name,
        status: j.status_name,
        createdDate: j.date_created,
      }));

      // Estimate documents (typically 2-5 per job)
      preview.documents.total = Math.round(preview.jobs.total * 2.5);
    } catch (err) {
      connectionValid = false;
      connectionError = err.message;
    }
  } else if (source === "ACCULYNX") {
    const client = new AccuLynxClient({
      apiKey: credentials.apiKey || "",
    });

    try {
      const contactsResult = await client.getContacts(1, 5);
      connectionValid = true;
      preview.contacts.total = contactsResult.totalCount;
      preview.contacts.sample = contactsResult.data.slice(0, 3).map((c) => ({
        name: `${c.firstName} ${c.lastName}`,
        email: c.email,
        phone: c.phone,
      }));

      const jobsResult = await client.getJobs(1, 5);
      preview.jobs.total = jobsResult.totalCount;
      preview.jobs.sample = jobsResult.data.slice(0, 3).map((j) => ({
        name: j.name,
        status: j.status,
        createdDate: j.createdDate,
      }));

      preview.documents.total = Math.round(preview.jobs.total * 3);
    } catch (err) {
      connectionValid = false;
      connectionError = err.message;
    }
  }

  // Check for potential duplicates in our system
  const duplicates = await checkForDuplicates(orgId, preview.contacts.sample);

  // Generate warnings
  if (preview.contacts.total > 10000) {
    warnings.push(
      "Large dataset detected. Migration may take 30+ minutes. Consider importing in batches."
    );
  }

  if (duplicates.emailMatches > 0) {
    warnings.push(
      `Found ${duplicates.emailMatches} contacts with matching emails already in your account. These will be updated, not duplicated.`
    );
  }

  if (preview.documents.total > 5000) {
    warnings.push(
      "Large number of documents. Document import may be slow depending on file sizes."
    );
  }

  // Estimate duration (rough: 100 records/minute for contacts, 50/minute for jobs with documents)
  const estimatedMinutes = Math.ceil(preview.contacts.total / 100 + preview.jobs.total / 50);
  const estimatedDuration =
    estimatedMinutes < 60
      ? `${estimatedMinutes} minutes`
      : `${Math.ceil(estimatedMinutes / 60)} hours`;

  return {
    success: connectionValid,
    source,
    connectionValid,
    connectionError,
    preview,
    duplicates,
    estimatedDuration,
    warnings,
  };
}

async function checkForDuplicates(
  orgId: string,
  sampleContacts: Array<{ email?: string | null; phone?: string | null }>
): Promise<{ emailMatches: number; addressMatches: number; phoneMatches: number }> {
  const emails = sampleContacts.map((c) => c.email).filter((e): e is string => !!e);
  const phones = sampleContacts.map((c) => c.phone).filter((p): p is string => !!p);

  let emailMatches = 0;
  let phoneMatches = 0;

  if (emails.length > 0) {
    const existingByEmail = await prisma.contacts.count({
      where: {
        orgId,
        email: { in: emails },
      },
    });
    // Extrapolate from sample
    emailMatches = Math.round((existingByEmail / emails.length) * sampleContacts.length * 10);
  }

  if (phones.length > 0) {
    const existingByPhone = await prisma.contacts.count({
      where: {
        orgId,
        phone: { in: phones },
      },
    });
    phoneMatches = Math.round((existingByPhone / phones.length) * sampleContacts.length * 10);
  }

  return {
    emailMatches,
    addressMatches: 0, // Would need address parsing to check
    phoneMatches,
  };
}
