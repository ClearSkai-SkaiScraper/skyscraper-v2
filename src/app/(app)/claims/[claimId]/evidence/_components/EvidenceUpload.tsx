/**
 * EvidenceUpload Component
 * Dropzone for uploading photos/videos with preview and progress
 */

"use client";

import { AlertCircle, CheckCircle, Upload, X } from "lucide-react";
import { useCallback, useState } from "react";

import { Button } from "@/components/ui/button";
import { logger } from "@/lib/logger";

interface EvidenceUploadProps {
  claimId: string;
  sectionKey?: string;
  onUploadComplete?: (assetId: string) => void;
}

interface UploadFile {
  id: string;
  file: File;
  status: "pending" | "uploading" | "success" | "error";
  progress: number;
  error?: string;
  assetId?: string;
}

export function EvidenceUpload({ claimId, sectionKey, onUploadComplete }: EvidenceUploadProps) {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    addFiles(droppedFiles);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      addFiles(selectedFiles);
    }
  };

  const addFiles = (newFiles: File[]) => {
    const uploadFiles: UploadFile[] = newFiles.map((file) => ({
      id: crypto.randomUUID(),
      file,
      status: "pending",
      progress: 0,
    }));

    setFiles((prev) => [...prev, ...uploadFiles]);

    // Auto-upload
    uploadFiles.forEach((uploadFile) => {
      void uploadFile_(uploadFile);
    });
  };

  const uploadFile_ = async (uploadFile: UploadFile) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === uploadFile.id ? { ...f, status: "uploading", progress: 10 } : f))
    );

    try {
      const formData = new FormData();
      formData.append("file", uploadFile.file);
      if (sectionKey) {
        formData.append("sectionKey", sectionKey);
      }

      const response = await fetch(`/api/claims/${claimId}/evidence/upload`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Upload failed");
      }

      const result = await response.json();

      setFiles((prev) =>
        prev.map((f) =>
          f.id === uploadFile.id
            ? { ...f, status: "success", progress: 100, assetId: result.asset.id }
            : f
        )
      );

      if (onUploadComplete) {
        onUploadComplete(result.asset.id);
      }
    } catch (error) {
      logger.error("Upload error:", error);
      setFiles((prev) =>
        prev.map((f) =>
          f.id === uploadFile.id
            ? {
                ...f,
                status: "error",
                error: error instanceof Error ? error.message : "Upload failed",
              }
            : f
        )
      );
    }
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const clearCompleted = () => {
    setFiles((prev) => prev.filter((f) => f.status !== "success"));
  };

  return (
    <div className="space-y-4">
      {/* Dropzone */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        className={`rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
          isDragging ? "border-orange-500 bg-orange-50" : "border-gray-300 hover:border-gray-400"
        } `}
      >
        <input
          type="file"
          multiple
          accept="image/*,video/*,application/pdf"
          onChange={handleFileInput}
          className="hidden"
          id="evidence-upload-input"
          aria-label="Upload Evidence Files"
          title="Upload Evidence Files"
        />

        <Upload className="mx-auto mb-4 h-12 w-12 text-gray-400" />

        <p className="mb-2 text-sm text-gray-600">
          Drag and drop photos/videos here, or click to browse
        </p>

        <Button
          type="button"
          variant="outline"
          onClick={() => document.getElementById("evidence-upload-input")?.click()}
        >
          Choose Files
        </Button>

        <p className="mt-3 text-xs text-gray-500">
          Supported: JPG, PNG, HEIC, MP4, MOV, PDF (max 50MB)
        </p>
      </div>

      {/* Upload Queue */}
      {files.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">
              Uploads ({files.filter((f) => f.status === "success").length} of {files.length})
            </h4>
            <Button type="button" variant="ghost" size="sm" onClick={clearCompleted}>
              Clear Completed
            </Button>
          </div>

          <div className="space-y-2">
            {files.map((file) => (
              <div key={file.id} className="flex items-center gap-3 rounded-lg border p-3">
                {/* Status Icon */}
                {file.status === "success" && (
                  <CheckCircle className="h-5 w-5 flex-shrink-0 text-green-600" />
                )}
                {file.status === "error" && (
                  <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-600" />
                )}
                {file.status === "uploading" && (
                  <div className="h-5 w-5 flex-shrink-0 animate-spin rounded-full border-2 border-orange-600 border-t-transparent" />
                )}

                {/* File Info */}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{file.file.name}</p>
                  <p className="text-xs text-gray-500">
                    {(file.file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                  {file.error && <p className="mt-1 text-xs text-red-600">{file.error}</p>}
                </div>

                {/* Progress Bar */}
                {file.status === "uploading" && (
                  <div className="h-2 w-24 rounded-full bg-gray-200">
                    <div
                      className="h-2 rounded-full bg-orange-600 transition-all"
                      style={{ width: `${file.progress}%` }}
                    />
                  </div>
                )}

                {/* Remove Button */}
                <button
                  type="button"
                  onClick={() => removeFile(file.id)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
