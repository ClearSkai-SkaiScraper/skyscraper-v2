"use client";

import { CheckCircle, File, FileText, Loader2, X } from "lucide-react";
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { logger } from "@/lib/logger";

interface DocumentUploadProps {
  claimId: string;
  onUploadComplete?: (urls: string[]) => void;
}

/**
 * DocumentUpload - Uses Supabase Storage via /api/upload/supabase
 * Migrated from UploadThing for reliability
 */
export function DocumentUpload({ claimId, onUploadComplete }: DocumentUploadProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadedUrls, setUploadedUrls] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles((prev) => [...prev, ...acceptedFiles]);
    setError(null);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "image/*": [".jpg", ".jpeg", ".png"],
    },
    maxSize: 20 * 1024 * 1024,
    maxFiles: 10,
  });

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0) return;

    setUploading(true);
    setProgress(0);
    setError(null);

    const urls: string[] = [];
    let completed = 0;

    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("type", "claimDocuments");
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
        setProgress(Math.round((completed / files.length) * 100));
      }

      setUploadedUrls(urls);
      onUploadComplete?.(urls);

      setTimeout(() => {
        setFiles([]);
        setProgress(0);
      }, 2000);
    } catch (err: unknown) {
      logger.error("Upload error:", err);
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const getFileIcon = (filename: string) => {
    if (filename.toLowerCase().endsWith(".pdf")) {
      return <FileText className="h-5 w-5 text-red-500" />;
    }
    return <File className="h-5 w-5 text-blue-500" />;
  };

  return (
    <Card className="p-6">
      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors duration-200 ${isDragActive ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-gray-400"} ${uploading ? "pointer-events-none opacity-50" : ""} `}
      >
        <input {...getInputProps()} />
        <FileText className="mx-auto mb-4 h-12 w-12 text-gray-400" />
        {isDragActive ? (
          <p className="text-lg font-medium text-blue-600">Drop documents here...</p>
        ) : (
          <>
            <p className="mb-2 text-lg font-medium text-gray-700">
              Drag & drop documents here, or click to select
            </p>
            <p className="text-sm text-gray-500">
              Supports: PDF, JPG, PNG (max 16MB each, 10 files max)
            </p>
          </>
        )}
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* File List */}
      {files.length > 0 && (
        <div className="mt-6 space-y-2">
          <h3 className="mb-3 text-sm font-medium text-gray-700">
            Selected Documents ({files.length})
          </h3>
          {files.map((file, index) => (
            <div
              key={index}
              className="flex items-center justify-between rounded-lg bg-gray-50 p-3"
            >
              <div className="flex min-w-0 flex-1 items-center gap-3">
                {getFileIcon(file.name)}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900">{file.name}</p>
                  <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              </div>
              {!uploading && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFile(index)}
                  className="flex-shrink-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Upload Progress */}
      {uploading && (
        <div className="mt-6 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Uploading...</span>
            <span className="font-medium text-gray-900">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      )}

      {/* Success Message */}
      {uploadedUrls.length > 0 && !uploading && (
        <div className="mt-6 flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-4">
          <CheckCircle className="h-5 w-5 flex-shrink-0 text-green-600" />
          <p className="text-sm text-green-800">
            Successfully uploaded {uploadedUrls.length} document(s)
          </p>
        </div>
      )}

      {/* Upload Button */}
      {files.length > 0 && !uploading && uploadedUrls.length === 0 && (
        <div className="mt-6">
          <Button onClick={handleUpload} className="w-full" size="lg">
            <FileText className="mr-2 h-4 w-4" />
            Upload {files.length} Document{files.length > 1 ? "s" : ""}
          </Button>
        </div>
      )}

      {uploading && (
        <div className="mt-6">
          <Button disabled className="w-full" size="lg">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Uploading...
          </Button>
        </div>
      )}
    </Card>
  );
}
