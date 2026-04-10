/**
 * ClientWorkspace Component
 * Unified workspace component for client portal Jobs and Claims
 * Features: Photos, Documents, Signed Docs, Invoices, Job Tracking, Messages
 */

"use client";

import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  Download,
  ExternalLink,
  Eye,
  FileCheck,
  FileSignature,
  FileText,
  Image as ImageIcon,
  Loader2,
  MessageCircle,
  MessageSquare,
  Phone,
  Plus,
  Receipt,
  Send,
  Wrench,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// ============================================================================
// Types
// ============================================================================

export interface WorkspaceProject {
  id: string;
  type: "job" | "claim";
  title: string;
  description?: string;
  status: string;
  progress: number;
  createdAt: string;
  updatedAt?: string;
  tradeType?: string;
  urgency?: string;
  address?: string;
  claimNumber?: string;
  dateOfLoss?: string;
  contractor?: {
    id: string;
    name: string;
    companyName?: string;
    avatar?: string;
    logo?: string;
    coverPhoto?: string;
    phone?: string;
    email?: string;
    website?: string;
    specialty?: string;
    description?: string;
    verified?: boolean;
    profileSlug?: string;
  };
}

export interface WorkspacePhoto {
  id: string;
  url: string;
  thumbnailUrl?: string;
  caption?: string;
  uploadedAt: string;
  uploadedBy: string;
  category?: string;
  source?: string; // "user" = pro, "client_upload" = client
}

export interface WorkspaceDocument {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  uploadedAt: string;
  uploadedBy: string;
  category?: string;
  sharedAt?: string; // When contractor shared with client
  viewedAt?: string; // When client first viewed (null = NEW)
}

export interface WorkspaceSignedDoc {
  id: string;
  name: string;
  status: "pending" | "signed" | "expired";
  signedAt?: string;
  expiresAt?: string;
  url: string;
  signUrl?: string;
}

export interface WorkspaceInvoice {
  id: string;
  number: string;
  amount: number;
  status: "draft" | "sent" | "paid" | "overdue";
  dueDate: string;
  paidAt?: string;
  items: Array<{
    description: string;
    quantity: number;
    rate: number;
    amount: number;
  }>;
}

export interface WorkspaceTimelineEvent {
  id: string;
  type: string;
  title: string;
  description?: string;
  timestamp: string;
  user: string;
  icon?: string;
}

export interface WorkspaceMessage {
  id: string;
  content: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  isFromContractor: boolean;
  timestamp: string;
  read: boolean;
}

interface ClientWorkspaceProps {
  project: WorkspaceProject;
  photos?: WorkspacePhoto[];
  documents?: WorkspaceDocument[];
  signedDocs?: WorkspaceSignedDoc[];
  invoices?: WorkspaceInvoice[];
  timeline?: WorkspaceTimelineEvent[];
  messages?: WorkspaceMessage[];
  canUpload?: boolean;
  canMessage?: boolean;
  backLink?: string;
  backLabel?: string;
  onUploadPhoto?: (file: File) => Promise<void>;
  onUploadDocument?: (file: File) => Promise<void>;
  onSendMessage?: (message: string) => Promise<void>;
  onRefresh?: () => void;
}

// ============================================================================
// Helper Functions
// ============================================================================

function getStatusColor(status: string) {
  switch (status.toLowerCase()) {
    case "pending":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300";
    case "in_progress":
    case "active":
    case "open":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
    case "completed":
    case "closed":
      return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
    case "cancelled":
    case "rejected":
      return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
    default:
      return "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300";
  }
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

// ============================================================================
// Main Component
// ============================================================================

export function ClientWorkspace({
  project,
  photos = [],
  documents = [],
  signedDocs = [],
  invoices = [],
  timeline = [],
  messages = [],
  canUpload = true,
  canMessage = true,
  backLink = "/portal/my-jobs",
  backLabel = "Back to My Jobs",
  onUploadPhoto,
  onUploadDocument,
  onSendMessage,
  onRefresh,
}: ClientWorkspaceProps) {
  const [activeTab, setActiveTab] = useState("overview");
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [uploadType, setUploadType] = useState<"photo" | "document">("photo");
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [uploading, setUploading] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<WorkspacePhoto | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<WorkspaceInvoice | null>(null);

  const photoInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  // Handle file upload
  async function handleFileUpload(files: FileList | null, type: "photo" | "document") {
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (type === "photo" && onUploadPhoto) {
          await onUploadPhoto(file);
        } else if (type === "document" && onUploadDocument) {
          await onUploadDocument(file);
        }
      }
      toast.success(`${type === "photo" ? "Photos" : "Documents"} uploaded successfully!`);
      setShowUploadDialog(false);
      onRefresh?.();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      toast.error(error.message || "Failed to upload files");
    } finally {
      setUploading(false);
    }
  }

  // Handle send message
  async function handleSendMessage() {
    if (!newMessage.trim() || !onSendMessage) return;

    setSendingMessage(true);
    try {
      await onSendMessage(newMessage);
      setNewMessage("");
      toast.success("Message sent!");
      onRefresh?.();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      toast.error(error.message || "Failed to send message");
    } finally {
      setSendingMessage(false);
    }
  }

  const pendingSignatures = signedDocs.filter((d) => d.status === "pending").length;
  const unpaidInvoices = invoices.filter((i) => i.status === "sent" || i.status === "overdue");
  const totalDue = unpaidInvoices.reduce((sum, inv) => sum + inv.amount, 0);

  return (
    <div className="space-y-6">
      {/* Hidden file inputs */}
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        aria-label="Upload photos"
        onChange={(e) => handleFileUpload(e.target.files, "photo")}
      />
      <input
        ref={docInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
        multiple
        className="hidden"
        aria-label="Upload documents"
        onChange={(e) => handleFileUpload(e.target.files, "document")}
      />

      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <Link
            href={backLink}
            className="mb-3 inline-flex items-center gap-2 text-sm text-slate-500 transition-colors hover:text-slate-900 dark:hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            {backLabel}
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white md:text-3xl">
              {project.title}
            </h1>
            <Badge className={getStatusColor(project.status)}>
              {project.status.replace(/_/g, " ")}
            </Badge>
            {project.type === "claim" && project.claimNumber && (
              <Badge variant="outline" className="font-mono">
                {project.claimNumber}
              </Badge>
            )}
          </div>
          {project.description && (
            <p className="mt-2 max-w-2xl text-slate-600 dark:text-slate-400">
              {project.description}
            </p>
          )}
          {project.address && <p className="mt-1 text-sm text-slate-500">📍 {project.address}</p>}
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2">
          {canMessage && project.contractor && (
            <Button
              onClick={() => setActiveTab("messages")}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <MessageSquare className="mr-2 h-4 w-4" />
              Message
            </Button>
          )}
          {project.contractor?.phone && (
            <Button variant="outline" asChild>
              <a href={`tel:${project.contractor.phone}`}>
                <Phone className="mr-2 h-4 w-4" />
                Call
              </a>
            </Button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <Card className="border-none bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30">
        <CardContent className="pt-6">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium">Project Progress</span>
            <span className="text-sm font-bold text-blue-600">{project.progress}%</span>
          </div>
          <Progress value={project.progress} className="h-3" />

          {/* Quick Stats */}
          <div className="mt-4 grid grid-cols-2 gap-4 border-t pt-4 dark:border-slate-700 sm:grid-cols-4">
            <div>
              <p className="text-xs text-slate-500">Photos</p>
              <p className="text-lg font-semibold">{photos.length}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Documents</p>
              <p className="text-lg font-semibold">{documents.length}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Pending Signatures</p>
              <p className="text-lg font-semibold">{pendingSignatures}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Amount Due</p>
              <p className="text-lg font-semibold text-amber-600">{formatCurrency(totalDue)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="flex w-full flex-wrap justify-start gap-1 bg-white p-1 dark:bg-slate-800">
          <TabsTrigger value="overview" className="flex-shrink-0">
            <Wrench className="mr-2 h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="photos" className="flex-shrink-0">
            <ImageIcon className="mr-2 h-4 w-4" />
            Photos ({photos.length})
          </TabsTrigger>
          <TabsTrigger value="documents" className="flex-shrink-0">
            <FileText className="mr-2 h-4 w-4" />
            Documents ({documents.length})
          </TabsTrigger>
          <TabsTrigger value="signatures" className="relative flex-shrink-0">
            <FileSignature className="mr-2 h-4 w-4" />
            Signed Docs
            {pendingSignatures > 0 && (
              <span className="ml-1 rounded-full bg-amber-500 px-1.5 py-0.5 text-xs text-white">
                {pendingSignatures}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="invoices" className="flex-shrink-0">
            <Receipt className="mr-2 h-4 w-4" />
            Invoices ({invoices.length})
          </TabsTrigger>
          <TabsTrigger value="timeline" className="flex-shrink-0">
            <Clock className="mr-2 h-4 w-4" />
            Timeline
          </TabsTrigger>
          {canMessage && (
            <TabsTrigger value="messages" className="flex-shrink-0">
              <MessageCircle className="mr-2 h-4 w-4" />
              Messages
            </TabsTrigger>
          )}
        </TabsList>

        {/* ================================================================== */}
        {/* OVERVIEW TAB */}
        {/* ================================================================== */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Project Details */}
            <Card>
              <CardHeader>
                <CardTitle>Project Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {project.tradeType && (
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-500">Trade Type:</span>
                    <span className="text-sm font-medium">{project.tradeType}</span>
                  </div>
                )}
                {project.urgency && (
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-500">Urgency:</span>
                    <Badge variant="outline">{project.urgency}</Badge>
                  </div>
                )}
                {project.dateOfLoss && (
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-500">Date of Loss:</span>
                    <span className="text-sm">{formatDate(project.dateOfLoss)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500">Created:</span>
                  <span className="text-sm">{formatDate(project.createdAt)}</span>
                </div>
                {project.updatedAt && (
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-500">Last Updated:</span>
                    <span className="text-sm">{formatDate(project.updatedAt)}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Contractor Trades Card */}
            {project.contractor && (
              <Card className="overflow-hidden">
                {/* Cover photo / gradient banner */}
                {project.contractor.coverPhoto ? (
                  <div className="relative h-28 w-full">
                    <Image
                      src={project.contractor.coverPhoto}
                      alt={`${project.contractor.companyName || project.contractor.name} cover`}
                      fill
                      className="object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  </div>
                ) : (
                  <div className="h-20 w-full bg-gradient-to-r from-blue-600 to-indigo-700" />
                )}

                <CardContent
                  className={
                    project.contractor.coverPhoto ? "-mt-10 space-y-4 pt-0" : "-mt-8 space-y-4 pt-0"
                  }
                >
                  {/* Avatar + Name */}
                  <div className="flex items-end gap-4">
                    <Avatar className="h-16 w-16 border-4 border-white shadow-md dark:border-slate-800">
                      <AvatarImage src={project.contractor.logo || project.contractor.avatar} />
                      <AvatarFallback className="bg-blue-100 text-lg font-bold text-blue-600">
                        {project.contractor.name
                          ?.split(" ")
                          .map((n) => n[0])
                          .join("") || "C"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 pb-1">
                      <div className="flex items-center gap-2">
                        <p className="text-lg font-bold text-slate-900 dark:text-white">
                          {project.contractor.name}
                        </p>
                        {project.contractor.verified && (
                          <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                            <CheckCircle2 className="mr-1 h-3 w-3" />
                            Verified
                          </Badge>
                        )}
                      </div>
                      {project.contractor.companyName &&
                        project.contractor.companyName !== project.contractor.name && (
                          <p className="text-sm text-slate-500">{project.contractor.companyName}</p>
                        )}
                    </div>
                  </div>

                  {/* Specialty / Trade */}
                  {project.contractor.specialty && (
                    <div className="flex items-center gap-2">
                      <Wrench className="h-4 w-4 text-slate-400" />
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        {project.contractor.specialty}
                      </span>
                    </div>
                  )}

                  {/* Description / About */}
                  {project.contractor.description && (
                    <p className="line-clamp-2 text-sm text-slate-500">
                      {project.contractor.description}
                    </p>
                  )}

                  {/* Contact Buttons */}
                  <div className="flex flex-wrap gap-2">
                    {project.contractor.phone && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={`tel:${project.contractor.phone}`}>
                          <Phone className="mr-2 h-4 w-4" />
                          {project.contractor.phone}
                        </a>
                      </Button>
                    )}
                    {project.contractor.email && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={`mailto:${project.contractor.email}`}>
                          <Send className="mr-2 h-4 w-4" />
                          Email
                        </a>
                      </Button>
                    )}
                    {project.contractor.website && (
                      <Button variant="outline" size="sm" asChild>
                        <a
                          href={project.contractor.website}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="mr-2 h-4 w-4" />
                          Website
                        </a>
                      </Button>
                    )}
                  </div>

                  {/* View Full Profile */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full border border-slate-200 dark:border-slate-700"
                    asChild
                  >
                    <Link
                      href={
                        project.contractor.profileSlug
                          ? `/portal/contractors/${project.contractor.profileSlug}`
                          : `/portal/contractors/${project.contractor.id}`
                      }
                    >
                      View Full Profile
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {timeline.length === 0 ? (
                <p className="py-4 text-center text-sm text-slate-500">No activity yet</p>
              ) : (
                <div className="space-y-4">
                  {timeline.slice(0, 5).map((event) => (
                    <div key={event.id} className="flex gap-3">
                      <div className="mt-1 flex h-2 w-2 flex-shrink-0 rounded-full bg-blue-600" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{event.title}</p>
                        {event.description && (
                          <p className="text-sm text-slate-500">{event.description}</p>
                        )}
                        <p className="text-xs text-slate-400">{formatDateTime(event.timestamp)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ================================================================== */}
        {/* PHOTOS TAB */}
        {/* ================================================================== */}
        <TabsContent value="photos" className="space-y-6">
          <div className="flex justify-end">
            {canUpload && onUploadPhoto && (
              <Button onClick={() => photoInputRef.current?.click()}>
                <Plus className="mr-2 h-4 w-4" />
                Upload Photos
              </Button>
            )}
          </div>

          {photos.length === 0 ? (
            <Card className="border-2 border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <ImageIcon className="mb-3 h-12 w-12 text-slate-300" />
                <p className="mb-2 text-sm font-medium text-slate-600">No photos yet</p>
                <p className="text-xs text-slate-400">Photos from your project will appear here</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Pro/Contractor Photos Section */}
              {photos.filter((p) => p.source === "user" || !p.source).length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-blue-500" />
                    <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Pro Trade Photos
                    </h3>
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                      From your contractor
                    </span>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                    {photos
                      .filter((p) => p.source === "user" || !p.source)
                      .map((photo) => (
                        <Card
                          key={photo.id}
                          className="group cursor-pointer overflow-hidden transition-shadow hover:shadow-lg"
                          onClick={() => setSelectedPhoto(photo)}
                        >
                          <div className="relative aspect-square bg-slate-100">
                            <Image
                              src={photo.thumbnailUrl || photo.url}
                              alt={photo.caption || "Project photo"}
                              fill
                              className="object-cover transition-transform group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/20">
                              <div className="absolute bottom-2 right-2 opacity-0 transition-opacity group-hover:opacity-100">
                                <Button size="sm" variant="secondary">
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                          <CardContent className="p-3">
                            {photo.caption && (
                              <p className="mb-1 truncate text-sm font-medium">{photo.caption}</p>
                            )}
                            <p className="text-xs text-slate-400">{formatDate(photo.uploadedAt)}</p>
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                </div>
              )}

              {/* Client Uploaded Photos Section */}
              {photos.filter((p) => p.source && p.source !== "user").length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-green-500" />
                    <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Your Photos
                    </h3>
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-300">
                      Uploaded by you
                    </span>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                    {photos
                      .filter((p) => p.source && p.source !== "user")
                      .map((photo) => (
                        <Card
                          key={photo.id}
                          className="group cursor-pointer overflow-hidden transition-shadow hover:shadow-lg"
                          onClick={() => setSelectedPhoto(photo)}
                        >
                          <div className="relative aspect-square bg-slate-100">
                            <Image
                              src={photo.thumbnailUrl || photo.url}
                              alt={photo.caption || "Project photo"}
                              fill
                              className="object-cover transition-transform group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/20">
                              <div className="absolute bottom-2 right-2 opacity-0 transition-opacity group-hover:opacity-100">
                                <Button size="sm" variant="secondary">
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                          <CardContent className="p-3">
                            {photo.caption && (
                              <p className="mb-1 truncate text-sm font-medium">{photo.caption}</p>
                            )}
                            <p className="text-xs text-slate-400">{formatDate(photo.uploadedAt)}</p>
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                </div>
              )}
            </>
          )}
        </TabsContent>

        {/* ================================================================== */}
        {/* DOCUMENTS TAB */}
        {/* ================================================================== */}
        <TabsContent value="documents" className="space-y-4">
          <div className="flex justify-end">
            {canUpload && onUploadDocument && (
              <Button onClick={() => docInputRef.current?.click()}>
                <Plus className="mr-2 h-4 w-4" />
                Upload Document
              </Button>
            )}
          </div>

          {documents.length === 0 ? (
            <Card className="border-2 border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="mb-3 h-12 w-12 text-slate-300" />
                <p className="mb-2 text-sm font-medium text-slate-600">No documents yet</p>
                <p className="text-xs text-slate-400">Project documents will appear here</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {documents.map((doc) => {
                // Show NEW badge if document was shared in last 48 hours and hasn't been viewed
                const sharedTime = doc.sharedAt ? new Date(doc.sharedAt) : new Date(doc.uploadedAt);
                const isNew =
                  !doc.viewedAt && Date.now() - sharedTime.getTime() < 48 * 60 * 60 * 1000;

                return (
                  <Card key={doc.id} className="group relative transition-shadow hover:shadow-md">
                    {isNew && (
                      <span className="absolute -right-1 -top-1 z-10 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-lg">
                        NEW
                      </span>
                    )}
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 rounded-lg bg-blue-100 p-2 dark:bg-blue-900/30">
                          <FileText className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{doc.name}</p>
                          <p className="text-xs text-slate-500">{formatFileSize(doc.size)}</p>
                          <p className="text-xs text-slate-400">{formatDate(doc.uploadedAt)}</p>
                        </div>
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0"
                          onClick={(e) => e.stopPropagation()}
                          title={`View ${doc.name}`}
                          aria-label={`View ${doc.name}`}
                        >
                          <Button size="sm" variant="default" className="gap-1">
                            <Eye className="h-3.5 w-3.5" />
                            View
                          </Button>
                        </a>
                        <a
                          href={doc.url}
                          download
                          className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                          onClick={(e) => e.stopPropagation()}
                          title={`Download ${doc.name}`}
                          aria-label={`Download ${doc.name}`}
                        >
                          <Button size="sm" variant="ghost">
                            <Download className="h-4 w-4" />
                            <span className="sr-only">Download</span>
                          </Button>
                        </a>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ================================================================== */}
        {/* SIGNED DOCS TAB */}
        {/* ================================================================== */}
        <TabsContent value="signatures" className="space-y-4">
          {signedDocs.length === 0 ? (
            <Card className="border-2 border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileSignature className="mb-3 h-12 w-12 text-slate-300" />
                <p className="mb-2 text-sm font-medium text-slate-600">No documents to sign</p>
                <p className="text-xs text-slate-400">
                  Documents requiring your signature will appear here
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {/* Pending Signatures */}
              {signedDocs.filter((d) => d.status === "pending").length > 0 && (
                <div>
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-amber-600">
                    <Clock className="h-4 w-4" />
                    Awaiting Your Signature
                  </h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {signedDocs
                      .filter((d) => d.status === "pending")
                      .map((doc) => (
                        <Card
                          key={doc.id}
                          className="border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-900/10"
                        >
                          <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="flex-shrink-0 rounded-lg bg-amber-100 p-2 dark:bg-amber-900/30">
                                <FileSignature className="h-5 w-5 text-amber-600" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate font-medium">{doc.name}</p>
                                {doc.expiresAt && (
                                  <p className="text-xs text-amber-600">
                                    Expires: {formatDate(doc.expiresAt)}
                                  </p>
                                )}
                              </div>
                              {doc.signUrl && (
                                <Button
                                  size="sm"
                                  className="bg-amber-600 hover:bg-amber-700"
                                  asChild
                                >
                                  <a href={doc.signUrl} target="_blank" rel="noopener noreferrer">
                                    Sign Now
                                    <ExternalLink className="ml-2 h-4 w-4" />
                                  </a>
                                </Button>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                </div>
              )}

              {/* Signed Documents */}
              {signedDocs.filter((d) => d.status === "signed").length > 0 && (
                <div>
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-green-600">
                    <CheckCircle2 className="h-4 w-4" />
                    Completed
                  </h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {signedDocs
                      .filter((d) => d.status === "signed")
                      .map((doc) => (
                        <Card key={doc.id}>
                          <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="flex-shrink-0 rounded-lg bg-green-100 p-2 dark:bg-green-900/30">
                                <FileCheck className="h-5 w-5 text-green-600" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate font-medium">{doc.name}</p>
                                {doc.signedAt && (
                                  <p className="text-xs text-slate-500">
                                    Signed: {formatDate(doc.signedAt)}
                                  </p>
                                )}
                              </div>
                              <Button size="sm" variant="outline" asChild>
                                <a href={doc.url} download title={`Download ${doc.name}`}>
                                  <Download className="h-4 w-4" />
                                  <span className="sr-only">Download {doc.name}</span>
                                </a>
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        {/* ================================================================== */}
        {/* INVOICES TAB */}
        {/* ================================================================== */}
        <TabsContent value="invoices" className="space-y-4">
          {invoices.length === 0 ? (
            <Card className="border-2 border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Receipt className="mb-3 h-12 w-12 text-slate-300" />
                <p className="mb-2 text-sm font-medium text-slate-600">No invoices yet</p>
                <p className="text-xs text-slate-400">
                  Invoices from your contractor will appear here
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {invoices.map((invoice) => (
                <Card
                  key={invoice.id}
                  className="cursor-pointer transition-shadow hover:shadow-md"
                  onClick={() => setSelectedInvoice(invoice)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div
                          className={`flex-shrink-0 rounded-lg p-2 ${
                            invoice.status === "paid"
                              ? "bg-green-100 dark:bg-green-900/30"
                              : invoice.status === "overdue"
                                ? "bg-red-100 dark:bg-red-900/30"
                                : "bg-blue-100 dark:bg-blue-900/30"
                          }`}
                        >
                          <Receipt
                            className={`h-5 w-5 ${
                              invoice.status === "paid"
                                ? "text-green-600"
                                : invoice.status === "overdue"
                                  ? "text-red-600"
                                  : "text-blue-600"
                            }`}
                          />
                        </div>
                        <div>
                          <p className="font-semibold">Invoice #{invoice.number}</p>
                          <p className="text-sm text-slate-500">
                            Due: {formatDate(invoice.dueDate)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold">{formatCurrency(invoice.amount)}</p>
                        <Badge
                          className={
                            invoice.status === "paid"
                              ? "bg-green-100 text-green-800"
                              : invoice.status === "overdue"
                                ? "bg-red-100 text-red-800"
                                : "bg-blue-100 text-blue-800"
                          }
                        >
                          {invoice.status}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ================================================================== */}
        {/* TIMELINE TAB */}
        {/* ================================================================== */}
        <TabsContent value="timeline" className="space-y-4">
          {timeline.length === 0 ? (
            <Card className="border-2 border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Clock className="mb-3 h-12 w-12 text-slate-300" />
                <p className="mb-2 text-sm font-medium text-slate-600">No activity yet</p>
                <p className="text-xs text-slate-400">Project updates will appear here</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-6">
                <div className="relative">
                  <div className="absolute bottom-0 left-3 top-0 w-px bg-slate-200 dark:bg-slate-700" />
                  <div className="space-y-6">
                    {timeline.map((event, index) => (
                      <div key={event.id} className="relative flex gap-4 pl-8">
                        <div
                          className={`absolute left-0 mt-1.5 h-6 w-6 rounded-full border-2 border-white dark:border-slate-900 ${
                            index === 0 ? "bg-blue-600" : "bg-slate-300 dark:bg-slate-600"
                          }`}
                        >
                          {index === 0 && <CheckCircle2 className="h-full w-full p-1 text-white" />}
                        </div>
                        <div className="flex-1 pb-4">
                          <p className="font-medium">{event.title}</p>
                          {event.description && (
                            <p className="mt-1 text-sm text-slate-500">{event.description}</p>
                          )}
                          <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
                            <Calendar className="h-3 w-3" />
                            {formatDateTime(event.timestamp)}
                            <span>•</span>
                            <span>{event.user}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ================================================================== */}
        {/* MESSAGES TAB */}
        {/* ================================================================== */}
        {canMessage && (
          <TabsContent value="messages" className="space-y-4">
            <Card className="flex h-[500px] flex-col">
              <CardHeader className="border-b dark:border-slate-700">
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5" />
                  Messages with {project.contractor?.name || "Contractor"}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col overflow-hidden p-0">
                {/* Messages List */}
                <div className="flex-1 space-y-4 overflow-y-auto p-4">
                  {messages.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center text-center">
                      <MessageSquare className="mb-3 h-12 w-12 text-slate-300" />
                      <p className="text-sm text-slate-500">No messages yet</p>
                      <p className="text-xs text-slate-400">
                        Start a conversation with your contractor
                      </p>
                    </div>
                  ) : (
                    messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.isFromContractor ? "justify-start" : "justify-end"}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                            msg.isFromContractor
                              ? "bg-slate-100 dark:bg-slate-800"
                              : "bg-blue-600 text-white"
                          }`}
                        >
                          {msg.isFromContractor && (
                            <p className="mb-1 text-xs font-medium text-slate-600 dark:text-slate-400">
                              {msg.senderName}
                            </p>
                          )}
                          <p className="text-sm">{msg.content}</p>
                          <p
                            className={`mt-1 text-xs ${
                              msg.isFromContractor ? "text-slate-400" : "text-blue-200"
                            }`}
                          >
                            {formatDateTime(msg.timestamp)}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Message Input */}
                <div className="border-t p-4 dark:border-slate-700">
                  <div className="flex gap-2">
                    <Input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type a message..."
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          void handleSendMessage();
                        }
                      }}
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim() || sendingMessage}
                    >
                      {sendingMessage ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* ================================================================== */}
      {/* Photo Lightbox Dialog */}
      {/* ================================================================== */}
      <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
        <DialogContent className="max-w-4xl">
          {selectedPhoto && (
            <>
              <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-slate-100">
                <Image
                  src={selectedPhoto.url}
                  alt={selectedPhoto.caption || "Project photo"}
                  fill
                  className="object-contain"
                />
              </div>
              <div className="mt-4">
                {selectedPhoto.caption && <p className="font-medium">{selectedPhoto.caption}</p>}
                <p className="text-sm text-slate-500">
                  Uploaded {formatDate(selectedPhoto.uploadedAt)} by {selectedPhoto.uploadedBy}
                </p>
              </div>
              <DialogFooter>
                <Button variant="outline" asChild>
                  <a href={selectedPhoto.url} download title="Download photo">
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </a>
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ================================================================== */}
      {/* Invoice Detail Dialog */}
      {/* ================================================================== */}
      <Dialog open={!!selectedInvoice} onOpenChange={() => setSelectedInvoice(null)}>
        <DialogContent className="max-w-2xl">
          {selectedInvoice && (
            <>
              <DialogHeader>
                <DialogTitle>Invoice #{selectedInvoice.number}</DialogTitle>
                <DialogDescription>Due: {formatDate(selectedInvoice.dueDate)}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b dark:border-slate-700">
                      <th className="py-2 text-left font-medium">Description</th>
                      <th className="py-2 text-right font-medium">Qty</th>
                      <th className="py-2 text-right font-medium">Rate</th>
                      <th className="py-2 text-right font-medium">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedInvoice.items.map((item, i) => (
                      <tr key={i} className="border-b dark:border-slate-700">
                        <td className="py-2">{item.description}</td>
                        <td className="py-2 text-right">{item.quantity}</td>
                        <td className="py-2 text-right">{formatCurrency(item.rate)}</td>
                        <td className="py-2 text-right">{formatCurrency(item.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={3} className="py-2 text-right font-semibold">
                        Total
                      </td>
                      <td className="py-2 text-right text-lg font-bold">
                        {formatCurrency(selectedInvoice.amount)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
                <div className="flex items-center justify-between rounded-lg bg-slate-50 p-4 dark:bg-slate-800">
                  <div>
                    <Badge
                      className={
                        selectedInvoice.status === "paid"
                          ? "bg-green-100 text-green-800"
                          : selectedInvoice.status === "overdue"
                            ? "bg-red-100 text-red-800"
                            : "bg-blue-100 text-blue-800"
                      }
                    >
                      {selectedInvoice.status}
                    </Badge>
                    {selectedInvoice.paidAt && (
                      <p className="mt-1 text-sm text-slate-500">
                        Paid on {formatDate(selectedInvoice.paidAt)}
                      </p>
                    )}
                  </div>
                  {selectedInvoice.status !== "paid" && (
                    <Button className="bg-green-600 hover:bg-green-700">Pay Now</Button>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================================
// Export Compact Summary Card Component
// ============================================================================

interface WorkspaceSummaryCardProps {
  project: WorkspaceProject;
  photosCount?: number;
  documentsCount?: number;
  pendingSignatures?: number;
  onClick?: () => void;
}

export function WorkspaceSummaryCard({
  project,
  photosCount = 0,
  documentsCount = 0,
  pendingSignatures = 0,
  onClick,
}: WorkspaceSummaryCardProps) {
  return (
    <Card className="cursor-pointer transition-all hover:shadow-lg" onClick={onClick}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">{project.title}</h3>
              <Badge className={getStatusColor(project.status)} variant="secondary">
                {project.status.replace(/_/g, " ")}
              </Badge>
            </div>
            {project.contractor && (
              <p className="mt-1 text-sm text-slate-500">
                with {project.contractor.companyName || project.contractor.name}
              </p>
            )}
          </div>
          <ChevronRight className="h-5 w-5 text-slate-400" />
        </div>

        <div className="mt-3">
          <Progress value={project.progress} className="h-2" />
          <p className="mt-1 text-xs text-slate-400">{project.progress}% complete</p>
        </div>

        <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <ImageIcon className="h-3 w-3" />
            {photosCount}
          </span>
          <span className="flex items-center gap-1">
            <FileText className="h-3 w-3" />
            {documentsCount}
          </span>
          {pendingSignatures > 0 && (
            <span className="flex items-center gap-1 text-amber-600">
              <FileSignature className="h-3 w-3" />
              {pendingSignatures} to sign
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
