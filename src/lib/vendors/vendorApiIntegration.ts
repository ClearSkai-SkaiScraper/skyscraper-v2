import { logger } from "@/lib/logger";

/**
 * Vendor API Integration Layer
 *
 * Handles integration with major roofing/building material suppliers:
 * - ABC Supply
 * - Beacon Building Products
 * - SRS Distribution
 * - GAF Direct
 *
 * ENHANCEMENT: Production implementations would use actual vendor API credentials
 * and endpoints. Currently uses mock/simulation mode.
 */

export interface VendorOrder {
  orderId: string;
  vendorCode: string;
  items: Array<{
    sku: string;
    productName: string;
    quantity: number;
    unitPrice: number;
  }>;
  deliveryAddress: string;
  deliveryDate?: string;
  specialInstructions?: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
}

export interface VendorOrderResponse {
  success: boolean;
  vendorOrderId?: string;
  confirmationNumber?: string;
  estimatedDelivery?: string;
  status: "pending" | "confirmed" | "processing" | "shipped" | "delivered" | "error";
  message?: string;
  error?: string;
}

export interface VendorPriceQuote {
  sku: string;
  price: number;
  availability: "in_stock" | "limited" | "backorder" | "unavailable";
  leadTime?: string;
  minimumOrder?: number;
}

// Vendor configuration
const VENDOR_CONFIGS: Record<
  string,
  {
    name: string;
    apiEndpoint: string;
    supportsRealtime: boolean;
    requiresAccount: boolean;
  }
> = {
  abc: {
    name: "ABC Supply",
    // eslint-disable-next-line no-restricted-syntax
    apiEndpoint: process.env.ABC_SUPPLY_API_URL || "https://api.abcsupply.com/v1",
    supportsRealtime: true,
    requiresAccount: true,
  },
  beacon: {
    name: "Beacon Building Products",
    // eslint-disable-next-line no-restricted-syntax
    apiEndpoint: process.env.BEACON_API_URL || "https://api.becn.com/v1",
    supportsRealtime: true,
    requiresAccount: true,
  },
  srs: {
    name: "SRS Distribution",
    // eslint-disable-next-line no-restricted-syntax
    apiEndpoint: process.env.SRS_API_URL || "https://api.srsdistribution.com/v1",
    supportsRealtime: false,
    requiresAccount: true,
  },
  gaf: {
    name: "GAF Materials",
    // eslint-disable-next-line no-restricted-syntax
    apiEndpoint: process.env.GAF_API_URL || "https://api.gaf.com/contractor/v1",
    supportsRealtime: true,
    requiresAccount: true,
  },
};

/**
 * Submit an order to a vendor's API
 * In production, this would call the actual vendor API
 */
export async function submitVendorOrder(order: VendorOrder): Promise<VendorOrderResponse> {
  const config = VENDOR_CONFIGS[order.vendorCode];

  if (!config) {
    return {
      success: false,
      status: "error",
      error: `Unknown vendor: ${order.vendorCode}`,
    };
  }

  logger.info(`[VENDOR_API] Submitting order to ${config.name}`, {
    orderId: order.orderId,
    items: order.items.length,
    deliveryAddress: order.deliveryAddress,
  });

  // Check for vendor API credentials
  const apiKey = getVendorApiKey(order.vendorCode);

  // eslint-disable-next-line no-restricted-syntax
  if (apiKey && process.env.VENDOR_API_LIVE === "true") {
    // Production: Call actual vendor API
    return await callVendorApi(order, config, apiKey);
  }

  // Simulation mode: Return mock confirmation
  return simulateVendorResponse(order, config);
}

/**
 * Get real-time pricing from vendor
 */
export async function getVendorPricing(
  vendorCode: string,
  skus: string[]
): Promise<VendorPriceQuote[]> {
  const config = VENDOR_CONFIGS[vendorCode];

  if (!config) {
    logger.warn(`[VendorAPI] Unknown vendor: ${vendorCode}`);
    return [];
  }

  const apiKey = getVendorApiKey(vendorCode);

  // eslint-disable-next-line no-restricted-syntax
  if (apiKey && config.supportsRealtime && process.env.VENDOR_API_LIVE === "true") {
    // Production: Call actual pricing API
    return await fetchVendorPricing(vendorCode, skus, apiKey);
  }

  // Simulation: Return estimated pricing
  return skus.map((sku) => ({
    sku,
    price: estimatePrice(sku),
    availability: "in_stock" as const,
    leadTime: "3-5 business days",
  }));
}

/**
 * Check inventory availability
 */
export async function checkVendorInventory(
  vendorCode: string,
  skus: string[],
  zipCode: string
): Promise<Record<string, { available: boolean; quantity: number; nearestBranch?: string }>> {
  const config = VENDOR_CONFIGS[vendorCode];

  if (!config) {
    return {};
  }

  logger.debug(`[VendorAPI] Checking inventory at ${config.name} for zip ${zipCode}`);

  // Simulation: All items available
  const result: Record<string, { available: boolean; quantity: number; nearestBranch?: string }> =
    {};
  for (const sku of skus) {
    result[sku] = {
      available: true,
      quantity: Math.floor(Math.random() * 500) + 50,
      nearestBranch: `${config.name} - ${zipCode.slice(0, 3)}XX Branch`,
    };
  }

  return result;
}

/**
 * Track order status from vendor
 */
export async function trackVendorOrder(
  vendorCode: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  vendorOrderId: string
): Promise<{
  status: string;
  estimatedDelivery?: string;
  trackingNumber?: string;
  lastUpdate?: string;
}> {
  const config = VENDOR_CONFIGS[vendorCode];

  if (!config) {
    return { status: "unknown" };
  }

  // Simulation: Return mock tracking
  return {
    status: "processing",
    estimatedDelivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    lastUpdate: new Date().toISOString(),
  };
}

// --- Internal Helpers ---

function getVendorApiKey(vendorCode: string): string | undefined {
  const envKeys: Record<string, string | undefined> = {
    // eslint-disable-next-line no-restricted-syntax
    abc: process.env.ABC_SUPPLY_API_KEY,
    // eslint-disable-next-line no-restricted-syntax
    beacon: process.env.BEACON_API_KEY,
    // eslint-disable-next-line no-restricted-syntax
    srs: process.env.SRS_API_KEY,
    // eslint-disable-next-line no-restricted-syntax
    gaf: process.env.GAF_API_KEY,
  };
  return envKeys[vendorCode];
}

async function callVendorApi(
  order: VendorOrder,
  config: { name: string; apiEndpoint: string },
  apiKey: string
): Promise<VendorOrderResponse> {
  try {
    const response = await fetch(`${config.apiEndpoint}/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "X-API-Version": "2024-01",
      },
      body: JSON.stringify({
        externalOrderId: order.orderId,
        lineItems: order.items.map((item) => ({
          sku: item.sku,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
        shipping: {
          address: order.deliveryAddress,
          requestedDate: order.deliveryDate,
          instructions: order.specialInstructions,
        },
        contact: {
          name: order.contactName,
          phone: order.contactPhone,
          email: order.contactEmail,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Vendor API error: ${response.status}`);
    }

    const data = await response.json();
    return {
      success: true,
      vendorOrderId: data.orderId,
      confirmationNumber: data.confirmationNumber,
      estimatedDelivery: data.estimatedDeliveryDate,
      status: "confirmed",
    };
  } catch (error) {
    logger.error(`[VendorAPI] ${config.name} API error:`, error);
    return {
      success: false,
      status: "error",
      error: error instanceof Error ? error.message : "API call failed",
    };
  }
}

async function fetchVendorPricing(
  vendorCode: string,
  skus: string[],
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  apiKey: string
): Promise<VendorPriceQuote[]> {
  // Implementation would call actual vendor pricing API
  // For now, return estimated prices
  return skus.map((sku) => ({
    sku,
    price: estimatePrice(sku),
    availability: "in_stock" as const,
  }));
}

function simulateVendorResponse(order: VendorOrder, config: { name: string }): VendorOrderResponse {
  // Generate mock confirmation
  const confirmationNumber = `${order.vendorCode.toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;

  return {
    success: true,
    vendorOrderId: `VO-${crypto.randomUUID().slice(0, 8)}`,
    confirmationNumber,
    estimatedDelivery: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    status: "confirmed",
    message: `Order submitted to ${config.name} (simulation mode)`,
  };
}

function estimatePrice(sku: string): number {
  // Rough price estimation based on SKU pattern
  const hash = sku.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return Math.round((hash % 100) + 25 + Math.random() * 50);
}

/**
 * Get supported vendors
 */
export function getSupportedVendors() {
  return Object.entries(VENDOR_CONFIGS).map(([code, config]) => ({
    code,
    name: config.name,
    supportsRealtime: config.supportsRealtime,
    hasCredentials: !!getVendorApiKey(code),
  }));
}
