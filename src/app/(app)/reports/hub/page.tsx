import {
  BarChart3,
  BookOpen,
  Calculator,
  CheckCircle,
  ClipboardCheck,
  FileBarChart,
  FileCheck,
  FileText,
  FolderOpen,
  History,
  LayoutGrid,
  PenLine,
  Scale,
  ShoppingBag,
  Sparkles,
  TrendingUp,
  Wrench,
  Zap,
} from "lucide-react";
import Link from "next/link";

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import { Button } from "@/components/ui/button";
import { safeOrgContext } from "@/lib/safeOrgContext";

export const metadata = {
  title: "Reports Hub | SkaiScraper",
  description: "Central hub for claim, retail, supplement, and AI reports.",
};

export const dynamic = "force-dynamic";

export default async function ReportsHubPage() {
  const orgCtx = await safeOrgContext();
  const safeMode = orgCtx.status !== "ok";

  const claimsTools = [
    {
      href: "/claims-ready-folder",
      title: "Claim Packet",
      desc: "Generate adjuster-ready insurance claim packets with AI-powered analysis and documentation.",
      icon: Sparkles,
      color: "from-blue-500 to-blue-600",
    },
    {
      href: "/ai/tools/supplement",
      title: "Supplement Builder",
      desc: "Build insurance supplements with line-item justifications and supporting evidence.",
      icon: FileCheck,
      color: "from-cyan-500 to-cyan-600",
    },
    {
      href: "/ai/tools/depreciation",
      title: "Depreciation Builder",
      desc: "Calculate and document recoverable depreciation for claims processing.",
      icon: Calculator,
      color: "from-violet-500 to-violet-600",
    },
    {
      href: "/ai/tools/rebuttal",
      title: "Rebuttal Builder",
      desc: "Create evidence-based rebuttals for insurance claim denials.",
      icon: Scale,
      color: "from-rose-500 to-rose-600",
    },
    {
      href: "/ai/bad-faith",
      title: "Bad Faith Analysis",
      desc: "Identify potential bad faith practices and build supporting documentation.",
      icon: FileBarChart,
      color: "from-red-500 to-red-600",
    },
    {
      href: "/reports/weather",
      title: "Weather Reports",
      desc: "Generate certified weather reports tied to storm events and claim dates.",
      icon: BarChart3,
      color: "from-sky-500 to-sky-600",
    },
  ];

  const retailTools = [
    {
      href: "/reports/contractor-packet",
      title: "Bid Package",
      desc: "Create polished homeowner-facing proposals with professional layouts and branding.",
      icon: PenLine,
      color: "from-emerald-500 to-emerald-600",
    },
    {
      href: "/ai/damage-builder",
      title: "Damage Report",
      desc: "Document property damage with AI-assisted analysis and photo annotation.",
      icon: FileText,
      color: "from-amber-500 to-amber-600",
    },
    {
      href: "/ai/roofplan-builder",
      title: "Project Plan Builder",
      desc: "Generate detailed project plans with scope of work, timelines, and material lists.",
      icon: Wrench,
      color: "from-orange-500 to-orange-600",
    },
    {
      href: "/ai/mockup",
      title: "Project Mockup Generator",
      desc: "Create before/after mockup visualizations to show clients the finished result.",
      icon: Sparkles,
      color: "from-pink-500 to-pink-600",
    },
  ];

  const generalTools = [
    {
      href: "/reports/history",
      title: "Report History",
      desc: "View, download, and manage all generated reports and exports.",
      icon: History,
      color: "from-purple-500 to-purple-600",
    },
    {
      href: "/reports/templates",
      title: "My Templates",
      desc: "Manage your saved report templates from the marketplace.",
      icon: LayoutGrid,
      color: "from-orange-500 to-orange-600",
    },
    {
      href: "/reports/templates/marketplace",
      title: "Template Marketplace",
      desc: "Browse and purchase professional report templates from the community.",
      icon: ShoppingBag,
      color: "from-indigo-500 to-indigo-600",
    },
    {
      href: "/settings/branding",
      title: "Company Branding",
      desc: "Customize your report branding with logos, colors, and cover pages.",
      icon: BookOpen,
      color: "from-slate-500 to-slate-600",
    },
    {
      href: "/settings/company-documents",
      title: "Company Documents",
      desc: "Manage contracts, agreements, and documents for your company.",
      icon: FolderOpen,
      color: "from-gray-500 to-gray-600",
    },
  ];

  const renderCard = (item: (typeof claimsTools)[0]) => {
    const Icon = item.icon;
    return (
      <Link
        key={item.href}
        href={item.href}
        className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white p-5 transition-all hover:border-blue-300 hover:shadow-lg dark:border-slate-700 dark:bg-slate-800"
      >
        <div className="flex items-start gap-4">
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${item.color} shadow-md`}
          >
            <Icon className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-slate-900 group-hover:text-blue-600 dark:text-white">
              {item.title}
            </h3>
            <p className="mt-1 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
              {item.desc}
            </p>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 h-1 w-0 bg-gradient-to-r from-blue-500 to-indigo-500 transition-all group-hover:w-full" />
      </Link>
    );
  };

  return (
    <PageContainer maxWidth="7xl">
      <PageHero
        section="reports"
        title="Reports Hub"
        subtitle={
          safeMode
            ? "Workspace not initialized – limited reports hub."
            : "Your command center for claims tools, retail proposals, and AI-powered reports"
        }
        icon={<Sparkles className="h-6 w-6" />}
      >
        <div className="flex flex-wrap gap-2">
          <Button asChild className="bg-white text-blue-600 hover:bg-blue-50">
            <Link href="/claims-ready-folder">
              <ClipboardCheck className="mr-2 h-4 w-4" />
              Claim Packet
            </Link>
          </Button>
          <Button asChild className="bg-white text-emerald-600 hover:bg-emerald-50">
            <Link href="/reports/contractor-packet">
              <PenLine className="mr-2 h-4 w-4" />
              Bid Package
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="border-white/20 bg-white/10 text-white hover:bg-white/20"
          >
            <Link href="/reports/templates/marketplace">
              <ShoppingBag className="mr-2 h-4 w-4" />
              Template Marketplace
            </Link>
          </Button>
        </div>
      </PageHero>

      {safeMode && (
        <div className="mb-6 inline-flex items-center gap-2 rounded-lg border border-yellow-400/40 bg-yellow-50 px-4 py-2 text-sm text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-200">
          <span>⚠️ Safe Mode:</span>
          <span>Initialize workspace to enable live report data.</span>
        </div>
      )}

      {/* ───────── QUICK START — 3 Hero Cards ───────── */}
      <div className="mb-10 grid gap-5 md:grid-cols-3">
        {/* Insurance Claims Card */}
        <Link
          href="/claims-ready-folder"
          className="group relative overflow-hidden rounded-2xl border-2 border-slate-200 bg-white p-6 transition-all hover:border-blue-400 hover:shadow-xl dark:border-slate-700 dark:bg-slate-800 dark:hover:border-blue-500"
        >
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/25">
            <ClipboardCheck className="h-7 w-7 text-white" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 dark:text-white dark:group-hover:text-blue-400">
            Claim Packet
          </h3>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
            Generate carrier-compliant claim packets with weather reports, damage documentation,
            code citations, and adjuster-ready formatting.
          </p>
          <ul className="mt-4 space-y-1.5">
            <li className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <CheckCircle className="h-3.5 w-3.5 text-green-500" /> Weather verification
            </li>
            <li className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <CheckCircle className="h-3.5 w-3.5 text-green-500" /> Photo evidence grids
            </li>
            <li className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <CheckCircle className="h-3.5 w-3.5 text-green-500" /> Code compliance docs
            </li>
          </ul>
          <div className="absolute bottom-0 left-0 h-1 w-0 bg-gradient-to-r from-blue-500 to-indigo-500 transition-all group-hover:w-full" />
        </Link>

        {/* Retail Proposal Card */}
        <Link
          href="/reports/contractor-packet"
          className="group relative overflow-hidden rounded-2xl border-2 border-slate-200 bg-white p-6 transition-all hover:border-emerald-400 hover:shadow-xl dark:border-slate-700 dark:bg-slate-800 dark:hover:border-emerald-500"
        >
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-500/25">
            <PenLine className="h-7 w-7 text-white" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 group-hover:text-emerald-600 dark:text-white dark:group-hover:text-emerald-400">
            Bid Package
          </h3>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
            Create polished homeowner-facing proposals with your company branding, pricing, project
            timelines, and professional layouts.
          </p>
          <ul className="mt-4 space-y-1.5">
            <li className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <CheckCircle className="h-3.5 w-3.5 text-green-500" /> Company branding
            </li>
            <li className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <CheckCircle className="h-3.5 w-3.5 text-green-500" /> Material specs
            </li>
            <li className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <CheckCircle className="h-3.5 w-3.5 text-green-500" /> Digital signatures
            </li>
          </ul>
          <div className="absolute bottom-0 left-0 h-1 w-0 bg-gradient-to-r from-emerald-500 to-teal-500 transition-all group-hover:w-full" />
        </Link>

        {/* Quick Reports Card */}
        <Link
          href="/reports/templates/pdf-builder"
          className="group relative overflow-hidden rounded-2xl border-2 border-slate-200 bg-white p-6 transition-all hover:border-purple-400 hover:shadow-xl dark:border-slate-700 dark:bg-slate-800 dark:hover:border-purple-500"
        >
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg shadow-purple-500/25">
            <Zap className="h-7 w-7 text-white" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 group-hover:text-purple-600 dark:text-white dark:group-hover:text-purple-400">
            Quick Reports
          </h3>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
            Generate fast AI-powered reports and estimates with minimal inputs — perfect for on-site
            quotes and quick turnarounds.
          </p>
          <ul className="mt-4 space-y-1.5">
            <li className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <CheckCircle className="h-3.5 w-3.5 text-green-500" /> AI-generated content
            </li>
            <li className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <CheckCircle className="h-3.5 w-3.5 text-green-500" /> Live preview
            </li>
            <li className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <CheckCircle className="h-3.5 w-3.5 text-green-500" /> Instant PDF export
            </li>
          </ul>
          <div className="absolute bottom-0 left-0 h-1 w-0 bg-gradient-to-r from-purple-500 to-pink-500 transition-all group-hover:w-full" />
        </Link>
      </div>

      {/* ── Section Divider ── */}
      <div className="relative mb-10">
        <div className="absolute inset-0 flex items-center" aria-hidden>
          <div className="w-full border-t border-slate-200 dark:border-slate-700/60" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-white px-4 text-xs font-semibold uppercase tracking-widest text-slate-400 dark:bg-slate-950 dark:text-slate-500">
            All Tools
          </span>
        </div>
      </div>

      {/* ───────── CLAIMS REPORTS ───────── */}
      <div className="mb-8 rounded-2xl border border-blue-200/60 bg-gradient-to-b from-blue-50/40 to-transparent p-6 dark:border-blue-800/30 dark:from-blue-950/20">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 shadow-sm dark:bg-blue-900/40">
            <ClipboardCheck className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Claims Reports</h2>
            <p className="text-sm text-slate-500">
              Insurance claim tools — supplements, depreciation, rebuttals, and more
            </p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {claimsTools.map(renderCard)}
        </div>
      </div>

      {/* ───────── RETAIL REPORTS ───────── */}
      <div className="mb-8 rounded-2xl border border-emerald-200/60 bg-gradient-to-b from-emerald-50/40 to-transparent p-6 dark:border-emerald-800/30 dark:from-emerald-950/20">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 shadow-sm dark:bg-emerald-900/40">
            <PenLine className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Retail Reports</h2>
            <p className="text-sm text-slate-500">
              Direct-to-homeowner proposals, damage reports, project plans, and mockups
            </p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">{retailTools.map(renderCard)}</div>
      </div>

      {/* ───────── GENERAL TOOLS ───────── */}
      <div className="mb-8 rounded-2xl border border-purple-200/60 bg-gradient-to-b from-purple-50/40 to-transparent p-6 dark:border-purple-800/30 dark:from-purple-950/20">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 shadow-sm dark:bg-purple-900/40">
            <TrendingUp className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Templates & Resources
            </h2>
            <p className="text-sm text-slate-500">
              Manage templates, branding, history, and community reports
            </p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {generalTools.map(renderCard)}
        </div>
      </div>
    </PageContainer>
  );
}
