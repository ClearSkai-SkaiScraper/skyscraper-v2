import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import { Button } from "@/components/ui/button";
import { getOrg } from "@/lib/org/getOrg";
import prisma from "@/lib/prisma";

import { TemplateEditor } from "../../_components/TemplateEditor";

export const dynamic = "force-dynamic";

export default async function EditTemplatePage({ params }: { params: { templateId: string } }) {
  const orgResult = await getOrg({ mode: "required" });

  if (!orgResult.ok) {
    redirect("/sign-in");
  }

  const orgId = orgResult.orgId;
  const userId = orgResult.userId;
  const { templateId } = params;

  // Look up via OrgTemplate first (company's saved template), same as detail page
  const orgTemplate = await prisma.orgTemplate.findFirst({
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

  let template = orgTemplate?.Template ?? null;

  if (!orgTemplate && !template) {
    // Fallback: direct Template lookup
    template = await prisma.template.findUnique({
      where: { id: templateId },
    });
  }

  if (!template) {
    notFound();
  }

  // Parse sections from the Template JSON so the editor can pre-select them
  let rawSections: any[] = [];
  try {
    rawSections = Array.isArray(template.sections)
      ? template.sections
      : JSON.parse((template.sections as string) || "[]");
  } catch {
    rawSections = [];
  }

  // Shape the data for the TemplateEditor component which expects:
  //   existingTemplate.id, .name, .description, .sections[].sectionKey
  const existingTemplate = {
    id: template.id,
    name: orgTemplate?.customName || template.name,
    description: template.description || "",
    sections: rawSections.map((s: any) => ({
      sectionKey: s.sectionKey || s.type || s.key || "",
    })),
  };

  return (
    <PageContainer>
      <PageHero
        section="reports"
        title={`Edit: ${existingTemplate.name}`}
        subtitle="Customise sections, name, and description for this template."
      >
        <Button asChild variant="outline">
          <Link href="/reports/templates">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Templates
          </Link>
        </Button>
      </PageHero>

      <TemplateEditor orgId={orgId} userId={userId} existingTemplate={existingTemplate} />
    </PageContainer>
  );
}
