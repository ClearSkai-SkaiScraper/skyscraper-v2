// src/app/(app)/claims/[claimId]/_components/ClientConnectSection.tsx
"use client";

import {
  CheckCircle2,
  Copy,
  Loader2,
  Mail,
  Search,
  UserCheck,
  UserPlus,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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

interface Contact {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  companyName?: string | null;
}

interface Connection {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  companyName?: string | null;
  contactId?: string;
}

interface ClientConnectSectionProps {
  claimId: string;
  currentClientId?: string | null;
}

export function ClientConnectSection({ claimId, currentClientId }: ClientConnectSectionProps) {
  // Connections (from Trades Network)
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedConnectionId, setSelectedConnectionId] = useState<string>("");
  const [loadingConnections, setLoadingConnections] = useState(true);
  const [attachingConnection, setAttachingConnection] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Contact[]>([]);
  const [searching, setSearching] = useState(false);

  // Attached client
  const [attachedClient, setAttachedClient] = useState<Contact | null>(null);

  // Invite state
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [inviting, setInviting] = useState(false);
  const [copied, setCopied] = useState(false);

  // Fetch connections from Trades Network
  useEffect(() => {
    void fetchConnections();
  }, []);

  // Fetch current attached client using unified endpoint
  useEffect(() => {
    void fetchAttachedClient();
  }, [claimId, currentClientId]);

  const fetchConnections = async () => {
    setLoadingConnections(true);
    try {
      // Fetch from company connections endpoint — only returns Client Network connections
      const res = await fetch("/api/company/connections?limit=100");
      if (res.ok) {
        const data = await res.json();
        const conns: Connection[] = (data.connections || []).map((c: any) => ({
          id: c.id,
          name: c.name || `${c.firstName || ""} ${c.lastName || ""}`.trim() || "Unknown",
          email: c.email,
          phone: c.phone,
          companyName: c.companyName,
          contactId: c.contactId || c.id,
        }));
        setConnections(conns);
      }
    } catch (error) {
      logger.error("Failed to fetch connections:", error);
    } finally {
      setLoadingConnections(false);
    }
  };

  const fetchAttachedClient = async () => {
    // Use the unified connected-client endpoint that checks both Client and CRM tables
    try {
      const res = await fetch(`/api/claims/${claimId}/connected-client`);
      if (res.ok) {
        const data = await res.json();
        if (data.client) {
          setAttachedClient({
            id: data.client.id,
            firstName: data.client.firstName,
            lastName: data.client.lastName,
            email: data.client.email,
            phone: data.client.phone,
          });
        }
      }
    } catch (error) {
      logger.error("Failed to fetch attached client:", error);
    }
  };

  const attachFromConnection = async () => {
    if (!selectedConnectionId) {
      toast.error("Please select a connection first");
      return;
    }

    setAttachingConnection(true);
    try {
      const connection = connections.find((c) => c.id === selectedConnectionId);
      if (!connection) {
        throw new Error("Connection not found");
      }

      // Use the contactId if available, otherwise create/attach by ID
      const contactId = connection.contactId || connection.id;

      const res = await fetch(`/api/claims/${claimId}/attach-contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to attach client");
      }

      setAttachedClient({
        id: contactId,
        firstName: connection.name.split(" ")[0] || null,
        lastName: connection.name.split(" ").slice(1).join(" ") || null,
        email: connection.email,
        phone: connection.phone,
      });
      setSelectedConnectionId("");
      toast.success("Client attached successfully!");
      // Refresh attached client from API to get authoritative data
      void fetchAttachedClient();
    } catch (error: any) {
      logger.error("Attach from connection failed:", error);
      toast.error(error.message || "Failed to attach client");
    } finally {
      setAttachingConnection(false);
    }
  };

  const searchContacts = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const res = await fetch(`/api/contacts/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      setSearchResults(data.contacts || []);
    } catch (error) {
      logger.error("Search failed:", error);
      toast.error("Search failed. Please try again.");
    } finally {
      setSearching(false);
    }
  };

  const attachClient = async (contactId: string) => {
    try {
      const res = await fetch(`/api/claims/${claimId}/attach-contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to attach client");
      }

      const attached = searchResults.find((c) => c.id === contactId);
      setAttachedClient(attached || null);
      setSearchQuery("");
      setSearchResults([]);
      toast.success("Client attached successfully!");
    } catch (error: any) {
      logger.error("Attach client failed:", error);
      toast.error(error.message || "Failed to attach client");
    }
  };

  const sendInvite = async () => {
    if (!inviteEmail.trim()) {
      toast.error("Please enter the client's email address");
      return;
    }

    setInviting(true);
    try {
      const res = await fetch(`/api/claims/${claimId}/mutate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "invite_client",
          clientEmail: inviteEmail.trim(),
          clientName: inviteName.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to send invite");
      }

      const data = await res.json();
      const appUrl = window.location.origin;
      const linkId = data.link?.id;
      if (linkId) {
        setInviteLink(`${appUrl}/client/accept-invite?token=${linkId}`);
      }
      toast.success("Invite sent successfully!");
      setInviteEmail("");
      setInviteName("");
    } catch (error: any) {
      logger.error("Send invite failed:", error);
      toast.error(error.message || "Failed to send invite");
    } finally {
      setInviting(false);
    }
  };

  const copyInviteLink = () => {
    if (inviteLink) {
      void navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      toast.success("Link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Current Attached Client */}
      {attachedClient && (
        <Card className="border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/20">
          <CardContent className="flex items-center gap-3 py-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/50">
              <UserCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="font-semibold text-emerald-900 dark:text-emerald-100">
                Client Connected: {attachedClient.firstName} {attachedClient.lastName}
              </p>
              {attachedClient.email && (
                <p className="text-sm text-emerald-700 dark:text-emerald-300">
                  {attachedClient.email}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Selection Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Connect a Client
          </CardTitle>
          <CardDescription>
            Select an existing connection, search your contacts, or send a new invite
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="connections" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="connections">
                <Users className="mr-2 h-4 w-4" />
                Connections
              </TabsTrigger>
              <TabsTrigger value="search">
                <Search className="mr-2 h-4 w-4" />
                Search
              </TabsTrigger>
              <TabsTrigger value="invite">
                <Mail className="mr-2 h-4 w-4" />
                Send Invite
              </TabsTrigger>
            </TabsList>

            {/* Tab 1: Select from Connections (Trades Network) */}
            <TabsContent value="connections" className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="connection-select">Select from Your Network</Label>
                <Select
                  value={selectedConnectionId}
                  onValueChange={setSelectedConnectionId}
                  disabled={loadingConnections}
                >
                  <SelectTrigger id="connection-select">
                    <SelectValue
                      placeholder={
                        loadingConnections ? "Loading connections..." : "Choose a connection..."
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {connections.length === 0 && !loadingConnections ? (
                      <SelectItem value="_none" disabled>
                        No connections found
                      </SelectItem>
                    ) : (
                      connections.map((conn) => (
                        <SelectItem key={conn.id} value={conn.id}>
                          <div className="flex flex-col">
                            <span>{conn.name}</span>
                            {conn.email && (
                              <span className="text-xs text-muted-foreground">{conn.email}</span>
                            )}
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={attachFromConnection}
                disabled={!selectedConnectionId || attachingConnection}
                className="w-full"
              >
                {attachingConnection ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Attaching...
                  </>
                ) : (
                  <>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Attach Selected Connection
                  </>
                )}
              </Button>

              {connections.length === 0 && !loadingConnections && (
                <p className="text-center text-sm text-muted-foreground">
                  No connections yet.{" "}
                  <a href="/company/connections" className="text-primary underline">
                    Add connections
                  </a>{" "}
                  in your Trades Network.
                </p>
              )}
            </TabsContent>

            {/* Tab 2: Search Existing Contacts */}
            <TabsContent value="search" className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="search-input">Search Contacts</Label>
                <div className="flex gap-2">
                  <Input
                    id="search-input"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && searchContacts()}
                    placeholder="Search by name, email, or phone..."
                  />
                  <Button onClick={searchContacts} disabled={searching || !searchQuery.trim()}>
                    {searching ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {searchResults.length > 0 && (
                <div className="space-y-2 rounded-lg border bg-muted/50 p-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Results ({searchResults.length})
                  </p>
                  {searchResults.map((contact) => (
                    <div
                      key={contact.id}
                      className="flex items-center justify-between rounded-lg border bg-background p-3"
                    >
                      <div>
                        <p className="font-medium">
                          {contact.firstName} {contact.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {contact.email || contact.phone || "No contact info"}
                        </p>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => attachClient(contact.id)}>
                        <UserPlus className="mr-1 h-3 w-3" />
                        Attach
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Tab 3: Send Email Invite */}
            <TabsContent value="invite" className="space-y-4 pt-4">
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="invite-name">Client Name (optional)</Label>
                  <Input
                    id="invite-name"
                    value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)}
                    placeholder="John Smith"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invite-email">Client Email *</Label>
                  <Input
                    id="invite-email"
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="client@email.com"
                  />
                </div>
              </div>

              <Button
                onClick={sendInvite}
                disabled={inviting || !inviteEmail.trim()}
                className="w-full"
              >
                {inviting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending Invite...
                  </>
                ) : (
                  <>
                    <Mail className="mr-2 h-4 w-4" />
                    Send Portal Invite
                  </>
                )}
              </Button>

              {inviteLink && (
                <Card className="border-primary/20 bg-primary/5">
                  <CardContent className="py-3">
                    <p className="mb-2 text-sm font-medium">Invite Link Generated:</p>
                    <div className="flex gap-2">
                      <Input
                        value={inviteLink}
                        readOnly
                        className="flex-1 text-xs"
                        aria-label="Invite Link"
                      />
                      <Button size="sm" variant="secondary" onClick={copyInviteLink}>
                        {copied ? (
                          <>
                            <CheckCircle2 className="mr-1 h-3 w-3" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="mr-1 h-3 w-3" />
                            Copy
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
