import { logger } from "@/lib/logger";

/**
 * Hook for fetching product pricing
 */

export interface PriceData {
  price: number | null;
  unit: string;
  source: "manual" | "ai" | "none";
}

/**
 * Fetch pricing for a product
 * @param productId - The vendor product ID
 * @param market - Market region (default: "US")
 * @returns Price data or null if unavailable
 */
export async function fetchPrice(productId: string, market = "US"): Promise<PriceData | null> {
  try {
    const res = await fetch(
      `/api/pricing?productId=${encodeURIComponent(productId)}&market=${encodeURIComponent(market)}`
    );

    if (!res.ok) {
      logger.error("[PRICE_FETCH] Failed to fetch price", { status: res.statusText });
      return null;
    }

    return await res.json();
  } catch (error) {
    logger.error("Error fetching price:", error);
    return null;
  }
}

/**
 * Format price in dollars
 * @param cents - Price in cents
 * @returns Formatted price string (e.g., "$12.99")
 */
export function formatPrice(cents: number | null): string {
  if (cents === null || cents === undefined) return "N/A";
  return `$${(cents / 100).toFixed(2)}`;
}

/**
 * Calculate line total
 * @param pricePerUnit - Price per unit in cents
 * @param quantity - Quantity
 * @returns Total price in cents
 */
export function calculateLineTotal(pricePerUnit: number | null, quantity: number): number {
  if (pricePerUnit === null || pricePerUnit === undefined) return 0;
  return pricePerUnit * quantity;
}
