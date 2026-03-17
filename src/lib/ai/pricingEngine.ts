/**
 * PHASE 40: Pricing Engine
 * 
 * Applies real-world pricing to line items including:
 * - Base pricing
 * - Waste factor
 * - Region multiplier
 * - Labor burden
 * - Sales tax (city-level)
 * - Overhead & Profit
 */

import { logger } from "@/lib/logger";

import { getPricing } from "./pricingTable";

export interface PricingProfile {
  taxRate: number;
  opPercent: number;
  wasteFactor: number;
  laborFactor: number;
  regionFactor: number;
}

export interface LineItem {
  code: string;
  description: string;
  qty: number;
  units: string;
  justification?: string;
  notes?: string;
}

export interface PricedLineItem extends LineItem {
  unitPrice: number;
  quantityWithWaste: number;
  subtotal: number;
  tax: number;
  op: number;
  total: number;
}

export interface EstimateTotals {
  subtotal: number;
  tax: number;
  op: number;
  total: number;
  rcv: number; // Replacement Cost Value
  itemCount: number;
}

/**
 * Apply waste factor to quantity
 */
export function applyWaste(quantity: number, wasteFactor: number): number {
  return quantity * (1 + wasteFactor);
}

/**
 * Apply region multiplier to price
 */
export function applyRegion(price: number, regionFactor: number): number {
  return price * regionFactor;
}

/**
 * Apply labor factor to price
 */
export function applyLabor(price: number, laborFactor: number): number {
  return price * laborFactor;
}

/**
 * Calculate sales tax
 */
export function applyTax(price: number, taxRate: number): number {
  return price * taxRate;
}

/**
 * Calculate overhead & profit
 */
export function applyOP(price: number, opPercent: number): number {
  return price * opPercent;
}

/**
 * Calculate complete pricing for a single line item
 */
export function calculateLineItemTotal(
  item: LineItem,
  profile: PricingProfile
): PricedLineItem | null {
  try {
    // Get base pricing
    const pricing = getPricing(item.code);
    if (!pricing) {
      logger.warn(`[calculateLineItemTotal] No pricing found for code: ${item.code}`);
      return null;
    }

    // Calculate quantity with waste
    const quantityWithWaste = applyWaste(item.qty, profile.wasteFactor);

    // Calculate base subtotal
    let unitPrice = pricing.unitPrice;
    
    // Apply region multiplier
    unitPrice = applyRegion(unitPrice, profile.regionFactor);
    
    // Apply labor factor
    unitPrice = applyLabor(unitPrice, profile.laborFactor);

    // Calculate subtotal
    const subtotal = quantityWithWaste * unitPrice;

    // Calculate tax
    const tax = applyTax(subtotal, profile.taxRate);

    // Calculate O&P
    const op = applyOP(subtotal, profile.opPercent);

    // Calculate total
    const total = subtotal + tax + op;

    return {
      ...item,
      unitPrice: Math.round(unitPrice * 100) / 100,
      quantityWithWaste: Math.round(quantityWithWaste * 100) / 100,
      subtotal: Math.round(subtotal * 100) / 100,
      tax: Math.round(tax * 100) / 100,
      op: Math.round(op * 100) / 100,
      total: Math.round(total * 100) / 100,
    };
  } catch (error) {
    logger.error(`[calculateLineItemTotal] Error for ${item.code}:`, error);
    return null;
  }
}

/**
 * Calculate totals for all priced items
 */
export function calculateEstimateTotals(
  pricedItems: PricedLineItem[]
): EstimateTotals {
  const totals = pricedItems.reduce(
    (acc, item) => ({
      subtotal: acc.subtotal + item.subtotal,
      tax: acc.tax + item.tax,
      op: acc.op + item.op,
      total: acc.total + item.total,
    }),
    { subtotal: 0, tax: 0, op: 0, total: 0 }
  );

  return {
    subtotal: Math.round(totals.subtotal * 100) / 100,
    tax: Math.round(totals.tax * 100) / 100,
    op: Math.round(totals.op * 100) / 100,
    total: Math.round(totals.total * 100) / 100,
    rcv: Math.round(totals.total * 100) / 100, // RCV = Total for now
    itemCount: pricedItems.length,
  };
}

/**
 * Price an entire scope
 */
export function priceScope(
  items: LineItem[],
  profile: PricingProfile
): {
  pricedItems: PricedLineItem[];
  totals: EstimateTotals;
  unpricedItems: LineItem[];
} {
  const pricedItems: PricedLineItem[] = [];
  const unpricedItems: LineItem[] = [];

  for (const item of items) {
    const priced = calculateLineItemTotal(item, profile);
    if (priced) {
      pricedItems.push(priced);
    } else {
      unpricedItems.push(item);
    }
  }

  const totals = calculateEstimateTotals(pricedItems);

  return {
    pricedItems,
    totals,
    unpricedItems,
  };
}

/**
 * City-level tax rates for Arizona
 */
export const ARIZONA_TAX_RATES: Record<string, number> = {
  // Phoenix Metro
  phoenix: 0.089, // 8.9%
  scottsdale: 0.0855, // 8.55%
  tempe: 0.088, // 8.8%
  mesa: 0.092, // 9.2%
  chandler: 0.088, // 8.8%
  gilbert: 0.082, // 8.2%
  glendale: 0.0905, // 9.05%
  peoria: 0.0895, // 8.95%
  surprise: 0.088, // 8.8%
  
  // Tucson Area
  tucson: 0.087, // 8.7%
  
  // Northern Arizona
  flagstaff: 0.0916, // 9.16%
  prescott: 0.0918, // 9.18%
  "prescott valley": 0.0918, // 9.18%
  "chino valley": 0.0835, // 8.35%
  sedona: 0.0895, // 8.95%
  
  // Default
  default: 0.089, // 8.9% AZ state average
};

/**
 * Get tax rate for a city
 */
export function getTaxRateForCity(city: string): number {
  const normalized = city.toLowerCase().trim();
  return ARIZONA_TAX_RATES[normalized] || ARIZONA_TAX_RATES.default;
}
