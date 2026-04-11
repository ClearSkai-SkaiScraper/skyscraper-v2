/* eslint-disable react/jsx-no-comment-textnodes, @typescript-eslint/no-explicit-any */
import { Plus } from "lucide-react";
import Link from "next/link";

import { ClaimsGrid } from "@/components/claims/ClaimsGrid";
import { Button } from "@/components/ui/button";

type ClaimDTO = {
  id: string;
  claimNumber: string | null;
  insured_name: string | null;
  status: string | null;
  carrier: string | null;
  estimatedValue: number | string | null;
  propertyAddress: string | null;
  lossDate: string | null;
  updatedAt: string | null;
};

type Props = {
  mode?: "public" | "app";
  initialClaims?: ClaimDTO[];
};

export default function ClaimsPage({ mode = "public", initialClaims = [] }: Props) {
  const claims = initialClaims ?? [];

  // Public demo fallback: if no claims exist, show a synthetic demo card
  const hydratedClaims = [...claims];
  if (mode === "public" && hydratedClaims.length === 0) {
    const now = new Date().toISOString();
    hydratedClaims.push({
      id: "test",
      claimNumber: "CLM-DEMO-001",
      insured_name: "John Smith",
      status: "active",
      carrier: "Demo Carrier",
      estimatedValue: 0,
      propertyAddress: "123 Demo St, Phoenix, AZ 85001",
      lossDate: now,
      updatedAt: now,
    });
  }

  if (hydratedClaims.length === 0) {
    return (
      <div className="container mx-auto max-w-7xl px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[color:var(--text)]">Claims Dashboard</h1>
            <p className="mt-1 text-muted-foreground">Demo mode is warming up.</p>
          </div>
          <Link href="/claims/new">
            <Button className="gap-2 bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4" />
              New Claim
            </Button>
          </Link>
        </div>
        <div className="rounded-2xl border border-dashed border-border bg-card/60 p-8 text-center">
          <p className="text-lg font-semibold text-foreground">No claims yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Check /api/diag/ready or /api/public/claims to verify demo data.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[color:var(--text)]">Claims Dashboard</h1>
          <p className="mt-1 text-muted-foreground">
            Manage and track all your insurance claims in one place
          </p>
        </div>
        <Link href="/claims/new">
          <Button className="gap-2 bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4" />
            New Claim
          </Button>
        </Link>
      </div>

      <ClaimsGrid claims={hydratedClaims as any} publicMode={mode === "public"} />
    </div>
  );
}
