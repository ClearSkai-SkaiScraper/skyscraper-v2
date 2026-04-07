// src/app/(app)/claims-ready-folder/[claimId]/sections/attachments/page.tsx
"use client";

import {
  Download,
  ExternalLink,
  File,
  FileImage,
  FileSpreadsheet,
  FileText,
  Folder,
  Paperclip,
  Plus,
  Search,
  Upload,
} from "lucide-react";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { logger } from "@/lib/logger";

interface Attachment {
  id: string;
  filename: string;
  fileType: string;
  fileSize: number;
  category: "photos" | "documents" | "estimates" | "correspondence" | "permits" | "other";
  uploadedAt: string;
  uploadedBy: string;
  url?: string;
}

const CATEGORY_ICONS: Record<string, typeof File> = {
  photos: FileImage,
  documents: FileText,
  estimates: FileSpreadsheet,
  correspondence: FileText,
  permits: FileText,
  other: File,
};

const CATEGORY_LABELS: Record<string, string> = {
  photos: "Photos",
  documents: "Documents",
  estimates: "Estimates",
  correspondence: "Correspondence",
  permits: "Permits",
  other: "Other",
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

export default function AttachmentsPage() {
  const params = useParams();
  const claimId = Array.isArray(params?.claimId) ? params.claimId[0] : params?.claimId;

  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const fetchAttachments = useCallback(async () => {
    if (!claimId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/claims-folder/sections/attachments?claimId=${claimId}`);
      if (res.ok) {
        const json = await res.json();
        setAttachments(json.attachments || []);
      }
    } catch (err) {
      logger.error("Failed to fetch attachments:", err);
    } finally {
      setLoading(false);
    }
  }, [claimId]);

  useEffect(() => {
    void fetchAttachments();
  }, [fetchAttachments]);

  const filteredAttachments = attachments.filter((att) => {
    const matchesSearch = att.filename.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === "all" || att.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const groupedByCategory = filteredAttachments.reduce(
    (acc, att) => {
      if (!acc[att.category]) acc[att.category] = [];
      acc[att.category].push(att);
      return acc;
    },
    {} as Record<string, Attachment[]>
  );

  const totalSize = attachments.reduce((sum, att) => sum + att.fileSize, 0);

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Paperclip className="h-6 w-6 text-slate-600" />
            <h1 className="text-2xl font-bold">Attachments</h1>
          </div>
          <p className="text-slate-500">Supporting documents and files</p>
        </div>
        <Badge variant="outline">Section 17 of 17</Badge>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="text-3xl font-bold">{attachments.length}</div>
            <div className="text-sm text-slate-500">Total Files</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-3xl font-bold">{formatFileSize(totalSize)}</div>
            <div className="text-sm text-slate-500">Total Size</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-3xl font-bold">{Object.keys(groupedByCategory).length}</div>
            <div className="text-sm text-slate-500">Categories</div>
          </CardContent>
        </Card>
      </div>

      {/* Upload & Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Button>
          <Upload className="mr-2 h-4 w-4" />
          Upload Files
        </Button>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Grouped Attachments */}
      {Object.keys(groupedByCategory).length > 0 ? (
        Object.entries(groupedByCategory).map(([category, files]) => {
          const Icon = CATEGORY_ICONS[category] || File;
          return (
            <Card key={category}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Icon className="h-5 w-5" />
                  {CATEGORY_LABELS[category] || category}
                  <Badge variant="outline">{files.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="divide-y">
                  {files.map((att) => {
                    const FileIcon = CATEGORY_ICONS[att.category] || File;
                    return (
                      <div key={att.id} className="flex items-center justify-between py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded bg-slate-100 dark:bg-slate-800">
                            <FileIcon className="h-5 w-5 text-slate-500" />
                          </div>
                          <div>
                            <div className="font-medium">{att.filename}</div>
                            <div className="text-sm text-slate-500">
                              {formatFileSize(att.fileSize)} • Uploaded{" "}
                              {new Date(att.uploadedAt).toLocaleDateString()}
                              {att.uploadedBy && ` by ${att.uploadedBy}`}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {att.url && (
                            <>
                              <Button variant="ghost" size="icon" asChild title="Open in new tab">
                                <a
                                  href={att.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  aria-label={`Open ${att.filename} in new tab`}
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                              </Button>
                              <Button variant="ghost" size="icon" asChild title="Download file">
                                <a
                                  href={att.url}
                                  download={att.filename}
                                  aria-label={`Download ${att.filename}`}
                                >
                                  <Download className="h-4 w-4" />
                                </a>
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Folder className="mx-auto mb-4 h-12 w-12 text-slate-300" />
            <h3 className="mb-2 text-lg font-medium">No Attachments Yet</h3>
            <p className="mb-4 max-w-md text-sm text-slate-500">
              Upload supporting documents like inspection photos, estimates, permits, and
              correspondence to include with your claims package.
            </p>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Attachment
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Quick Upload Categories */}
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-lg">Quick Upload</CardTitle>
          <CardDescription>Drag files here or click a category to upload</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-3">
            {Object.entries(CATEGORY_LABELS).map(([key, label]) => {
              const Icon = CATEGORY_ICONS[key] || File;
              return (
                <Button key={key} variant="outline" className="h-auto flex-col gap-2 p-4">
                  <Icon className="h-6 w-6" />
                  <span>{label}</span>
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
