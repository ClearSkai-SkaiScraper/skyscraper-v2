// eslint-disable-next-line no-restricted-imports
import { currentUser } from "@clerk/nextjs/server";
import { History, ImageIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import { TradesToolJobPicker } from "@/components/trades/TradesToolJobPicker";
import { Button } from "@/components/ui/button";

import MockupClient from "./client";
export const metadata: Metadata = { title: "Project Mockup • SkaiScraper" };
export const dynamic = "force-dynamic";

export default async function AIMockupPage() {
  const user = await currentUser();
  if (!user) {
    redirect("/sign-in");
  }

  return (
    <PageContainer>
      <PageHero
        section="build"
        title="Project Mockup Generator"
        subtitle="Generate before/after visualizations for all trade projects"
        icon={<ImageIcon className="h-5 w-5" />}
      >
        <Button variant="outline" asChild>
          <Link href="/ai/mockup/history">
            <History className="mr-2 h-4 w-4" />
            View History
          </Link>
        </Button>
      </PageHero>
      <TradesToolJobPicker label="Select job context:" />
      <MockupClient />
    </PageContainer>
  );
}
