import { ArrowRight, Building, FileText, Sparkles } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = {
  title: "AI Proposals | Dashboard",
  description: "Generate AI-powered proposals for insurance and retail clients",
};

export const dynamic = "force-dynamic";

import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function AIProposalsPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");
  return (
    <div className="space-y-6 p-8">
      <div className="mb-6 flex items-center gap-3">
        <Sparkles className="h-8 w-8 text-purple-600" />
        <div>
          <h1 className="mb-2 text-3xl font-bold text-[color:var(--text)]">AI Proposals</h1>
          <p className="text-slate-700 dark:text-slate-300">
            Generate professional proposals for insurance claims and retail estimates
          </p>
        </div>
      </div>

      {/* Two paths: Claims and Retail */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Insurance Claims */}
        <Card className="border-2 transition-all hover:border-blue-400 hover:shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-6 w-6 text-blue-600" />
              Insurance Claims
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-slate-700 dark:text-slate-300">
              Generate comprehensive insurance claim proposals with AI-powered damage assessment,
              code citations, and carrier-ready documentation.
            </p>
            <ul className="list-inside list-disc space-y-2 text-sm text-slate-700 dark:text-slate-300">
              <li>AI damage analysis from photos</li>
              <li>Automated code citations</li>
              <li>Carrier-compliant formatting</li>
              <li>Date of loss verification</li>
            </ul>
            <Link href="/claims/generate" className="block">
              <Button className="w-full bg-sky-600 hover:bg-sky-700">
                Generate Claims Proposal
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Retail Estimates */}
        <Card className="border-2 transition-all hover:border-green-400 hover:shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-6 w-6 text-green-600" />
              Retail Estimates
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-slate-700 dark:text-slate-300">
              Create professional retail estimates and quick reports for homeowners and commercial
              clients with AI-assisted pricing and material calculations.
            </p>
            <ul className="list-inside list-disc space-y-2 text-sm text-slate-700 dark:text-slate-300">
              <li>AI-powered pricing suggestions</li>
              <li>Material calculations</li>
              <li>Professional formatting</li>
              <li>Quick turnaround reports</li>
            </ul>
            <Link href="/retail/generate" className="block">
              <Button className="w-full bg-green-600 hover:bg-green-700">
                Generate Retail Estimate
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Token Usage Info */}
      <div className="rounded-lg border border-purple-200 bg-purple-50 p-4">
        <p className="text-sm text-purple-900">
          <strong>💎 Token Usage:</strong> Each proposal generation consumes 1 AI token from your
          organization balance. You can purchase additional tokens in Settings → Billing.
        </p>
      </div>
    </div>
  );
}
