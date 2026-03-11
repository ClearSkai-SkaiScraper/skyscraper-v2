/**
 * Client Portal - Claim Detail Workspace
 * Full interactive workspace for managing an insurance claim project
 * Uses unified ClientWorkspace component
 */

"use client";

import { logger } from "@/lib/logger";
import { useAuth } from "@clerk/nextjs";
import { Home, Loader2 } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
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
import { Button } from "@/components/ui/button";

// ============================================================================
// Demo Data for Claims
// ============================================================================

const DEMO_CLAIM_PROJECT: WorkspaceProject = {
  id: "demo-claim-1",
  type: "claim",
  title: "Storm Damage Restoration",
  description:
    "Roof and siding damage from the July 15th hailstorm. Premier Roofing Co. is handling the restoration work.",
  status: "in_progress",
  progress: 45,
  createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14).toISOString(),
  updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
  tradeType: "Roofing & Siding",
  urgency: "high",
  address: "123 Memory Ln, Phoenix, AZ 85001",
  claimNumber: "CLM-2024-STORM",
  dateOfLoss: new Date(Date.now() - 1000 * 60 * 60 * 24 * 21).toISOString(),
  contractor: {
    id: "demo-contractor-2",
    name: "Sarah Williams",
    companyName: "Premier Roofing Co.",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop",
    phone: "(602) 555-0456",
    email: "sarah@premierroofing.com",
  },
};

const DEMO_CLAIM_PHOTOS: WorkspacePhoto[] = [
  {
    id: "claim-photo-1",
    url: "https://images.unsplash.com/photo-1632778149955-e80f8ceca2e8?w=800",
    thumbnailUrl: "https://images.unsplash.com/photo-1632778149955-e80f8ceca2e8?w=400",
    caption: "Initial damage - roof overview",
    uploadedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 12).toISOString(),
    uploadedBy: "Sarah Williams",
    category: "Damage Assessment",
  },
  {
    id: "claim-photo-2",
    url: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800",
    thumbnailUrl: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400",
    caption: "Hail damage on shingles",
    uploadedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 12).toISOString(),
    uploadedBy: "Sarah Williams",
    category: "Damage Assessment",
  },
  {
    id: "claim-photo-3",
    url: "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=800",
    thumbnailUrl: "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=400",
    caption: "Siding impact damage",
    uploadedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 11).toISOString(),
    uploadedBy: "Sarah Williams",
    category: "Damage Assessment",
  },
  {
    id: "claim-photo-4",
    url: "https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=800",
    thumbnailUrl: "https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=400",
    caption: "Roof tear-off in progress",
    uploadedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
    uploadedBy: "Sarah Williams",
    category: "Work Progress",
  },
];

const DEMO_CLAIM_DOCUMENTS: WorkspaceDocument[] = [
  {
    id: "claim-doc-1",
    name: "Insurance Claim Estimate.pdf",
    type: "application/pdf",
    size: 3456789,
    url: "#",
    uploadedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString(),
    uploadedBy: "Sarah Williams",
    category: "Insurance",
  },
  {
    id: "claim-doc-2",
    name: "Xactimate Scope of Work.pdf",
    type: "application/pdf",
    size: 2345678,
    url: "#",
    uploadedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString(),
    uploadedBy: "Sarah Williams",
    category: "Scope",
  },
  {
    id: "claim-doc-3",
    name: "Material Specifications.pdf",
    type: "application/pdf",
    size: 1234567,
    url: "#",
    uploadedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 8).toISOString(),
    uploadedBy: "Sarah Williams",
    category: "Specifications",
  },
];

const DEMO_CLAIM_SIGNED_DOCS: WorkspaceSignedDoc[] = [
  {
    id: "claim-sig-1",
    name: "Assignment of Benefits",
    status: "signed",
    signedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 12).toISOString(),
    url: "#",
  },
  {
    id: "claim-sig-2",
    name: "Restoration Agreement",
    status: "signed",
    signedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 12).toISOString(),
    url: "#",
  },
  {
    id: "claim-sig-3",
    name: "Change Order - Additional Repairs",
    status: "pending",
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 5).toISOString(),
    url: "#",
    signUrl: "#sign-change-order",
  },
];

const DEMO_CLAIM_INVOICES: WorkspaceInvoice[] = [
  {
    id: "claim-inv-1",
    number: "PR-2024-0892-1",
    amount: 4500.0,
    status: "paid",
    dueDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
    paidAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
    items: [
      { description: "Insurance Deductible", quantity: 1, rate: 2500, amount: 2500 },
      { description: "Emergency Tarp Installation", quantity: 1, rate: 2000, amount: 2000 },
    ],
  },
  {
    id: "claim-inv-2",
    number: "PR-2024-0892-2",
    amount: 18750.0,
    status: "sent",
    dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 21).toISOString(),
    items: [
      { description: "Architectural Shingles (30 sq)", quantity: 30, rate: 350, amount: 10500 },
      { description: "Underlayment & Flashing", quantity: 1, rate: 2800, amount: 2800 },
      { description: "Labor - Roof Installation", quantity: 1, rate: 4200, amount: 4200 },
      { description: "Debris Removal & Disposal", quantity: 1, rate: 1250, amount: 1250 },
    ],
  },
];

const DEMO_CLAIM_TIMELINE: WorkspaceTimelineEvent[] = [
  {
    id: "claim-event-1",
    type: "status_change",
    title: "Claim Opened",
    description: "Storm damage claim filed with insurance",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14).toISOString(),
    user: "System",
  },
  {
    id: "claim-event-2",
    type: "inspection",
    title: "Initial Inspection Complete",
    description: "Damage assessment photos and measurements documented",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 12).toISOString(),
    user: "Sarah Williams",
  },
  {
    id: "claim-event-3",
    type: "document",
    title: "Insurance Estimate Uploaded",
    description: "Xactimate estimate approved by insurance adjuster",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString(),
    user: "Sarah Williams",
  },
  {
    id: "claim-event-4",
    type: "payment",
    title: "Deductible Received",
    description: "Payment of $4,500.00 processed",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
    user: "System",
  },
  {
    id: "claim-event-5",
    type: "status_change",
    title: "Work Started",
    description: "Roof tear-off and material delivery",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
    user: "Sarah Williams",
  },
];

const DEMO_CLAIM_MESSAGES: WorkspaceMessage[] = [
  {
    id: "claim-msg-1",
    content:
      "Good news! The insurance adjuster approved the estimate. We can start work as soon as materials arrive.",
    senderId: "contractor-2",
    senderName: "Sarah Williams",
    senderAvatar:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop",
    isFromContractor: true,
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 8).toISOString(),
    read: true,
  },
  {
    id: "claim-msg-2",
    content: "That is great news! Will I need to be home when you start work?",
    senderId: "client-1",
    senderName: "You",
    isFromContractor: false,
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 8).toISOString(),
    read: true,
  },
  {
    id: "claim-msg-3",
    content:
      "Not necessary! As long as we have access to the property, we can work while you are away.",
    senderId: "contractor-2",
    senderName: "Sarah Williams",
    senderAvatar:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop",
    isFromContractor: true,
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
    read: true,
  },
  {
    id: "claim-msg-4",
    content:
      "Update: Tear-off is complete. We found some additional deck damage that needs repair. I have uploaded a change order for your signature.",
    senderId: "contractor-2",
    senderName: "Sarah Williams",
    senderAvatar:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop",
    isFromContractor: true,
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
    read: false,
  },
];

// ============================================================================
// Main Component
// ============================================================================

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
  const [isDemo, setIsDemo] = useState(false);
  const [canUpload, setCanUpload] = useState(false);

  const loadClaimData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      // Check if this is the legacy demo claim - redirect to claims list
      if (claimId === "demo-claim-1") {
        setError("Demo claims are no longer available. Please create or view real claims.");
        setLoading(false);
        return;
      }

      // Fetch real claim details
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
      const [photosRes, docsRes, eventsRes] = await Promise.all([
        fetch(`/api/portal/claims/${claimId}/photos`),
        fetch(`/api/portal/claims/${claimId}/documents`),
        fetch(`/api/portal/claims/${claimId}/events`),
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
    loadClaimData();
  }, [userId, loadClaimData]);

  async function handleUploadPhoto(file: File) {
    if (isDemo) {
      toast.info("This is a demo claim - uploads are disabled");
      return;
    }

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
    if (isDemo) {
      toast.info("This is a demo claim - uploads are disabled");
      return;
    }

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
    if (isDemo) {
      toast.info("This is a demo claim - messaging is disabled");
      return;
    }

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
      {/* Demo Mode Banner */}
      {isDemo && (
        <div className="mb-6 rounded-xl border-2 border-dashed border-amber-300 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-900/20">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-800">
              <span className="text-xl">🏠</span>
            </div>
            <div>
              <p className="font-semibold text-amber-800 dark:text-amber-200">Demo Claim</p>
              <p className="text-sm text-amber-700 dark:text-amber-300">
                This is a demo showing how your insurance claim workspace will look.
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
        canUpload={!isDemo && canUpload}
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
