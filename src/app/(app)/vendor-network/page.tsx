/**
 * VENDOR INTELLIGENCE NETWORK — Main Hub Page
 * /vendor-network — Browse, filter, search the full vendor network
 */

import { ArrowLeft, BarChart3, Network } from "lucide-react";
import { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import { Button } from "@/components/ui/button";
import { safeOrgContext } from "@/lib/safeOrgContext";

import { VendorNetworkClient } from "./_components/VendorNetworkClient";

export const metadata: Metadata = {
  title: "Vendor Intelligence Network | SkaiScraper",
  description:
    "Browse dealers, distributors, and suppliers across every construction trade. Place orders and manage vendor relationships.",
};

export const dynamic = "force-dynamic";

export default async function VendorNetworkPage() {
  const ctx = await safeOrgContext();
  if (ctx.status === "unauthenticated") redirect("/sign-in");
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
          section="build"
          title="Vendor Intelligence Network"
          subtitle="Dealers, distributors, and suppliers — place orders, compare pricing, and manage vendor relationships across every trade"
          icon={<Network className="h-6 w-6" />}
        >
          <Button asChild className="bg-white text-blue-600 hover:bg-blue-50">
            <Link href="/trades/analytics">
              <BarChart3 className="mr-2 h-4 w-4" />
              Vendor Analytics
            </Link>
          </Button>
        </PageHero>
        <Suspense
          fallback={
            <div className="py-20 text-center text-muted-foreground">Loading vendor network...</div>
          }
        >
          <VendorNetworkClient />
        </Suspense>
      </PageContainer>
    </>
  );
}
