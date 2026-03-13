/**
 * MATERIAL ORDERS PAGE
 * Enterprise-grade material ordering system for vendor network
 * Supports: Catalog orders, inventory management, job linking
 */

import { Package } from "lucide-react";
import { Metadata } from "next";

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import { safeOrgContext } from "@/lib/safeOrgContext";

import { MaterialOrdersClient } from "./_components/MaterialOrdersClient";

export const metadata: Metadata = {
  title: "Material Orders | SkaiScraper",
  description: "Order materials from vendors and track deliveries",
};

export const dynamic = "force-dynamic";

export default async function MaterialOrdersPage() {
  const { orgId, userId } = await safeOrgContext();

  if (!orgId || !userId) {
    return (
      <PageContainer maxWidth="7xl">
        <p className="p-8 text-center text-muted-foreground">
          Please select an organization to continue.
        </p>
      </PageContainer>
    );
  }

  return (
    <PageContainer maxWidth="7xl">
      <PageHero
        section="network"
        title="Material Orders"
        subtitle="Order materials from vendors, track deliveries, and link to jobs"
        icon={<Package className="h-6 w-6" />}
      />
      <MaterialOrdersClient orgId={orgId} userId={userId} />
    </PageContainer>
  );
}
