/**
 * Client Portal - Job Detail Workspace
 * Full interactive workspace for managing a project with contractor
 * Uses unified ClientWorkspace component
 */

"use client";

import { logger } from "@/lib/logger";
import { Loader2, Wrench } from "lucide-react";
import { useParams, useRouter } from "next/navigation";

import { EmptyState } from "@/components/ui/EmptyState";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

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

// ============================================================================
// Main Component
// ============================================================================

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params?.jobId as string;

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [project, setProject] = useState<WorkspaceProject | null>(null);
  const [photos, setPhotos] = useState<WorkspacePhoto[]>([]);
  const [documents, setDocuments] = useState<WorkspaceDocument[]>([]);
  const [signedDocs, setSignedDocs] = useState<WorkspaceSignedDoc[]>([]);
  const [invoices, setInvoices] = useState<WorkspaceInvoice[]>([]);
  const [timeline, setTimeline] = useState<WorkspaceTimelineEvent[]>([]);
  const [messages, setMessages] = useState<WorkspaceMessage[]>([]);

  const loadJobData = useCallback(async () => {
    try {
      setLoading(true);
      setNotFound(false);

      // Legacy demo job IDs - show not found instead
      if (jobId === "demo-job-1" || jobId.startsWith("demo-")) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      // Load real job details
      const jobRes = await fetch(`/api/portal/jobs/${jobId}`);
      if (jobRes.ok) {
        const data = await jobRes.json();
        if (data.job) {
          setProject({
            id: data.job.id,
            type: "job",
            title: data.job.title,
            description: data.job.description,
            status: data.job.status,
            progress: data.job.progress || 0,
            createdAt: data.job.createdAt,
            updatedAt: data.job.updatedAt,
            tradeType: data.job.tradeType,
            urgency: data.job.urgency,
            contractor: data.job.contractor,
          });
        }
      } else {
        // Job not found - show not found state
        setNotFound(true);
        setLoading(false);
        return;
      }

      // Load related data
      const [docsRes, photosRes, invoicesRes, timelineRes] = await Promise.all([
        fetch(`/api/portal/jobs/${jobId}/documents`),
        fetch(`/api/portal/jobs/${jobId}/photos`),
        fetch(`/api/portal/jobs/${jobId}/invoices`),
        fetch(`/api/portal/jobs/${jobId}/timeline`),
      ]);

      if (docsRes.ok) {
        const data = await docsRes.json();
        setDocuments(data.documents || []);
      }

      if (photosRes.ok) {
        const data = await photosRes.json();
        setPhotos(data.photos || []);
      }

      if (invoicesRes.ok) {
        const data = await invoicesRes.json();
        setInvoices(data.invoices || []);
      }

      if (timelineRes.ok) {
        const data = await timelineRes.json();
        setTimeline(data.events || []);
      }
    } catch (error) {
      logger.error("Failed to load job data:", error);
      toast.error("Failed to load project details");
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    if (jobId) {
      loadJobData();
    }
  }, [jobId, loadJobData]);

  async function handleUploadPhoto(file: File) {
    const formData = new FormData();
    formData.append("files", file);
    formData.append("jobId", jobId);
    formData.append("type", "photo");

    const res = await fetch(`/api/portal/jobs/${jobId}/upload`, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) throw new Error("Upload failed");
  }

  async function handleUploadDocument(file: File) {
    const formData = new FormData();
    formData.append("files", file);
    formData.append("jobId", jobId);
    formData.append("type", "document");

    const res = await fetch(`/api/portal/jobs/${jobId}/upload`, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) throw new Error("Upload failed");
  }

  async function handleSendMessage(message: string) {
    const res = await fetch(`/api/portal/jobs/${jobId}/messages`, {
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
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          <p className="text-slate-500">Loading project...</p>
        </div>
      </div>
    );
  }

  // Show proper not found state (when demo mode is OFF)
  if (notFound || !project) {
    return (
      <div className="container mx-auto max-w-3xl px-4 py-12">
        <EmptyState
          icon={Wrench}
          title="Project Not Found"
          description="This project doesn't exist or you don't have permission to view it. Create a new project to get started."
          ctaLabel="Create Project"
          ctaHref="/portal/projects/new"
          secondaryLabel="Back to My Jobs"
          secondaryHref="/portal/my-jobs"
          size="lg"
        />
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
        canUpload={true}
        canMessage={true}
        backLink="/portal/my-jobs"
        backLabel="Back to My Jobs"
        onUploadPhoto={handleUploadPhoto}
        onUploadDocument={handleUploadDocument}
        onSendMessage={handleSendMessage}
        onRefresh={loadJobData}
      />
    </div>
  );
}
