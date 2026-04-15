/**
 * VIN — Receipt Upload Page
 * Upload material receipts, auto-parse, link to claims
 */

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";

import { ReceiptUploadClient } from "./_components/ReceiptUploadClient";

export const metadata = { title: "Receipt Upload — Vendor Network" };

export default function ReceiptsPage() {
  return (
    <PageContainer>
      <PageHero
        section="build"
        title="Material Receipts"
        subtitle="Upload material receipts and invoices. AI auto-parses vendor, items, and totals."
      />
      <ReceiptUploadClient />
    </PageContainer>
  );
}
