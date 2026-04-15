/**
 * VIN — Admin Vendor Management Page
 * CRUD for vendors: create, edit, toggle featured/verified
 */

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";

import { VendorAdminClient } from "./_components/VendorAdminClient";

export const metadata = { title: "Vendor Admin — Vendor Network" };

export default function VendorAdminPage() {
  return (
    <PageContainer>
      <PageHero
        section="build"
        title="Vendor Administration"
        subtitle="Create, edit, and manage all vendors in the network. Toggle featured/verified status and manage trade assignments."
      />
      <VendorAdminClient />
    </PageContainer>
  );
}
