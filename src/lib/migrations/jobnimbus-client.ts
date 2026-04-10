/**
 * JobNimbus API Client
 *
 * Secure, server-side-only client for the JobNimbus REST API.
 * Used by the migration engine to pull contacts, jobs, tasks, and files
 * from a contractor's JobNimbus account into SkaiScraper.
 *
 * Docs: https://documenter.getpostman.com/view/3919598/S11HvKSL
 *
 * IMPORTANT: Never import this file on the client side.
 */

import "server-only";

import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

export interface JobNimbusConfig {
  apiKey: string;
  baseUrl?: string;
}

export interface JobNimbusContact {
  jnid: string;
  first_name: string;
  last_name: string;
  email: string | null;
  home_phone: string | null;
  mobile_phone: string | null;
  work_phone: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state_text: string | null;
  zip: string | null;
  country: string | null;
  date_created: number;
  date_updated: number;
}

export interface JobNimbusJob {
  jnid: string;
  number: number;
  name: string;
  status_name: string;
  description: string | null;
  sales_rep: string | null;
  sales_rep_name: string | null;
  location: {
    address_line1: string | null;
    address_line2: string | null;
    city: string | null;
    state_text: string | null;
    zip: string | null;
    country: string | null;
    geo: {
      lat: number | null;
      lon: number | null;
    } | null;
  } | null;
  related: string[]; // Related contact jnids
  date_created: number;
  date_updated: number;
  date_start: number | null;
  date_end: number | null;
  approved_estimate_total: number | null;
  approved_estimate_subtotal: number | null;
}

export interface JobNimbusTask {
  jnid: string;
  title: string;
  description: string | null;
  type: string;
  is_completed: boolean;
  date_due: number | null;
  date_completed: number | null;
  related: string[]; // Related job jnids
  date_created: number;
  date_updated: number;
}

export interface JobNimbusFile {
  jnid: string;
  filename: string;
  description: string | null;
  url: string;
  content_type: string | null;
  related: string[]; // Related job/contact jnids
  date_created: number;
}

export interface JobNimbusActivity {
  jnid: string;
  type: string;
  note: string | null;
  related: string[];
  date_created: number;
}

export interface PaginatedResponse<T> {
  count: number;
  results: T[];
}

// ============================================================================
// Client
// ============================================================================

const DEFAULT_BASE_URL = "https://app.jobnimbus.com/api1";
const DEFAULT_PAGE_SIZE = 100;
const MAX_RETRIES = 3;
const RATE_LIMIT_DELAY_MS = 1000; // 1 second between requests to respect rate limits

export class JobNimbusClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(config: JobNimbusConfig) {
    if (!config.apiKey) {
      throw new Error("[JobNimbus] API key is required");
    }
    this.apiKey = config.apiKey;
    this.baseUrl = (config.baseUrl || DEFAULT_BASE_URL).replace(/\/$/, "");
  }

  // ============================================================================
  // Low-level fetch with retry + rate-limit handling
  // ============================================================================

  private async request<T>(
    endpoint: string,
    params: Record<string, string | number> = {}
  ): Promise<T> {
    const url = new URL(`${this.baseUrl}${endpoint}`);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const res = await fetch(url.toString(), {
          method: "GET",
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
        });

        // Rate limit handling
        if (res.status === 429) {
          const retryAfter = parseInt(res.headers.get("Retry-After") || "5", 10);
          logger.warn(`[JobNimbus] Rate limited. Waiting ${retryAfter}s...`);
          await this.sleep(retryAfter * 1000);
          continue;
        }

        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(`JobNimbus API error: ${res.status} - ${errorText}`);
        }

        return res.json() as Promise<T>;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (err: any) {
        lastError = err;
        logger.warn(`[JobNimbus] Attempt ${attempt} failed: ${err.message}`);
        if (attempt < MAX_RETRIES) {
          await this.sleep(Math.pow(2, attempt) * 1000); // Exponential backoff
        }
      }
    }

    throw lastError || new Error("[JobNimbus] Request failed after retries");
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // ============================================================================
  // Public Methods
  // ============================================================================

  /**
   * Test API connection
   */
  async testConnection(): Promise<{ ok: boolean; error?: string }> {
    try {
      await this.request<PaginatedResponse<JobNimbusContact>>("/contacts", { count: 1 });
      return { ok: true };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  }

  /**
   * Alias used by preflight route — returns { data, totalCount } format.
   */
  async getContacts(
    page = 1,
    pageSize = DEFAULT_PAGE_SIZE
  ): Promise<{ data: JobNimbusContact[]; totalCount: number }> {
    const offset = (page - 1) * pageSize;
    const res = await this.request<PaginatedResponse<JobNimbusContact>>("/contacts", {
      count: pageSize,
      offset,
    });
    return { data: res.results, totalCount: res.count };
  }

  async getJobs(
    page = 1,
    pageSize = DEFAULT_PAGE_SIZE
  ): Promise<{ data: JobNimbusJob[]; totalCount: number }> {
    const offset = (page - 1) * pageSize;
    const res = await this.request<PaginatedResponse<JobNimbusJob>>("/jobs", {
      count: pageSize,
      offset,
    });
    return { data: res.results, totalCount: res.count };
  }

  /**
   * Fetch all contacts with pagination
   */
  async fetchAllContacts(): Promise<JobNimbusContact[]> {
    const all: JobNimbusContact[] = [];
    let offset = 0;

    while (true) {
      const res = await this.request<PaginatedResponse<JobNimbusContact>>("/contacts", {
        count: DEFAULT_PAGE_SIZE,
        offset,
      });

      all.push(...res.results);
      logger.debug(`[JobNimbus] Fetched ${all.length} contacts...`);

      if (res.results.length < DEFAULT_PAGE_SIZE) break;
      offset += DEFAULT_PAGE_SIZE;

      // Respect rate limits
      await this.sleep(RATE_LIMIT_DELAY_MS);
    }

    return all;
  }

  /**
   * Fetch all jobs with pagination
   */
  async fetchAllJobs(): Promise<JobNimbusJob[]> {
    const all: JobNimbusJob[] = [];
    let offset = 0;

    while (true) {
      const res = await this.request<PaginatedResponse<JobNimbusJob>>("/jobs", {
        count: DEFAULT_PAGE_SIZE,
        offset,
      });

      all.push(...res.results);
      logger.debug(`[JobNimbus] Fetched ${all.length} jobs...`);

      if (res.results.length < DEFAULT_PAGE_SIZE) break;
      offset += DEFAULT_PAGE_SIZE;

      await this.sleep(RATE_LIMIT_DELAY_MS);
    }

    return all;
  }

  /**
   * Fetch all tasks with pagination
   */
  async fetchAllTasks(): Promise<JobNimbusTask[]> {
    const all: JobNimbusTask[] = [];
    let offset = 0;

    while (true) {
      const res = await this.request<PaginatedResponse<JobNimbusTask>>("/tasks", {
        count: DEFAULT_PAGE_SIZE,
        offset,
      });

      all.push(...res.results);
      logger.debug(`[JobNimbus] Fetched ${all.length} tasks...`);

      if (res.results.length < DEFAULT_PAGE_SIZE) break;
      offset += DEFAULT_PAGE_SIZE;

      await this.sleep(RATE_LIMIT_DELAY_MS);
    }

    return all;
  }

  /**
   * Fetch files for a specific job
   */
  async fetchFilesForJob(jobJnid: string): Promise<JobNimbusFile[]> {
    const res = await this.request<PaginatedResponse<JobNimbusFile>>("/files", {
      filter: JSON.stringify({ must: [{ related: jobJnid }] }),
      count: 100,
    });

    return res.results;
  }

  /**
   * Fetch activity/notes for a job
   */
  async fetchActivitiesForJob(jobJnid: string): Promise<JobNimbusActivity[]> {
    const res = await this.request<PaginatedResponse<JobNimbusActivity>>("/activities", {
      filter: JSON.stringify({ must: [{ related: jobJnid }] }),
      count: 100,
    });

    return res.results;
  }

  /**
   * Fetch a single contact by jnid
   */
  async fetchContact(jnid: string): Promise<JobNimbusContact | null> {
    try {
      return await this.request<JobNimbusContact>(`/contacts/${jnid}`);
    } catch {
      return null;
    }
  }

  /**
   * Fetch a single job by jnid
   */
  async fetchJob(jnid: string): Promise<JobNimbusJob | null> {
    try {
      return await this.request<JobNimbusJob>(`/jobs/${jnid}`);
    } catch {
      return null;
    }
  }
}
