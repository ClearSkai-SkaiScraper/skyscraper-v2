/**
 * Demo Data Helper
 *
 * Per AI advisor: "Ensure demo data is clearly separated from real data.
 * Add consistent tagging so demo records can be easily identified and purged."
 *
 * This module provides utilities for:
 * 1. Tagging demo data consistently
 * 2. Filtering demo data in queries
 * 3. Purging demo data safely
 */

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

// Demo data prefix/tag used across all tables
export const DEMO_PREFIX = "[DEMO]";
export const DEMO_TAG = "demo-data";

/**
 * Check if a record is demo data based on title/name/description
 */
export function isDemoRecord(record: {
  title?: string | null;
  name?: string | null;
  description?: string | null;
}): boolean {
  const fields = [record.title, record.name, record.description].filter(Boolean);
  return fields.some((field) => field?.startsWith(DEMO_PREFIX) || field?.includes(DEMO_TAG));
}

/**
 * Tag a string as demo data
 */
export function tagAsDemo(value: string): string {
  if (value.startsWith(DEMO_PREFIX)) return value;
  return `${DEMO_PREFIX} ${value}`;
}

/**
 * Remove demo tag from a string
 */
export function untagDemo(value: string): string {
  return value
    .replace(new RegExp(`^\\${DEMO_PREFIX}\\s*`), "")
    .replace(new RegExp(DEMO_TAG, "g"), "")
    .trim();
}

/**
 * Check if org is in demo mode
 */
export async function isOrgInDemoMode(orgId: string): Promise<boolean> {
  try {
    const org = await prisma.org.findUnique({
      where: { id: orgId },
      select: { demoMode: true },
    });
    return org?.demoMode ?? false;
  } catch (error) {
    logger.warn("[DEMO_HELPER] Failed to check demo mode:", error);
    return false;
  }
}

/**
 * Get demo record count for an org
 */
export async function getDemoRecordCounts(orgId: string): Promise<{
  claims: number;
  leads: number;
  contacts: number;
  properties: number;
}> {
  const [claims, leads, contacts, properties] = await Promise.all([
    prisma.claims.count({
      where: {
        orgId,
        OR: [{ title: { startsWith: DEMO_PREFIX } }, { description: { contains: DEMO_TAG } }],
      },
    }),
    prisma.leads.count({
      where: {
        orgId,
        OR: [
          { title: { startsWith: DEMO_PREFIX } },
          { description: { contains: DEMO_TAG } },
          { isDemo: true },
        ],
      },
    }),
    prisma.contacts.count({
      where: {
        orgId,
        firstName: { startsWith: DEMO_PREFIX },
      },
    }),
    prisma.properties.count({
      where: {
        orgId,
        OR: [{ name: { startsWith: DEMO_PREFIX } }, { isDemo: true }],
      },
    }),
  ]);

  return { claims, leads, contacts, properties };
}

/**
 * Purge all demo records for an org
 * Returns count of deleted records
 */
export async function purgeOrgDemoData(orgId: string): Promise<{
  claims: number;
  leads: number;
  contacts: number;
  properties: number;
  total: number;
}> {
  logger.info("[DEMO_HELPER] Purging demo data for org:", orgId);

  // Delete in order to respect foreign keys
  // Claims first (they reference properties)
  const deletedClaims = await prisma.claims.deleteMany({
    where: {
      orgId,
      OR: [{ title: { startsWith: DEMO_PREFIX } }, { description: { contains: DEMO_TAG } }],
    },
  });

  const deletedLeads = await prisma.leads.deleteMany({
    where: {
      orgId,
      OR: [
        { title: { startsWith: DEMO_PREFIX } },
        { description: { contains: DEMO_TAG } },
        { isDemo: true },
      ],
    },
  });

  const deletedContacts = await prisma.contacts.deleteMany({
    where: {
      orgId,
      firstName: { startsWith: DEMO_PREFIX },
    },
  });

  const deletedProperties = await prisma.properties.deleteMany({
    where: {
      orgId,
      OR: [{ name: { startsWith: DEMO_PREFIX } }, { isDemo: true }],
    },
  });

  const result = {
    claims: deletedClaims.count,
    leads: deletedLeads.count,
    contacts: deletedContacts.count,
    properties: deletedProperties.count,
    total:
      deletedClaims.count + deletedLeads.count + deletedContacts.count + deletedProperties.count,
  };

  logger.info("[DEMO_HELPER] Purge complete:", result);
  return result;
}

/**
 * Create standard demo claim data for seeding
 */
export function createDemoClaimData(orgId: string, propertyId: string) {
  return {
    id: crypto.randomUUID(),
    orgId,
    propertyId,
    claimNumber: `${DEMO_PREFIX}-${Date.now().toString(36).toUpperCase()}`,
    title: tagAsDemo("Sample Hail Damage Claim"),
    description: `${DEMO_TAG}: This is a sample claim for demonstration purposes. This record will be removed when demo mode is disabled.`,
    damageType: "hail",
    status: "new",
    carrier: "State Farm",
    priority: "medium",
    dateOfLoss: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Create standard demo lead data for seeding
 */
export function createDemoLeadData(orgId: string) {
  return {
    id: crypto.randomUUID(),
    orgId,
    title: tagAsDemo("Storm Damage Lead - Oak Street"),
    status: "new",
    source: "demo",
    notes: `${DEMO_TAG}: Sample lead created for demonstration. Will be purged when demo mode is disabled.`,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}
