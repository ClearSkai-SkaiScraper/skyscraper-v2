import { Search, UserPlus, Users } from "lucide-react";
import Link from "next/link";

import InviteClientButton from "@/components/clients/InviteClientButton";
import { NoOrgMembershipBanner } from "@/components/guards/NoOrgMembershipBanner";
import { PageHero } from "@/components/layout/PageHero";
import { Button } from "@/components/ui/button";
import { getTenant } from "@/lib/auth/tenant";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface PageProps {
  searchParams: Promise<{ search?: string }>;
}

export default async function ClientsPage({ searchParams }: PageProps) {
  const orgId = await getTenant();
  const params = await searchParams;
  const searchQuery = params.search || "";

  if (!orgId) {
    return <NoOrgMembershipBanner title="Clients" />;
  }

  let clients: any[] = [];
  let hasError = false;

  try {
    const whereClause: any = { orgId };

    // Add search filter if provided
    if (searchQuery.trim()) {
      whereClause.OR = [
        { name: { contains: searchQuery, mode: "insensitive" } },
        { email: { contains: searchQuery, mode: "insensitive" } },
      ];
    }

    clients = await prisma.client.findMany({
      where: whereClause,
      take: 50,
      orderBy: { createdAt: "desc" },
    });
  } catch (error) {
    logger.error("[ClientsPage] Error loading clients:", error);
    hasError = true;
  }

  return (
    <div className="space-y-6 p-6">
      <PageHero
        section="jobs"
        title="Clients"
        subtitle="Manage your client contacts and relationships"
        icon={<Users className="h-5 w-5" />}
      >
        <Button asChild size="sm">
          <Link href="/leads/new">
            <UserPlus className="mr-2 h-4 w-4" />
            Add Client
          </Link>
        </Button>
      </PageHero>

      {hasError && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-900 dark:bg-yellow-900/20">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            ⚠️ There was an issue loading client contacts. Please try again or contact support if
            this continues.
          </p>
        </div>
      )}

      {/* Search Bar */}
      <form method="get" className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            name="search"
            type="text"
            defaultValue={searchQuery}
            placeholder="Search clients by name or email..."
            className="w-full rounded-md border border-input bg-background px-10 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
          />
        </div>
        <button
          type="submit"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Search
        </button>
        {searchQuery && (
          <Link
            href="/clients"
            className="rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
          >
            Clear
          </Link>
        )}
      </form>

      {/* Create Client Form */}
      <div className="rounded-lg border bg-card p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-medium text-foreground">Add New Client</h3>
        <form
          action="/api/clients/create"
          method="post"
          className="grid gap-3 text-sm md:grid-cols-5"
        >
          <input name="orgId" type="hidden" value={orgId} />
          <input
            name="firstName"
            placeholder="First Name"
            required
            className="rounded-md border border-input bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
          />
          <input
            name="lastName"
            placeholder="Last Name"
            required
            className="rounded-md border border-input bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
          />
          <input
            name="email"
            type="email"
            placeholder="Email"
            required
            className="rounded-md border border-input bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
          />
          <input
            name="phone"
            type="tel"
            placeholder="Phone (optional)"
            className="rounded-md border border-input bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
          />
          <button className="rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground hover:bg-primary/90">
            Add Client
          </button>
        </form>
      </div>

      {clients.length === 0 && !hasError ? (
        <div className="rounded-lg border border-border bg-card p-12 text-center">
          <h3 className="text-lg font-semibold text-foreground">No Clients Yet</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Add your first client using the form above to get started.
          </p>
        </div>
      ) : (
        <table className="w-full border text-sm">
          <thead>
            <tr className="bg-muted/50">
              <th className="p-2 text-left">Name</th>
              <th className="p-2 text-left">Email</th>
              <th className="p-2 text-left">Created</th>
              <th className="p-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((c) => (
              <tr key={c.id} className="border-t">
                <td className="p-2">
                  <Link href={`/clients/${c.id}`} className="underline">
                    {c.name}
                  </Link>
                </td>
                <td className="p-2">{c.email}</td>
                <td className="p-2">{new Date(c.createdAt).toLocaleDateString()}</td>
                <td className="p-2">
                  <div className="flex items-center gap-2">
                    <Link href={`/clients/${c.id}`} className="text-xs underline">
                      View
                    </Link>
                    <InviteClientButton clientId={c.id} email={c.email} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
