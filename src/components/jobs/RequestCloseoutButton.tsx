/**
 * Request Closeout Button
 *
 * Placed on claim and retail job overview pages.
 * When clicked, sets status to FINISHED and creates a manager
 * approval task. Manager can approve → archive or reject → reopen.
 */
"use client";

import { Archive, CheckCircle, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

interface RequestCloseoutButtonProps {
  entityId: string;
  entityType: "claim" | "lead";
  entityTitle: string;
  currentStatus: string;
  onCloseoutRequested?: () => void;
}

export function RequestCloseoutButton({
  entityId,
  entityType,
  entityTitle,
  currentStatus,
  onCloseoutRequested,
}: RequestCloseoutButtonProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState("");

  // Only show on items that aren't already finished/archived
  const normalized = currentStatus?.toLowerCase().trim() ?? "";
  const isAlreadyFinished = ["finished", "completed", "done", "archived", "closed"].includes(
    normalized
  );

  const handleRequestCloseout = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/closeout/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityId,
          entityType,
          reason: reason.trim() || "Ready for closeout review",
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(err.error || `Failed (${res.status})`);
      }

      toast.success("Closeout requested! A manager approval task has been created.", {
        duration: 5000,
      });
      setOpen(false);
      setReason("");
      onCloseoutRequested?.();
    } catch (err: any) {
      toast.error(err.message || "Failed to request closeout");
    } finally {
      setLoading(false);
    }
  };

  if (isAlreadyFinished) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 dark:border-emerald-800 dark:bg-emerald-950">
        <CheckCircle className="h-4 w-4 text-emerald-600" />
        <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
          This {entityType === "claim" ? "claim" : "job"} is finished
        </span>
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300 dark:hover:bg-amber-900"
        >
          <Archive className="mr-2 h-4 w-4" />
          Request Closeout
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request Closeout</DialogTitle>
          <DialogDescription>
            This will mark &quot;{entityTitle}&quot; as <strong>Finished</strong> and create a
            manager approval task. Once approved, the file will be archived.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Closeout Notes (optional)
            </label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., All work complete, final payment received, client satisfied..."
              rows={3}
            />
          </div>
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300">
            <strong>What happens next:</strong>
            <ul className="mt-1 list-inside list-disc space-y-0.5">
              <li>Status set to &quot;Finished&quot;</li>
              <li>Manager approval task created</li>
              <li>Manager approves → file archived</li>
              <li>Manager rejects → file re-opened with reason</li>
            </ul>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleRequestCloseout} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Requesting…
              </>
            ) : (
              <>
                <Archive className="mr-2 h-4 w-4" />
                Request Closeout
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
