/* eslint-disable react/jsx-no-comment-textnodes, @typescript-eslint/no-explicit-any */
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import prisma from "@/lib/prisma";
import { safeOrgContext } from "@/lib/safeOrgContext";

interface ClientNetworkParams {
  params: { clientNetworkId: string };
}

export default async function ClientNetworkDetailPage({ params }: ClientNetworkParams) {
  const ctx = await safeOrgContext();
  if (ctx.status === "unauthenticated") redirect("/sign-in");
  if (ctx.status !== "ok" || !ctx.orgId) notFound();

  const clientNetwork = await prisma.client_networks.findUnique({
    where: { id: params.clientNetworkId },
  });

  if (!clientNetwork || clientNetwork.orgId !== ctx.orgId) notFound();

  const [contacts, activity] = await Promise.all([
    prisma.client_contacts.findMany({
      where: { clientNetworkId: clientNetwork.id },
      orderBy: { createdAt: "desc" },
    }),
    prisma.client_activity.findMany({
      where: { clientNetworkId: clientNetwork.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  return (
    <PageContainer maxWidth="7xl">
      <PageHero
        section="network"
        title={clientNetwork.name}
        subtitle={`/portal/${clientNetwork.slug}`}
        actions={
          <div className="flex items-center gap-2">
            <Button asChild variant="secondary">
              <Link href="/network/clients">Back</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/portal/${clientNetwork.slug}`}>Open portal</Link>
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
            <CardDescription>System + pro actions for this client portal network.</CardDescription>
          </CardHeader>
          <CardContent>
            {activity.length === 0 ? (
              <p className="text-sm text-muted-foreground">No activity yet.</p>
            ) : (
              <div className="space-y-3">
                {activity.map((a) => (
                  <div key={a.id} className="rounded-lg border border-border p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">{a.type}</p>
                        {a.message ? (
                          <p className="mt-1 text-sm text-muted-foreground">{a.message}</p>
                        ) : null}
                      </div>
                      <p className="whitespace-nowrap text-xs text-muted-foreground">
                        {new Date(a.createdAt as any).toLocaleString()}
                      </p>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Actor: {a.actorType}
                      {a.actorId ? ` • ${a.actorId}` : ""}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contacts</CardTitle>
            <CardDescription>Homeowner contacts in this portal.</CardDescription>
          </CardHeader>
          <CardContent>
            {contacts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No contacts added yet.</p>
            ) : (
              <div className="space-y-3">
                {contacts.map((c) => (
                  <div key={c.id} className="rounded-lg border border-border p-3">
                    <p className="text-sm font-medium text-foreground">{c.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{c.role || "Homeowner"}</p>
                    <p className="mt-2 text-sm text-muted-foreground">{c.email || c.phone || ""}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
