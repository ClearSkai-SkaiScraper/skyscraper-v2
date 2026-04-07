// components/reports/ShareButton.tsx
"use client";

import { useState } from "react";

import { logger } from "@/lib/logger";

interface ShareButtonProps {
  reportId: string;
}

export function ShareButton({ reportId }: ShareButtonProps) {
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const generateShareLink = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/reports/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId }),
      });

      if (response.ok) {
        const data = await response.json();
        setShareUrl(data.shareUrl);
      }
    } catch (error) {
      logger.error("Failed to generate share link:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (shareUrl) {
      void navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const revokeLink = async () => {
    try {
      await fetch("/api/reports/share", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId }),
      });
      setShareUrl(null);
    } catch (error) {
      logger.error("Failed to revoke share link:", error);
    }
  };

  if (!shareUrl) {
    return (
      <button
        onClick={generateShareLink}
        disabled={isLoading}
        className="rounded border px-3 py-1.5 text-sm hover:bg-slate-50 disabled:opacity-50"
      >
        {isLoading ? "Generating..." : "Share"}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="text"
        value={shareUrl}
        readOnly
        className="min-w-0 flex-1 rounded border bg-slate-50 px-3 py-1.5 text-sm"
        aria-label="Share link"
      />
      <button
        onClick={copyToClipboard}
        className="rounded bg-sky-600 px-3 py-1.5 text-sm text-white hover:bg-sky-700"
      >
        {copied ? "Copied!" : "Copy"}
      </button>
      <button
        onClick={revokeLink}
        className="rounded border px-3 py-1.5 text-sm hover:bg-red-50 hover:text-red-600"
      >
        Revoke
      </button>
    </div>
  );
}
