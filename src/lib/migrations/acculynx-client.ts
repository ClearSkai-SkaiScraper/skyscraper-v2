/**
 * AccuLynx API Client
 *
 * Secure, server-side-only client for the AccuLynx REST API.
 * Used by the migration engine to pull contacts, jobs, and documents
 * from a roofing company's AccuLynx account into SkaiScraper.
 *
 * Docs: https://api.acculynx.com/api/v2 (requires partner credentials)
 *
 * IMPORTANT: Never import this file on the client side.
 */

import "server-only";

import { logger } from "@/lib/logger";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AccuLynxConfig {
  apiKey: string;
  baseUrl?: string;
}

export interface AccuLynxContact {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
  } | null;
}

export interface AccuLynxJob {
  id: string;
  name: string;
  status: string;
  jobType: string;
  description: string | null;
  estimatedRevenue: number | null;
  contactId: string | null;
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
  } | null;
  createdDate: string;
  modifiedDate: string;
}

export interface AccuLynxDocument {
  id: string;
  name: string;
  type: string;
  url: string;
  jobId: string | null;
  createdDate: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

const DEFAULT_BASE_URL = "https://api.acculynx.com/api/v2";
const DEFAULT_PAGE_SIZE = 100;
const MAX_RETRIES = 3;

export class AccuLynxClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(config: AccuLynxConfig) {
    if (!config.apiKey) {
      throw new Error("[AccuLynx] API key is required");
    }
    this.apiKey = config.apiKey;
    this.baseUrl = (config.baseUrl || DEFAULT_BASE_URL).replace(/\/$/, "");
  }

  // ---- Low-level fetch with retry + rate-limit backoff -------------------

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
            Accept: "application/json",
          },
        });

        // Rate-limited — back off
        if (res.status === 429) {
          const retryAfter = parseInt(res.headers.get("Retry-After") || "5", 10);
          logger.warn(
            `[ACCULYNX] Rate limited (429). Waiting ${retryAfter}s (attempt ${attempt}/${MAX_RETRIES})`
          );
          await sleep(retryAfter * 1000);
          continue;
        }

        if (!res.ok) {
          const body = await res.text().catch(() => "");
          throw new Error(`AccuLynx API ${res.status}: ${body}`);
        }

        return (await res.json()) as T;
      } catch (err: any) {
        lastError = err;
        if (attempt < MAX_RETRIES) {
          await sleep(1000 * attempt); // exponential-ish backoff
        }
      }
    }

    throw lastError ?? new Error("[AccuLynx] Request failed after retries");
  }

  // ---- Public data-pull methods ------------------------------------------

  async fetchContacts(
    page = 1,
    pageSize = DEFAULT_PAGE_SIZE
  ): Promise<PaginatedResponse<AccuLynxContact>> {
    return this.request<PaginatedResponse<AccuLynxContact>>("/contacts", { page, pageSize });
  }

  async fetchAllContacts(): Promise<AccuLynxContact[]> {
    return this.fetchAllPages<AccuLynxContact>("/contacts");
  }

  async fetchJobs(page = 1, pageSize = DEFAULT_PAGE_SIZE): Promise<PaginatedResponse<AccuLynxJob>> {
    return this.request<PaginatedResponse<AccuLynxJob>>("/jobs", { page, pageSize });
  }

  async fetchAllJobs(): Promise<AccuLynxJob[]> {
    return this.fetchAllPages<AccuLynxJob>("/jobs");
  }

  async fetchDocuments(
    jobId: string,
    page = 1,
    pageSize = DEFAULT_PAGE_SIZE
  ): Promise<PaginatedResponse<AccuLynxDocument>> {
    return this.request<PaginatedResponse<AccuLynxDocument>>(`/jobs/${jobId}/documents`, {
      page,
      pageSize,
    });
  }

  /**
   * Alias used by preflight route — returns { data, totalCount } format.
   */
  async getContacts(
    page = 1,
    pageSize = DEFAULT_PAGE_SIZE
  ): Promise<{ data: AccuLynxContact[]; totalCount: number }> {
    const res = await this.fetchContacts(page, pageSize);
    return { data: res.data, totalCount: res.totalCount };
  }

  async getJobs(
    page = 1,
    pageSize = DEFAULT_PAGE_SIZE
  ): Promise<{ data: AccuLynxJob[]; totalCount: number }> {
    const res = await this.fetchJobs(page, pageSize);
    return { data: res.data, totalCount: res.totalCount };
  }

  /**
   * Fetch estimates for a job (documents with type "estimate").
   */
  async fetchEstimates(
    jobId: string,
    page = 1,
    pageSize = DEFAULT_PAGE_SIZE
  ): Promise<PaginatedResponse<AccuLynxDocument>> {
    return this.request<PaginatedResponse<AccuLynxDocument>>(`/jobs/${jobId}/estimates`, {
      page,
      pageSize,
    });
  }

  /** Test connection — returns true if the API key is valid */
  async testConnection(): Promise<{ ok: boolean; error?: string }> {
    try {
      await this.request("/contacts", { page: 1, pageSize: 1 });
      return { ok: true };
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  }

  // ---- Helpers -----------------------------------------------------------

  private async fetchAllPages<T>(endpoint: string): Promise<T[]> {
    const all: T[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const res = await this.request<PaginatedResponse<T>>(endpoint, {
        page,
        pageSize: DEFAULT_PAGE_SIZE,
      });
      all.push(...res.data);
      hasMore = res.hasMore;
      page++;
    }

    return all;
  }
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
