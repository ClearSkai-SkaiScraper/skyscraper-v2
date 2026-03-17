/**
 * Migration Dry-Run API
 * POST /api/migrations/[source]/dry-run
 *
 * Simulates the full migration without actually writing data.
 * Returns what WOULD be imported, including:
 * - Record counts by type
 * - Duplicate detection results
 * - Validation errors
 * - Field mapping preview
 */

import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { logger } from "@/lib/logger";
import { AccuLynxClient } from "@/lib/migrations/acculynx-client";
import type { MigrationSource } from "@/lib/migrations/base-engine";
import { JobNimbusClient } from "@/lib/migrations/jobnimbus-client";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60; // Allow up to 60s for large datasets

const SUPPORTED_SOURCES: MigrationSource[] = ["JOBNIMBUS", "ACCULYNX"];

const RequestSchema = z.object({
  apiKey: z.string().optional(),
  accessToken: z.string().optional(),
  options: z
    .object({
      skipContacts: z.boolean().optional(),
      skipJobs: z.boolean().optional(),
      skipDocuments: z.boolean().optional(),
      dateFilter: z
        .object({
          after: z.string().optional(),
          before: z.string().optional(),
        })
        .optional(),
      sampleSize: z.number().min(10).max(500).optional(),
    })
    .optional(),
});

interface DryRunResult {
  success: boolean;
  source: MigrationSource;
  summary: {
    totalRecords: number;
    contactsToImport: number;
    jobsToImport: number;
    documentsToImport: number;
    duplicatesFound: number;
    validationErrors: number;
  };
  duplicates: DuplicateMatch[];
  validationErrors: ValidationError[];
  sampleMappings: SampleMapping[];
  estimatedDuration: string;
  recommendations: string[];
}

interface DuplicateMatch {
  type: "contact" | "job";
  externalId: string;
  externalName: string;
  matchedInternalId: string;
  matchedInternalName: string;
  matchType: "email" | "phone" | "address" | "name";
  action: "update" | "skip";
}

interface ValidationError {
  type: "contact" | "job";
  externalId: string;
  field: string;
  error: string;
  value: any;
}

interface SampleMapping {
  type: "contact" | "job";
  external: Record<string, any>;
  internal: Record<string, any>;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ source: string }> }
) {
  const { source } = await params;
  const upperSource = source.toUpperCase() as MigrationSource;

  if (!SUPPORTED_SOURCES.includes(upperSource)) {
    return NextResponse.json({ error: `Unsupported migration source: ${source}` }, { status: 400 });
  }

  const { userId, orgId } = await auth();
  if (!userId || !orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { apiKey, accessToken, options } = parsed.data;
  if (!apiKey && !accessToken) {
    return NextResponse.json({ error: "API key or access token required" }, { status: 400 });
  }

  try {
    const result = await runDryRun(upperSource, orgId, apiKey || accessToken || "", options);
    return NextResponse.json(result);
  } catch (error) {
    logger.error(`[Migration Dry-Run] ${upperSource} error:`, error);
    return NextResponse.json({ error: "Dry run failed" }, { status: 500 });
  }
}

async function runDryRun(
  source: MigrationSource,
  orgId: string,
  apiKey: string,
  options?: {
    skipContacts?: boolean;
    skipJobs?: boolean;
    skipDocuments?: boolean;
    sampleSize?: number;
  }
): Promise<DryRunResult> {
  const sampleSize = options?.sampleSize || 100;
  const duplicates: DuplicateMatch[] = [];
  const validationErrors: ValidationError[] = [];
  const sampleMappings: SampleMapping[] = [];
  const recommendations: string[] = [];

  let totalContacts = 0;
  let totalJobs = 0;
  let totalDocuments = 0;
  let contactsData: any[] = [];
  let jobsData: any[] = [];

  // Fetch sample data based on source
  if (source === "JOBNIMBUS") {
    const client = new JobNimbusClient({ apiKey });

    if (!options?.skipContacts) {
      const contactsResult = await client.getContacts(1, sampleSize);
      totalContacts = contactsResult.totalCount;
      contactsData = contactsResult.data;
    }

    if (!options?.skipJobs) {
      const jobsResult = await client.getJobs(1, sampleSize);
      totalJobs = jobsResult.totalCount;
      jobsData = jobsResult.data;
      totalDocuments = totalJobs * 2; // Estimate
    }
  } else if (source === "ACCULYNX") {
    const client = new AccuLynxClient({ apiKey });

    if (!options?.skipContacts) {
      const contactsResult = await client.getContacts(1, sampleSize);
      totalContacts = contactsResult.totalCount;
      contactsData = contactsResult.data;
    }

    if (!options?.skipJobs) {
      const jobsResult = await client.getJobs(1, sampleSize);
      totalJobs = jobsResult.totalCount;
      jobsData = jobsResult.data;
      totalDocuments = totalJobs * 3; // Estimate
    }
  }

  // Check for duplicates
  for (const contact of contactsData.slice(0, 50)) {
    const email = source === "JOBNIMBUS" ? contact.email : contact.email;
    const phone = source === "JOBNIMBUS" ? contact.phone : contact.phone;
    const name =
      source === "JOBNIMBUS"
        ? `${contact.first_name || ""} ${contact.last_name || ""}`.trim()
        : `${contact.firstName || ""} ${contact.lastName || ""}`.trim();

    // Check email match
    if (email) {
      const existing = await prisma.contacts.findFirst({
        where: { orgId, email },
        select: { id: true, firstName: true, lastName: true },
      });

      if (existing) {
        duplicates.push({
          type: "contact",
          externalId: contact.id || contact.jnid,
          externalName: name,
          matchedInternalId: existing.id,
          matchedInternalName: `${existing.firstName} ${existing.lastName}`.trim() || "Unknown",
          matchType: "email",
          action: "update",
        });
      }
    }

    // Check phone match
    if (phone && !duplicates.find((d) => d.externalId === (contact.id || contact.jnid))) {
      const normalizedPhone = phone.replace(/\D/g, "");
      if (normalizedPhone.length >= 10) {
        const existing = await prisma.contacts.findFirst({
          where: {
            orgId,
            phone: { contains: normalizedPhone.slice(-10) },
          },
          select: { id: true, firstName: true, lastName: true },
        });

        if (existing) {
          duplicates.push({
            type: "contact",
            externalId: contact.id || contact.jnid,
            externalName: name,
            matchedInternalId: existing.id,
            matchedInternalName: `${existing.firstName} ${existing.lastName}`.trim() || "Unknown",
            matchType: "phone",
            action: "update",
          });
        }
      }
    }

    // Validate required fields
    if (!name || name === "Unknown" || name.length < 2) {
      validationErrors.push({
        type: "contact",
        externalId: contact.id || contact.jnid,
        field: "name",
        error: "Missing or invalid contact name",
        value: name,
      });
    }

    // Create sample mapping
    if (sampleMappings.length < 5) {
      sampleMappings.push({
        type: "contact",
        external: {
          id: contact.id || contact.jnid,
          name,
          email,
          phone,
        },
        internal: {
          id: "(will be generated)",
          org_id: orgId,
          name: name || "Unknown Contact",
          email: email || null,
          phone: phone || null,
          source: source,
          external_id: contact.id || contact.jnid,
        },
      });
    }
  }

  // Check jobs for duplicates by address
  for (const job of jobsData.slice(0, 30)) {
    const address =
      source === "JOBNIMBUS" ? job.address?.line1 || job.address : job.address?.street;
    const jobName = job.name || job.title || "Untitled Job";

    if (address && typeof address === "string" && address.length > 5) {
      const existing = await prisma.crm_jobs.findFirst({
        where: {
          org_id: orgId,
          property_address: { contains: address.substring(0, 20) },
        },
        select: { id: true, property_address: true },
      });

      if (existing) {
        duplicates.push({
          type: "job",
          externalId: job.id || job.jnid,
          externalName: jobName,
          matchedInternalId: existing.id,
          matchedInternalName: existing.property_address || "Unknown",
          matchType: "address",
          action: "skip",
        });
      }
    }

    // Create job sample mapping
    if (sampleMappings.filter((m) => m.type === "job").length < 3) {
      sampleMappings.push({
        type: "job",
        external: {
          id: job.id || job.jnid,
          name: jobName,
          status: job.status,
          address,
        },
        internal: {
          id: "(will be generated)",
          org_id: orgId,
          name: jobName,
          property_address: address || null,
          status: mapJobStatus(job.status),
          external_id: job.id || job.jnid,
        },
      });
    }
  }

  // Generate recommendations
  const duplicatePercent = Math.round(
    (duplicates.length / Math.max(contactsData.length + jobsData.length, 1)) * 100
  );

  if (duplicatePercent > 20) {
    recommendations.push(
      `High duplicate rate (${duplicatePercent}%). Consider cleaning up existing data first or using "update" mode.`
    );
  }

  if (totalContacts > 5000) {
    recommendations.push("Large contact list. Consider importing in batches by date range.");
  }

  if (validationErrors.length > 10) {
    recommendations.push(
      `${validationErrors.length} records have validation issues. Review before importing.`
    );
  }

  if (totalDocuments > 1000) {
    recommendations.push("Many documents to import. Document migration may take significant time.");
  }

  // Estimate duration
  const estimatedMinutes = Math.ceil(totalContacts / 100 + totalJobs / 50);
  const estimatedDuration =
    estimatedMinutes < 60
      ? `${estimatedMinutes} minutes`
      : `${Math.ceil(estimatedMinutes / 60)} hours`;

  return {
    success: true,
    source,
    summary: {
      totalRecords: totalContacts + totalJobs,
      contactsToImport: totalContacts - duplicates.filter((d) => d.type === "contact").length,
      jobsToImport: totalJobs - duplicates.filter((d) => d.type === "job").length,
      documentsToImport: options?.skipDocuments ? 0 : totalDocuments,
      duplicatesFound: duplicates.length,
      validationErrors: validationErrors.length,
    },
    duplicates: duplicates.slice(0, 20), // Limit to 20 for response size
    validationErrors: validationErrors.slice(0, 20),
    sampleMappings,
    estimatedDuration,
    recommendations,
  };
}

function mapJobStatus(externalStatus: string): string {
  const statusMap: Record<string, string> = {
    lead: "NEW",
    new: "NEW",
    open: "IN_PROGRESS",
    "in progress": "IN_PROGRESS",
    working: "IN_PROGRESS",
    pending: "PENDING",
    closed: "COMPLETED",
    won: "COMPLETED",
    completed: "COMPLETED",
    lost: "CANCELLED",
    cancelled: "CANCELLED",
  };

  return statusMap[(externalStatus || "").toLowerCase()] || "NEW";
}
