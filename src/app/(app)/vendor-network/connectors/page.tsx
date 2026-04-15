/**
 * VIN — Supplier Connectors Page
 * Manage integrations with Home Depot Pro, Lowe's Pro, ABC Supply, etc.
 */

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";

import { ConnectorsClient } from "./_components/ConnectorsClient";

export const metadata = { title: "Supplier Connectors — Vendor Network" };

export default function ConnectorsPage() {
  return (
    <PageContainer>
      <PageHero
        section="build"
        title="Supplier Connectors"
        subtitle="Connect your accounts with major suppliers for streamlined ordering, real-time pricing, and inventory checks."
      />
      <ConnectorsClient />
    </PageContainer>
  );
}
