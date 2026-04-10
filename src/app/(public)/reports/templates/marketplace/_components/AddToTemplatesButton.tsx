"use client";

import { BookmarkPlus, Check, Loader2, LogIn } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { clientFetch } from "@/lib/http/clientFetch";
import { logger } from "@/lib/logger";

interface AddToTemplatesButtonProps {
  templateId: string;
  templateTitle: string;
  templateSlug?: string;
  initiallyAdded?: boolean;
  onAdded?: (templateId: string, templateSlug?: string) => void;
}

export function AddToTemplatesButton({
  templateId,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  templateTitle,
  templateSlug,
  initiallyAdded = false,
  onAdded,
}: AddToTemplatesButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [added, setAdded] = useState(initiallyAdded);
  const [error, setError] = useState<string | null>(null);
  const [showSignInPrompt, setShowSignInPrompt] = useState(false);

  async function handleAdd() {
    if (added) return;

    try {
      setLoading(true);
      setError(null);

      // clientFetch throws on non-ok responses, so success means template added
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const result = await clientFetch<{
        success: boolean;
        alreadyExists?: boolean;
        message?: string;
      }>("/api/templates/add-from-marketplace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: templateSlug || templateId,
        }),
      });

      // Success - template was added or already exists
      setAdded(true);
      // Notify parent to update state
      onAdded?.(templateId, templateSlug);
    } catch (err) {
      // Check for 401 unauthorized - user needs to sign in
      if (
        err.status === 401 ||
        err.message?.includes("Unauthorized") ||
        err.message?.includes("401")
      ) {
        setShowSignInPrompt(true);
        return;
      }

      // Check if already exists (sometimes returned as 409 or in message)
      if (err.status === 409 || err.data?.alreadyExists || err.message?.includes("already")) {
        setAdded(true);
        // Notify parent to update state
        onAdded?.(templateId, templateSlug);
        return;
      }

      setError(err.message || "Failed to add template");
      logger.error("[AddToTemplatesButton] Error:", err);
    } finally {
      setLoading(false);
    }
  }

  // Show sign-in prompt for unauthenticated users
  if (showSignInPrompt) {
    return (
      <button
        onClick={() => router.push(`/sign-in?redirect=/reports/templates/marketplace`)}
        className="flex items-center gap-2 rounded-lg border border-sky-300 bg-sky-50 px-4 py-2 text-sm font-medium text-sky-700 hover:bg-sky-100"
        title="Sign in to add templates to your library"
      >
        <LogIn className="h-4 w-4" />
        Sign in to Add
      </button>
    );
  }

  if (added) {
    return (
      <button
        disabled
        className="flex items-center gap-2 rounded-lg border border-green-300 bg-green-50 px-4 py-2 text-sm font-medium text-green-700"
      >
        <Check className="h-4 w-4" />
        Added
      </button>
    );
  }

  if (error) {
    return (
      <button
        onClick={handleAdd}
        className="flex items-center gap-2 rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
        title={error}
      >
        <BookmarkPlus className="h-4 w-4" />
        Retry
      </button>
    );
  }

  return (
    <button
      onClick={handleAdd}
      disabled={loading}
      className="flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
      title="Save to My Templates for later use"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <BookmarkPlus className="h-4 w-4" />
      )}
      {loading ? "Adding..." : "Add to My Templates"}
    </button>
  );
}
