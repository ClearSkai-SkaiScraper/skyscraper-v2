/**
 * JobNimbus Migration Engine
 *
 * Concrete implementation of BaseMigrationEngine for JobNimbus imports.
 * Handles the full migration workflow: contacts → jobs → tasks → files.
 */

import "server-only";

import prisma from "@/lib/prisma";

import { BaseMigrationEngine, MigrationConfig } from "./base-engine";
import { JobNimbusClient } from "./jobnimbus-client";
import { mapActivity, mapContact, mapFile, mapJob, mapTask } from "./jobnimbus-mapper";

// ============================================================================
// JobNimbus Migration Engine
// ============================================================================

export class JobNimbusMigrationEngine extends BaseMigrationEngine {
  private client: JobNimbusClient;

  constructor(config: MigrationConfig) {
    super(config);

    if (!config.credentials.apiKey) {
      throw new Error("[JobNimbus] API key is required");
    }

    this.client = new JobNimbusClient({
      apiKey: config.credentials.apiKey,
    });
  }

  // ============================================================================
  // Abstract Method Implementations
  // ============================================================================

  async testConnection(): Promise<{ ok: boolean; error?: string }> {
    return this.client.testConnection();
  }

  async countRecords(): Promise<number> {
    // For JobNimbus, we need to fetch to count (no separate count endpoint)
    // We'll estimate based on first page
    // In production, you might want to cache this or use parallel requests
    const contacts = await this.client.fetchAllContacts();
    const jobs = await this.client.fetchAllJobs();
    return contacts.length + jobs.length;
  }

  protected async executeMigration(): Promise<void> {
    const { options } = this.config;

    // Phase 1: Import Contacts
    if (!options?.skipContacts) {
      await this.importContacts();
      if (this.isCancelled()) return;
    }

    // Phase 2: Import Jobs
    if (!options?.skipJobs) {
      await this.importJobs();
      if (this.isCancelled()) return;
    }

    // Phase 3: Import Tasks
    if (!options?.skipTasks) {
      await this.importTasks();
      if (this.isCancelled()) return;
    }

    // Phase 4: Import Documents (per job)
    if (!options?.skipDocuments) {
      await this.importDocuments();
      if (this.isCancelled()) return;
    }

    // Update final stats
    await this.updateJob({
      importedRecords:
        this.stats.contactsImported +
        this.stats.jobsImported +
        this.stats.tasksImported +
        this.stats.documentsImported +
        this.stats.notesImported,
      skippedRecords: this.stats.recordsSkipped,
      errorRecords: this.stats.recordsFailed,
      stats: this.stats,
    });
  }

  // ============================================================================
  // Import Phases
  // ============================================================================

  private async importContacts(): Promise<void> {
    this.emitProgress("RUNNING", "Fetching contacts from JobNimbus...", 10);

    const contacts = await this.client.fetchAllContacts();
    const total = contacts.length;

    this.emitProgress("RUNNING", `Importing ${total} contacts...`, 15);

    for (let i = 0; i < contacts.length; i++) {
      if (this.isCancelled()) return;

      const jnContact = contacts[i];
      try {
        const mapped = mapContact(jnContact);

        // Check for existing (upsert logic)
        const existing = await (prisma.leads as any).findFirst({
          where: {
            orgId: this.config.orgId,
            email: mapped.email || undefined,
          },
        });

        if (existing) {
          // Update existing
          await (prisma.leads as any).update({
            where: { id: existing.id },
            data: {
              firstName: mapped.firstName,
              lastName: mapped.lastName,
              phone: mapped.phone,
              addressStreet: mapped.addressLine1,
              addressCity: mapped.addressCity,
              addressState: mapped.addressState,
              addressZip: mapped.addressZip,
            },
          });
          await this.recordItem("CONTACT", mapped.externalId, existing.id);
        } else {
          // Create new
          const lead = await (prisma.leads as any).create({
            data: {
              orgId: this.config.orgId,
              firstName: mapped.firstName,
              lastName: mapped.lastName,
              email: mapped.email,
              phone: mapped.phone,
              addressStreet: mapped.addressLine1,
              addressCity: mapped.addressCity,
              addressState: mapped.addressState,
              addressZip: mapped.addressZip,
              source: "JOBNIMBUS",
            },
          });
          await this.recordItem("CONTACT", mapped.externalId, lead.id);
        }

        this.stats.contactsImported++;
      } catch (error: any) {
        this.recordError("CONTACT", jnContact.jnid, error.message);
      }

      // Emit progress every 10 records
      if (i % 10 === 0) {
        const pct = 15 + Math.round((i / total) * 20);
        this.emitProgress("RUNNING", `Imported ${i + 1}/${total} contacts`, pct);
      }
    }

    this.emitProgress("RUNNING", `Contacts complete: ${this.stats.contactsImported}`, 35);
  }

  private async importJobs(): Promise<void> {
    this.emitProgress("RUNNING", "Fetching jobs from JobNimbus...", 40);

    const jobs = await this.client.fetchAllJobs();
    const total = jobs.length;

    this.emitProgress("RUNNING", `Importing ${total} jobs...`, 45);

    for (let i = 0; i < jobs.length; i++) {
      if (this.isCancelled()) return;

      const jnJob = jobs[i];
      try {
        const mapped = mapJob(jnJob);

        // Look up related lead (from previously imported contacts)
        let leadId: string | null = null;
        if (mapped.relatedContactIds.length > 0) {
          const migrationItem = await prisma.migration_items.findFirst({
            where: {
              migrationId: this.jobId!,
              entityType: "CONTACT",
              externalId: { in: mapped.relatedContactIds },
            },
          });
          leadId = migrationItem?.internalId || null;
        }

        // Create claim
        const claim = await (prisma as any).claims.create({
          data: {
            orgId: this.config.orgId,
            leadId,
            claimNumber: mapped.claimNumber || undefined,
            projectName: mapped.projectName,
            status: mapped.status,
            description: mapped.description,
            addressStreet: mapped.addressLine1,
            addressCity: mapped.addressCity,
            addressState: mapped.addressState,
            addressZip: mapped.addressZip,
            dateOfLoss: mapped.startDate,
          },
        });

        await this.recordItem("JOB", mapped.externalId, claim.id);
        this.stats.jobsImported++;
      } catch (error: any) {
        this.recordError("JOB", jnJob.jnid, error.message);
      }

      if (i % 10 === 0) {
        const pct = 45 + Math.round((i / total) * 20);
        this.emitProgress("RUNNING", `Imported ${i + 1}/${total} jobs`, pct);
      }
    }

    this.emitProgress("RUNNING", `Jobs complete: ${this.stats.jobsImported}`, 65);
  }

  private async importTasks(): Promise<void> {
    this.emitProgress("RUNNING", "Fetching tasks from JobNimbus...", 70);

    const tasks = await this.client.fetchAllTasks();
    const total = tasks.length;

    this.emitProgress("RUNNING", `Importing ${total} tasks...`, 72);

    for (let i = 0; i < tasks.length; i++) {
      if (this.isCancelled()) return;

      const jnTask = tasks[i];
      try {
        const mapped = mapTask(jnTask);

        // Look up related job
        let claimId: string | null = null;
        if (mapped.relatedJobIds.length > 0) {
          const migrationItem = await prisma.migration_items.findFirst({
            where: {
              migrationId: this.jobId!,
              entityType: "JOB",
              externalId: { in: mapped.relatedJobIds },
            },
          });
          claimId = migrationItem?.internalId || null;
        }

        // Create task (using claim_tasks or similar table)
        // For now, we'll store as claim notes with type TASK
        if (claimId) {
          await (prisma as any).claim_timeline_events.create({
            data: {
              claim_id: claimId,
              actor_id: this.config.userId,
              actor_type: "USER",
              type: "TASK",
              description: `${mapped.title}\n\n${mapped.description || ""}`,
              org_id: this.config.orgId,
              occurred_at: new Date(),
              visible_to_client: false,
            },
          });
        }

        await this.recordItem("TASK", mapped.externalId, claimId || "orphan");
        this.stats.tasksImported++;
      } catch (error: any) {
        this.recordError("TASK", jnTask.jnid, error.message);
      }

      if (i % 10 === 0) {
        const pct = 72 + Math.round((i / total) * 10);
        this.emitProgress("RUNNING", `Imported ${i + 1}/${total} tasks`, pct);
      }
    }

    this.emitProgress("RUNNING", `Tasks complete: ${this.stats.tasksImported}`, 82);
  }

  private async importDocuments(): Promise<void> {
    this.emitProgress("RUNNING", "Importing documents...", 85);

    // Get all imported jobs to fetch their documents
    const importedJobs = await prisma.migration_items.findMany({
      where: {
        migrationId: this.jobId!,
        entityType: "JOB",
      },
    });

    let docCount = 0;
    for (const jobItem of importedJobs) {
      if (this.isCancelled()) return;

      try {
        const files = await this.client.fetchFilesForJob(jobItem.externalId);
        const activities = await this.client.fetchActivitiesForJob(jobItem.externalId);

        // Import files
        for (const file of files) {
          const mapped = mapFile(file);

          // Store file reference (actual download would be separate)
          await (prisma as any).documents.create({
            data: {
              claimId: jobItem.internalId,
              filename: mapped.filename,
              originalUrl: mapped.sourceUrl,
              contentType: mapped.contentType,
              source: "JOBNIMBUS",
            },
          });

          await this.recordItem("DOCUMENT", file.jnid, jobItem.internalId || "");
          this.stats.documentsImported++;
          docCount++;
        }

        // Import activities as notes
        for (const activity of activities) {
          const mapped = mapActivity(activity);
          if (!mapped) continue;

          await (prisma as any).claim_timeline_events.create({
            data: {
              claim_id: jobItem.internalId,
              actor_id: this.config.userId,
              actor_type: "USER",
              type: mapped.type,
              description: mapped.content,
              org_id: this.config.orgId,
              occurred_at: new Date(),
              visible_to_client: false,
            },
          });

          await this.recordItem("NOTE", activity.jnid, jobItem.internalId || "");
          this.stats.notesImported++;
        }

        // Rate limit between jobs
        await this.sleep(500);
      } catch (error: any) {
        this.recordError("DOCUMENT", jobItem.externalId, error.message);
      }
    }

    this.emitProgress(
      "RUNNING",
      `Documents complete: ${this.stats.documentsImported}, Notes: ${this.stats.notesImported}`,
      95
    );
  }
}
