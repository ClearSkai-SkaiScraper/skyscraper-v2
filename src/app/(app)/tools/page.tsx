/**
 * /tools — AI Tools Hub
 *
 * Central hub for all SkaiScraper Pro AI-powered tools.
 * Links to supplement builder, rebuttal generator, depreciation calculator,
 * mockup generator, and other AI features.
 */

import {
  Brain,
  Calculator,
  Camera,
  FileText,
  Hammer,
  Image,
  Shield,
  Sparkles,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { safeOrgContext } from "@/lib/safeOrgContext";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "AI Tools | SkaiScraper Pro",
  description:
    "AI-powered tools for insurance claims — supplement builder, rebuttal generator, depreciation calculator, and more.",
};

const TOOLS = [
  {
    title: "Supplement Builder",
    description:
      "AI-assisted supplement letter generation with line-item analysis and carrier-specific formatting.",
    href: "/ai/tools/supplement",
    icon: FileText,
    gradient: "from-blue-500 to-blue-600",
    badge: "Most Popular",
  },
  {
    title: "Rebuttal Generator",
    description:
      "Generate professional rebuttals to carrier denials with code references and precedent citations.",
    href: "/ai/tools/rebuttal",
    icon: Shield,
    gradient: "from-red-500 to-red-600",
    badge: null,
  },
  {
    title: "Depreciation Calculator",
    description:
      "Calculate recoverable depreciation with certificate of completion and final invoice generation.",
    href: "/ai/tools/depreciation",
    icon: Calculator,
    gradient: "from-amber-500 to-amber-600",
    badge: null,
  },
  {
    title: "AI Damage Analysis",
    description:
      "Upload photos and get instant AI-powered damage detection, severity assessment, and repair estimates.",
    href: "/dashboard/ai",
    icon: Camera,
    gradient: "from-emerald-500 to-emerald-600",
    badge: "Pro",
  },
  {
    title: "Mockup Generator",
    description:
      "Generate photorealistic before/after mockups of completed repairs using DALL-E 3.",
    href: "/dashboard/ai",
    icon: Image,
    gradient: "from-purple-500 to-purple-600",
    badge: "Pro",
  },
  {
    title: "Report Builder",
    description:
      "AI-generated comprehensive inspection reports with photos, findings, and recommendations.",
    href: "/dashboard/ai",
    icon: Brain,
    gradient: "from-indigo-500 to-indigo-600",
    badge: null,
  },
  {
    title: "Smart Actions",
    description:
      "Contextual AI actions — auto-draft emails, suggest next steps, and prioritize tasks.",
    href: "/dashboard/ai",
    icon: Zap,
    gradient: "from-orange-500 to-orange-600",
    badge: null,
  },
  {
    title: "Materials Estimator",
    description:
      "Estimate material costs by trade with regional pricing data and supplier integrations.",
    href: "/materials/estimator",
    icon: Hammer,
    gradient: "from-slate-500 to-slate-600",
    badge: null,
  },
];

export default async function ToolsPage() {
  const orgCtx = await safeOrgContext();
  if (!orgCtx.ok) {
    redirect("/sign-in");
  }

  return (
    <PageContainer>
      <PageHero
        title="AI Tools"
        subtitle="AI-powered tools to accelerate claims processing, generate professional documents, and win more approvals."
        icon={<Sparkles className="h-8 w-8 text-primary" />}
      />

      <div className="mx-auto mt-8 grid max-w-6xl gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {TOOLS.map((tool) => {
          const Icon = tool.icon;
          return (
            <Link key={tool.href + tool.title} href={tool.href} className="group">
              <Card className="h-full transition-all hover:border-primary/30 hover:shadow-lg dark:hover:border-primary/20">
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
                  <CardTitle className="mt-3 text-base">{tool.title}</CardTitle>
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
    </PageContainer>
  );
}
