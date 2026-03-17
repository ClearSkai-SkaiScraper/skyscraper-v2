/**
 * Contractors Data
 *
 * Data access for contractor information using Prisma
 */

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export interface Contractor {
  id: string;
  user_id: string;
  trade: string;
  region: string;
  companyName: string | null;
  website: string | null;
  contactEmail: string | null;
  profilePhotoUrl: string | null;
  description: string | null;
  premium: boolean;
  created_at: Date;
  updated_at: Date;
}

/**
 * Get contractor by ID
 */
export async function getContractor(contractorId: string): Promise<Contractor | null> {
  try {
    const contractor = await prisma.contractors.findUnique({
      where: { id: contractorId },
    });
    if (!contractor) return null;
    return {
      id: contractor.id,
      user_id: contractor.user_id,
      trade: contractor.trade,
      region: contractor.region,
      companyName: contractor.company_name,
      website: contractor.website,
      contactEmail: contractor.contact_email,
      profilePhotoUrl: contractor.profile_photo_url,
      description: contractor.description,
      premium: contractor.premium,
      created_at: contractor.created_at,
      updated_at: contractor.updated_at,
    };
  } catch (error) {
    logger.error(`[ContractorsData] Error getting contractor ${contractorId}:`, error);
    return null;
  }
}

/**
 * List contractors
 */
export async function listContractors(options?: {
  specialty?: string;
  location?: string;
  limit?: number;
  offset?: number;
}): Promise<{ contractors: Contractor[]; total: number }> {
  try {
    const where: Record<string, unknown> = {};
    if (options?.specialty) {
      where.trade = options.specialty;
    }
    if (options?.location) {
      where.region = { contains: options.location, mode: "insensitive" };
    }

    const [contractors, total] = await Promise.all([
      prisma.contractors.findMany({
        where,
        take: options?.limit || 50,
        skip: options?.offset || 0,
        orderBy: [{ premium: "desc" }, { company_name: "asc" }],
      }),
      prisma.contractors.count({ where }),
    ]);

    return {
      contractors: contractors.map((c) => ({
        id: c.id,
        user_id: c.user_id,
        trade: c.trade,
        region: c.region,
        companyName: c.company_name,
        website: c.website,
        contactEmail: c.contact_email,
        profilePhotoUrl: c.profile_photo_url,
        description: c.description,
        premium: c.premium,
        created_at: c.created_at,
        updated_at: c.updated_at,
      })),
      total,
    };
  } catch (error) {
    logger.error("[ContractorsData] Error listing contractors:", error);
    return { contractors: [], total: 0 };
  }
}

/**
 * Search contractors
 */
export async function searchContractors(
  query: string,
  options?: { limit?: number }
): Promise<Contractor[]> {
  try {
    const contractors = await prisma.contractors.findMany({
      where: {
        OR: [
          { company_name: { contains: query, mode: "insensitive" } },
          { trade: { contains: query, mode: "insensitive" } },
          { region: { contains: query, mode: "insensitive" } },
          { description: { contains: query, mode: "insensitive" } },
        ],
      },
      take: options?.limit || 20,
      orderBy: [{ premium: "desc" }, { company_name: "asc" }],
    });

    return contractors.map((c) => ({
      id: c.id,
      user_id: c.user_id,
      trade: c.trade,
      region: c.region,
      companyName: c.company_name,
      website: c.website,
      contactEmail: c.contact_email,
      profilePhotoUrl: c.profile_photo_url,
      description: c.description,
      premium: c.premium,
      created_at: c.created_at,
      updated_at: c.updated_at,
    }));
  } catch (error) {
    logger.error(`[ContractorsData] Error searching contractors for "${query}":`, error);
    return [];
  }
}

/**
 * Get contractors by specialty
 */
export async function getContractorsBySpecialty(specialty: string): Promise<Contractor[]> {
  try {
    const contractors = await prisma.contractors.findMany({
      where: { trade: specialty },
      orderBy: [{ premium: "desc" }, { company_name: "asc" }],
    });

    return contractors.map((c) => ({
      id: c.id,
      user_id: c.user_id,
      trade: c.trade,
      region: c.region,
      companyName: c.company_name,
      website: c.website,
      contactEmail: c.contact_email,
      profilePhotoUrl: c.profile_photo_url,
      description: c.description,
      premium: c.premium,
      created_at: c.created_at,
      updated_at: c.updated_at,
    }));
  } catch (error) {
    logger.error(`[ContractorsData] Error getting contractors by specialty ${specialty}:`, error);
    return [];
  }
}

/**
 * Fetch contractor by ID - alias for getContractor
 */
export const fetchContractorById = getContractor;

/**
 * Fetch contractors - alias for listContractors
 */
export async function fetchContractors(options?: {
  specialty?: string;
  location?: string;
  limit?: number;
  offset?: number;
}): Promise<Contractor[]> {
  const result = await listContractors(options);
  return result.contractors;
}
