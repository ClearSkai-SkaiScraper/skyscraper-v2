/**
 * Client Document Sharing Component
 * Allows pros to manage which documents are shared with specific clients
 */

"use client";

import { logger } from "@/lib/logger";
import { format } from "date-fns";
import { Eye, FileText, Image as ImageIcon, Share, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";

interface Document {
  id: string;
  name: string;
  type: "photo" | "report" | "estimate" | "other";
  size: string;
  shared: boolean;
  sharedAt?: string;
}

interface Client {
  id: string;
  name: string;
  email: string;
}

interface ClientDocumentSharingProps {
  claimId: string;
  clients?: Client[];
  onClientAdded?: () => void;
}

export default function ClientDocumentSharing({
  claimId,
  clients: clientsProp,
  onClientAdded,
}: ClientDocumentSharingProps) {
  const router = useRouter();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [clients, setClients] = useState<Client[]>(clientsProp || []);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [loadingClients, setLoadingClients] = useState(!clientsProp?.length);

  // Auto-fetch connected client if none passed via prop
  useEffect(() => {
    if (!clientsProp?.length) {
      fetchConnectedClient();
    }
  }, [claimId]);

  // Sync prop changes
  useEffect(() => {
    if (clientsProp?.length) {
      setClients(clientsProp);
      setLoadingClients(false);
    }
  }, [clientsProp]);

  const fetchConnectedClient = async () => {
    setLoadingClients(true);
    try {
      const res = await fetch(`/api/claims/${claimId}/connected-client`);
      if (res.ok) {
        const data = await res.json();
        if (data.client) {
          const client: Client = {
            id: data.client.id,
            name: data.client.name || "Unknown Client",
            email: data.client.email || "",
          };
          setClients([client]);
          // Auto-select the only client
          setSelectedClientId(client.id);
        } else {
          setClients([]);
        }
      }
    } catch (error) {
      logger.error("Failed to fetch connected client:", error);
    } finally {
      setLoadingClients(false);
    }
  };

  // Load documents and their sharing status
  useEffect(() => {
    // Auto-select the only client if available
    if (clients.length === 1 && !selectedClientId) {
      setSelectedClientId(clients[0].id);
    }
    loadDocuments();
  }, [claimId, selectedClientId, clients]);

  const loadDocuments = async () => {
    try {
      const response = await fetch(
        `/api/claims/documents/sharing?claimId=${claimId}&clientId=${selectedClientId}`
      );
      if (!response.ok) {
        // Auth or scope errors — silently degrade, main doc list still works
        logger.warn("ClientDocumentSharing: API returned", response.status);
        setDocuments([]);
        return;
      }

      const data = await response.json();
      setDocuments(data.documents || []);
    } catch (error) {
      logger.error("Error loading documents:", error);
      // Don't toast on load — the main documents list still works
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleDocumentSharing = async (documentId: string, shared: boolean) => {
    if (!selectedClientId) {
      toast.error("Please select a client first");
      return;
    }

    try {
      const response = await fetch("/api/claims/documents/sharing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: selectedClientId,
          claimId,
          documentId,
          shared,
        }),
      });

      if (!response.ok) throw new Error("Failed to update sharing");

      const result = await response.json();
      toast.success(result.message);

      // Update local state
      setDocuments((docs) =>
        docs.map((doc) =>
          doc.id === documentId
            ? { ...doc, shared, sharedAt: shared ? new Date().toISOString() : undefined }
            : doc
        )
      );
    } catch (error) {
      logger.error("Error toggling document sharing:", error);
      toast.error("Failed to update document sharing");
    }
  };

  const getDocumentIcon = (type: string) => {
    switch (type) {
      case "photo":
        return <ImageIcon className="h-4 w-4" />;
      case "report":
        return <FileText className="h-4 w-4" />;
      case "estimate":
        return <FileText className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getDocumentTypeColor = (type: string) => {
    switch (type) {
      case "photo":
        return "bg-blue-100 text-blue-800";
      case "report":
        return "bg-green-100 text-green-800";
      case "estimate":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (loadingClients) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Share className="h-5 w-5" />
            Document Sharing
          </CardTitle>
          <CardDescription>Loading connected client...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-6">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (clients.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Share className="h-5 w-5" />
            Document Sharing
          </CardTitle>
          <CardDescription>No clients are associated with this claim yet</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="py-6 text-center">
            <Users className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <p className="mb-4 text-sm text-muted-foreground">
              Add clients to this claim to share documents with them
            </p>
            <Button onClick={() => router.push(`/claims/${claimId}/client`)}>
              <Users className="mr-2 h-4 w-4" />
              Add Client to Claim
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Share className="h-5 w-5" />
          Document Sharing
        </CardTitle>
        <CardDescription>Control which documents are shared with your clients</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Client Selection */}
        <div className="space-y-2">
          <Label>Select Client</Label>
          <Select value={selectedClientId} onValueChange={setSelectedClientId}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a client to manage their document access..." />
            </SelectTrigger>
            <SelectContent>
              {clients.map((client) => (
                <SelectItem key={client.id} value={client.id}>
                  <div className="flex flex-col">
                    <span className="font-medium">{client.name}</span>
                    <span className="text-xs text-muted-foreground">{client.email}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedClientId && (
          <>
            <Separator />

            {/* Document List */}
            {loading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
                ))}
              </div>
            ) : documents.length === 0 ? (
              <div className="py-8 text-center">
                <FileText className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No documents found for this claim</p>
              </div>
            ) : (
              <div className="space-y-3">
                <Label className="text-base font-medium">Documents ({documents.length})</Label>
                {documents.map((document) => (
                  <div
                    key={document.id}
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`rounded-lg p-2 ${getDocumentTypeColor(document.type)}`}>
                        {getDocumentIcon(document.type)}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate font-medium">{document.name}</p>
                          <Badge variant="outline" className="text-xs capitalize">
                            {document.type}
                          </Badge>
                        </div>

                        <div className="mt-1 flex items-center gap-4 text-xs text-muted-foreground">
                          <span>{document.size}</span>
                          {document.shared && document.sharedAt && (
                            <span className="flex items-center gap-1">
                              <Eye className="h-3 w-3" />
                              Shared {format(new Date(document.sharedAt), "MMM d")}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={document.shared}
                          onCheckedChange={(checked) => toggleDocumentSharing(document.id, checked)}
                        />
                        <Label className="text-sm">{document.shared ? "Shared" : "Private"}</Label>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Bulk Actions */}
            {documents.length > 0 && (
              <>
                <Separator />
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    {documents.filter((d) => d.shared).length} of {documents.length} documents
                    shared
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        documents.forEach((doc) => {
                          if (!doc.shared) {
                            toggleDocumentSharing(doc.id, true);
                          }
                        });
                      }}
                    >
                      Share All
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        documents.forEach((doc) => {
                          if (doc.shared) {
                            toggleDocumentSharing(doc.id, false);
                          }
                        });
                      }}
                    >
                      Hide All
                    </Button>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
