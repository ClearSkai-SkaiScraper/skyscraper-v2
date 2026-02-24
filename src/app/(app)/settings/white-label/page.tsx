"use client";

import { ArrowLeft, Construction } from "lucide-react";
import Link from "next/link";

import { PageContainer } from "@/components/layout/PageContainer";

export default function SettingsWhiteLabelPage() {
  return (
    <PageContainer>
      <div className="mx-auto max-w-2xl py-16 text-center">
        <Construction className="mx-auto h-16 w-16 text-muted-foreground/40" />
        <h1 className="mt-6 text-2xl font-semibold">White Label Branding</h1>
        <p className="mt-2 text-muted-foreground">
          This feature is under development and will be available in a future release.
        </p>
        <Link
          href="/settings"
          className="mt-8 inline-flex items-center gap-2 text-sm text-primary hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Settings
        </Link>
      </div>
    </PageContainer>
  );
}
