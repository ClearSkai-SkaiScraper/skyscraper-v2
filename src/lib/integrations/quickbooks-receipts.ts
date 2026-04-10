/**
 * QuickBooks Receipt & Expense Sync
 *
 * Extends the core QuickBooks client with:
 * - Receipt/expense creation in QB as Purchase records
 * - Material receipt → QB Bill mapping
 * - Bulk receipt sync for a job/claim
 *
 * The QB Purchase entity handles receipts/expenses.
 * Docs: https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/purchase
 */

import { getValidToken } from "@/lib/integrations/quickbooks";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

// ── Types ───────────────────────────────────────────────────────────────

export interface ReceiptLineItem {
  description: string;
  amount: number;
  accountRef?: string; // QB account ID (e.g., "Materials Expense")
  category?: string;
}

export interface ReceiptSyncInput {
  vendorName: string;
  receiptDate: string; // YYYY-MM-DD
  totalAmount: number;
  paymentMethod: "Cash" | "Check" | "CreditCard" | "DebitCard" | "Other";
  lineItems: ReceiptLineItem[];
  memo?: string;
  receiptImageUrl?: string;
  taxAmount?: number;
}

export interface ReceiptSyncResult {
  qbPurchaseId: string;
  status: "synced" | "already_synced";
  receiptId: string;
}

// ── QB API Base ─────────────────────────────────────────────────────────

const QB_API_BASE =
  // eslint-disable-next-line no-restricted-syntax
  process.env.QUICKBOOKS_ENVIRONMENT === "production"
    ? "https://quickbooks.api.intuit.com/v3"
    : "https://sandbox-quickbooks.api.intuit.com/v3";

async function qbRequest(
  method: string,
  realmId: string,
  path: string,
  accessToken: string,
  body?: unknown
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

// ── Vendor (Supplier) Management ────────────────────────────────────────

/**
 * Find or create a vendor in QuickBooks.
 * Used to map receipt suppliers (e.g., "ABC Supply", "Home Depot") to QB Vendor records.
 */
async function findOrCreateVendor(
  realmId: string,
  accessToken: string,
  vendorName: string
): Promise<string> {
  // Query for existing vendor
  const query = `SELECT * FROM Vendor WHERE DisplayName = '${vendorName.replace(/'/g, "\\'")}'`;
  const searchRes = await qbRequest(
    "GET",
    realmId,
    `query?query=${encodeURIComponent(query)}`,
    accessToken
  );

  const vendors = searchRes?.QueryResponse?.Vendor;
  if (vendors && vendors.length > 0) {
    return vendors[0].Id;
  }

  // Create new vendor
  const createRes = await qbRequest("POST", realmId, "vendor", accessToken, {
    DisplayName: vendorName,
  });

  return createRes.Vendor.Id;
}

// ── Receipt → QB Purchase Sync ──────────────────────────────────────────

/**
 * Sync a single receipt to QuickBooks as a Purchase (expense/receipt).
 *
 * Maps to QB "Purchase" entity with PaymentType = Cash/Check/CreditCard.
 */
export async function syncReceiptToQuickBooks(
  orgId: string,
  receiptId: string,
  input: ReceiptSyncInput
): Promise<ReceiptSyncResult> {
  const auth = await getValidToken(orgId);
  if (!auth) throw new Error("QuickBooks not connected");

  // Check if already synced
  const receipt = await prisma.material_receipts.findUnique({
    where: { id: receiptId },
  });

  if (!receipt) throw new Error(`Receipt ${receiptId} not found`);

  // Check metadata for existing QB sync
  const metadata = (receipt.parsedItems as Record<string, unknown>) || {};
  if (metadata.qbPurchaseId) {
    return {
      qbPurchaseId: metadata.qbPurchaseId as string,
      status: "already_synced",
      receiptId,
    };
  }

  // Find or create the vendor in QB
  const vendorId = await findOrCreateVendor(auth.realmId, auth.accessToken, input.vendorName);

  // Map payment method to QB PaymentType
  const paymentTypeMap: Record<string, string> = {
    Cash: "Cash",
    Check: "Check",
    CreditCard: "CreditCard",
    DebitCard: "CreditCard",
    Other: "Cash",
  };

  // Create Purchase in QB
  const purchasePayload = {
    PaymentType: paymentTypeMap[input.paymentMethod] || "Cash",
    TotalAmt: input.totalAmount,
    TxnDate: input.receiptDate,
    EntityRef: { value: vendorId, type: "Vendor" },
    PrivateNote: input.memo || `SkaiScrape Receipt #${receiptId.slice(0, 8)}`,
    Line: input.lineItems.map((item) => ({
      DetailType: "AccountBasedExpenseLineDetail",
      Amount: item.amount,
      Description: item.description,
      AccountBasedExpenseLineDetail: {
        AccountRef: item.accountRef
          ? { value: item.accountRef }
          : { value: "1", name: "Job Materials" }, // Default expense account
      },
    })),
  };

  const result = await qbRequest(
    "POST",
    auth.realmId,
    "purchase",
    auth.accessToken,
    purchasePayload
  );
  const qbPurchaseId = result.Purchase.Id;

  logger.info(`[QB_RECEIPTS] Receipt ${receiptId} synced to QB Purchase ${qbPurchaseId}`);

  // Store QB reference in receipt metadata
  await prisma.material_receipts.update({
    where: { id: receiptId },
    data: {
      parsedItems: {
        ...((receipt.parsedItems as Record<string, unknown>) || {}),
        qbPurchaseId,
        qbSyncedAt: new Date().toISOString(),
      },
    },
  });

  // Update QB connection last sync time
  await prisma.quickbooks_connections.update({
    where: { org_id: orgId },
    data: { last_sync_at: new Date() },
  });

  return { qbPurchaseId, status: "synced", receiptId };
}

// ── Bulk Sync for Claim/Job ─────────────────────────────────────────────

/**
 * Sync all unsynced material receipts for a claim to QuickBooks.
 */
export async function syncClaimReceiptsToQuickBooks(
  orgId: string,
  claimId: string
): Promise<{ synced: number; skipped: number; errors: string[] }> {
  const receipts = await prisma.material_receipts.findMany({
    where: {
      orgId,
      claimId,
      status: "pending",
    },
  });

  let synced = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const receipt of receipts) {
    try {
      // Check if already synced
      const meta = (receipt.parsedItems as Record<string, unknown>) || {};
      if (meta.qbPurchaseId) {
        skipped++;
        continue;
      }

      await syncReceiptToQuickBooks(orgId, receipt.id, {
        vendorName: receipt.supplier,
        receiptDate: receipt.purchaseDate
          ? receipt.purchaseDate.toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0],
        totalAmount: Number(receipt.total || receipt.subtotal || 0),
        paymentMethod: (receipt.paymentMethod as ReceiptSyncInput["paymentMethod"]) || "Other",
        lineItems: Array.isArray(meta.items)
          ? (meta.items as ReceiptLineItem[])
          : [
              {
                description: `Materials from ${receipt.supplier}`,
                amount: Number(receipt.total || receipt.subtotal || 0),
              },
            ],
        memo: `Claim: ${claimId} | Receipt #${receipt.receiptNumber || receipt.id.slice(0, 8)}`,
      });

      synced++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      errors.push(`Receipt ${receipt.id}: ${msg}`);
      logger.error(`[QB_RECEIPTS] Failed to sync receipt ${receipt.id}:`, err);
    }
  }

  logger.info(
    `[QB_RECEIPTS] Claim ${claimId} bulk sync complete: ${synced} synced, ${skipped} skipped, ${errors.length} errors`
  );

  return { synced, skipped, errors };
}

// ── QuickBooks Disconnect ───────────────────────────────────────────────

/**
 * Disconnect QuickBooks integration for an org.
 * Revokes OAuth token and marks connection as inactive.
 */
export async function disconnectQuickBooks(orgId: string): Promise<void> {
  const conn = await prisma.quickbooks_connections.findUnique({
    where: { org_id: orgId },
  });

  if (!conn) {
    logger.warn(`[QB] No connection found for org ${orgId}`);
    return;
  }

  // Attempt to revoke token at Intuit
  try {
    const revokeUrl = "https://developer.api.intuit.com/v2/oauth2/tokens/revoke";
    const credentials = Buffer.from(
      // eslint-disable-next-line no-restricted-syntax
      `${process.env.QUICKBOOKS_CLIENT_ID}:${process.env.QUICKBOOKS_CLIENT_SECRET}`
    ).toString("base64");

    await fetch(revokeUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${credentials}`,
      },
      body: JSON.stringify({ token: conn.refresh_token }),
    });
  } catch (err) {
    logger.warn("[QB] Token revocation failed (non-critical):", err);
  }

  // Mark connection as inactive
  await prisma.quickbooks_connections.update({
    where: { org_id: orgId },
    data: {
      is_active: false,
      access_token: "REVOKED",
      refresh_token: "REVOKED",
    },
  });

  logger.info(`[QB] Disconnected org ${orgId}`);
}
