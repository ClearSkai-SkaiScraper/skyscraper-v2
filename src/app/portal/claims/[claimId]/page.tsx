/**
 * Client Portal - Claim Detail Workspace
 * Full interactive workspace for managing an insurance claim project
 * Uses unified ClientWorkspace component
 */

"use client";

import { useAuth } from "@clerk/nextjs";
import { Home, Loader2 } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import {
  ClientWorkspace,
  WorkspaceDocument,
  WorkspaceInvoice,
  WorkspaceMessage,
  WorkspacePhoto,
  WorkspaceProject,
  WorkspaceSignedDoc,
  WorkspaceTimelineEvent,
} from "@/components/portal/ClientWorkspace";
import { Button } from "@/components/ui/button";
import { logger } from "@/lib/logger";

export default function PortalClaimDetailPage() {
  const params = useParams();
  const claimId = params!.claimId as string;
  const { userId } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [project, setProject] = useState<WorkspaceProject | null>(null);
  const [photos, setPhotos] = useState<WorkspacePhoto[]>([]);
  const [documents, setDocuments] = useState<WorkspaceDocument[]>([]);
  const [signedDocs, setSignedDocs] = useState<WorkspaceSignedDoc[]>([]);
  const [invoices, setInvoices] = useState<WorkspaceInvoice[]>([]);
  const [timeline, setTimeline] = useState<WorkspaceTimelineEvent[]>([]);
  const [messages, setMessages] = useState<WorkspaceMessage[]>([]);
  const [canUpload, setCanUpload] = useState(false);

  const loadClaimData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      // Fetch claim details
      const claimRes = await fetch(`/api/portal/claims/${claimId}`);
      if (!claimRes.ok) {
        if (claimRes.status === 403) {
          throw new Error("Access denied to this claim");
        }
        throw new Error("Failed to fetch claim");
      }
      const claimData = await claimRes.json();

      if (claimData.claim) {
        setProject({
          id: claimData.claim.id,
          type: "claim",
          title: claimData.claim.title || "Insurance Claim",
          description: claimData.claim.description,
          status: claimData.claim.status || "open",
          progress: claimData.claim.progress || 0,
          createdAt: claimData.claim.createdAt,
          updatedAt: claimData.claim.updatedAt,
          address: claimData.claim.address,
          claimNumber: claimData.claim.claimNumber,
          dateOfLoss: claimData.claim.dateOfLoss,
          contractor: claimData.claim.contractor,
        });
      } else {
        // Claim not found — show error
        setError("Claim not found or you don't have access to this claim.");
        setLoading(false);
        return;
      }

      // Check access role
      const accessRes = await fetch(`/api/portal/claims/${claimId}/access`);
      if (accessRes.ok) {
        const accessData = await accessRes.json();
        setCanUpload(accessData.role === "EDITOR");
      }

      // Load related data
      const [photosRes, docsRes, eventsRes, invoicesRes, signaturesRes] = await Promise.all([
        fetch(`/api/portal/claims/${claimId}/photos`),
        fetch(`/api/portal/claims/${claimId}/documents`),
        fetch(`/api/portal/claims/${claimId}/events`),
        fetch(`/api/portal/claims/${claimId}/invoices`),
        fetch(`/api/portal/claims/${claimId}/signatures`),
      ]);

      if (photosRes.ok) {
        const data = await photosRes.json();
        setPhotos(data.photos || []);
      }

      if (docsRes.ok) {
        const data = await docsRes.json();
        setDocuments(data.documents || []);
      }

      if (eventsRes.ok) {
        const data = await eventsRes.json();
        setTimeline(data.events || []);
      }

      if (invoicesRes.ok) {
        const data = await invoicesRes.json();
        if (data.invoices?.length > 0) {
          setInvoices(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            data.invoices.map((inv: any) => ({
              id: inv.id,
              number: inv.invoiceNumber,
              amount: inv.totals?.total || inv.totals?.grandTotal || 0,
              status: inv.kind === "final" ? "paid" : "pending",
              dueDate: inv.createdAt,
              items: Array.isArray(inv.items)
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                ? inv.items.map((item: any) => ({
                    description: item.description || item.name || "Line item",
                    quantity: item.quantity || 1,
                    unitPrice: item.unitPrice || item.price || 0,
                    total: item.total || item.amount || 0,
                  }))
                : [],
            }))
          );
        }
      }

      if (signaturesRes.ok) {
        const data = await signaturesRes.json();
        if (data.signatures?.length > 0) {
          setSignedDocs(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            data.signatures.map((sig: any) => ({
              id: sig.id,
              name: sig.name,
              status:
                sig.status === "signed"
                  ? "signed"
                  : sig.expiresAt && new Date(sig.expiresAt) < new Date()
                    ? "expired"
                    : "pending",
              signedAt: sig.signedAt,
              url: sig.signedDocumentUrl || sig.documentUrl || "#",
              expiresAt: sig.expiresAt,
            }))
          );
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An error occurred";
      setError(errorMessage);
      logger.error("Failed to load claim:", err);
    } finally {
      setLoading(false);
    }
  }, [claimId]);

  useEffect(() => {
    if (!userId) return;
    void loadClaimData();
  }, [userId, loadClaimData]);

  async function handleUploadPhoto(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("caption", file.name);

    const res = await fetch(`/api/portal/claims/${claimId}/photos`, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) throw new Error("Failed to upload photo");
  }

  async function handleUploadDocument(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", file.name);

    const res = await fetch(`/api/portal/claims/${claimId}/documents`, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) throw new Error("Failed to upload document");
  }

  async function handleSendMessage(message: string) {
    const res = await fetch(`/api/portal/claims/${claimId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: message }),
    });

    if (!res.ok) throw new Error("Failed to send message");
  }

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-amber-600" />
          <p className="text-slate-500">Loading claim...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center">
        <div className="mb-4 rounded-full bg-red-100 p-4">
          <Home className="h-8 w-8 text-red-400" />
        </div>
        <h2 className="mb-2 text-xl font-semibold">Access Denied</h2>
        <p className="mb-4 text-slate-500">{error}</p>
        <Link href="/portal/claims">
          <Button>Back to Claims</Button>
        </Link>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center">
        <div className="mb-4 rounded-full bg-slate-100 p-4">
          <Home className="h-8 w-8 text-slate-400" />
        </div>
        <h2 className="mb-2 text-xl font-semibold">Claim Not Found</h2>
        <p className="mb-4 text-slate-500">This claim may have been removed or is unavailable.</p>
        <Link href="/portal/claims">
          <Button>Back to Claims</Button>
        </Link>
      </div>
    );
  }

  return (
    <div>
      <ClientWorkspace
        project={project}
        photos={photos}
        documents={documents}
        signedDocs={signedDocs}
        invoices={invoices}
        timeline={timeline}
        messages={messages}
        canUpload={canUpload}
        canMessage={true}
        backLink="/portal/claims"
        backLabel="Back to My Claims"
        onUploadPhoto={handleUploadPhoto}
        onUploadDocument={handleUploadDocument}
        onSendMessage={handleSendMessage}
        onRefresh={loadClaimData}
      />
    </div>
  );
}
