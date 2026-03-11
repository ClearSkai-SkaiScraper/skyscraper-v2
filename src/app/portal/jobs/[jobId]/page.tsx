/**
 * Client Portal - Job Detail Workspace
 * Full interactive workspace for managing a project with contractor
 * Uses unified ClientWorkspace component
 *
 * DEMO MODE: Uses DemoService for centralized demo data management
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
import { getDemoJobWorkspace, type DemoWorkspaceData } from "@/lib/demo/DemoService";

// Demo workspace data is now loaded from DemoService
const getDemoData = (jobId?: string): DemoWorkspaceData => getDemoJobWorkspace(jobId);

// Legacy constant kept for backwards compatibility with explicit demo-job-1 route
const DEMO_JOB_PROJECT: WorkspaceProject = getDemoData().project;

// Deprecated - keeping for reference during migration
const _LEGACY_DEMO_JOB_PROJECT: WorkspaceProject = {
  id: "demo-job-1",
  type: "job",
  title: "Security Cameras & Driveway Lighting",
  description:
    "ClearSkai Technologies is scheduled to assess your property for security camera placement and smart driveway lighting installation.",
  status: "in_progress",
  progress: 35,
  createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
  updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
  tradeType: "Smart Home & Technology",
  urgency: "normal",
  address: "123 Smart Home Lane, Phoenix, AZ 85001",
  contractor: {
    id: "demo-contractor-1",
    name: "Mike Johnson",
    companyName: "ClearSkai Technologies",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop",
    phone: "(480) 555-0123",
    email: "mike@clearskaitech.com",
  },
};

const DEMO_PHOTOS: WorkspacePhoto[] = [
  {
    id: "demo-photo-1",
    url: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800",
    thumbnailUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400",
    caption: "Front entrance - proposed camera location",
    uploadedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
    uploadedBy: "Mike Johnson",
    category: "Site Assessment",
  },
  {
    id: "demo-photo-2",
    url: "https://images.unsplash.com/photo-1584568694244-14fbdf83bd30?w=800",
    thumbnailUrl: "https://images.unsplash.com/photo-1584568694244-14fbdf83bd30?w=400",
    caption: "Driveway lighting area",
    uploadedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
    uploadedBy: "Mike Johnson",
    category: "Site Assessment",
  },
  {
    id: "demo-photo-3",
    url: "https://images.unsplash.com/photo-1558002038-1055907df827?w=800",
    thumbnailUrl: "https://images.unsplash.com/photo-1558002038-1055907df827?w=400",
    caption: "Backyard coverage area",
    uploadedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
    uploadedBy: "Mike Johnson",
    category: "Site Assessment",
  },
];

const DEMO_DOCUMENTS: WorkspaceDocument[] = [
  {
    id: "demo-doc-1",
    name: "Project Proposal - Security System.pdf",
    type: "application/pdf",
    size: 2456789,
    url: "#",
    uploadedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4).toISOString(),
    uploadedBy: "Mike Johnson",
    category: "Proposal",
  },
  {
    id: "demo-doc-2",
    name: "Camera System Specifications.pdf",
    type: "application/pdf",
    size: 1234567,
    url: "#",
    uploadedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
    uploadedBy: "Mike Johnson",
    category: "Specifications",
  },
];

const DEMO_SIGNED_DOCS: WorkspaceSignedDoc[] = [
  {
    id: "demo-sig-1",
    name: "Project Agreement & Terms",
    status: "pending",
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(),
    url: "#",
    signUrl: "#sign-agreement",
  },
  {
    id: "demo-sig-2",
    name: "Initial Assessment Authorization",
    status: "signed",
    signedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
    url: "#",
  },
];

const DEMO_INVOICES: WorkspaceInvoice[] = [
  {
    id: "demo-inv-1",
    number: "INV-2024-001",
    amount: 2500.0,
    status: "paid",
    dueDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString(),
    paidAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 8).toISOString(),
    items: [
      { description: "Site Assessment & Planning", quantity: 1, rate: 500, amount: 500 },
      { description: "Equipment Deposit (50%)", quantity: 1, rate: 2000, amount: 2000 },
    ],
  },
  {
    id: "demo-inv-2",
    number: "INV-2024-002",
    amount: 4750.0,
    status: "sent",
    dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString(),
    items: [
      { description: "4K Security Cameras (4 units)", quantity: 4, rate: 450, amount: 1800 },
      { description: "Smart LED Driveway Lights (6 units)", quantity: 6, rate: 175, amount: 1050 },
      { description: "Installation Labor", quantity: 8, rate: 125, amount: 1000 },
    ],
  },
];

const DEMO_TIMELINE: WorkspaceTimelineEvent[] = [
  {
    id: "demo-event-1",
    type: "status_change",
    title: "Project Started",
    description: "ClearSkai Technologies accepted your project request",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
    user: "System",
  },
  {
    id: "demo-event-2",
    type: "document",
    title: "Proposal Uploaded",
    description: "Project Proposal has been shared with you",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4).toISOString(),
    user: "Mike Johnson",
  },
  {
    id: "demo-event-3",
    type: "payment",
    title: "Payment Received",
    description: "Payment of $2,500.00 has been processed",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 8).toISOString(),
    user: "System",
  },
  {
    id: "demo-event-4",
    type: "photo",
    title: "Site Assessment Photos Added",
    description: "3 photos have been added to document the assessment",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
    user: "Mike Johnson",
  },
];

const DEMO_MESSAGES: WorkspaceMessage[] = [
  {
    id: "demo-msg-1",
    content:
      "Hi! Thanks for choosing ClearSkai Technologies. I have uploaded my assessment photos. The proposed system looks great for your needs.",
    senderId: "contractor-1",
    senderName: "Mike Johnson",
    senderAvatar:
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop",
    isFromContractor: true,
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
    read: true,
  },
  {
    id: "demo-msg-2",
    content: "Thanks Mike! The photos look great. When can we schedule the installation?",
    senderId: "client-1",
    senderName: "You",
    isFromContractor: false,
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
    read: true,
  },
  {
    id: "demo-msg-3",
    content:
      "I have availability next Tuesday or Thursday afternoon. Would either work for you? The installation should take about 6-8 hours.",
    senderId: "contractor-1",
    senderName: "Mike Johnson",
    senderAvatar:
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop",
    isFromContractor: true,
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    read: true,
  },
];

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
  const [isDemo, setIsDemo] = useState(false);

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
    if (isDemo) {
      toast.info("This is a demo project - uploads are disabled");
      return;
    }

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
    if (isDemo) {
      toast.info("This is a demo project - uploads are disabled");
      return;
    }

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
    if (isDemo) {
      toast.info("This is a demo project - messaging is disabled");
      return;
    }

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
      {/* Demo Mode Banner */}
      {isDemo && (
        <div className="mb-6 rounded-xl border-2 border-dashed border-amber-300 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-900/20">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-800">
              <span className="text-xl">👋</span>
            </div>
            <div>
              <p className="font-semibold text-amber-800 dark:text-amber-200">Demo Project</p>
              <p className="text-sm text-amber-700 dark:text-amber-300">
                This is a demo showing how your project workspace will look. Real projects will have
                interactive uploads, messaging, and payments.
              </p>
            </div>
          </div>
        </div>
      )}

      <ClientWorkspace
        project={project}
        photos={photos}
        documents={documents}
        signedDocs={signedDocs}
        invoices={invoices}
        timeline={timeline}
        messages={messages}
        canUpload={!isDemo}
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
