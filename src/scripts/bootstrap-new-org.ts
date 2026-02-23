// Adapter for bootstrapping new orgs
import { bootstrapNewOrgForUser } from "@/lib/organizations";
import prismaDefault from "@/lib/prisma";

export const prisma = prismaDefault;

/**
 * Wrapper function to match the Clerk webhook's expected signature
 * Converts between webhook format and library format
 */
export async function bootstrapNewOrg(
  userId: string,
  orgId: string,
  _options?: {
    includeWelcomeData?: boolean;
    initialTokens?: number;
    skipBrandingSetup?: boolean;
  }
): Promise<{ success: boolean; errors?: string[] }> {
  try {
    await bootstrapNewOrgForUser({
      clerkUserId: userId,
      clerkOrgId: orgId,
    });
    return { success: true };
  } catch (error) {
    return {
      success: false,
      errors: [error instanceof Error ? error.message : "Unknown error during bootstrap"],
    };
  }
}
