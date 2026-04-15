// eslint-disable-next-line no-restricted-imports
import { currentUser } from "@clerk/nextjs/server";
import { Users } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { PageHero } from "@/components/layout/PageHero";
import prisma from "@/lib/prisma";

async function getOrCreatePortalToken(clientId: string, claimId: string, orgId: string) {
  // Check if insured_access exists for this job/claim
  const existing = await prisma.insured_access.findFirst({
    where: { org_id: orgId },
    orderBy: { created_at: "desc" },
  });
  if (existing) return existing.access_token;

  // Create new access token
  const token = Math.random().toString(16).slice(2) + Date.now().toString(16);
  const id = crypto.randomUUID();
  await prisma.insured_access.create({
    data: {
      id,
      job_id: claimId, // Using claimId as job reference
      org_id: orgId,
      insured_email: "", // Will be filled when client accesses
      access_token: token,
      expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
      updated_at: new Date(),
    },
  });
  return token;
}

export default async function ClientDetailPage({ params }: { params: { clientId: string } }) {
  const user = await currentUser();
  if (!user) redirect("/sign-in");
  const { clientId } = params;
  const orgId = user.publicMetadata?.orgId as string | undefined;
  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client) return <div className="p-6">Client not found.</div>;
  const claims = await prisma.claims.findMany({
    where: { clientId: client.id },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  const latestClaimId = claims[0]?.id;
  const token =
    orgId && latestClaimId ? await getOrCreatePortalToken(client.id, latestClaimId, orgId) : null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const leads: any[] = [];

  return (
    <div className="space-y-6">
      <PageHero
        title={client.name ?? "Client"}
        subtitle={client.email ?? "Client Details"}
        icon={<Users className="h-6 w-6" />}
        section="network"
      >
        <Link href="/clients" className="text-sm text-white/80 underline hover:text-white">
          ← Back to Clients
        </Link>
      </PageHero>
      <div className="px-6">
        <div className="grid gap-4 text-sm md:grid-cols-3">
          <Stat label="Email" value={client.email ?? ""} />
          <Stat label="Phone" value={client.phone || "—"} />
          <Stat label="Address" value={client.address || "—"} />
        </div>
        {token && (
          <Link
            href={`/portal/${token}`}
            target="_blank"
            className="inline-block rounded border bg-white px-4 py-2 text-sm hover:bg-gray-50"
          >
            View as Client
          </Link>
        )}

        {/* ITEM 6: All Jobs Section */}
        <div className="space-y-4 border-t pt-6">
          <h2 className="text-lg font-semibold">Claims History ({claims.length})</h2>
          {claims.length === 0 ? (
            <p className="text-sm text-gray-500">No claims</p>
          ) : (
            <div className="space-y-2">
              {claims.map((claim) => (
                <div
                  key={claim.id}
                  className="flex items-center justify-between border-b pb-2 text-sm"
                >
                  <div>
                    <p className="font-medium">{claim.title}</p>
                    <p className="text-gray-500">{claim.claimNumber}</p>
                  </div>
                  <span className="rounded bg-gray-100 px-2 py-1 text-xs">{claim.status}</span>
                </div>
              ))}
            </div>
          )}

          <h2 className="mt-6 text-lg font-semibold">Leads History ({leads.length})</h2>
          <p className="text-sm text-gray-500">No leads</p>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border bg-white p-3">
      <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
      <div className="mt-1 truncate font-medium" title={value}>
        {value}
      </div>
    </div>
  );
}
