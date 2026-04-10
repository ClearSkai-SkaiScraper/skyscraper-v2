// eslint-disable-next-line no-restricted-imports
import { currentUser } from "@clerk/nextjs/server";

import { logger } from "@/lib/logger";

import { CompanyBranding,getBrandingForUser } from "./branding";
import { getSupabaseAdmin } from "./supabaseAdmin";

export interface WizardContext {
  user: {
    id: string;
    email: string | null;
    firstName: string | null;
    lastName: string | null;
  };
  branding: CompanyBranding | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  lead: any | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  job: any | null;
}

/**
 * Load complete context for Claims Wizard and Quick PDF pages
 * Includes user, company branding, and optional lead/job data
 */
export async function loadWizardContext({
  leadId,
  jobId,
}: {
  leadId?: string;
  jobId?: string;
}): Promise<WizardContext> {
  const user = await currentUser();
  if (!user) {
    throw new Error("No authenticated user");
  }

  // Load company branding
  const branding = await getBrandingForUser(user.id);

  // Load lead if provided
  let lead = null;
  if (leadId) {
    try {
      const admin = getSupabaseAdmin();
      if (admin) {
        const { data } = await admin.from("leads").select("*").eq("id", leadId).maybeSingle();
        lead = data;
      }
    } catch (err) {
      logger.error("[loadWizardContext] Error loading lead:", err);
    }
  }

  // Load job if provided
  let job = null;
  if (jobId) {
    try {
      const admin = getSupabaseAdmin();
      if (admin) {
        const { data } = await admin.from("jobs").select("*").eq("id", jobId).maybeSingle();
        job = data;
      }
    } catch (err) {
      logger.error("[loadWizardContext] Error loading job:", err);
    }
  }

  return {
    user: {
      id: user.id,
      email: user.emailAddresses[0]?.emailAddress ?? null,
      firstName: user.firstName,
      lastName: user.lastName,
    },
    branding,
    lead,
    job,
  };
}
