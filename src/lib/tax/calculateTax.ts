// src/lib/tax/calculateTax.ts
// Tax calculation utility for SkaiScraper
// Supports org-level tax rates with state-specific overrides

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export interface TaxConfig {
  rate: number; // Percentage (e.g., 8.5 = 8.5%)
  isEnabled: boolean;
  state?: string;
}

export interface TaxCalculation {
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
}

// Default tax rates by state (can be expanded)
const STATE_TAX_RATES: Record<string, number> = {
  AZ: 5.6,
  CA: 7.25,
  CO: 2.9,
  FL: 6.0,
  NV: 6.85,
  TX: 6.25,
  // Add more states as needed
};

/**
 * Get tax rate for an organization
 * Priority: org_branding.taxRate > state default > 0
 */
export async function getOrgTaxRate(orgId: string): Promise<TaxConfig> {
  try {
    // Try to get org-specific tax rate from branding settings
    const branding = await prisma.org_branding.findFirst({
      where: { orgId },
      select: {
        // We'll use a convention where tax rate is stored
        // For now, return default until migration adds the field
      },
    });

    // Once taxRate field is added to org_branding:
    // if (branding?.taxRate !== undefined && branding.taxRate !== null) {
    //   return {
    //     rate: branding.taxRate,
    //     isEnabled: branding.taxRate > 0,
    //   };
    // }

    // For now, return default (0) - tax disabled until configured
    return {
      rate: 0,
      isEnabled: false,
    };
  } catch (error) {
    logger.error("[Tax] Error fetching org tax rate:", error);
    return { rate: 0, isEnabled: false };
  }
}

/**
 * Get default tax rate for a state
 */
export function getStateTaxRate(state: string): number {
  const normalizedState = state.toUpperCase().trim();
  return STATE_TAX_RATES[normalizedState] || 0;
}

/**
 * Calculate tax for a given subtotal
 */
export function calculateTax(subtotal: number, taxRate: number): TaxCalculation {
  // Ensure we have valid numbers
  const validSubtotal = Number(subtotal) || 0;
  const validRate = Number(taxRate) || 0;

  // Calculate tax amount
  const taxAmount = validSubtotal * (validRate / 100);

  return {
    subtotal: validSubtotal,
    taxRate: validRate,
    taxAmount: Math.round(taxAmount * 100) / 100, // Round to 2 decimal places
    total: Math.round((validSubtotal + taxAmount) * 100) / 100,
  };
}

/**
 * Format tax rate as percentage string
 */
export function formatTaxRate(rate: number): string {
  if (rate === 0) return "No tax";
  return `${rate.toFixed(2)}%`;
}

/**
 * Format currency with proper locale
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

/**
 * Calculate tax for line items with individual tax treatment
 */
export function calculateLineItemsTax(
  items: Array<{ qty: number; unitPrice: number; isTaxable?: boolean }>,
  taxRate: number
): TaxCalculation {
  let taxableSubtotal = 0;
  let nonTaxableSubtotal = 0;

  for (const item of items) {
    const lineTotal = item.qty * item.unitPrice;
    if (item.isTaxable !== false) {
      taxableSubtotal += lineTotal;
    } else {
      nonTaxableSubtotal += lineTotal;
    }
  }

  const taxAmount = taxableSubtotal * (taxRate / 100);
  const subtotal = taxableSubtotal + nonTaxableSubtotal;

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    taxRate,
    taxAmount: Math.round(taxAmount * 100) / 100,
    total: Math.round((subtotal + taxAmount) * 100) / 100,
  };
}
