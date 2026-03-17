"use client";
import { useState } from "react";

import { logger } from "@/lib/logger";
import { btn, card, glow } from "@/lib/theme";

export default function ClaimFiles({ claimId }: { claimId: string }) {
  const [files, setFiles] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    setUploading(true);
    try {
      // TODO: Implement file upload to Firebase Storage
      logger.debug("Uploading files:", e.target.files);
      // Mock upload
      const newFiles = Array.from(e.target.files).map((file) => ({
        id: Math.random().toString(36),
        name: file.name,
        size: file.size,
        type: file.type,
        uploadedAt: new Date(),
      }));
      setFiles([...files, ...newFiles]);
    } catch (err) {
      logger.error("Upload failed:", err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={`${card} ${glow}`}>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-[color:var(--text)]">
          Files & Attachments
        </h3>
        <label className={`${btn} cursor-pointer`}>
          {uploading ? "Uploading..." : "📎 Upload Files"}
          <input
            type="file"
            multiple
            onChange={handleFileUpload}
            className="hidden"
            disabled={uploading}
          />
        </label>
      </div>

      {files.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-[color:var(--border)] py-12 text-center">
          <div className="mb-3 text-4xl">📁</div>
          <p className="text-sm text-[color:var(--muted)]">
            No files uploaded yet. Click "Upload Files" to add documents, photos, or reports.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {files.map((file) => (
            <div
              key={file.id}
              className="rounded-lg border border-[color:var(--border)] p-4 transition-colors hover:bg-[var(--surface-2)]"
            >
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-[color:var(--text)]">
                    {file.name}
                  </div>
                  <div className="mt-1 text-xs text-[color:var(--muted)]">
                    {(file.size / 1024).toFixed(1)} KB •{" "}
                    {new Date(file.uploadedAt).toLocaleDateString()}
                  </div>
                </div>
                <button className="ml-2 text-[color:var(--muted)] hover:text-[color:var(--text)]">
                  ⋮
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
