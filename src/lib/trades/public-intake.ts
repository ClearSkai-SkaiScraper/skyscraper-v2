import { logger } from "@/lib/logger";

/**
 * Public Intake Handler
 * Phase 5: Turns public requests into full CRM pipeline
 * 
 * @deprecated DISABLED - Missing Prisma models (customer_accounts, customer_properties, public_leads)
 * These models were removed from schema. Feature needs redesign or re-implementation.
 * 
 * Original Flow:
 * 1. Ensure/create CustomerAccount
 * 2. Optionally create CustomerProperty
 * 3. Create PublicLead
 * 4. Create internal CRM Lead
 * 5. Queue AI intake job
 */

type PublicSubmitPayload = {
  contractorSlug: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  details?: Record<string, any>;
  photos?: string[];
  trade?: string;
};

/**
 * DISABLED: This feature requires Prisma models that don't exist in current schema.
 * Returns a safe stub response instead of crashing.
 * 
 * Missing models:
 * - customer_accounts
 * - customer_properties
 * - public_leads
 * - contractor_profiles (should be ContractorProfile)
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function handlePublicSubmit(payload: PublicSubmitPayload) {
  logger.warn('[public-intake] Feature disabled - missing backing Prisma models (customer_accounts, customer_properties, public_leads)');
  
  // Return a minimal stub response that matches expected shape
  return {
    publicLead: null,
    crmLead: null,
    customer: null,
    property: null,
    disabled: true,
    reason: 'Feature requires schema migration - models not yet implemented'
  };
}
