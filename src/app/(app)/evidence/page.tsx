"use client";

import { useUser } from "@clerk/nextjs";
import { Camera, CheckCircle, FileText, Image, Upload, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import { PageSectionCard } from "@/components/layout/PageSectionCard";
import { Button } from "@/components/ui/button";
import EmptyState from "@/components/ui/EmptyState";
import { StandardButton } from "@/components/ui/StandardButton";
import { logger } from "@/lib/logger";

interface UploadedFile {
  name: string;
  url: string;
  size: number;
  uploadedAt: Date;
}

/**
 * EvidencePage - Uses Supabase Storage via /api/upload/supabase
 * Migrated from UploadThing for reliability
 */
export default function EvidencePage() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useUser();
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/sign-in");
    }
  }, [isLoaded, isSignedIn, router]);

  if (!isLoaded || !isSignedIn) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files);
    setFiles((prev) => [...prev, ...droppedFiles]);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      setFiles((prev) => [...prev, ...selectedFiles]);
    }
  };

  const handleUpload = async () => {
    if (files.length === 0) return;

    setUploading(true);
    setUploadErrors([]);

    try {
      const newUploads: UploadedFile[] = [];

      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("type", "evidence");

        const res = await fetch("/api/upload/supabase", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Upload failed");
        }

        const data = await res.json();
        newUploads.push({
          name: file.name,
          url: data.url,
          size: file.size,
          uploadedAt: new Date(),
        });
      }

      setUploadedFiles((prev) => [...newUploads, ...prev]);
      setFiles([]);
    } catch (error) {
      logger.error("Upload failed:", error);
      setUploadErrors((prev) => [
        ...prev,
        error instanceof Error ? error.message : "Upload failed",
      ]);
    } finally {
      setUploading(false);
    }
  };

  return (
    <PageContainer>
      <PageHero
        section="claims"
        title="Evidence Management"
        subtitle="Upload and annotate photos, documents, and evidence"
        icon={<Camera className="h-5 w-5" />}
      />

      <PageSectionCard>
        {/* Upload Zone */}
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className="rounded-xl border-2 border-dashed border-[color:var(--border)] bg-[var(--surface-1)] p-12 shadow-sm transition-colors hover:border-blue-400"
        >
          <div className="text-center">
            <Upload className="mx-auto mb-4 h-16 w-16 text-slate-700 dark:text-slate-300" />
            <h3 className="mb-2 text-lg font-semibold text-[color:var(--text)]">Drop files here</h3>
            <p className="mb-4 text-slate-700 dark:text-slate-300">
              or click to browse (JPG, PNG, PDF up to 10MB)
            </p>
            <input
              type="file"
              multiple
              accept="image/*,.pdf"
              onChange={handleFileInput}
              className="hidden"
              id="file-upload"
            />
            <label htmlFor="file-upload">
              <StandardButton variant="indigo" gradient className="cursor-pointer">
                Browse Files
              </StandardButton>
            </label>
          </div>
        </div>

        {/* File List */}
        {files.length > 0 && (
          <div className="rounded-xl border bg-[var(--surface-1)] p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Selected Files ({files.length})</h3>
              <Button
                onClick={handleUpload}
                disabled={uploading}
                className="bg-gradient-indigo hover:opacity-95"
              >
                {uploading ? "Uploading..." : "Upload All"}
              </Button>
            </div>
            <div className="space-y-2">
              {files.map((file, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-lg bg-[var(--surface-2)] p-3"
                >
                  {file.type.startsWith("image/") ? (
                    <Image className="h-5 w-5 text-blue-600" />
                  ) : (
                    <FileText className="h-5 w-5 text-blue-600" />
                  )}
                  <div className="flex-1">
                    <div className="text-sm font-medium">{file.name}</div>
                    <div className="text-xs text-slate-700 dark:text-slate-300">
                      {(file.size / 1024).toFixed(1)} KB
                    </div>
                  </div>
                  <button
                    onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
                    className="text-sm text-red-600 hover:text-red-700"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Uploads */}
        <div className="rounded-xl border bg-[var(--surface-1)] p-6 shadow-sm">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <span className="text-xl">📁</span> Recent Uploads
          </h3>

          {/* Show upload errors */}
          {uploadErrors.length > 0 && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4">
              <div className="flex items-center gap-2 text-red-700">
                <XCircle className="h-5 w-5" />
                <span className="font-medium">Upload Errors</span>
              </div>
              <ul className="mt-2 list-inside list-disc text-sm text-red-600">
                {uploadErrors.map((error, i) => (
                  <li key={i}>{error}</li>
                ))}
              </ul>
              <button
                onClick={() => setUploadErrors([])}
                className="mt-2 text-sm text-red-600 underline hover:no-underline"
              >
                Dismiss
              </button>
            </div>
          )}

          {uploadedFiles.length > 0 ? (
            <div className="space-y-2">
              {uploadedFiles.map((file, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-lg bg-[var(--surface-2)] p-3"
                >
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <div className="flex-1">
                    <div className="text-sm font-medium">{file.name}</div>
                    <div className="text-xs text-slate-700 dark:text-slate-300">
                      {(file.size / 1024).toFixed(1)} KB • Uploaded{" "}
                      {file.uploadedAt.toLocaleTimeString()}
                    </div>
                  </div>
                  <a
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    View
                  </a>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No uploads yet"
              description="Upload photos and documents to get started with evidence management"
              icon={<span className="text-3xl">📭</span>}
            />
          )}
        </div>
      </PageSectionCard>
    </PageContainer>
  );
}
