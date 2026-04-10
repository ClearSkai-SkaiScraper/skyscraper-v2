"use client";

/**
 * DocumentForwardButton — Action button to forward a claim document to a client.
 * Shows in document rows. Calls /api/claims/documents/forward.
 */

import { Forward, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

interface DocumentForwardButtonProps {
  documentId: string;
  claimId: string;
  filename: string;
  clientId?: string;
  onForwarded?: () => void;
}

export function DocumentForwardButton({
  documentId,
  claimId,
  filename,
  clientId,
  onForwarded,
}: DocumentForwardButtonProps) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleForward = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/claims/documents/forward", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId,
          claimId,
          clientId,
          message: message.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to forward");

      toast.success(`"${filename}" forwarded to client`);
      setOpen(false);
      setMessage("");
      onForwarded?.();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      toast.error(err.message || "Failed to forward document");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs">
          <Forward className="h-3 w-3" />
          Forward
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Forward to Client</DialogTitle>
          <DialogDescription>
            Share &quot;{filename}&quot; with the claim client. They&apos;ll receive a notification
            and can view it in their portal.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Optional message
            </label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Add a note for the client..."
              rows={3}
              maxLength={500}
              className="mt-1"
            />
            <p className="mt-1 text-xs text-slate-400">{message.length}/500</p>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleForward} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  Forwarding…
                </>
              ) : (
                <>
                  <Forward className="mr-1 h-4 w-4" />
                  Forward to Client
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
