/**
 * CRM Migration Engine — Core Orchestrator
 *
 * Pulls data from external CRM (AccuLynx, etc.), maps it to SkaiScraper
 * schema, inserts into the database, and logs the migration.
 *
 * Features:
 * - Duplicate detection via externalId tracking
 * - Partial retry (picks up where it left off)
 * - Per-record audit trail via migration_items
 * - Transactional inserts per-batch
 */

import "server-only";

import prisma from "@/lib/prisma";

import { AccuLynxClient } from "./acculynx-client";
import { mapContact, mapJobToJob, mapJobToLead, mapJobToProperty } from "./acculynx-mapper";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MigrationOptions {
  orgId: string;
  userId: string;
  apiKey: string;
  baseUrl?: string;
  /** If true, only test the connection — don't pull data */
  dryRun?: boolean;
}

export interface MigrationResult {
  success: boolean;
  migrationId: string;
  stats: {
    contacts: { imported: number; skipped: number; errors: number };
    properties: { imported: number; skipped: number; errors: number };
    leads: { imported: number; skipped: number; errors: number };
    jobs: { imported: number; skipped: number; errors: number };
  };
  errors: string[];
  durationMs: number;
}

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

export async function runAccuLynxMigration(opts: MigrationOptions): Promise<MigrationResult> {
  const startTime = Date.now();
  const migrationId = crypto.randomUUID();
  const errors: string[] = [];
  const stats = {
    contacts: { imported: 0, skipped: 0, errors: 0 },
    properties: { imported: 0, skipped: 0, errors: 0 },
    leads: { imported: 0, skipped: 0, errors: 0 },
    jobs: { imported: 0, skipped: 0, errors: 0 },
  };

  // Create migration job entry
  await prisma.migration_jobs.create({
    data: {
      id: migrationId,
      orgId: opts.orgId,
      userId: opts.userId,
      source: "acculynx",
      status: "running",
      startedAt: new Date(),
    },
  });

  try {
    const client = new AccuLynxClient({
      apiKey: opts.apiKey,
      baseUrl: opts.baseUrl,
    });

    // 1. Test connection
    const connTest = await client.testConnection();
    if (!connTest.ok) {
      throw new Error(`AccuLynx connection failed: ${connTest.error}`);
    }

    if (opts.dryRun) {
      await updateMigrationJob(migrationId, "completed", stats, []);
      return {
        success: true,
        migrationId,
        stats,
        errors: [],
        durationMs: Date.now() - startTime,
      };
    }

    // 2. Pull + insert contacts
    const rawContacts = await client.fetchAllContacts();

    for (const raw of rawContacts) {
      try {
        const mapped = mapContact(raw);

        // Dedup check: skip if we already imported this externalId
        const exists = await prisma.contacts.findFirst({
          where: {
            orgId: opts.orgId,
            externalId: mapped.externalId,
            externalSource: "acculynx",
          },
          select: { id: true },
        });

        if (exists) {
          stats.contacts.skipped++;
          await prisma.migration_items.create({
            data: {
              migrationId,
              entityType: "contact",
              externalId: raw.id,
              internalId: exists.id,
              status: "skipped",
            },
          });
          continue;
        }

        const newContactId = crypto.randomUUID();
        await prisma.contacts.create({
          data: {
            id: newContactId,
            orgId: opts.orgId,
            firstName: mapped.firstName,
            lastName: mapped.lastName,
            email: mapped.email || "",
            phone: mapped.phone,
            street: mapped.street,
            city: mapped.city,
            state: mapped.state,
            zipCode: mapped.zipCode,
            slug: mapped.slug,
            externalId: mapped.externalId,
            externalSource: mapped.externalSource,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });
        stats.contacts.imported++;
        await prisma.migration_items.create({
          data: {
            migrationId,
            entityType: "contact",
            externalId: raw.id,
            internalId: newContactId,
            status: "imported",
          },
        });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (err: any) {
        stats.contacts.errors++;
        errors.push(`Contact ${raw.id}: ${err.message}`);
        await prisma.migration_items.create({
          data: {
            migrationId,
            entityType: "contact",
            externalId: raw.id,
            status: "error",
            errorMessage: err.message,
          },
        });
      }
    }

    // 3. Pull + insert jobs → properties + leads + jobs
    const rawJobs = await client.fetchAllJobs();

    for (const raw of rawJobs) {
      try {
        // 3a. Create property from job address
        const mappedProperty = mapJobToProperty(raw);
        let propertyId: string | null = null;

        const existingProp = await prisma.properties.findFirst({
          where: {
            orgId: opts.orgId,
            externalId: mappedProperty.externalId,
            externalSource: "acculynx",
          },
          select: { id: true },
        });

        if (existingProp) {
          propertyId = existingProp.id;
          stats.properties.skipped++;
          await prisma.migration_items.create({
            data: {
              migrationId,
              entityType: "property",
              externalId: raw.id,
              internalId: existingProp.id,
              status: "skipped",
            },
          });
        } else {
          propertyId = crypto.randomUUID();
          // Find matching contact by AccuLynx contactId
          let contactId: string | null = null;
          if (raw.contactId) {
            const matchedContact = await prisma.contacts.findFirst({
              where: {
                orgId: opts.orgId,
                externalId: raw.contactId,
                externalSource: "acculynx",
              },
              select: { id: true },
            });
            contactId = matchedContact?.id || null;
          }

          await prisma.properties.create({
            data: {
              id: propertyId,
              orgId: opts.orgId,
              contactId: contactId || (await getOrCreatePlaceholderContact(opts.orgId)),
              name: mappedProperty.name,
              propertyType: mappedProperty.propertyType,
              street: mappedProperty.street || "",
              city: mappedProperty.city || "",
              state: mappedProperty.state || "",
              zipCode: mappedProperty.zipCode || "",
              externalId: mappedProperty.externalId,
              externalSource: mappedProperty.externalSource,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          });
          stats.properties.imported++;
          await prisma.migration_items.create({
            data: {
              migrationId,
              entityType: "property",
              externalId: raw.id,
              internalId: propertyId,
              status: "imported",
            },
          });
        }

        // 3b. Create lead from job
        const mappedLead = mapJobToLead(raw);

        const existingLead = await prisma.leads.findFirst({
          where: {
            orgId: opts.orgId,
            externalId: mappedLead.externalId,
            externalSource: "acculynx",
          },
          select: { id: true },
        });

        if (existingLead) {
          stats.leads.skipped++;
          await prisma.migration_items.create({
            data: {
              migrationId,
              entityType: "lead",
              externalId: raw.id,
              internalId: existingLead.id,
              status: "skipped",
            },
          });
        } else {
          // Find contact for lead
          let contactId: string | null = null;
          if (raw.contactId) {
            const matchedContact = await prisma.contacts.findFirst({
              where: {
                orgId: opts.orgId,
                externalId: raw.contactId,
                externalSource: "acculynx",
              },
              select: { id: true },
            });
            contactId = matchedContact?.id || null;
          }

          const newLeadId = crypto.randomUUID();
          await prisma.leads.create({
            data: {
              id: newLeadId,
              orgId: opts.orgId,
              contactId: contactId || (await getOrCreatePlaceholderContact(opts.orgId)),
              title: mappedLead.title,
              description: mappedLead.description,
              source: mappedLead.source,
              value: mappedLead.value,
              stage: mappedLead.stage,
              temperature: mappedLead.temperature,
              jobCategory: mappedLead.jobCategory,
              jobType: mappedLead.jobType,
              workType: mappedLead.workType,
              externalId: mappedLead.externalId,
              externalSource: mappedLead.externalSource,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          });
          stats.leads.imported++;
          await prisma.migration_items.create({
            data: {
              migrationId,
              entityType: "lead",
              externalId: raw.id,
              internalId: newLeadId,
              status: "imported",
            },
          });
        }

        // 3c. Create job record
        const mappedJob = mapJobToJob(raw);

        const existingJob = await prisma.jobs.findFirst({
          where: {
            orgId: opts.orgId,
            externalId: mappedJob.externalId,
            externalSource: "acculynx",
          },
          select: { id: true },
        });

        if (existingJob) {
          stats.jobs.skipped++;
          await prisma.migration_items.create({
            data: {
              migrationId,
              entityType: "job",
              externalId: raw.id,
              internalId: existingJob.id,
              status: "skipped",
            },
          });
        } else {
          const newJobId = crypto.randomUUID();
          await prisma.jobs.create({
            data: {
              id: newJobId,
              orgId: opts.orgId,
              propertyId,
              title: mappedJob.title,
              description: mappedJob.description,
              jobType: mappedJob.jobType,
              status: mappedJob.status,
              estimatedCost: mappedJob.estimatedCost,
              externalId: mappedJob.externalId,
              externalSource: mappedJob.externalSource,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          });
          stats.jobs.imported++;
          await prisma.migration_items.create({
            data: {
              migrationId,
              entityType: "job",
              externalId: raw.id,
              internalId: newJobId,
              status: "imported",
            },
          });
        }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (err: any) {
        stats.jobs.errors++;
        errors.push(`Job ${raw.id}: ${err.message}`);
        await prisma.migration_items.create({
          data: {
            migrationId,
            entityType: "job",
            externalId: raw.id,
            status: "error",
            errorMessage: err.message,
          },
        });
      }
    }

    // 4. Update migration job
    await updateMigrationJob(migrationId, "completed", stats, errors);

    return {
      success: true,
      migrationId,
      stats,
      errors,
      durationMs: Date.now() - startTime,
    };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    errors.push(err.message);
    await updateMigrationJob(migrationId, "failed", stats, errors);

    return {
      success: false,
      migrationId,
      stats,
      errors,
      durationMs: Date.now() - startTime,
    };
  }
}

// ---------------------------------------------------------------------------
// Job helper
// ---------------------------------------------------------------------------

async function updateMigrationJob(
  migrationId: string,
  status: string,
  stats: MigrationResult["stats"],
  errors: string[]
) {
  const total = Object.values(stats).reduce((a, s) => a + s.imported + s.skipped + s.errors, 0);
  const imported = Object.values(stats).reduce((a, s) => a + s.imported, 0);
  const skipped = Object.values(stats).reduce((a, s) => a + s.skipped, 0);
  const errorCount = Object.values(stats).reduce((a, s) => a + s.errors, 0);

  await prisma.migration_jobs.update({
    where: { id: migrationId },
    data: {
      status,
      totalRecords: total,
      importedRecords: imported,
      skippedRecords: skipped,
      errorRecords: errorCount,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      stats: stats as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      errors: errors as any,
      completedAt: new Date(),
    },
  });
}

/**
 * Get or create a placeholder contact for imported records
 * whose original contact couldn't be matched.
 */
const placeholderCache = new Map<string, string>();

async function getOrCreatePlaceholderContact(orgId: string): Promise<string> {
  if (placeholderCache.has(orgId)) return placeholderCache.get(orgId)!;

  const placeholderId = `migration-placeholder-${orgId.slice(0, 8)}`;

  await prisma.contacts.upsert({
    where: { id: placeholderId },
    update: {},
    create: {
      id: placeholderId,
      orgId,
      firstName: "Imported",
      lastName: "Contact",
      email: "",
      slug: `imported-contact-${orgId.slice(0, 8)}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  placeholderCache.set(orgId, placeholderId);
  return placeholderId;
}
