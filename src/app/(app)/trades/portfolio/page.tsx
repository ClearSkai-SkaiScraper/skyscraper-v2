/**
 * #182 — Vendor Portfolio Management
 * Server component gallery of completed projects.
 * Each item: photo, description, trade category, date, testimonial.
 * Add/edit buttons link to the existing upload flow.
 */

import {
  ArrowLeft,
  Camera,
  Edit,
  ExternalLink,
  Image as ImageIcon,
  Plus,
  Star,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import { PageSectionCard } from "@/components/layout/PageSectionCard";
import prisma from "@/lib/prisma";
import { safeOrgContext } from "@/lib/safeOrgContext";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function PortfolioPage() {
  const orgCtx = await safeOrgContext();
  if (orgCtx.status === "unauthenticated" || !orgCtx.userId) redirect("/sign-in");

  const userId = orgCtx.userId;

  // Fetch member profile
  const member = await prisma.tradesCompanyMember
    .findUnique({
      where: { userId },
      include: { company: true },
    })
    .catch(() => null);

  if (!member) {
    return (
      <PageContainer>
        <PageHero
          title="Project Portfolio"
          subtitle="Set up your trades profile first"
          icon={<Camera className="h-5 w-5" />}
          section="build"
        />
        <PageSectionCard>
          <div className="py-10 text-center">
            <Camera className="mx-auto mb-4 h-12 w-12 text-slate-300" />
            <h2 className="mb-2 text-lg font-semibold">No Profile Found</h2>
            <p className="mb-4 text-sm text-slate-500">
              Create your trades profile to start building your portfolio.
            </p>
            <Link
              href="/trades/setup"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
            >
              Set Up Profile →
            </Link>
          </div>
        </PageSectionCard>
      </PageContainer>
    );
  }

  // Fetch featured work items (portfolio)
  const portfolioItems = await prisma.tradesFeaturedWork
    .findMany({
      where: { userId },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    })
    .catch(() => []);

  // Also grab inline portfolio images from member profile
  const inlineImages = member.portfolioImages ?? [];

  const totalItems = portfolioItems.length + inlineImages.length;

  return (
    <>
      {/* Back to Hub */}
      <div className="mb-2">
        <Link
          href="/trades"
          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-blue-600 transition hover:bg-blue-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Network Hub
        </Link>
      </div>

      <PageContainer maxWidth="7xl">
        <PageHero
          title="Project Portfolio"
          subtitle={`${totalItems} project${totalItems !== 1 ? "s" : ""} showcasing your best work`}
          icon={<Camera className="h-5 w-5" />}
          section="build"
        >
          <Link
            href="/trades/portfolio/upload"
            className="inline-flex items-center gap-2 rounded-lg bg-white/20 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm transition hover:bg-white/30"
          >
            <Plus className="h-4 w-4" />
            Add Project
          </Link>
        </PageHero>

        {/* Empty state */}
        {totalItems === 0 && (
          <PageSectionCard>
            <div className="py-16 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
                <ImageIcon className="h-8 w-8 text-emerald-400" />
              </div>
              <h2 className="mb-2 text-lg font-semibold text-slate-800">Your portfolio is empty</h2>
              <p className="mx-auto mb-6 max-w-md text-sm text-slate-500">
                Showcase your completed projects to attract new clients. Add photos, descriptions,
                and highlight your best work.
              </p>
              <Link
                href="/trades/portfolio/upload"
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700"
              >
                <Camera className="h-4 w-4" />
                Upload Your First Project
              </Link>
            </div>
          </PageSectionCard>
        )}

        {/* Featured Work Items (from tradesFeaturedWork) */}
        {portfolioItems.length > 0 && (
          <PageSectionCard
            title="Featured Projects"
            subtitle="Projects from your featured work gallery"
          >
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {portfolioItems.map((item) => (
                <div
                  key={item.id}
                  className="group overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md"
                >
                  {/* Image */}
                  <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
                    <Image
                      src={item.imageUrl}
                      alt={item.title}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                    {item.isFeatured && (
                      <span className="absolute left-2 top-2 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-white shadow">
                        ★ Featured
                      </span>
                    )}
                  </div>

                  {/* Details */}
                  <div className="p-4">
                    <h3 className="mb-1 font-semibold text-slate-800">{item.title}</h3>
                    {item.description && (
                      <p className="mb-2 line-clamp-2 text-xs text-slate-500">{item.description}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-2">
                      {item.category && (
                        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700">
                          {item.category}
                        </span>
                      )}
                      {item.projectDate && (
                        <span className="text-[10px] text-slate-400">
                          {new Date(item.projectDate).toLocaleDateString("en-US", {
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </PageSectionCard>
        )}

        {/* Inline portfolio images */}
        {inlineImages.length > 0 && (
          <PageSectionCard title="Portfolio Gallery" subtitle="Images from your profile">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {inlineImages.map((url, i) => (
                <div
                  key={i}
                  className="group relative aspect-square overflow-hidden rounded-lg bg-slate-100"
                >
                  <Image
                    src={url}
                    alt={`Portfolio image ${i + 1}`}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                    sizes="(max-width: 640px) 50vw, 25vw"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover:bg-black/20">
                    <ExternalLink className="h-5 w-5 text-white opacity-0 transition group-hover:opacity-100" />
                  </div>
                </div>
              ))}
            </div>
          </PageSectionCard>
        )}

        {/* Portfolio tips */}
        <PageSectionCard title="Portfolio Tips">
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              {
                icon: Camera,
                title: "High-Quality Photos",
                desc: "Use well-lit, high-resolution images. Before-and-after shots are especially compelling.",
              },
              {
                icon: Star,
                title: "Highlight Specialties",
                desc: "Showcase projects that align with your core trade specialties to attract the right clients.",
              },
              {
                icon: Edit,
                title: "Add Descriptions",
                desc: "Include project scope, timeline, and any challenges overcome for context.",
              },
            ].map((tip) => (
              <div key={tip.title} className="flex gap-3">
                <div className="flex-shrink-0 rounded-lg bg-emerald-50 p-2">
                  <tip.icon className="h-4 w-4 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-700">{tip.title}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{tip.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </PageSectionCard>
      </PageContainer>
    </>
  );
}
