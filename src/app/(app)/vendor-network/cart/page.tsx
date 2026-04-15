/**
 * VIN — Materials Cart Page
 * Cart management: view items, adjust qty, submit order
 */

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";

import { MaterialsCartClient } from "./_components/MaterialsCartClient";

export const metadata = { title: "Materials Cart — Vendor Network" };

export default function MaterialsCartPage() {
  return (
    <PageContainer>
      <PageHero
        section="build"
        title="Materials Cart"
        subtitle="Build material orders from the vendor network, review line items, and submit to suppliers."
      />
      <MaterialsCartClient />
    </PageContainer>
  );
}
