
import { getActiveOrgSafe } from "@/lib/auth/getActiveOrgSafe";
import prisma from "@/lib/prisma";

// Prisma singleton imported from @/lib/db/prisma

export async function requireOrg() {
  const orgResult = await getActiveOrgSafe();

  if (!orgResult.ok) {
    throw new Error("Failed to get organization: " + orgResult.reason);
  }

  const dbOrg = await prisma.org.findUnique({
    where: { id: orgResult.org.id },
  });

  if (!dbOrg) {
    throw new Error("Organization not found after auto-creation");
  }

  return dbOrg;
}

export async function getCurrentOrg() {
  const orgResult = await getActiveOrgSafe();

  if (!orgResult.ok) {
    return null;
  }

  return prisma.org.findUnique({
    where: { id: orgResult.org.id },
  });
}
