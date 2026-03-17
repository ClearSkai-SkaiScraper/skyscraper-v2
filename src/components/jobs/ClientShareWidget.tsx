// src/components/jobs/ClientShareWidget.tsx
"use client";

import { CheckCircle2, Copy, Eye, EyeOff, FileImage, Link2, Send, User } from "lucide-react";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { logger } from "@/lib/logger";

interface ClientShareWidgetProps {
  jobId: string;
  jobType: "lead" | "claim";
  clientId?: string | null;
  clientName?: string;
  clientEmail?: string;
}

interface SharedDocument {
  id: string;
  name: string;
  type: string;
  sharedWithClient: boolean;
  uploadedAt: string;
}

export function ClientShareWidget({
  jobId,
  jobType,
  clientId,
  clientName,
  clientEmail,
}: ClientShareWidgetProps) {
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [documents, setDocuments] = useState<SharedDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [sendingInvite, setSendingInvite] = useState(false);
  const [clientConnected, setClientConnected] = useState(!!clientId);

  useEffect(() => {
    if (clientId) {
      fetchDocuments();
    }
  }, [clientId, jobId]);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const endpoint =
        jobType === "claim" ? `/api/claims/${jobId}/documents` : `/api/leads/${jobId}/files`;

      const res = await fetch(endpoint);
      if (res.ok) {
        const data = await res.json();
        // Transform to our format
        const docs = (data.documents || data.files || []).map((doc: any) => ({
          id: doc.id,
          name: doc.filename || doc.name || "Document",
          type: doc.mimeType || doc.type || "file",
          sharedWithClient: doc.sharedWithClient || false,
          uploadedAt: doc.createdAt || doc.uploadedAt,
        }));
        setDocuments(docs);
      }
    } catch (error) {
      logger.error("Failed to fetch documents:", error);
    } finally {
      setLoading(false);
    }
  };

  const generateInviteLink = async () => {
    try {
      const endpoint =
        jobType === "claim" ? `/api/claims/${jobId}/invite-client` : `/api/leads/${jobId}/invite`;

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      if (!res.ok) throw new Error("Failed to generate invite");

      const data = await res.json();
      setInviteLink(data.inviteUrl || data.link);
    } catch (error) {
      logger.error("Generate invite failed:", error);
      alert("Failed to generate invite link");
    }
  };

  const sendEmailInvite = async () => {
    if (!clientEmail) {
      alert("No client email address available");
      return;
    }

    setSendingInvite(true);
    try {
      const res = await fetch("/api/network/clients/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: clientEmail,
          firstName: clientName?.split(" ")[0] || "",
          lastName: clientName?.split(" ").slice(1).join(" ") || "",
          jobId,
          jobType,
        }),
      });

      if (!res.ok) throw new Error("Failed to send invite");

      alert("✅ Invite sent successfully!");
    } catch (error) {
      logger.error("Send invite failed:", error);
      alert("Failed to send invite. Please try again.");
    } finally {
      setSendingInvite(false);
    }
  };

  const copyInviteLink = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const toggleDocumentShare = async (docId: string, share: boolean) => {
    try {
      const endpoint =
        jobType === "claim"
          ? `/api/claims/${jobId}/documents/${docId}/share`
          : `/api/leads/${jobId}/files/${docId}/share`;

      await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sharedWithClient: share }),
      });

      setDocuments((prev) =>
        prev.map((doc) => (doc.id === docId ? { ...doc, sharedWithClient: share } : doc))
      );
    } catch (error) {
      logger.error("Failed to toggle document share:", error);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Client Connection
          </span>
          {clientConnected && <Badge className="bg-green-100 text-green-800">Connected</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Connected Client Info */}
        {clientConnected && clientName ? (
          <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-600 font-semibold text-white">
                {clientName.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-medium text-green-900 dark:text-green-100">{clientName}</p>
                {clientEmail && (
                  <p className="text-sm text-green-700 dark:text-green-300">{clientEmail}</p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              No client connected to this job yet
            </p>
          </div>
        )}

        {/* Invite Actions */}
        <div className="space-y-3">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Invite Client to Portal
          </p>

          <div className="flex gap-2">
            {clientEmail && (
              <Button
                variant="default"
                size="sm"
                onClick={sendEmailInvite}
                disabled={sendingInvite}
                className="gap-2"
              >
                <Send className="h-4 w-4" />
                {sendingInvite ? "Sending..." : "Email Invite"}
              </Button>
            )}

            <Button variant="outline" size="sm" onClick={generateInviteLink} className="gap-2">
              <Link2 className="h-4 w-4" />
              Get Link
            </Button>
          </div>

          {inviteLink && (
            <div className="flex items-center gap-2 rounded-lg bg-slate-100 p-3 dark:bg-slate-800">
              <input
                type="text"
                value={inviteLink}
                readOnly
                className="flex-1 bg-transparent text-xs text-slate-600 dark:text-slate-400"
                aria-label="Shareable invite link"
              />
              <Button variant="ghost" size="sm" onClick={copyInviteLink}>
                {copied ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          )}
        </div>

        {/* Document Sharing Toggle */}
        {clientConnected && documents.length > 0 && (
          <div className="space-y-3 border-t pt-4">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Share Documents with Client
            </p>

            <div className="max-h-48 space-y-2 overflow-y-auto">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800"
                >
                  <div className="flex items-center gap-2">
                    <FileImage className="h-4 w-4 text-slate-400" />
                    <span className="line-clamp-1 text-sm text-slate-700 dark:text-slate-300">
                      {doc.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {doc.sharedWithClient ? (
                      <Eye className="h-4 w-4 text-green-500" />
                    ) : (
                      <EyeOff className="h-4 w-4 text-slate-400" />
                    )}
                    <Switch
                      checked={doc.sharedWithClient}
                      onCheckedChange={(checked) => toggleDocumentShare(doc.id, checked)}
                    />
                  </div>
                </div>
              ))}
            </div>

            <p className="text-xs text-muted-foreground">
              Toggle documents on to share them in the client's portal
            </p>
          </div>
        )}

        {clientConnected && documents.length === 0 && !loading && (
          <div className="border-t pt-4">
            <p className="text-sm text-muted-foreground">
              Upload documents to share them with your client
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
