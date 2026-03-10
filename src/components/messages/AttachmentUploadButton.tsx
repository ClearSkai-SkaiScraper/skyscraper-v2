"use client";

/**
 * AttachmentUploadButton — File picker + upload for message attachments.
 * Uploads to /api/uploads/message-attachment and returns URL array.
 */

import { Loader2, Paperclip, X } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

interface AttachmentUploadButtonProps {
  onAttachmentsChange: (urls: string[]) => void;
  attachments: string[];
  maxFiles?: number;
}

export function AttachmentUploadButton({
  onAttachmentsChange,
  attachments,
  maxFiles = 5,
}: AttachmentUploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (attachments.length + files.length > maxFiles) {
      toast.error(`Maximum ${maxFiles} attachments allowed`);
      return;
    }

    setUploading(true);

    try {
      const newUrls: string[] = [];

      for (const file of Array.from(files)) {
        // Validate file size (10MB max)
        if (file.size > 25 * 1024 * 1024) {
          toast.error(`${file.name} is too large (max 25MB)`);
          continue;
        }

        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/uploads/message-attachment", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          toast.error(`Failed to upload ${file.name}`);
          continue;
        }

        const data = await res.json();
        if (data.url) {
          newUrls.push(data.url);
        }
      }

      if (newUrls.length > 0) {
        onAttachmentsChange([...attachments, ...newUrls]);
      }
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
      // Reset input so same file can be selected again
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const removeAttachment = (index: number) => {
    onAttachmentsChange(attachments.filter((_, i) => i !== index));
  };

  return (
    <div className="flex items-center gap-2">
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"
        onChange={handleFileSelect}
        className="hidden"
      />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0"
        onClick={() => inputRef.current?.click()}
        disabled={uploading || attachments.length >= maxFiles}
        title="Attach files"
      >
        {uploading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Paperclip className="h-4 w-4 text-slate-500" />
        )}
      </Button>

      {/* Preview badges for queued attachments */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {attachments.map((url, i) => {
            const name = (() => {
              try {
                const path = new URL(url).pathname;
                return decodeURIComponent(path.split("/").pop() || "file");
              } catch {
                return "file";
              }
            })();
            return (
              <span
                key={i}
                className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
              >
                <span className="max-w-[80px] truncate">{name}</span>
                <button
                  onClick={() => removeAttachment(i)}
                  className="ml-0.5 rounded-full p-0.5 hover:bg-blue-200 dark:hover:bg-blue-800"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
