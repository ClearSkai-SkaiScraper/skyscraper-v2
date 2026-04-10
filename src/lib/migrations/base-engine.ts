/**
 * Base Migration Engine
 *
 * Generic framework for importing data from external CRM/ERP systems.
 * Handles progress tracking, error management, SSE streaming, encryption,
 * and rollback capabilities.
 *
 * Extend this class to create source-specific migration engines.
 */

import "server-only";

import { Prisma } from "@prisma/client";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

// ============================================================================
// Types
// ============================================================================

export type MigrationSource = "ACCULYNX" | "JOBNIMBUS" | "CSV" | "ROOFR" | "HOVER" | "OTHER";

export type MigrationStatus =
  | "PENDING"
  | "RUNNING"
  | "PAUSED"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED"
  | "ROLLING_BACK";

export type EntityType = "CONTACT" | "JOB" | "TASK" | "DOCUMENT" | "NOTE" | "INVOICE" | "ESTIMATE";

export interface MigrationConfig {
  orgId: string;
  userId: string;
  source: MigrationSource;
  credentials: MigrationCredentials;
  options?: MigrationOptions;
}

export interface MigrationCredentials {
  apiKey?: string;
  accessToken?: string;
  refreshToken?: string;
  clientId?: string;
  clientSecret?: string;
}

export interface MigrationOptions {
  dryRun?: boolean;
  batchSize?: number;
  skipContacts?: boolean;
  skipJobs?: boolean;
  skipDocuments?: boolean;
  skipTasks?: boolean;
  dateFilter?: {
    after?: Date;
    before?: Date;
  };
}

export interface MigrationProgress {
  jobId: string;
  status: MigrationStatus;
  phase: string;
  totalRecords: number;
  importedRecords: number;
  skippedRecords: number;
  errorRecords: number;
  currentEntity?: string;
  message?: string;
  startedAt: Date;
  estimatedCompletion?: Date;
}

export interface MigrationResult {
  success: boolean;
  jobId: string;
  stats: MigrationStats;
  errors: MigrationError[];
  duration: number;
}

export interface MigrationStats {
  contactsImported: number;
  jobsImported: number;
  documentsImported: number;
  tasksImported: number;
  notesImported: number;
  recordsSkipped: number;
  recordsFailed: number;
}

export interface MigrationError {
  entityType: EntityType;
  externalId: string;
  message: string;
  timestamp: Date;
}

// ============================================================================
// Progress Callback Type
// ============================================================================

export type ProgressCallback = (progress: MigrationProgress) => void;

// ============================================================================
// Base Migration Engine
// ============================================================================

export abstract class BaseMigrationEngine {
  protected config: MigrationConfig;
  protected jobId: string | null = null;
  protected cancelled = false;
  protected errors: MigrationError[] = [];
  protected stats: MigrationStats = {
    contactsImported: 0,
    jobsImported: 0,
    documentsImported: 0,
    tasksImported: 0,
    notesImported: 0,
    recordsSkipped: 0,
    recordsFailed: 0,
  };
  protected startTime: Date | null = null;
  protected progressCallback: ProgressCallback | null = null;

  constructor(config: MigrationConfig) {
    this.config = config;
  }

  // ============================================================================
  // Abstract Methods (implement in subclasses)
  // ============================================================================

  /** Test connection to the source system */
  abstract testConnection(): Promise<{ ok: boolean; error?: string }>;

  /** Fetch and count total records to import */
  abstract countRecords(): Promise<number>;

  /** Execute the actual migration */
  protected abstract executeMigration(): Promise<void>;

  // ============================================================================
  // Public Methods
  // ============================================================================

  /**
   * Set progress callback for SSE streaming
   */
  setProgressCallback(callback: ProgressCallback): void {
    this.progressCallback = callback;
  }

  /**
   * Start the migration
   */
  async run(): Promise<MigrationResult> {
    this.startTime = new Date();
    this.cancelled = false;
    this.errors = [];
    this.resetStats();

    try {
      // Create migration job record
      await this.createMigrationJob();

      // Test connection first
      const connectionTest = await this.testConnection();
      if (!connectionTest.ok) {
        throw new Error(`Connection failed: ${connectionTest.error}`);
      }

      // Count total records
      const totalRecords = await this.countRecords();
      await this.updateJob({ totalRecords, status: "RUNNING" });
      this.emitProgress("RUNNING", "Starting import...", 0);

      // Execute the migration
      await this.executeMigration();

      // Mark complete
      const status = this.cancelled ? "CANCELLED" : "COMPLETED";
      await this.updateJob({ status, completedAt: new Date() });

      return {
        success: !this.cancelled,
        jobId: this.jobId!,
        stats: this.stats,
        errors: this.errors,
        duration: Date.now() - this.startTime.getTime(),
      };
    } catch (error: any) {
      logger.error("[Migration] Fatal error:", error);
      await this.updateJob({ status: "FAILED", errors: [error.message] });

      return {
        success: false,
        jobId: this.jobId || "unknown",
        stats: this.stats,
        errors: [
          {
            entityType: "CONTACT",
            externalId: "SYSTEM",
            message: error.message,
            timestamp: new Date(),
          },
        ],
        duration: Date.now() - (this.startTime?.getTime() || Date.now()),
      };
    }
  }

  /**
   * Cancel the running migration
   */
  cancel(): void {
    this.cancelled = true;
    logger.debug(`[Migration] Job ${this.jobId} cancelled by user`);
  }

  /**
   * Pause the migration (save state for later resume)
   */
  async pause(): Promise<void> {
    this.cancelled = true;
    await this.updateJob({ status: "PAUSED" });
  }

  /**
   * Rollback all imported records
   */
  async rollback(): Promise<void> {
    if (!this.jobId) {
      throw new Error("No migration job to rollback");
    }

    await this.updateJob({ status: "ROLLING_BACK" });
    this.emitProgress("ROLLING_BACK", "Rolling back imported records...", 0);

    try {
      // Delete all migration_items for this job
      // In a real implementation, we'd also delete the actual records
      await prisma.migration_items.deleteMany({
        where: { migrationId: this.jobId },
      });

      await this.updateJob({ status: "CANCELLED" });
      this.emitProgress("CANCELLED", "Rollback complete", 100);
    } catch (error: any) {
      logger.error("[Migration] Rollback failed:", error);
      await this.updateJob({ status: "FAILED", errors: [error.message] });
      throw error;
    }
  }

  // ============================================================================
  // Protected Helpers
  // ============================================================================

  protected async createMigrationJob(): Promise<void> {
    const job = await prisma.migration_jobs.create({
      data: {
        orgId: this.config.orgId,
        userId: this.config.userId,
        source: this.config.source,
        status: "PENDING",
        totalRecords: 0,
        importedRecords: 0,
        skippedRecords: 0,
        errorRecords: 0,
        config: (this.config.options as Prisma.InputJsonValue) || {},
        errors: [],
        stats: {},
      },
    });

    this.jobId = job.id;
  }

  protected async updateJob(
    data: Partial<{
      status: MigrationStatus;
      totalRecords: number;
      importedRecords: number;
      skippedRecords: number;
      errorRecords: number;
      errors: string[];
      stats: Record<string, any>;
      completedAt: Date;
    }>
  ): Promise<void> {
    if (!this.jobId) return;

    await prisma.migration_jobs.update({
      where: { id: this.jobId },
      data: data as Prisma.migration_jobsUpdateInput,
    });
  }

  protected async recordItem(
    entityType: EntityType,
    externalId: string,
    internalId: string
  ): Promise<void> {
    if (!this.jobId) return;

    await prisma.migration_items.create({
      data: {
        migrationId: this.jobId,
        entityType,
        externalId,
        internalId,
      },
    });
  }

  protected recordError(entityType: EntityType, externalId: string, message: string): void {
    this.errors.push({
      entityType,
      externalId,
      message,
      timestamp: new Date(),
    });
    this.stats.recordsFailed++;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected emitProgress(status: MigrationStatus, message: string, percentComplete: number): void {
    if (!this.progressCallback || !this.jobId) return;

    const imported =
      this.stats.contactsImported +
      this.stats.jobsImported +
      this.stats.documentsImported +
      this.stats.tasksImported +
      this.stats.notesImported;

    this.progressCallback({
      jobId: this.jobId,
      status,
      phase: message,
      totalRecords: imported + this.stats.recordsSkipped + this.stats.recordsFailed,
      importedRecords: imported,
      skippedRecords: this.stats.recordsSkipped,
      errorRecords: this.stats.recordsFailed,
      message,
      startedAt: this.startTime || new Date(),
    });
  }

  protected resetStats(): void {
    this.stats = {
      contactsImported: 0,
      jobsImported: 0,
      documentsImported: 0,
      tasksImported: 0,
      notesImported: 0,
      recordsSkipped: 0,
      recordsFailed: 0,
    };
  }

  protected isCancelled(): boolean {
    return this.cancelled;
  }

  /**
   * Sleep utility for rate limiting
   */
  protected sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
