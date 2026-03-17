/**
 * /tools — AI Tools Hub
 *
 * Central hub for all SkaiScraper Pro AI-powered tools.
 * Links to supplement builder, rebuttal generator, depreciation calculator,
 * mockup generator, damage builder, and other AI features.
 */

import {
  Calculator,
  Camera,
  ClipboardCheck,
  FileText,
  Hammer,
  Image,
  LayoutGrid,
  Scale,
  Shield,
  Sparkles,
  Zap,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { NoOrgMembershipBanner } from "@/components/guards/NoOrgMembershipBanner";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { safeOrgContext } from "@/lib/safeOrgContext";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "AI Tools | SkaiScraper Pro",
  description:
    "AI-powered tools for contractors — supplement builder, rebuttal generator, project planning, and more.",
};

interface ToolDef {
  title: string;
  description: string;
  href: string;
  icon: React.ElementType;
  gradient: string;
  badge: string | null;
  category: "documents" | "analysis" | "visual" | "estimation";
}

const TOOLS: ToolDef[] = [
  // ── Documents ────────────────────────────────────────────────────────
  {
    title: "Supplement Builder",
    description:
      "AI-assisted supplement letter generation with line-item analysis and carrier-specific formatting.",
    href: "/ai/tools/supplement",
    icon: FileText,
    gradient: "from-blue-500 to-blue-600",
    badge: "Most Popular",
    category: "documents",
  },
  {
    title: "Rebuttal Generator",
    description:
      "Generate professional rebuttals to carrier denials with code references and precedent citations.",
    href: "/ai/tools/rebuttal",
    icon: Shield,
    gradient: "from-red-500 to-red-600",
    badge: null,
    category: "documents",
  },

  // ── Analysis ─────────────────────────────────────────────────────────
  {
    title: "Damage Analysis",
    description:
      "Upload photos and get instant AI-powered damage detection, severity assessment, and repair estimates.",
    href: "/ai/damage-builder",
    icon: Camera,
    gradient: "from-emerald-500 to-emerald-600",
    badge: "Pro",
    category: "analysis",
  },
  {
    title: "Claims Analysis",
    description:
      "Deep-dive AI analysis of claim data to identify patterns, missing items, and approval strategy.",
    href: "/ai/claims-analysis",
    icon: ClipboardCheck,
    gradient: "from-cyan-500 to-cyan-600",
    badge: null,
    category: "analysis",
  },
  {
    title: "Bad Faith Detection",
    description:
      "Analyze carrier responses and timelines for potential bad faith indicators and compliance issues.",
    href: "/ai/bad-faith",
    icon: Scale,
    gradient: "from-rose-500 to-rose-600",
    badge: "New",
    category: "analysis",
  },
  {
    title: "Smart Actions",
    description:
      "Contextual AI actions — auto-draft emails, suggest next steps, and prioritize tasks.",
    href: "/ai/smart-actions",
    icon: Zap,
    gradient: "from-orange-500 to-orange-600",
    badge: null,
    category: "analysis",
  },
  // ── Visual ───────────────────────────────────────────────────────────
  {
    title: "Mockup Generator",
    description:
      "Generate photorealistic before/after mockups of completed repairs using DALL-E 3.",
    href: "/ai/mockup",
    icon: Image,
    gradient: "from-purple-500 to-purple-600",
    badge: "Pro",
    category: "visual",
  },
  {
    title: "Project Plan Builder",
    description: "AI-assisted project planning with scope of work, timelines, and material lists.",
    href: "/ai/roofplan-builder",
    icon: LayoutGrid,
    gradient: "from-teal-500 to-teal-600",
    badge: null,
    category: "visual",
  },
  // ── Estimation ───────────────────────────────────────────────────────
  {
    title: "Depreciation Calculator",
    description:
      "Calculate recoverable depreciation with certificate of completion and final invoice generation.",
    href: "/ai/tools/depreciation",
    icon: Calculator,
    gradient: "from-amber-500 to-amber-600",
    badge: null,
    category: "estimation",
  },
  {
    title: "Materials Estimator",
    description:
      "Estimate material costs by trade with regional pricing, compliance codes, and supplier data.",
    href: "/materials/estimator",
    icon: Hammer,
    gradient: "from-slate-500 to-slate-600",
    badge: null,
    category: "estimation",
  },
];

const CATEGORY_LABELS: Record<ToolDef["category"], string> = {
  documents: "Document Generation",
  analysis: "AI Analysis",
  visual: "Visual & Diagrams",
  estimation: "Estimation & Pricing",
};

const CATEGORY_ORDER: ToolDef["category"][] = ["documents", "analysis", "visual", "estimation"];

export default async function ToolsPage() {
  const orgCtx = await safeOrgContext();
  if (orgCtx.status === "unauthenticated") {
    redirect("/sign-in");
  }
  if (!orgCtx.ok || !orgCtx.orgId) {
    return (
      <PageContainer>
        <NoOrgMembershipBanner title="AI Tools" />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHero
        title="AI Tools"
        subtitle="AI-powered tools to accelerate claims processing, generate professional documents, and win more approvals."
        icon={<Sparkles className="h-8 w-8 text-primary" />}
      />

      <div className="mx-auto mt-8 max-w-6xl space-y-10">
        {CATEGORY_ORDER.map((cat) => {
          const tools = TOOLS.filter((t) => t.category === cat);
          if (tools.length === 0) return null;
          return (
            <section key={cat}>
              <h2 className="mb-4 text-lg font-semibold text-muted-foreground">
                {CATEGORY_LABELS[cat]}
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {tools.map((tool) => {
                  const Icon = tool.icon;
                  return (
                    <Link key={tool.href + tool.title} href={tool.href} className="group">
                      <Card className="h-full transition-all hover:border-primary/30 hover:shadow-lg group-hover:-translate-y-0.5 dark:hover:border-primary/20">
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div
                              className={`flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ${tool.gradient} text-white shadow-sm`}
                            >
                              <Icon className="h-5 w-5" />
                            </div>
                            {tool.badge && (
                              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                                {tool.badge}
                              </span>
                            )}
                          </div>
                          <CardTitle className="mt-3 text-base transition-colors group-hover:text-primary">
                            {tool.title}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <CardDescription className="text-sm leading-relaxed">
                            {tool.description}
                          </CardDescription>
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      {/* Quick access to AI Hub */}
      <div className="mx-auto mt-10 max-w-6xl">
        <Link href="/ai" className="group">
          <Card className="border-2 border-dashed transition-all hover:border-primary/40 hover:bg-primary/5">
            <CardContent className="flex items-center gap-4 py-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary/80 to-primary text-white">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold transition-colors group-hover:text-primary">
                  AI Command Center
                </p>
                <p className="text-sm text-muted-foreground">
                  Access all AI features, history, and exports in one place
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </PageContainer>
  );
}
