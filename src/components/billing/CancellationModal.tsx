"use client";

/**
 * CancellationModal — Confirm subscription cancellation
 *
 * Shows a modal with cancellation consequences and collects a reason.
 * Calls the Stripe billing portal for the actual cancellation.
 */

import { AlertTriangle, Loader2 } from "lucide-react";
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
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface CancellationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  seatCount: number;
  onSuccess?: () => void;
}

const CANCELLATION_REASONS = [
  { value: "too_expensive", label: "Too expensive" },
  { value: "not_using", label: "Not using it enough" },
  { value: "switching", label: "Switching to another tool" },
  { value: "missing_features", label: "Missing features I need" },
  { value: "seasonal", label: "Seasonal business — will return" },
  { value: "other", label: "Other" },
];

export function CancellationModal({
  open,
  onOpenChange,
  seatCount,
  onSuccess,
}: CancellationModalProps) {
  const [reason, setReason] = useState("");
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCancel = async () => {
    setLoading(true);
    try {
      // Record cancellation reason
      await fetch("/api/billing/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason, feedback }),
      });

      // Redirect to Stripe portal for actual cancellation
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const data = await res.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error("Failed to open billing portal");
      }

      onSuccess?.();
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Cancel Subscription
          </DialogTitle>
          <DialogDescription>Are you sure? This will affect your entire team.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Consequences */}
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-950/20">
            <h4 className="text-sm font-semibold text-red-800 dark:text-red-200">
              What happens when you cancel:
            </h4>
            <ul className="mt-2 space-y-1 text-sm text-red-700 dark:text-red-300">
              <li>• Access continues until the end of your billing period</li>
              <li>
                • All {seatCount} team member{seatCount !== 1 ? "s" : ""} will lose access
              </li>
              <li>• AI damage detection & report generation will stop</li>
              <li>• Your data will be retained for 90 days</li>
            </ul>
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label>Why are you cancelling?</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue placeholder="Select a reason..." />
              </SelectTrigger>
              <SelectContent>
                {CANCELLATION_REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Feedback */}
          <div className="space-y-2">
            <Label>Anything else you&apos;d like us to know? (optional)</Label>
            <Textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Your feedback helps us improve..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Keep Subscription
          </Button>
          <Button variant="destructive" onClick={handleCancel} disabled={loading || !reason}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              "Cancel Subscription"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
