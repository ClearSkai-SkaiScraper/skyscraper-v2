import { ensureDemoDataForOrg } from "@/lib/demoSeed";
import prisma from "@/lib/prisma";

/**
 * Idempotently ensures the public demo org exists and has at least one claim.
 * Safe to call in production; never throws (returns orgId or null).
 */
export async function ensurePublicDemoOrg(): Promise<string | null> {
  try {
    const existing = await prisma.org.findUnique({
      where: { clerkOrgId: "public_demo" },
      select: { id: true },
    });
    const orgId = existing?.id
      ? existing.id
      : (
          await prisma.org.create({
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            data: { name: "Public Demo", clerkOrgId: "public_demo" } as any,
            select: { id: true },
          })
        ).id;

    // Ensure demo data exists; swallow errors to avoid RSC digest
    try {
      await ensureDemoDataForOrg({ orgId });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (__) {}

    return orgId;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (__) {
    return null;
  }
}
