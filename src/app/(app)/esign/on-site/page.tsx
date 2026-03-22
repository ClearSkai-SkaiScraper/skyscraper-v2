import { PenTool } from "lucide-react";
import type { Metadata } from "next";

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getTenant } from "@/lib/auth/tenant";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "On-Site Signing | SkaiScraper",
  description: "Manage on-site electronic signature envelopes",
};

export default async function OnSiteSigningPage() {
  const orgId = await getTenant();
  if (!orgId) redirect("/");

  // Fetch recent envelopes (scoped to user's claims via orgId)
  let envelopes: Array<{
    id: string;
    status: string;
    documentName: string;
    signerName: string;
    createdAt: Date;
    updatedAt: Date;
  }> = [];

  try {
    // Get claim IDs for this org first, then find envelopes
    const orgClaimIds = await prisma.claims.findMany({
      where: { orgId },
      select: { id: true },
      take: 100,
    });
    const claimIds = orgClaimIds.map((c) => c.id);

    if (claimIds.length > 0) {
      envelopes = await prisma.signatureEnvelope.findMany({
        where: { claimId: { in: claimIds } },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          status: true,
          documentName: true,
          signerName: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    }
  } catch {
    // Table may not exist yet — graceful fallback
  }

  const statusColor = (status: string): "default" | "secondary" | "outline" => {
    switch (status.toLowerCase()) {
      case "completed":
        return "default";
      case "pending":
        return "secondary";
      case "sent":
        return "outline";
      default:
        return "secondary";
    }
  };

  return (
    <PageContainer>
      <PageHero
        title="On-Site Signing"
        subtitle="Create and manage electronic signature envelopes for on-site document signing."
        icon={<PenTool className="h-7 w-7" />}
      />

      {envelopes.length === 0 ? (
        <div className="mt-12 flex flex-col items-center justify-center text-center">
          <div className="mb-4 rounded-full bg-muted p-4">
            <PenTool className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold">No envelopes yet</h3>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            On-site signing envelopes will appear here when created from a claim or smart document.
          </p>
        </div>
      ) : (
        <div className="mt-8 grid gap-3">
          {envelopes.map((env) => (
            <Link key={env.id} href={`/esign/on-site/${env.id}`}>
              <Card className="transition-all hover:shadow-sm hover:ring-1 hover:ring-primary/20">
                <CardHeader className="flex flex-row items-center justify-between py-4">
                  <div>
                    <CardTitle className="text-base">
                      {env.documentName || `Envelope ${env.id.slice(0, 8)}…`}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {env.signerName} · Created {env.createdAt.toLocaleDateString()}
                    </CardDescription>
                  </div>
                  <Badge variant={statusColor(env.status)}>{env.status}</Badge>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
