// eslint-disable-next-line no-restricted-imports
import { currentUser } from "@clerk/nextjs/server";
import { ArrowLeft, Sparkles, Video } from "lucide-react";
import { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { requireTenant } from "@/lib/auth/tenant";
import prisma from "@/lib/prisma";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import { PageSectionCard } from "@/components/layout/PageSectionCard";
import { Button } from "@/components/ui/button";

import { VideoReportPanel } from "../VideoReportPanel";

type Props = {
  params: Promise<{ id: string }>;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return {
    title: "AI Video Report | SkaiScraper",
    description: "Generate cinematic AI-powered damage assessment videos",
  };
}

export default async function LeadVideoReportPage({ params }: Props) {
  const { id } = await params;
  const user = await currentUser();
  if (!user) redirect("/sign-in");
  const orgId = await requireTenant();

  const lead = await prisma.leads.findFirst({
    where: { id, orgId },
  });

  if (!lead) {
    notFound();
  }

  const contactRow = await prisma.contacts.findUnique({
    where: { id: lead.contactId },
    select: {
      firstName: true,
      lastName: true,
      email: true,
    },
  });

  const contact = contactRow
    ? {
        firstName: contactRow.firstName,
        lastName: contactRow.lastName,
        email: contactRow.email,
      }
    : null;

  return (
    <PageContainer>
      <PageHero
        section="leads"
        title="AI Video Report"
        subtitle="Generate cinematic damage assessment videos with AI narration"
        icon={<Video className="h-5 w-5" />}
      >
        <Link href={`/leads/${lead.id}`}>
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Lead
          </Button>
        </Link>
      </PageHero>

      <PageSectionCard>
        <div className="space-y-6">
          {/* Back Navigation */}
          <Link
            href={`/leads/${lead.id}`}
            className="inline-flex items-center gap-2 text-sm text-slate-700 transition-colors hover:text-[color:var(--text)] dark:text-slate-300"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Lead Details
          </Link>

          {/* Hero Section */}
          <div className="relative overflow-hidden rounded-2xl border border-[color:var(--border)] bg-gradient-to-br from-sky-500/10 via-blue-500/10 to-cyan-500/10 p-8">
            <div className="relative z-10">
              <div className="mb-4 flex items-center gap-3">
                <div className="rounded-xl bg-gradient-purple p-3 shadow-lg">
                  <Video className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="bg-gradient-to-r from-sky-600 to-blue-600 bg-clip-text text-2xl font-bold text-transparent">
                    AI Video Intelligence
                  </h2>
                  <p className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                    <Sparkles className="h-4 w-4" />
                    Powered by GPT-4 Vision + DALL-E 3 + ElevenLabs
                  </p>
                </div>
              </div>
              <div className="mt-6 grid gap-4 md:grid-cols-3">
                <div className="rounded-xl border border-[color:var(--border)] bg-[var(--surface-1)] p-4">
                  <h3 className="mb-1 font-semibold">📸 Scene Analysis</h3>
                  <p className="text-sm text-slate-700 dark:text-slate-300">
                    AI identifies damage patterns, materials, and severity from uploaded photos
                  </p>
                </div>
                <div className="rounded-xl border border-[color:var(--border)] bg-[var(--surface-1)] p-4">
                  <h3 className="mb-1 font-semibold">🎙️ Professional Narration</h3>
                  <p className="text-sm text-slate-700 dark:text-slate-300">
                    Natural voice synthesis creates engaging damage assessment commentary
                  </p>
                </div>
                <div className="rounded-xl border border-[color:var(--border)] bg-[var(--surface-1)] p-4">
                  <h3 className="mb-1 font-semibold">🎬 Cinematic Output</h3>
                  <p className="text-sm text-slate-700 dark:text-slate-300">
                    Polished video report ready to share with clients and adjusters
                  </p>
                </div>
              </div>
            </div>
            <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-gradient-to-br from-sky-500/20 to-blue-500/20 blur-3xl" />
          </div>

          {/* Lead Info Card */}
          <div className="rounded-xl border border-[color:var(--border)] bg-[var(--surface-1)] p-6">
            <h3 className="mb-4 text-lg font-semibold">Project Information</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="mb-1 text-xs text-slate-700 dark:text-slate-300">Lead Title</p>
                <p className="font-medium">{lead.title || "Untitled Lead"}</p>
              </div>
              {contact && (
                <div>
                  <p className="mb-1 text-xs text-slate-700 dark:text-slate-300">Client Contact</p>
                  <p className="font-medium">
                    {contact.firstName} {contact.lastName}
                  </p>
                  {contact.email && (
                    <p className="text-sm text-slate-700 dark:text-slate-300">{contact.email}</p>
                  )}
                </div>
              )}
              <div>
                <p className="mb-1 text-xs text-slate-700 dark:text-slate-300">Stage</p>
                <span className="inline-flex rounded-full bg-[var(--primary-weak)] px-2 py-1 text-xs text-[color:var(--primary)]">
                  {lead.stage}
                </span>
              </div>
              <div>
                <p className="mb-1 text-xs text-slate-700 dark:text-slate-300">Created</p>
                <p className="text-sm">{new Date(lead.createdAt).toLocaleDateString()}</p>
              </div>
            </div>
          </div>

          {/* Video Report Generator */}
          <VideoReportPanel leadId={lead.id} />

          {/* Tips & Best Practices */}
          <div className="rounded-xl border border-[color:var(--border)] bg-[var(--surface-1)] p-6">
            <h3 className="mb-4 text-lg font-semibold">💡 Best Practices</h3>
            <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-green-500">✓</span>
                <span>Upload 5-15 high-quality damage photos for best results</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-green-500">✓</span>
                <span>Include photos from multiple angles showing extent of damage</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-green-500">✓</span>
                <span>Videos typically take 2-5 minutes to generate depending on photo count</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-green-500">✓</span>
                <span>Share the public link with clients for transparent damage documentation</span>
              </li>
            </ul>
          </div>
        </div>
      </PageSectionCard>
    </PageContainer>
  );
}
