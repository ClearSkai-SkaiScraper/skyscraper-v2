/**
 * QuickBooks Online Integration — OAuth + API scaffold
 *
 * Handles:
 * - OAuth 2.0 authorization flow
 * - Token refresh (with encryption at rest)
 * - Customer/Invoice/Payment CRUD
 * - Job-to-Invoice sync
 *
 * Environment vars required:
 * - QUICKBOOKS_CLIENT_ID
 * - QUICKBOOKS_CLIENT_SECRET
 * - QUICKBOOKS_REDIRECT_URI
 * - QUICKBOOKS_ENVIRONMENT (sandbox | production)
 * - TOKEN_ENCRYPTION_KEY (32-byte hex for token encryption)
 */

import { encryptToken, safeDecrypt } from "@/lib/crypto/token-encryption";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

// ── Config ──────────────────────────────────────────────────────────────────

const QB_AUTH_URL = "https://appcenter.intuit.com/connect/oauth2";
const QB_TOKEN_URL = "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer";
const QB_API_BASE =
  // eslint-disable-next-line no-restricted-syntax
  process.env.QUICKBOOKS_ENVIRONMENT === "production"
    ? "https://quickbooks.api.intuit.com/v3"
    : "https://sandbox-quickbooks.api.intuit.com/v3";

// eslint-disable-next-line no-restricted-syntax
const clientId = process.env.QUICKBOOKS_CLIENT_ID || "";
// eslint-disable-next-line no-restricted-syntax
const clientSecret = process.env.QUICKBOOKS_CLIENT_SECRET || "";
const redirectUri =
  // eslint-disable-next-line no-restricted-syntax
  process.env.QUICKBOOKS_REDIRECT_URI ||
  "https://skaiscrape.com/api/integrations/quickbooks/callback";

// ── OAuth Flow ──────────────────────────────────────────────────────────────

/**
 * Generate the OAuth authorization URL for QuickBooks.
 * Redirect user to this URL to start the connection flow.
 */
export function getAuthorizationUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "com.intuit.quickbooks.accounting",
    state,
  });
  return `${QB_AUTH_URL}?${params.toString()}`;
}

/**
 * Exchange authorization code for access + refresh tokens.
 */
export async function exchangeCodeForTokens(code: string) {
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const res = await fetch(QB_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${credentials}`,
      Accept: "application/json",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`QuickBooks token exchange failed: ${error}`);
  }

  const data = await res.json();
  return {
    accessToken: data.access_token as string,
    refreshToken: data.refresh_token as string,
    expiresIn: data.expires_in as number, // seconds
    realmId: data.realmId as string,
  };
}

/**
 * Refresh an expired access token.
 */
export async function refreshAccessToken(refreshToken: string) {
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const res = await fetch(QB_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${credentials}`,
      Accept: "application/json",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!res.ok) {
    throw new Error("QuickBooks token refresh failed");
  }

  const data = await res.json();
  return {
    accessToken: data.access_token as string,
    refreshToken: data.refresh_token as string,
    expiresIn: data.expires_in as number,
  };
}

// ── Connection Management ───────────────────────────────────────────────────

/**
 * Save or update QuickBooks connection for an org.
 * Tokens are encrypted at rest for security compliance.
 */
export async function saveConnection(
  orgId: string,
  realmId: string,
  accessToken: string,
  refreshToken: string,
  expiresIn: number,
  companyName?: string
) {
  const tokenExpires = new Date(Date.now() + expiresIn * 1000);

  // Encrypt tokens before storing
  const encryptedAccessToken = encryptToken(accessToken);
  const encryptedRefreshToken = encryptToken(refreshToken);

  await prisma.quickbooks_connections.upsert({
    where: { org_id: orgId },
    create: {
      org_id: orgId,
      realm_id: realmId,
      access_token: encryptedAccessToken,
      refresh_token: encryptedRefreshToken,
      token_expires: tokenExpires,
      company_name: companyName || null,
      is_active: true,
    },
    update: {
      realm_id: realmId,
      access_token: encryptedAccessToken,
      refresh_token: encryptedRefreshToken,
      token_expires: tokenExpires,
      company_name: companyName || null,
      is_active: true,
    },
  });

  logger.info(`[QB] Connection saved for org ${orgId} (tokens encrypted)`);
}

/**
 * Get a valid access token for an org, refreshing if needed.
 * Handles decryption of stored tokens automatically.
 */
export async function getValidToken(orgId: string): Promise<{
  accessToken: string;
  realmId: string;
} | null> {
  const conn = await prisma.quickbooks_connections.findUnique({
    where: { org_id: orgId },
  });

  if (!conn || !conn.is_active) return null;

  // Decrypt tokens (handles both encrypted and legacy plaintext)
  const decryptedAccessToken = safeDecrypt(conn.access_token);
  const decryptedRefreshToken = safeDecrypt(conn.refresh_token);

  // Check if token is expired (with 5 min buffer)
  if (new Date() >= new Date(conn.token_expires.getTime() - 5 * 60 * 1000)) {
    try {
      const refreshed = await refreshAccessToken(decryptedRefreshToken);
      await saveConnection(
        orgId,
        conn.realm_id,
        refreshed.accessToken,
        refreshed.refreshToken,
        refreshed.expiresIn,
        conn.company_name || undefined
      );
      return { accessToken: refreshed.accessToken, realmId: conn.realm_id };
    } catch (err) {
      logger.error("[QB] Token refresh failed:", err);
      // Mark connection as inactive
      await prisma.quickbooks_connections.update({
        where: { org_id: orgId },
        data: {
          is_active: false,
          sync_errors: [
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ...(Array.isArray(conn.sync_errors) ? (conn.sync_errors as any[]) : []),
            { error: "Token refresh failed", at: new Date().toISOString() },
          ],
        },
      });
      return null;
    }
  }

  return { accessToken: decryptedAccessToken, realmId: conn.realm_id };
}

// ── API Helpers ─────────────────────────────────────────────────────────────

async function qbRequest(
  method: string,
  realmId: string,
  path: string,
  accessToken: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body?: any
) {
  const url = `${QB_API_BASE}/company/${realmId}/${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`QuickBooks API error (${res.status}): ${error}`);
  }

  return res.json();
}

// ── Customer Operations ─────────────────────────────────────────────────────

export async function createCustomer(
  orgId: string,
  customer: {
    displayName: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
  }
) {
  const auth = await getValidToken(orgId);
  if (!auth) throw new Error("QuickBooks not connected");

  return qbRequest("POST", auth.realmId, "customer", auth.accessToken, {
    DisplayName: customer.displayName,
    PrimaryEmailAddr: customer.email ? { Address: customer.email } : undefined,
    PrimaryPhone: customer.phone ? { FreeFormNumber: customer.phone } : undefined,
    BillAddr: customer.address
      ? {
          Line1: customer.address,
          City: customer.city,
          CountrySubDivisionCode: customer.state,
          PostalCode: customer.zip,
        }
      : undefined,
  });
}

// ── Invoice Operations ──────────────────────────────────────────────────────

export async function createInvoice(
  orgId: string,
  invoice: {
    customerRef: string; // QB customer ID
    lineItems: Array<{
      description: string;
      amount: number;
      quantity?: number;
    }>;
    dueDate?: string;
  }
) {
  const auth = await getValidToken(orgId);
  if (!auth) throw new Error("QuickBooks not connected");

  return qbRequest("POST", auth.realmId, "invoice", auth.accessToken, {
    CustomerRef: { value: invoice.customerRef },
    DueDate: invoice.dueDate,
    Line: invoice.lineItems.map((item) => ({
      DetailType: "SalesItemLineDetail",
      Amount: item.amount,
      Description: item.description,
      SalesItemLineDetail: {
        Qty: item.quantity || 1,
        UnitPrice: item.amount / (item.quantity || 1),
      },
    })),
  });
}

// ── Payment Operations ──────────────────────────────────────────────────────

export async function recordPayment(
  orgId: string,
  payment: {
    customerRef: string;
    amount: number;
    invoiceRef?: string;
    paymentDate?: string;
    paymentMethod?: string;
  }
) {
  const auth = await getValidToken(orgId);
  if (!auth) throw new Error("QuickBooks not connected");

  return qbRequest("POST", auth.realmId, "payment", auth.accessToken, {
    CustomerRef: { value: payment.customerRef },
    TotalAmt: payment.amount,
    TxnDate: payment.paymentDate,
    PaymentMethodRef: payment.paymentMethod ? { value: payment.paymentMethod } : undefined,
    Line: payment.invoiceRef
      ? [
          {
            Amount: payment.amount,
            LinkedTxn: [{ TxnId: payment.invoiceRef, TxnType: "Invoice" }],
          },
        ]
      : undefined,
  });
}

// ── Sync Operations ─────────────────────────────────────────────────────────

/**
 * Sync a SkaiScrape job to a QuickBooks invoice.
 * Creates or updates the invoice in QB and stores the QB invoice ID.
 */
export async function syncJobToInvoice(orgId: string, jobId: string) {
  const auth = await getValidToken(orgId);
  if (!auth) throw new Error("QuickBooks not connected");

  // Get job + financials
  const job = await prisma.crm_jobs.findUnique({ where: { id: jobId } });
  if (!job) throw new Error("Job not found");

  const financials = await prisma.job_financials.findUnique({
    where: { job_id: jobId },
  });

  if (!financials) throw new Error("No financial data for this job");

  // Check if already synced
  if (financials.qb_invoice_id) {
    logger.debug(`[QB] Job ${jobId} already synced to QB invoice ${financials.qb_invoice_id}`);
    return { qbInvoiceId: financials.qb_invoice_id, status: "already_synced" };
  }

  // Create customer in QB (or find existing)
  const customerName = job.insured_name || `Job-${job.id.slice(0, 8)}`;
  const customerResult = await createCustomer(orgId, {
    displayName: customerName,
    address: job.property_address || undefined,
  });

  // Create invoice in QB
  const totalRevenue = Number(financials.contract_amount) + Number(financials.supplement_amount);
  const invoiceResult = await createInvoice(orgId, {
    customerRef: customerResult.Customer.Id,
    lineItems: [
      {
        description: `Roofing Services — ${job.property_address || "Job"} (Claim: ${job.claim_number || "N/A"})`,
        amount: totalRevenue,
      },
    ],
  });

  // Store QB invoice ID
  await prisma.job_financials.update({
    where: { job_id: jobId },
    data: {
      qb_invoice_id: invoiceResult.Invoice.Id,
      qb_synced_at: new Date(),
    },
  });

  // Update last sync time
  await prisma.quickbooks_connections.update({
    where: { org_id: orgId },
    data: { last_sync_at: new Date() },
  });

  return { qbInvoiceId: invoiceResult.Invoice.Id, status: "synced" };
}
