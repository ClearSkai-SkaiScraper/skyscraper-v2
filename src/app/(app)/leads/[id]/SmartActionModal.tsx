"use client";

import { Copy, RefreshCw, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

interface SmartActionModalProps {
  title: string;
  content: string;
  action: string;
  leadId: string;
  onClose: () => void;
  onRegenerate: () => void;
}

export function SmartActionModal({
  title,
  content,
  action,
  leadId,
  onClose,
  onRegenerate,
}: SmartActionModalProps) {
  const copyToClipboard = () => {
    navigator.clipboard.writeText(content);
    toast.success("Content copied to clipboard");
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-xl dark:bg-neutral-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between border-b bg-white p-4 dark:bg-neutral-900">
          <h2 className="text-xl font-bold">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 transition-colors hover:bg-gray-100"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="whitespace-pre-wrap rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm leading-relaxed">
            {content}
          </div>
        </div>

        {/* Actions */}
        <div className="sticky bottom-0 flex gap-2 border-t bg-white p-4 dark:bg-neutral-900">
          <Button onClick={copyToClipboard} variant="outline" className="flex-1">
            <Copy className="mr-2 h-4 w-4" />
            Copy to Clipboard
          </Button>
          <Button onClick={onRegenerate} variant="outline" className="flex-1">
            <RefreshCw className="mr-2 h-4 w-4" />
            Regenerate
          </Button>
        </div>
      </div>
    </div>
  );
}
