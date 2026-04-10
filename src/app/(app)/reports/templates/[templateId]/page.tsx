import { ArrowLeft, Download, FileText, Settings } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { NoOrgMembershipBanner } from "@/components/guards/NoOrgMembershipBanner";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getOrg } from "@/lib/org/getOrg";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function TemplateDetailPage({ params }: { params: { templateId: string } }) {
  // Use getOrg with mode: "required"
  const orgResult = await getOrg({ mode: "required" });

  if (!orgResult.ok) {
    return <NoOrgMembershipBanner title="Template Details" />;
  }

  const orgId = orgResult.orgId;
  const templateId = params.templateId;

  // First check if this is an OrgTemplate id
  type TemplateType = Awaited<ReturnType<typeof prisma.template.findUnique>>;
  type OrgTemplateType = Awaited<
    ReturnType<
      typeof prisma.orgTemplate.findFirst<{
        include: { Template: true };
      }>
    >
  >;

  let template: TemplateType = null;
  let orgTemplate: OrgTemplateType = null;

  // Try to find via OrgTemplate first (company's saved template)
  orgTemplate = await prisma.orgTemplate.findFirst({
    where: {
      OR: [
        { id: templateId, orgId },
        { templateId: templateId, orgId },
      ],
    },
    include: {
      Template: true,
    },
  });

  if (orgTemplate) {
    template = orgTemplate.Template;
  } else {
    // Try direct Template lookup (marketplace template)
    template = await prisma.template.findUnique({
      where: { id: templateId },
    });
  }

  if (!template) {
    notFound();
  }

  // Parse sections from JSON
  const sections = Array.isArray(template.sections)
    ? template.sections
    : JSON.parse((template.sections as string) || "[]");

  return (
    <PageContainer>
      <PageHero
        title={orgTemplate?.customName || template.name}
        subtitle={template.description || "Professional report template"}
        icon={<FileText className="h-5 w-5" />}
      >
        <Button asChild variant="outline">
          <Link href="/reports/templates">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Templates
          </Link>
        </Button>
        <Button asChild>
          <Link href={`/reports/claims/new?templateId=${template.id}`}>
            <FileText className="mr-2 h-4 w-4" />
            Use Template
          </Link>
        </Button>
      </PageHero>

      {/* Template Info */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Template Sections
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sections.length > 0 ? (
              <div className="space-y-4">
                {sections
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  .sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  .map((section: any, index: number) => (
                    <div key={index} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-slate-900">
                          {getSectionTitle(section.type)}
                        </h4>
                        <span className="text-xs text-slate-500">
                          Order: {section.order || index + 1}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-slate-600">
                        {getSectionDescription(section.type)}
                      </p>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center">
                <FileText className="mx-auto h-12 w-12 text-slate-400" />
                <p className="mt-2 text-sm text-slate-600">
                  This template uses dynamic sections based on report type
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Template Info</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-3">
                <div>
                  <dt className="text-xs font-medium text-slate-500">Category</dt>
                  <dd className="text-sm font-medium">{template.category || "General"}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-slate-500">Version</dt>
                  <dd className="text-sm font-medium">{template.version || "1.0"}</dd>
                </div>
                {template.tags && template.tags.length > 0 && (
                  <div>
                    <dt className="text-xs font-medium text-slate-500">Tags</dt>
                    <dd className="mt-1 flex flex-wrap gap-1">
                      {template.tags.map((tag: string) => (
                        <span
                          key={tag}
                          className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700"
                        >
                          {tag}
                        </span>
                      ))}
                    </dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button asChild className="w-full gap-2">
                <Link href={`/reports/claims/new?templateId=${template.id}`}>
                  <FileText className="h-4 w-4" />
                  Generate Report
                </Link>
              </Button>
              {template.thumbnailUrl && (
                <Button variant="outline" asChild className="w-full gap-2">
                  <a href={template.thumbnailUrl} target="_blank" rel="noopener noreferrer">
                    <Download className="h-4 w-4" />
                    Download Preview
                  </a>
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}

function getSectionTitle(type: string): string {
  const titles: Record<string, string> = {
    header: "Company Header",
    client_info: "Client Information",
    property_details: "Property Details",
    scope_of_work: "Scope of Work",
    line_items: "Line Items & Pricing",
    totals: "Cost Summary",
    terms: "Terms & Conditions",
    signature: "Signature Block",
    claim_overview: "Claim Overview",
    property_info: "Property Information",
    damage_summary: "Damage Assessment",
    photo_grid: "Photo Documentation",
    recommendations: "Repair Recommendations",
  };
  return titles[type] || type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

function getSectionDescription(type: string): string {
  const descriptions: Record<string, string> = {
    header: "Your company logo, name, and contact information",
    client_info: "Homeowner name, address, phone, and email",
    property_details: "Property address, type, year built, roofing details",
    scope_of_work: "Detailed description of work to be performed",
    line_items: "Itemized list of materials, labor, and costs",
    totals: "Subtotals, taxes, discounts, and grand total",
    terms: "Payment terms, warranties, and conditions",
    signature: "Customer and contractor signature lines with dates",
    claim_overview: "Claim number, loss date, carrier, policy information",
    property_info: "Property address, owner details, structure type",
    damage_summary: "Detailed damage assessment and severity",
    photo_grid: "Evidence photos with captions and annotations",
    recommendations: "Scope of work, cost estimates, timeline",
  };
  return descriptions[type] || "Section content";
}
