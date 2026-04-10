"use server";

// eslint-disable-next-line no-restricted-imports
import { currentUser } from "@clerk/nextjs/server";
import { cache } from "react";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export type JobPin = {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  status: string;
  type: "job" | "project" | "claim";
  value?: number;
  priority?: string;
  scheduledDate?: Date;
};

/**
 * Get all jobs/projects with location data for map display
 */

// Deterministic position from address string (until real geocoding API is added)
function addressToCoords(address: string): { lat: number; lng: number } {
  let h = 0;
  for (let i = 0; i < address.length; i++) {
    h = (Math.imul(31, h) + address.charCodeAt(i)) | 0;
  }
  return {
    lat: 33.4484 + ((Math.abs(h) % 1000) / 1000) * 0.4 - 0.2,
    lng: -112.074 + ((Math.abs(h >> 10) % 1000) / 1000) * 0.4 - 0.2,
  };
}

export const getJobsForMap = cache(async (): Promise<JobPin[]> => {
  const user = await currentUser();
  if (!user) return [];

  const orgId = (user.publicMetadata?.orgId as string) || user.id;

  try {
    // Get active jobs
    const jobs = await prisma.jobs.findMany({
      where: {
        orgId,
        status: { in: ["pending", "in_progress", "scheduled"] },
      },
      take: 50,
      orderBy: { createdAt: "desc" },
    });

    // Get active projects
    const projects = await prisma.projects.findMany({
      where: {
        orgId,
        status: {
          in: [
            "LEAD",
            "QUALIFIED",
            "INSPECTION_SCHEDULED",
            "ESTIMATE_SENT",
            "APPROVED",
            "PRODUCTION",
          ],
        },
      },
      take: 50,
      orderBy: { createdAt: "desc" },
    });

    const propertyIds = Array.from(
      new Set(
        [...jobs.map((j) => j.propertyId), ...projects.map((p) => p.propertyId)].filter(
          (id): id is string => Boolean(id)
        )
      )
    );
    const properties = propertyIds.length
      ? await prisma.properties.findMany({
          where: { id: { in: propertyIds } },
          select: { id: true, name: true, street: true, city: true, state: true, zipCode: true },
        })
      : [];
    const propertiesById = new Map(properties.map((p) => [p.id, p] as const));

    const jobPins: JobPin[] = jobs
      .map((job) => ({
        job,
        property: propertiesById.get(job.propertyId) ?? null,
      }))
      .filter((x) => Boolean(x.property))
      .map(({ job, property }) => {
        const address = `${property!.street}, ${property!.city}, ${property!.state} ${property!.zipCode}`;
        const coords = addressToCoords(address);
        return {
          id: job.id,
          name: property!.name,
          address,
          lat: coords.lat,
          lng: coords.lng,
          status: job.status,
          type: "job",
          priority: job.priority,
          scheduledDate: job.scheduledStart || undefined,
        };
      });

    const projectPins: JobPin[] = projects
      .map((proj) => ({
        proj,
        property: proj.propertyId ? (propertiesById.get(proj.propertyId) ?? null) : null,
      }))
      .filter((x) => Boolean(x.property))
      .map(({ proj, property }) => {
        const address = `${property!.street}, ${property!.city}, ${property!.state} ${property!.zipCode}`;
        const coords = addressToCoords(address);
        return {
          id: proj.id,
          name: property!.name,
          address,
          lat: coords.lat,
          lng: coords.lng,
          status: proj.status,
          type: "project",
          value: proj.valueEstimate || undefined,
        };
      });

    return [...jobPins, ...projectPins];
  } catch (error) {
    logger.error("Error fetching jobs for map:", error);
    return [];
  }
});
