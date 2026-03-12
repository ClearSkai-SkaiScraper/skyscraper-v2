import { LayoutGrid, ShoppingBag } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import { Button } from "@/components/ui/button";
import { getOrg } from "@/lib/org/getOrg";
import prisma from "@/lib/prisma";
import { ALL_TEMPLATES } from "@/lib/templates/templateRegistry";

import { TemplateList } from "./_components/TemplateList";

export const metadata: Metadata = {
  title: "Report Templates | SkaiScraper",
  description: "Browse and manage your report templates for claims and inspections.",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

// 🔥 COMPANY_TEMPLATES_PAGE - Shows templates the company has ADDED from the marketplace
// Users browse /reports/templates/marketplace to find templates, then add them here
export default async function ReportTemplatesPage() {
  // Use getOrg with mode: "required" - redirects to /sign-in or /onboarding if no org
  const orgResult = await getOrg({ mode: "required" });

  // If we get here, org is guaranteed (otherwise would have redirected)
  if (!orgResult.ok) {
    throw new Error("Unexpected: getOrg(required) returned not ok without redirecting");
  }

  const orgId = orgResult.orgId;
  const userId = orgResult.userId;

  // Auto-seed ONE mandatory template if this org has none (Contractor Estimate)
  // This gives them a starter template - they can add more from the Marketplace
  const MANDATORY_TEMPLATE_SLUG = "contractor-estimate-premium";
  const registryTemplate =
    ALL_TEMPLATES.find((t) => t.slug === MANDATORY_TEMPLATE_SLUG) ||
    ALL_TEMPLATES.find((t) => t.slug === "initial-claim-inspection");
  const MANDATORY_TEMPLATE_DATA = registryTemplate
    ? {
        id: registryTemplate.id,
        slug: registryTemplate.slug,
        name: registryTemplate.title,
        description: registryTemplate.description,
        category: registryTemplate.category,
        version: registryTemplate.version,
        isPublished: true,
        isActive: true,
        isMarketplace: true,
        tags: registryTemplate.tags,
        thumbnailUrl: `/api/templates/${registryTemplate.id}/thumbnail`,
        sections: [],
      }
    : {
        id: "template-contractor-estimate",
        slug: "contractor-estimate-premium",
        name: "Professional Contractor Estimate",
        description: "Professional contractor estimate template for project bids and proposals.",
        category: "Estimates",
        version: "1.0",
        isPublished: true,
        isActive: true,
        isMarketplace: true,
        tags: ["contractor", "estimate", "proposal", "bid"],
        thumbnailUrl: "/template-thumbs/general-contractor-estimate.svg",
        sections: [],
      };

  try {
    // Check if org has ANY templates
    const existingOrgTemplates = await prisma.orgTemplate.count({
      where: { orgId, isActive: true },
    });

    // Only seed if org has ZERO templates (give them one to start)
    if (existingOrgTemplates === 0) {
      // Ensure the mandatory template exists in Template table
      let mandatoryTemplate = await prisma.template.findFirst({
        where: { slug: MANDATORY_TEMPLATE_SLUG },
      });

      if (!mandatoryTemplate) {
        mandatoryTemplate = await prisma.template.create({ data: MANDATORY_TEMPLATE_DATA });
      } else if (!mandatoryTemplate.isPublished) {
        mandatoryTemplate = await prisma.template.update({
          where: { id: mandatoryTemplate.id },
          data: { isPublished: true, isActive: true },
        });
      }

      // Link to org via OrgTemplate
      const upserted = await prisma.orgTemplate.upsert({
        where: { orgId_templateId: { orgId, templateId: mandatoryTemplate.id } },
        update: { isActive: true },
        create: { orgId, templateId: mandatoryTemplate.id, isActive: true },
      });
    }
  } catch (seedError) {
    // Failed to seed mandatory template — continue without it
  }

  // Fetch company templates via orgTemplate → template join
  // This shows templates the company has added from the marketplace
  let templates: any[] = [];
  try {
    const orgTemplates = await prisma.orgTemplate.findMany({
      where: { orgId, isActive: true },
      include: {
        Template: {
          select: {
            id: true,
            slug: true,
            name: true,
            description: true,
            category: true,
            thumbnailUrl: true,
            version: true,
            tags: true,
            isPublished: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Map to the format TemplateList expects
    const safeOrgTemplates = orgTemplates.filter((ot) => ot.Template);

    templates = safeOrgTemplates.map((ot) => ({
      id: ot.id,
      templateId: ot.templateId,
      orgId: ot.orgId,
      name: ot.customName || ot.Template.name,
      description: ot.Template.description,
      category: ot.Template.category,
      slug: ot.Template.slug,
      thumbnailUrl: ot.Template.thumbnailUrl || `/api/templates/${ot.Template.id}/thumbnail`,
      previewPdfUrl: null,
      version: ot.Template.version,
      isDefault: false,
      createdAt: ot.createdAt,
      updatedAt: ot.updatedAt,
    }));

    if (templates.length === 0) {
      const mandatoryTemplate = await prisma.template.findFirst({
        where: { slug: MANDATORY_TEMPLATE_SLUG },
      });
      if (mandatoryTemplate) {
        const reseeded = await prisma.orgTemplate.upsert({
          where: { orgId_templateId: { orgId, templateId: mandatoryTemplate.id } },
          update: { isActive: true },
          create: { orgId, templateId: mandatoryTemplate.id, isActive: true },
        });
        templates = [
          {
            id: reseeded.id,
            templateId: mandatoryTemplate.id,
            orgId,
            name: mandatoryTemplate.name,
            description: mandatoryTemplate.description,
            category: mandatoryTemplate.category,
            slug: mandatoryTemplate.slug,
            thumbnailUrl:
              mandatoryTemplate.thumbnailUrl || `/api/templates/${mandatoryTemplate.id}/thumbnail`,
            previewPdfUrl: null,
            version: mandatoryTemplate.version,
            isDefault: false,
            createdAt: reseeded.createdAt,
            updatedAt: reseeded.updatedAt,
          },
        ];
      }
    }
  } catch (e) {
    // Failed to fetch orgTemplates — show empty state
    templates = [];
  }

  return (
    <PageContainer>
      <PageHero
        section="reports"
        title="My Templates"
        subtitle="Templates you've saved from the marketplace. Use these with AI to generate professional reports."
        icon={<LayoutGrid className="h-6 w-6" />}
      >
        <div className="flex items-center gap-2">
          <Button asChild className="bg-white text-blue-600 hover:bg-blue-50">
            <Link href="/reports/templates/marketplace">
              <ShoppingBag className="mr-2 h-4 w-4" />
              Browse Marketplace
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="border-white/20 bg-white/10 text-white hover:bg-white/20"
          >
            <Link href="/reports/history">Report History</Link>
          </Button>
        </div>
      </PageHero>
      <div className="mt-2">
        {templates.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-12 text-center">
            <LayoutGrid className="mx-auto h-12 w-12 text-slate-400" />
            <h3 className="mt-4 text-lg font-semibold text-slate-900">No templates yet</h3>
            <p className="mt-2 text-sm text-slate-600">
              Get started by browsing the marketplace to find professional report templates.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Button asChild>
                <Link href="/reports/templates/marketplace">
                  <ShoppingBag className="mr-2 h-4 w-4" />
                  Browse Marketplace
                </Link>
              </Button>
            </div>
          </div>
        ) : (
          <TemplateList initialTemplates={templates} orgId={orgId} />
        )}
      </div>
    </PageContainer>
  );
}
