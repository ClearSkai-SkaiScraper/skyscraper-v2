"use client";

import { DownloadIcon, FileIcon, UploadIcon } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { logger } from "@/lib/logger";

interface ClaimFile {
  id: string;
  type: string;
  title: string;
  mimeType: string;
  fileSize: number | null;
  publicUrl: string;
  createdAt: string;
  visibleToClient: boolean;
}

interface ClaimFilesPanelProps {
  claimId: string;
  orgId: string;
  initialFiles: ClaimFile[];
}

export function ClaimFilesPanel({ claimId, orgId, initialFiles }: ClaimFilesPanelProps) {
  const [files, setFiles] = useState<ClaimFile[]>(initialFiles);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    setUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append("claimId", claimId);
      formData.append("orgId", orgId);

      for (let i = 0; i < selectedFiles.length; i++) {
        formData.append("files", selectedFiles[i]);
      }

      const response = await fetch("/api/claims/files/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Upload failed");
      }

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const result = await response.json();

      // Refresh the page to show new files
      window.location.reload();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      logger.error("Upload error:", error);
      setUploadError(error.message || "Failed to upload files");
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes: number | null): string => {
    if (!bytes) return "Unknown";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const getFileIcon = (type: string) => {
    return <FileIcon className="h-4 w-4" />;
  };

  const getTypeColor = (type: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (type.toUpperCase()) {
      case "PHOTO":
        return "default";
      case "DOCUMENT":
        return "secondary";
      case "INVOICE":
      case "CERTIFICATE":
        return "outline";
      default:
        return "outline";
    }
  };

  const toggleVisibility = async (fileId: string, newValue: boolean) => {
    try {
      setTogglingId(fileId);

      const res = await fetch(`/api/claims/${claimId}/files/${fileId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ visibleToClient: newValue }),
      });

      if (!res.ok) {
        throw new Error(`Toggle failed (${res.status})`);
      }

      // Update local state
      setFiles((prev) =>
        prev.map((f) => (f.id === fileId ? { ...f, visibleToClient: newValue } : f))
      );
    } catch (error) {
      logger.error("Toggle visibility error:", error);
      setUploadError("Failed to update file visibility. Please try again.");
      // Revert UI after a moment
      setTimeout(() => setUploadError(null), 3000);
    } finally {
      setTogglingId(null);
    }
  };

  if (files.length === 0 && !uploading) {
    return (
      <div className="rounded-xl border border-slate-200/50 bg-white/90 p-6 shadow-lg backdrop-blur-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">Files & Attachments</h2>
          <div>
            <input
              type="file"
              id="file-upload"
              multiple
              accept="image/*,.pdf"
              onChange={handleFileUpload}
              className="hidden"
              disabled={uploading}
            />
            <label htmlFor="file-upload">
              <Button asChild disabled={uploading}>
                <span className="cursor-pointer">
                  <UploadIcon className="mr-2 h-4 w-4" />
                  Upload Files
                </span>
              </Button>
            </label>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center py-12 text-center">
          <FileIcon className="mb-4 h-12 w-12 text-slate-300" />
          <p className="mb-2 text-sm text-slate-600">No files uploaded yet for this claim</p>
          <p className="text-xs text-slate-400">
            Upload photos, documents, or invoices to get started
          </p>
          {uploadError && (
            <div className="mt-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">
              {uploadError}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200/50 bg-white/90 p-6 shadow-lg backdrop-blur-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Files & Attachments ({files.length})</h2>
          <p className="mt-1 text-xs text-slate-500">
            Files uploaded here are shared with the homeowner through the client portal when marked
            as visible
          </p>
        </div>
        <div>
          <input
            type="file"
            id="file-upload"
            multiple
            accept="image/*,.pdf"
            onChange={handleFileUpload}
            className="hidden"
            disabled={uploading}
          />
          <label htmlFor="file-upload">
            <Button asChild disabled={uploading}>
              <span className="cursor-pointer">
                <UploadIcon className="mr-2 h-4 w-4" />
                {uploading ? "Uploading..." : "Upload Files"}
              </span>
            </Button>
          </label>
        </div>
      </div>

      {uploadError && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">
          {uploadError}
        </div>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12"></TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Size</TableHead>
            <TableHead>Uploaded</TableHead>
            <TableHead className="text-center">Portal Visible</TableHead>
            <TableHead className="w-24">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {files.map((file) => (
            <TableRow key={file.id}>
              <TableCell>{getFileIcon(file.type)}</TableCell>
              <TableCell className="font-medium">{file.title}</TableCell>
              <TableCell>
                <Badge variant={getTypeColor(file.type)}>{file.type}</Badge>
              </TableCell>
              <TableCell className="text-sm text-slate-600">
                {formatFileSize(file.fileSize)}
              </TableCell>
              <TableCell className="text-sm text-slate-600">
                {new Date(file.createdAt).toLocaleDateString()}
              </TableCell>
              <TableCell className="text-center">
                <Switch
                  checked={file.visibleToClient}
                  disabled={togglingId === file.id}
                  onCheckedChange={(checked) => toggleVisibility(file.id, checked)}
                  aria-label="Toggle portal visibility"
                />
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" asChild>
                    <a
                      href={file.publicUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      download
                      title={`Download ${file.title}`}
                    >
                      <DownloadIcon className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
