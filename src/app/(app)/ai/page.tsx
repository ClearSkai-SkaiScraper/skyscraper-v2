/**
 * /ai — AI Tools Hub
 * Landing page for all AI-powered features
 * UI matches the Reports Hub pattern (rounded-2xl containers, gradient icons, section headers)
 */
import {
  BarChart3,
  Brain,
  Camera,
  FileBarChart,
  FileCheck,
  FileSearch,
  Image,
  Package,
  Scale,
  Sparkles,
  Wrench,
  Zap,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "AI Tools Hub | SkaiScraper",
  description: "AI-powered tools for claims processing, analysis, and reporting.",
};

/* ------------------------------------------------------------------ */
/*  Tool definitions by category                                       */
/* ------------------------------------------------------------------ */

const claimsAITools = [
  {
    href: "/ai/claims-analysis",
    title: "Claims Analysis",
    desc: "Deep-dive AI analysis of claim data with approval probability scoring and risk assessment.",
    icon: FileSearch,
    color: "from-blue-500 to-blue-600",
  },
  {
    href: "/ai/bad-faith",
    title: "Bad Faith Analysis",
    desc: "AI-powered bad faith detection, carrier behavior scoring, and regulatory compliance checks.",
    icon: Scale,
    color: "from-red-500 to-red-600",
  },
  {
    href: "/ai/tools/supplement",
    title: "Supplement Builder",
    desc: "Generate insurance supplement requests with AI-powered line-item justifications.",
    icon: FileCheck,
    color: "from-cyan-500 to-cyan-600",
  },
  {
    href: "/ai/tools/rebuttal",
    title: "Rebuttal Builder",
    desc: "Draft carrier rebuttal letters with precedent citations and evidence-based arguments.",
    icon: FileBarChart,
    color: "from-rose-500 to-rose-600",
  },
  {
    href: "/ai/tools/depreciation",
    title: "Depreciation Calculator",
    desc: "AI-enhanced depreciation and RCV/ACV calculations with supporting documentation.",
    icon: Brain,
    color: "from-teal-500 to-teal-600",
  },
  {
    href: "/ai/exports",
    title: "Carrier Exports",
    desc: "Generate Xactimate, Symbility, and carrier-specific formatted export packages.",
    icon: Package,
    color: "from-indigo-500 to-indigo-600",
  },
];

const productionAITools = [
  {
    href: "/ai/smart-actions",
    title: "Smart Actions",
    desc: "Intelligent workflow automations, next-step suggestions, and task prioritization.",
    icon: Sparkles,
    color: "from-purple-500 to-purple-600",
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
    icon: Image,
    color: "from-pink-500 to-pink-600",
  },
  {
    href: "/ai/vision-labs",
    title: "Vision Labs",
    desc: "Advanced computer vision analysis for photos and video documentation.",
    icon: Camera,
    color: "from-violet-500 to-violet-600",
  },
];

/* ------------------------------------------------------------------ */
/*  Shared card renderer (matches Reports Hub renderCard)              */
/* ------------------------------------------------------------------ */
function renderCard(item: {
  href: string;
  title: string;
  desc: string;
  icon: React.ElementType;
  color: string;
}) {
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
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default function AIToolsPage() {
  return (
    <PageContainer maxWidth="7xl">
      <PageHero
        section="claims"
        title="AI Tools Hub"
        subtitle="AI-powered tools to accelerate claims processing, analysis, and reporting"
        icon={<Brain className="h-6 w-6" />}
      >
        <div className="flex flex-wrap gap-2">
          <Button asChild className="bg-white text-blue-600 hover:bg-blue-50">
            <Link href="/ai/claims-analysis">
              <FileSearch className="mr-2 h-4 w-4" />
              Claims Analysis
            </Link>
          </Button>
          <Button asChild className="bg-white text-purple-600 hover:bg-purple-50">
            <Link href="/ai/smart-actions">
              <Sparkles className="mr-2 h-4 w-4" />
              Smart Actions
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="border-white/20 bg-white/10 text-white hover:bg-white/20"
          >
            <Link href="/reports/hub">
              <BarChart3 className="mr-2 h-4 w-4" />
              Reports Hub
            </Link>
          </Button>
        </div>
      </PageHero>

      {/* ───────── QUICK START — 3 Hero Cards ───────── */}
      <div className="mb-10 grid gap-5 md:grid-cols-3">
        {/* Claims Analysis */}
        <Link
          href="/ai/claims-analysis"
          className="group relative overflow-hidden rounded-2xl border-2 border-slate-200 bg-white p-6 transition-all hover:border-blue-400 hover:shadow-xl dark:border-slate-700 dark:bg-slate-800 dark:hover:border-blue-500"
        >
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/25">
            <FileSearch className="h-7 w-7 text-white" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 dark:text-white dark:group-hover:text-blue-400">
            Claims Analysis
          </h3>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
            AI-powered deep analysis of claim data with approval probability, risk scoring, and
            actionable recommendations.
          </p>
          <ul className="mt-4 space-y-1.5">
            <li className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <Zap className="h-3.5 w-3.5 text-green-500" /> Approval probability
            </li>
            <li className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <Zap className="h-3.5 w-3.5 text-green-500" /> Risk assessment
            </li>
            <li className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <Zap className="h-3.5 w-3.5 text-green-500" /> Next-step suggestions
            </li>
          </ul>
          <div className="absolute bottom-0 left-0 h-1 w-0 bg-gradient-to-r from-blue-500 to-indigo-500 transition-all group-hover:w-full" />
        </Link>

        {/* Smart Actions */}
        <Link
          href="/ai/smart-actions"
          className="group relative overflow-hidden rounded-2xl border-2 border-slate-200 bg-white p-6 transition-all hover:border-purple-400 hover:shadow-xl dark:border-slate-700 dark:bg-slate-800 dark:hover:border-purple-500"
        >
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg shadow-purple-500/25">
            <Sparkles className="h-7 w-7 text-white" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 group-hover:text-purple-600 dark:text-white dark:group-hover:text-purple-400">
            Smart Actions
          </h3>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
            Intelligent workflow automations that analyze your pipeline and suggest the most
            impactful next steps.
          </p>
          <ul className="mt-4 space-y-1.5">
            <li className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <Zap className="h-3.5 w-3.5 text-green-500" /> Auto-prioritization
            </li>
            <li className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <Zap className="h-3.5 w-3.5 text-green-500" /> Workflow suggestions
            </li>
            <li className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <Zap className="h-3.5 w-3.5 text-green-500" /> Pipeline insights
            </li>
          </ul>
          <div className="absolute bottom-0 left-0 h-1 w-0 bg-gradient-to-r from-purple-500 to-pink-500 transition-all group-hover:w-full" />
        </Link>

        {/* Mockup Generator */}
        <Link
          href="/ai/mockup"
          className="group relative overflow-hidden rounded-2xl border-2 border-slate-200 bg-white p-6 transition-all hover:border-pink-400 hover:shadow-xl dark:border-slate-700 dark:bg-slate-800 dark:hover:border-pink-500"
        >
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500 to-pink-600 shadow-lg shadow-pink-500/25">
            <Image className="h-7 w-7 text-white" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 group-hover:text-pink-600 dark:text-white dark:group-hover:text-pink-400">
            Mockup Generator
          </h3>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
            Create stunning before/after project mockups to show clients exactly what their finished
            project will look like.
          </p>
          <ul className="mt-4 space-y-1.5">
            <li className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <Zap className="h-3.5 w-3.5 text-green-500" /> AI visualization
            </li>
            <li className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <Zap className="h-3.5 w-3.5 text-green-500" /> Material selection
            </li>
            <li className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <Zap className="h-3.5 w-3.5 text-green-500" /> Client presentations
            </li>
          </ul>
          <div className="absolute bottom-0 left-0 h-1 w-0 bg-gradient-to-r from-pink-500 to-rose-500 transition-all group-hover:w-full" />
        </Link>
      </div>

      {/* ── Section Divider ── */}
      <div className="relative mb-10">
        <div className="absolute inset-0 flex items-center" aria-hidden>
          <div className="w-full border-t border-slate-200 dark:border-slate-700/60" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-white px-4 text-xs font-semibold uppercase tracking-widest text-slate-400 dark:bg-slate-950 dark:text-slate-500">
            All AI Tools
          </span>
        </div>
      </div>

      {/* ───────── CLAIMS AI ───────── */}
      <div className="mb-8 rounded-2xl border border-blue-200/60 bg-gradient-to-b from-blue-50/40 to-transparent p-6 dark:border-blue-800/30 dark:from-blue-950/20">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 shadow-sm dark:bg-blue-900/40">
            <Scale className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Claims Intelligence
            </h2>
            <p className="text-sm text-slate-500">
              AI-powered analysis, supplements, rebuttals, and carrier tools
            </p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {claimsAITools.map(renderCard)}
        </div>
      </div>

      {/* ───────── PRODUCTION AI ───────── */}
      <div className="mb-8 rounded-2xl border border-purple-200/60 bg-gradient-to-b from-purple-50/40 to-transparent p-6 dark:border-purple-800/30 dark:from-purple-950/20">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 shadow-sm dark:bg-purple-900/40">
            <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Production & Reporting
            </h2>
            <p className="text-sm text-slate-500">
              Report assembly, smart actions, mockups, vision analysis, and project planning
            </p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {productionAITools.map(renderCard)}
        </div>
      </div>
    </PageContainer>
  );
}
