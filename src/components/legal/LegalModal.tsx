"use client";

import Link from "next/link";
import { useState } from "react";

import { logger } from "@/lib/logger";

interface LegalModalProps {
  document: {
    id: string;
    title: string;
    latestVersion: string;
  };
  onAccepted: () => void;
}

export function LegalModal({ document, onAccepted }: LegalModalProps) {
  const [loading, setLoading] = useState(false);
  const [showFriendly, setShowFriendly] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleAccept = async () => {
    if (loading) return;
    setLoading(true);
    setError(null);

    try {
      // eslint-disable-next-line no-console
      console.log("[LegalModal] Accepting document:", {
        documentId: document.id,
        version: document.latestVersion,
      });

      const response = await fetch("/api/legal/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId: document.id,
          version: document.latestVersion,
        }),
      });

      const data = await response.json().catch(() => ({}));
      logger.debug("[LegalModal] API response:", { status: response.status, data });

      if (!response.ok) {
        // Provide specific error messages
        if (response.status === 401) {
          throw new Error("Session expired. Please refresh the page and sign in again.");
        } else if (response.status === 500) {
          throw new Error(
            data.error || "Server error. Our team has been notified. Please try again in a moment."
          );
        }
        throw new Error(data.error || `Server returned ${response.status}`);
      }

      logger.debug("[LegalModal] ✅ Acceptance saved successfully");

      // Small delay to ensure database commit completes
      await new Promise((resolve) => setTimeout(resolve, 300));

      onAccepted();
    } catch (error: any) {
      logger.error("[LegalModal] ❌ Failed to accept:", error);
      setError(error.message || "Could not record your acceptance. Please try again.");
      setLoading(false);
    }
  };

  const docUrl = `/legal/${document.id}/${document.latestVersion}?view=${
    showFriendly ? "friendly" : "legal"
  }`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-2xl">
      <div className="relative w-full max-w-3xl rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-white">{document.title}</h2>
            <p className="text-xs text-slate-300">
              Version {document.latestVersion} • Required to continue
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-200">
            <button
              type="button"
              className={`rounded-full px-3 py-1 transition-colors ${
                showFriendly ? "bg-white/20" : "bg-transparent hover:bg-white/10"
              }`}
              onClick={() => setShowFriendly(true)}
            >
              Simple
            </button>
            <button
              type="button"
              className={`rounded-full px-3 py-1 transition-colors ${
                !showFriendly ? "bg-white/20" : "bg-transparent hover:bg-white/10"
              }`}
              onClick={() => setShowFriendly(false)}
            >
              Legal
            </button>
          </div>
        </div>

        <div className="mb-4 max-h-[340px] overflow-y-auto rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-100">
          <p className="mb-2 text-slate-200">
            This is a preview. For the full document,{" "}
            <Link
              href={docUrl}
              target="_blank"
              className="text-blue-300 underline hover:text-blue-200"
            >
              open it in a new tab
            </Link>
            .
          </p>
          <p className="mb-3 text-xs text-slate-300">
            Please review this document before accepting.
          </p>
          <div className="mt-3 space-y-2 text-xs text-slate-400">
            <p>• Please review this document carefully</p>
            <p>• Click the link above to read the full legal text</p>
            <p>• Your acceptance is legally binding</p>
            <p>• You can access this document anytime from Settings</p>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <p className="max-w-xs text-xs text-slate-400">
              By clicking &quot;I Accept,&quot; you agree to be legally bound by this document on
              behalf of yourself and, where applicable, your organization.
            </p>

            <button
              type="button"
              disabled={loading}
              onClick={handleAccept}
              className={`rounded-lg px-6 py-2 text-sm font-medium text-white transition-colors ${
                loading ? "cursor-not-allowed bg-slate-600" : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {loading ? "Saving…" : "I Accept"}
            </button>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>
      </div>
    </div>
  );
}
