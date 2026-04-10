/**
 * Template Library - Core Functions
 * Manages report templates for organizations
 */

import prisma from "@/lib/prisma";

export interface TemplateData {
  name: string;
  sectionOrder: string[];
  sectionEnabled: Record<string, boolean>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  defaults?: any;
}

/**
 * Save report template for org
 * Uses Template.sections to store template JSON data
 */
export async function saveTemplate(
  orgId: string,
  _userId: string,
  data: TemplateData
): Promise<{ id: string }> {
  const template = await prisma.template.create({
    data: {
      name: data.name,
      category: "report",
      description: `Template created by user`,
      sections: {
        sectionOrder: data.sectionOrder,
        sectionEnabled: data.sectionEnabled,
        defaults: data.defaults,
      },
      isPublished: false,
      isActive: true,
    },
  });

  // Link to org
  await prisma.orgTemplate.create({
    data: {
      orgId,
      templateId: template.id,
    },
  });

  return { id: template.id };
}

/**
 * List templates for org
 */
export async function listTemplates(orgId: string) {
  const orgTemplates = await prisma.orgTemplate.findMany({
    where: { orgId },
    include: { Template: true },
  });

  return orgTemplates.map((ot) => ({
    id: ot.Template.id,
    name: ot.Template.name,
    category: ot.Template.category,
    sections: ot.Template.sections,
    createdAt: ot.Template.createdAt,
  }));
}

/**
 * Get template by ID
 */
export async function getTemplate(templateId: string, orgId: string) {
  const orgTemplate = await prisma.orgTemplate.findUnique({
    where: {
      orgId_templateId: { orgId, templateId },
    },
    include: { Template: true },
  });

  if (!orgTemplate) return null;

  return {
    id: orgTemplate.Template.id,
    name: orgTemplate.Template.name,
    sections: orgTemplate.Template.sections,
  };
}

/**
 * Apply template to report
 * Returns updated report data
 */
export async function applyTemplate(
  _reportId: string,
  templateId: string,
  orgId: string
): Promise<{ sectionOrder: string[]; sectionEnabled: Record<string, boolean> }> {
  const template = await getTemplate(templateId, orgId);
  if (!template || !template.sections) {
    return {
      sectionOrder: [],
      sectionEnabled: {},
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const json = template.sections as any;
  return {
    sectionOrder: json.sectionOrder || [],
    sectionEnabled: json.sectionEnabled || {},
  };
}

/**
 * Set template as org default (using customName as marker)
 */
export async function setDefaultTemplate(templateId: string, orgId: string): Promise<void> {
  // First unset any existing default
  await prisma.orgTemplate.updateMany({
    where: { orgId, customName: "default" },
    data: { customName: null },
  });

  // Then set the new default
  await prisma.orgTemplate.update({
    where: {
      orgId_templateId: { orgId, templateId },
    },
    data: { customName: "default" },
  });
}

/**
 * Get org default template
 */
export async function getDefaultTemplate(orgId: string) {
  const orgTemplate = await prisma.orgTemplate.findFirst({
    where: { orgId, customName: "default" },
    include: { Template: true },
  });

  if (!orgTemplate) return null;

  return {
    id: orgTemplate.Template.id,
    name: orgTemplate.Template.name,
    sections: orgTemplate.Template.sections,
  };
}

/**
 * Delete template
 */
export async function deleteTemplate(templateId: string, orgId: string): Promise<void> {
  await prisma.orgTemplate.delete({
    where: {
      orgId_templateId: { orgId, templateId },
    },
  });
}
