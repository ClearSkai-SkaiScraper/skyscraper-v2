/**
 * ABC Supply Integration Client
 *
 * Handles:
 * - Account authentication
 * - Product catalog search
 * - Order creation and tracking
 * - Inventory availability
 * - Branch/location lookup
 *
 * Environment vars required:
 * - ABC_SUPPLY_API_KEY
 * - ABC_SUPPLY_API_SECRET
 * - ABC_SUPPLY_ENVIRONMENT (sandbox | production)
 *
 * Note: ABC Supply's API requires partner credentials.
 * Contact ABC Supply for API documentation and credentials.
 */

import "server-only";

// ============================================================================
// Configuration
// ============================================================================

const ABC_API_BASE =
  // eslint-disable-next-line no-restricted-syntax
  process.env.ABC_SUPPLY_ENVIRONMENT === "production"
    ? "https://api.abcsupply.com/v1"
    : "https://sandbox-api.abcsupply.com/v1";

// eslint-disable-next-line no-restricted-syntax
const apiKey = process.env.ABC_SUPPLY_API_KEY || "";
// eslint-disable-next-line no-restricted-syntax
const apiSecret = process.env.ABC_SUPPLY_API_SECRET || "";

// ============================================================================
// Types
// ============================================================================

export interface ABCProduct {
  sku: string;
  name: string;
  description: string;
  manufacturer: string;
  category: string;
  unitOfMeasure: string;
  pricePerUnit: number;
  minOrderQuantity: number;
  imageUrl?: string;
}

export interface ABCBranch {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  latitude: number;
  longitude: number;
  isOpen: boolean;
  deliveryAvailable: boolean;
}

export interface ABCInventory {
  sku: string;
  branchId: string;
  quantityAvailable: number;
  quantityOnOrder: number;
  estimatedRestockDate?: string;
}

export interface ABCOrderLine {
  sku: string;
  quantity: number;
  priceOverride?: number;
}

export interface ABCOrder {
  id: string;
  status: "pending" | "confirmed" | "processing" | "shipped" | "delivered" | "cancelled";
  branchId: string;
  lines: ABCOrderLine[];
  subtotal: number;
  tax: number;
  total: number;
  deliveryAddress?: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    zip: string;
  };
  deliveryDate?: string;
  trackingNumber?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ABCOrderCreateRequest {
  branchId: string;
  lines: ABCOrderLine[];
  deliveryMethod: "pickup" | "delivery";
  deliveryAddress?: ABCOrder["deliveryAddress"];
  requestedDeliveryDate?: string;
  poNumber?: string;
  notes?: string;
}

// ============================================================================
// Client Class
// ============================================================================

export class ABCSupplyClient {
  private orgAccountId: string;

  constructor(orgAccountId: string) {
    if (!apiKey || !apiSecret) {
      throw new Error("[ABCSupply] API credentials not configured");
    }
    this.orgAccountId = orgAccountId;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Low-level request helper
  // ─────────────────────────────────────────────────────────────────────────

  private async request<T>(
    method: string,
    endpoint: string,
    body?: Record<string, unknown>
  ): Promise<T> {
    const url = `${ABC_API_BASE}${endpoint}`;
    const timestamp = Date.now().toString();

    // Generate HMAC signature (simplified - actual impl may vary)
    const signature = await this.generateSignature(method, endpoint, timestamp);

    const res = await fetch(url, {
      method,
      headers: {
        "X-API-Key": apiKey,
        "X-API-Timestamp": timestamp,
        "X-API-Signature": signature,
        "X-Account-ID": this.orgAccountId,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`ABC Supply API error (${res.status}): ${errorText}`);
    }

    return res.json() as Promise<T>;
  }

  private async generateSignature(
    method: string,
    endpoint: string,
    timestamp: string
  ): Promise<string> {
    // HMAC-SHA256 signature
    const message = `${method}${endpoint}${timestamp}`;
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(apiSecret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
    return Buffer.from(signature).toString("base64");
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Product Catalog
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Search products by keyword
   */
  async searchProducts(query: string, limit = 20): Promise<ABCProduct[]> {
    return this.request<ABCProduct[]>(
      "GET",
      `/products/search?q=${encodeURIComponent(query)}&limit=${limit}`
    );
  }

  /**
   * Get product by SKU
   */
  async getProduct(sku: string): Promise<ABCProduct | null> {
    try {
      return await this.request<ABCProduct>("GET", `/products/${sku}`);
    } catch {
      return null;
    }
  }

  /**
   * Get products by category
   */
  async getProductsByCategory(
    category: string,
    page = 1,
    limit = 50
  ): Promise<{ products: ABCProduct[]; total: number }> {
    return this.request(
      "GET",
      `/products/category/${encodeURIComponent(category)}?page=${page}&limit=${limit}`
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Branch/Location
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Find nearest branches by zip code
   */
  async findNearestBranches(zip: string, limit = 5): Promise<ABCBranch[]> {
    return this.request<ABCBranch[]>("GET", `/branches/near/${zip}?limit=${limit}`);
  }

  /**
   * Get branch by ID
   */
  async getBranch(branchId: string): Promise<ABCBranch | null> {
    try {
      return await this.request<ABCBranch>("GET", `/branches/${branchId}`);
    } catch {
      return null;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Inventory
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Check inventory at a specific branch
   */
  async checkInventory(sku: string, branchId: string): Promise<ABCInventory | null> {
    try {
      return await this.request<ABCInventory>("GET", `/inventory/${branchId}/${sku}`);
    } catch {
      return null;
    }
  }

  /**
   * Check inventory for multiple SKUs at a branch
   */
  async checkBulkInventory(skus: string[], branchId: string): Promise<ABCInventory[]> {
    return this.request<ABCInventory[]>("POST", `/inventory/${branchId}/bulk`, { skus });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Orders
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Create a new order
   */
  async createOrder(request: ABCOrderCreateRequest): Promise<ABCOrder> {
    return this.request<ABCOrder>("POST", "/orders", request as unknown as Record<string, unknown>);
  }

  /**
   * Get order by ID
   */
  async getOrder(orderId: string): Promise<ABCOrder | null> {
    try {
      return await this.request<ABCOrder>("GET", `/orders/${orderId}`);
    } catch {
      return null;
    }
  }

  /**
   * Cancel an order
   */
  async cancelOrder(orderId: string, reason: string): Promise<ABCOrder> {
    return this.request<ABCOrder>("POST", `/orders/${orderId}/cancel`, { reason });
  }

  /**
   * List orders for the account
   */
  async listOrders(
    status?: ABCOrder["status"],
    page = 1,
    limit = 20
  ): Promise<{ orders: ABCOrder[]; total: number }> {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (status) params.set("status", status);
    return this.request("GET", `/orders?${params.toString()}`);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Account
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Get account balance and credit info
   */
  async getAccountInfo(): Promise<{
    accountId: string;
    companyName: string;
    creditLimit: number;
    currentBalance: number;
    availableCredit: number;
  }> {
    return this.request("GET", "/account");
  }

  /**
   * Test connection
   */
  async testConnection(): Promise<{ ok: boolean; error?: string }> {
    try {
      await this.getAccountInfo();
      return { ok: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      return { ok: false, error: message };
    }
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Get ABC Supply client for an organization
 */
export function getABCSupplyClient(orgAccountId: string): ABCSupplyClient {
  return new ABCSupplyClient(orgAccountId);
}

// ============================================================================
// Roofing Material Categories
// ============================================================================

export const ABC_ROOFING_CATEGORIES = [
  "Asphalt Shingles",
  "Metal Roofing",
  "Underlayment",
  "Flashing",
  "Ridge Caps",
  "Ventilation",
  "Fasteners",
  "Sealants",
  "Gutters",
  "Skylights",
  "Ice & Water Shield",
  "Starter Strip",
  "Hip & Ridge",
  "Drip Edge",
] as const;

export type ABCRoofingCategory = (typeof ABC_ROOFING_CATEGORIES)[number];
