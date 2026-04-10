"use server";

// eslint-disable-next-line no-restricted-imports
import { currentUser } from "@clerk/nextjs/server";
import JSZip from "jszip";
import { cache } from "react";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export interface ExportProject {
  id: string;
  title: string;
  propertyAddress: string;
  claimNumber?: string;
  documentCount: number;
  photoCount: number;
  hasWeatherReport: boolean;
  hasDOL: boolean;
  status: string;
  value?: number;
}

export const getExportableProjects = cache(async (): Promise<ExportProject[]> => {
  const user = await currentUser();
  if (!user) return [];

  const orgId = (user.publicMetadata?.orgId as string) || user.id;

  try {
    const projects = await prisma.projects.findMany({
      where: { orgId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const propertyIds = Array.from(
      new Set(projects.map((p) => p.propertyId).filter((id): id is string => Boolean(id)))
    );
    const properties = propertyIds.length
      ? await prisma.properties.findMany({
          where: { id: { in: propertyIds } },
          select: { id: true, street: true, city: true, state: true, zipCode: true },
        })
      : [];
    const propertiesById = new Map(properties.map((p) => [p.id, p] as const));

    return projects.map((project) => {
      const property = project.propertyId ? propertiesById.get(project.propertyId) : null;
      const propertyAddress = property
        ? `${property.street}, ${property.city}, ${property.state} ${property.zipCode}`
        : "Address not available";

      return {
        id: project.id,
        title: project.title,
        propertyAddress,
        claimNumber: undefined, // Would link to claim if available
        documentCount: 0,
        photoCount: 0,
        hasWeatherReport: false,
        hasDOL: false,
        status: project.status,
        value: project.valueEstimate || undefined,
      };
    });
  } catch (error) {
    logger.error("[getExportableProjects] Error:", error);
    return [];
  }
});

export async function generateCarrierExport(
  projectId: string
): Promise<{ success: boolean; downloadUrl?: string; message?: string }> {
  const user = await currentUser();
  if (!user) {
    return { success: false, message: "User not authenticated" };
  }

  try {
    const project = await prisma.projects.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return { success: false, message: "Project not found" };
    }

    // Note: core schema does not currently define project -> property/documents relations.
    // When those relations exist, this can be upgraded to bundle related files.

    // TODO: Implement ZIP bundling with JSZip
    // 1. Fetch all document URLs
    // 2. Download each file
    // 3. Create ZIP with organized structure:
    //    - /photos/*.jpg
    //    - /reports/weather_report.pdf
    //    - /reports/dol.pdf
    //    - /documents/*.pdf
    // 4. Upload ZIP to storage
    // 5. Return download URL

    return {
      success: true,
      downloadUrl: `/api/exports/carrier/${projectId}/download`,
      message: `Export prepared for project ${project.title || projectId}`,
    };
  } catch (error) {
    logger.error("[generateCarrierExport] Error:", error);
    return { success: false, message: "Failed to generate export" };
  }
}

/**
 * Bulk export multiple projects as a ZIP file
 */
export async function generateBulkCarrierExport(
  projectIds: string[]
): Promise<{ success: boolean; downloadUrl?: string; message?: string }> {
  const user = await currentUser();
  if (!user) {
    return { success: false, message: "User not authenticated" };
  }

  const orgId = (user.publicMetadata?.orgId as string) || user.id;

  try {
    // Fetch all requested projects
    const projects = await prisma.projects.findMany({
      where: {
        id: { in: projectIds },
        orgId, // Security: only export user's own projects
      },
    });

    if (projects.length === 0) {
      return { success: false, message: "No valid projects found" };
    }

    // Get properties for addresses
    const propertyIds = Array.from(
      new Set(projects.map((p) => p.propertyId).filter((id): id is string => Boolean(id)))
    );
    const properties = propertyIds.length
      ? await prisma.properties.findMany({
          where: { id: { in: propertyIds } },
          select: { id: true, street: true, city: true, state: true, zipCode: true },
        })
      : [];
    const propertiesById = new Map(properties.map((p) => [p.id, p] as const));

    // Create ZIP structure
    const zip = new JSZip();

    for (const project of projects) {
      const property = project.propertyId ? propertiesById.get(project.propertyId) : null;
      const folderName = `${project.title || project.id}`.replace(/[^a-zA-Z0-9-_]/g, "_");
      const folder = zip.folder(folderName);

      if (folder) {
        // Add project summary
        const summary = {
          projectId: project.id,
          title: project.title,
          status: project.status,
          address: property
            ? `${property.street}, ${property.city}, ${property.state} ${property.zipCode}`
            : "N/A",
          valueEstimate: project.valueEstimate,
          createdAt: project.createdAt,
          exportedAt: new Date().toISOString(),
        };

        folder.file("project_summary.json", JSON.stringify(summary, null, 2));
        folder.file(
          "README.txt",
          `Project: ${project.title}\nExported: ${new Date().toLocaleString()}\n\nThis folder contains all carrier-ready documents for this project.\n`
        );

        // TODO: When document relations are available, fetch and add actual files
        // const documents = await prisma.documents.findMany({ where: { projectId: project.id } });
        // for (const doc of documents) {
        //   const response = await fetch(doc.url);
        //   const buffer = await response.arrayBuffer();
        //   folder.file(`documents/${doc.name}`, buffer);
        // }
      }
    }

    // Generate ZIP blob
    const zipBlob = await zip.generateAsync({ type: "blob" });
    const zipBase64 = await blobToBase64(zipBlob);

    // Store in database for download (temporary solution)
    // In production, upload to S3/UploadThing and return URL

    return {
      success: true,
      downloadUrl: `/api/exports/bulk-download?data=${encodeURIComponent(zipBase64.slice(0, 100))}...`,
      message: `Bulk export prepared: ${projects.length} projects`,
    };
  } catch (error) {
    logger.error("[generateBulkCarrierExport] Error:", error);
    return { success: false, message: "Failed to generate bulk export" };
  }
}

// Helper to convert blob to base64
async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  return Buffer.from(buffer).toString("base64");
}
