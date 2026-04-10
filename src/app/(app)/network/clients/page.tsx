import {
  Briefcase,
  Building2,
  FileText,
  Home,
  Key,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Plus,
  Search,
  Send,
  Share,
  UserCircle,
  Users,
} from "lucide-react";
import { Metadata } from "next";
import Link from "next/link";

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { logger } from "@/lib/logger";
import { getOrg } from "@/lib/org/getOrg";
import prisma from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Clients Network",
  description: "Manage client portal networks for your organization",
};

export const dynamic = "force-dynamic";

// Category configuration
const CATEGORIES = [
  { value: "all", label: "All Clients", icon: Users },
  { value: "Homeowner", label: "Homeowners", icon: Home },
  { value: "Business Owner", label: "Business Owners", icon: Building2 },
  { value: "Broker", label: "Brokers", icon: Briefcase },
  { value: "Realtor", label: "Realtors", icon: Key },
  { value: "Property Manager", label: "Property Managers", icon: UserCircle },
  { value: "Landlord", label: "Landlords", icon: MapPin },
] as const;

function getCategoryIcon(category: string) {
  const cat = CATEGORIES.find((c) => c.value === category);
  return cat?.icon || Users;
}

function getCategoryColor(category: string) {
  switch (category) {
    case "Homeowner":
      return "bg-blue-100 text-blue-800";
    case "Business Owner":
      return "bg-purple-100 text-purple-800";
    case "Broker":
      return "bg-green-100 text-green-800";
    case "Realtor":
      return "bg-amber-100 text-amber-800";
    case "Property Manager":
      return "bg-indigo-100 text-indigo-800";
    case "Landlord":
      return "bg-rose-100 text-rose-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

// Component for Networks view (existing functionality)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function NetworksView({ networks, categoryCounts, networksByCategory, countById }: any) {
  if (networks.length === 0) {
    return (
      <Card className="border-dashed">
        <CardHeader className="text-center">
          <Users className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <CardTitle>No Client Networks Yet</CardTitle>
          <CardDescription>
            Create your first client network to start managing client relationships.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <Button asChild>
            <Link href="/network/create?type=client">Create First Client Network</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Tabs defaultValue="all" className="w-full">
      // eslint-disable-next-line react/jsx-no-comment-textnodes
      <TabsList className="grid w-full grid-cols-4 lg:grid-cols-7">
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        {categoryCounts.map((cat: any) => {
          const IconComponent = cat.icon;
          return (
            <TabsTrigger key={cat.value} value={cat.value} className="flex items-center gap-1">
              <IconComponent className="h-4 w-4" />
              <span className="hidden lg:inline">{cat.label}</span>
              <Badge variant="secondary" className="ml-1 text-xs">
                {cat.count}
              </Badge>
            </TabsTrigger>
          );
        })}
      </TabsList>

      <TabsContent value="all" className="mt-6 space-y-4">
        // eslint-disable-next-line react/jsx-no-comment-textnodes
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          {networks.map((n: any) => {
            const CategoryIcon = getCategoryIcon(n.category || "Homeowner");
            return (
              <ClientCard
                key={n.id}
                network={n}
                contactCount={countById.get(n.id) ?? 0}
                CategoryIcon={CategoryIcon}
              />
            );
          })}
        </div>
      </TabsContent>

      {CATEGORIES.filter((c) => c.value !== "all").map((cat) => (
        <TabsContent key={cat.value} value={cat.value} className="mt-6 space-y-4">
          {(networksByCategory[cat.value]?.length || 0) === 0 ? (
            <Card className="border-dashed">
              <CardHeader className="text-center">
                <cat.icon className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                <CardTitle>No {cat.label} Yet</CardTitle>
                <CardDescription>
                  Add your first {cat.label.toLowerCase().slice(0, -1)} to start building this
                  category.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <Button asChild>
                  <Link
                    href={`/network/create?type=client&category=${encodeURIComponent(cat.value)}`}
                  >
                    Add {cat.label.slice(0, -1)}
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            // eslint-disable-next-line react/jsx-no-comment-textnodes
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              {networksByCategory[cat.value]?.map((n: any) => {
                const CategoryIcon = cat.icon;
                return (
                  <ClientCard
                    key={n.id}
                    network={n}
                    contactCount={countById.get(n.id) ?? 0}
                    CategoryIcon={CategoryIcon}
                  />
                );
              })}
            </div>
          )}
        </TabsContent>
      ))}
    </Tabs>
  );
}

// Component for Client Directory view
function ClientDirectoryView() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Browse Client Directory
          </CardTitle>
          <CardDescription>Discover and connect with clients on the platform</CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <Search className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="mb-2 text-lg font-semibold">Client Directory</h3>
          <p className="mb-6 text-sm text-muted-foreground">
            Search and browse all available clients with profiles on the platform
          </p>
          <Button asChild size="lg">
            <Link href="/clients/directory">
              <Search className="mr-2 h-4 w-4" />
              Open Directory
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// Component for Client Connections view
function ClientConnectionsView() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Active Connections
          </CardTitle>
          <CardDescription>Manage your connected clients and pending invitations</CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <MessageSquare className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="mb-2 text-lg font-semibold">Client Connections</h3>
          <p className="mb-6 text-sm text-muted-foreground">
            Track and manage all your client relationships in one place
          </p>
          <div className="flex justify-center gap-3">
            <Button asChild variant="outline">
              <Link href="/invitations/analytics">View Analytics</Link>
            </Button>
            <Button asChild>
              <Link href="/invitations">
                <Send className="mr-2 h-4 w-4" />
                Send Invitations
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Component for Shared Documents view
function SharedDocumentsView() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Document Sharing
          </CardTitle>
          <CardDescription>
            Manage files shared with clients for claims and projects
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <FileText className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="mb-2 text-lg font-semibold">Document Management</h3>
          <p className="mb-6 text-sm text-muted-foreground">
            Share photos, reports, and documents with specific clients for their claims
          </p>
          <AddToClaimDialog />
        </CardContent>
      </Card>
    </div>
  );
}

// Dialog for adding clients to claims with document sharing
function AddToClaimDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="lg">
          <Plus className="mr-2 h-4 w-4" />
          Add Client to Claim
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add Client to Claim & Share Documents</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          {/* Client Selection */}
          <div className="space-y-2">
            <Label>Select Client</Label>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Choose a client..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="client1">John Doe - Homeowner</SelectItem>
                <SelectItem value="client2">Jane Smith - Business Owner</SelectItem>
                <SelectItem value="client3">Mike Johnson - Property Manager</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Claim Selection */}
          <div className="space-y-2">
            <Label>Select Claim/Project</Label>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Choose a claim..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="claim1">Claim #12345 - Water Damage</SelectItem>
                <SelectItem value="claim2">Claim #12346 - Fire Damage</SelectItem>
                <SelectItem value="claim3">Project #789 - Restoration</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Document Selection */}
          <div className="space-y-3">
            <Label>Select Documents to Share</Label>
            <div className="max-h-48 space-y-3 overflow-y-auto rounded-lg border p-4">
              <div className="flex items-center space-x-2">
                <Checkbox id="doc1" />
                <FileText className="h-4 w-4" />
                <Label htmlFor="doc1" className="flex-1">
                  Initial Assessment Report.pdf
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="doc2" />
                <FileText className="h-4 w-4" />
                <Label htmlFor="doc2" className="flex-1">
                  Damage Photo 1.jpg
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="doc3" />
                <FileText className="h-4 w-4" />
                <Label htmlFor="doc3" className="flex-1">
                  Damage Photo 2.jpg
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="doc4" />
                <FileText className="h-4 w-4" />
                <Label htmlFor="doc4" className="flex-1">
                  Estimate.pdf
                </Label>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2">
            <Button variant="outline">Cancel</Button>
            <Button>
              <Share className="mr-2 h-4 w-4" />
              Add Client & Share Documents
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default async function ClientsNetworkPage() {
  const ctx = await getOrg({ mode: "required" });
  if (!ctx.ok) throw new Error("Unreachable: mode required should redirect");
  const orgId = ctx.orgId;

  // Wrap in try-catch to handle table not existing gracefully
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let networks: any[] = [];
  let countById = new Map<string, number>();
  let hasError = false;

  try {
    networks = await prisma.client_networks.findMany({
      where: { orgId },
      orderBy: { createdAt: "desc" },
    });

    const ids = networks.map((n) => n.id);
    const contactCounts =
      ids.length === 0
        ? []
        : await prisma.client_contacts.groupBy({
            by: ["clientNetworkId"],
            where: { clientNetworkId: { in: ids } },
            _count: { _all: true },
          });

    countById = new Map(contactCounts.map((c) => [c.clientNetworkId, c._count._all] as const));
  } catch (error) {
    logger.error("[ClientsNetwork] Failed to load networks:", error);
    hasError = true;
  }

  // Group networks by category
  const networksByCategory = networks.reduce(
    (acc, n) => {
      const cat = n.category || "Homeowner";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(n);
      return acc;
    },
    {} as Record<string, typeof networks>
  );

  // Count by category for badges
  const categoryCounts = CATEGORIES.map((cat) => ({
    ...cat,
    count: cat.value === "all" ? networks.length : networksByCategory[cat.value]?.length || 0,
  }));

  return (
    <PageContainer maxWidth="7xl">
      <PageHero
        section="network"
        title="Clients Network"
        subtitle="Manage your client relationships and discover new connections"
        icon={<Users className="h-5 w-5" />}
        actions={
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href="/invitations">Invite Clients</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/network/create?type=client">+ Add Client</Link>
            </Button>
          </div>
        }
      />

      {hasError ? (
        <Card>
          <CardHeader>
            <CardTitle>Unable to load networks</CardTitle>
            <CardDescription>
              There was an issue loading your client networks. The database tables may need to be
              created. Run the migration:{" "}
              <code className="rounded bg-muted px-2 py-1">20260112_create_portal_tables.sql</code>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/network/clients">Retry</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="networks" className="w-full">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
            <TabsTrigger value="networks">
              <Building2 className="mr-2 h-4 w-4" />
              My Networks
            </TabsTrigger>
            <TabsTrigger value="directory">
              <Search className="mr-2 h-4 w-4" />
              Client Directory
            </TabsTrigger>
            <TabsTrigger value="connections">
              <MessageSquare className="mr-2 h-4 w-4" />
              Connections
            </TabsTrigger>
            <TabsTrigger value="documents">
              <FileText className="mr-2 h-4 w-4" />
              Shared Files
            </TabsTrigger>
          </TabsList>

          {/* My Networks Tab - Existing functionality */}
          <TabsContent value="networks" className="space-y-6">
            <NetworksView
              networks={networks}
              categoryCounts={categoryCounts}
              networksByCategory={networksByCategory}
              countById={countById}
            />
          </TabsContent>

          {/* Client Directory Tab */}
          <TabsContent value="directory" className="space-y-6">
            <ClientDirectoryView />
          </TabsContent>

          {/* Connections Tab */}
          <TabsContent value="connections" className="space-y-6">
            <ClientConnectionsView />
          </TabsContent>

          {/* Shared Documents Tab */}
          <TabsContent value="documents" className="space-y-6">
            <SharedDocumentsView />
          </TabsContent>
        </Tabs>
      )}
    </PageContainer>
  );
}

function ClientCard({
  network,
  contactCount,
  CategoryIcon,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  network: any;
  contactCount: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  CategoryIcon: any;
}) {
  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`rounded-lg p-2 ${getCategoryColor(network.category || "Homeowner")}`}>
              <CategoryIcon className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="truncate text-lg">{network.name}</CardTitle>
              <Badge variant="outline" className="mt-1 text-xs">
                {network.category || "Homeowner"}
              </Badge>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Contact info */}
        <div className="space-y-2 text-sm text-muted-foreground">
          {network.email && (
            <div className="flex items-center gap-2">
              <Mail className="h-3.5 w-3.5" />
              <span className="truncate">{network.email}</span>
            </div>
          )}
          {network.phone && (
            <div className="flex items-center gap-2">
              <Phone className="h-3.5 w-3.5" />
              <span>{network.phone}</span>
            </div>
          )}
          {(network.city || network.state) && (
            <div className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5" />
              <span>{[network.city, network.state].filter(Boolean).join(", ")}</span>
            </div>
          )}
        </div>

        {/* Portal info */}
        <div className="border-t pt-2">
          <p className="mb-3 text-xs text-muted-foreground">
            Portal: <code className="rounded bg-muted px-1.5 py-0.5">/portal/{network.slug}</code>
            <span className="mx-2">•</span>
            {contactCount} contact{contactCount === 1 ? "" : "s"}
          </p>

          <div className="flex items-center gap-2">
            <Button asChild variant="default" size="sm" className="flex-1">
              <Link href={`/network/clients/${network.id}`}>Manage</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href={`/portal/${network.slug}`}>Open Portal</Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
