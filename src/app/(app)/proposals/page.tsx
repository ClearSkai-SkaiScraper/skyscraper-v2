import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

import { ProposalCreationForm } from "./_components/ProposalCreationForm";
import { ProposalList } from "./_components/ProposalList";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Proposals | SkaiScraper",
  description: "Create and manage project proposals with AI-powered generation.",
};

export default async function ProposalEnginePage() {
  const { userId, orgId } = await auth();

  if (!userId || !orgId) {
    redirect("/sign-in");
  }

  // Fetch templates for picker
  const templates = await prisma.report_templates
    .findMany({
      where: {
        org_id: orgId,
      },
      orderBy: [{ is_default: "desc" }, { name: "asc" }],
    })
    .catch(() => []);

  // Fetch recent proposals from proposal_drafts
  let proposals: any[] = [];
  try {
    const drafts = await prisma.proposal_drafts.findMany({
      where: { org_id: orgId },
      orderBy: { created_at: "desc" },
      take: 50,
      select: {
        id: true,
        packet_type: true,
        status: true,
        ai_summary: true,
        context_json: true,
        created_at: true,
        updated_at: true,
      },
    });

    proposals = drafts.map((d) => {
      const ctx = d.context_json as any;
      return {
        id: d.id,
        projectName: ctx?.projectName || ctx?.title || d.packet_type || "Untitled Proposal",
        status:
          d.status === "ready"
            ? "ready"
            : d.status === "failed"
              ? "failed"
              : d.status === "generating"
                ? "generating"
                : "ready",
        createdAt: d.created_at,
        updatedAt: d.updated_at,
      };
    });
  } catch (err) {
    logger.error("[proposals] Failed to load proposal drafts:", err);
  }

  return (
    <PageContainer>
      <PageHero
        section="reports"
        title="Proposal Engine"
        subtitle="Generate professional proposals with AI-powered content"
      />

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left: Creation Form */}
        <div className="lg:col-span-2">
          <ProposalCreationForm templates={templates} orgId={orgId} />
        </div>

        {/* Right: Recent Proposals */}
        <div>
          <ProposalList proposals={proposals} />
        </div>
      </div>
    </PageContainer>
  );
}
