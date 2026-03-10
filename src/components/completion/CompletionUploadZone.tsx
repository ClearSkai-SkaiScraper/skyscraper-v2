"use client";

import { logger } from "@/lib/logger";
import { FileText, Image as ImageIcon, X } from "lucide-react";
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

interface CompletionUploadZoneProps {
  claimId: string;
  type: "document" | "photo";
  onUploadComplete?: () => void;
}

/**
 * CompletionUploadZone - Uses Supabase Storage via /api/upload/supabase
 * Migrated from UploadThing for reliability
 */
export function CompletionUploadZone({
  claimId,
  type,
  onUploadComplete,
}: CompletionUploadZoneProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);
  const [progress, setProgress] = useState(0);

  const uploadType = type === "document" ? "claimDocuments" : "completionPhotos";

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;

      setUploading(true);
      setProgress(0);

      try {
        const urls: string[] = [];
        let completed = 0;

        for (const file of acceptedFiles) {
          const formData = new FormData();
          formData.append("file", file);
          formData.append("type", uploadType);
          formData.append("claimId", claimId);

          const res = await fetch("/api/upload/supabase", {
            method: "POST",
            body: formData,
          });

          if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || "Upload failed");
          }

          const data = await res.json();
          urls.push(data.url);

          completed++;
          setProgress(Math.round((completed / acceptedFiles.length) * 100));
        }

        toast.success(`${urls.length} ${type}(s) uploaded successfully`);
        if (onUploadComplete) onUploadComplete();
      } catch (error: unknown) {
        logger.error("Upload error:", error);
        toast.error(`Upload failed: ${error instanceof Error ? error.message : "Unknown error"}`);
      } finally {
        setUploading(false);
        setProgress(0);
      }
    },
    [claimId, type, uploadType, onUploadComplete]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept:
      type === "document"
        ? { "application/pdf": [".pdf"], "image/*": [".jpg", ".jpeg", ".png"] }
        : { "image/*": [".jpg", ".jpeg", ".png"] },
    maxSize: 25 * 1024 * 1024, // 25MB per photo
  });

  const removeFile = (id: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.id !== id));
  };

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        {...getRootProps()}
        className={`cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-all ${
          isDragActive
            ? "border-blue-500 bg-blue-50"
            : "border-gray-300 bg-gray-50 hover:border-gray-400"
        }`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-3">
          {type === "document" ? (
            <FileText className="h-12 w-12 text-gray-400" />
          ) : (
            <ImageIcon className="h-12 w-12 text-gray-400" />
          )}
          {uploading ? (
            <p className="text-gray-600">Uploading...</p>
          ) : isDragActive ? (
            <p className="font-medium text-blue-600">Drop files here...</p>
          ) : (
            <>
              <p className="font-medium text-gray-700">
                {type === "document"
                  ? "📄 Upload Completion Documents"
                  : "📸 Upload Completion Photos"}
              </p>
              <p className="text-sm text-gray-500">Drag & drop files here, or click to browse</p>
              <p className="text-xs text-gray-400">
                {type === "document" ? "PDF, JPG, PNG (max 50MB)" : "JPG, PNG (max 25MB per file)"}
              </p>
            </>
          )}
        </div>
      </div>

      {/* Uploaded Files List */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-gray-700">
            Uploaded {type === "document" ? "Documents" : "Photos"} ({uploadedFiles.length})
          </h4>
          <div className="space-y-2">
            {uploadedFiles.map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between rounded-lg border bg-white p-3"
              >
                <div className="flex items-center gap-3">
                  {type === "document" ? (
                    <FileText className="h-5 w-5 text-blue-600" />
                  ) : (
                    <ImageIcon className="h-5 w-5 text-green-600" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {file.fileName || "Unnamed file"}
                    </p>
                    <p className="text-xs text-gray-500">
                      {file.fileSize ? `${(file.fileSize / 1024).toFixed(1)} KB` : "Unknown size"}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => removeFile(file.id)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
