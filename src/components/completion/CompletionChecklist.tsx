"use client";

import { useEffect,useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { logger } from "@/lib/logger";

interface CompletionChecklistProps {
  claimId: string;
  onStatusChange?: () => void;
}

export function CompletionChecklist({ claimId, onStatusChange }: CompletionChecklistProps) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({
    completionFormUploaded: false,
    completionPhotosUploaded: false,
    walkthroughPassed: false,
    notes: "",
    isComplete: false,
  });

  useEffect(() => {
    void fetchStatus();
  }, [claimId]);

  const fetchStatus = async () => {
    try {
      const res = await fetch(`/api/completion/update?claimId=${claimId}`);
      if (res.ok) {
        const data = await res.json();
        setStatus({
          completionFormUploaded: data.completionFormUploaded || false,
          completionPhotosUploaded: data.completionPhotosUploaded || false,
          walkthroughPassed: data.walkthroughPassed || false,
          notes: data.notes || "",
          isComplete: data.isComplete || false,
        });
      }
    } catch (error) {
      logger.error("Failed to fetch status:", error);
    }
  };

  const updateStatus = async (field: string, value: boolean | string) => {
    try {
      setLoading(true);
      const res = await fetch("/api/completion/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          claimId,
          [field]: value,
        }),
      });

      if (!res.ok) throw new Error(await res.text());

      const data = await res.json();
      setStatus({
        completionFormUploaded: data.completionFormUploaded || false,
        completionPhotosUploaded: data.completionPhotosUploaded || false,
        walkthroughPassed: data.walkthroughPassed || false,
        notes: data.notes || "",
        isComplete: data.isComplete || false,
      });

      if (data.isComplete && !status.isComplete) {
        toast.success("🏁 Build marked as COMPLETE! Ready for depreciation processing.");
      } else {
        toast.success("Checklist updated");
      }

      if (onStatusChange) onStatusChange();
    } catch (error: any) {
      toast.error(`Failed to update: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const allComplete =
    status.completionFormUploaded &&
    status.completionPhotosUploaded &&
    status.walkthroughPassed;

  return (
    <div className="rounded-xl border bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-semibold">🏁 Completion Checklist</h3>

      {status.isComplete && (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-4">
          <p className="font-semibold text-green-800">
            ✅ BUILD COMPLETE - Ready for Depreciation Processing
          </p>
        </div>
      )}

      <div className="space-y-4">
        {/* Completion Form */}
        <div className="flex items-center justify-between rounded-lg bg-gray-50 p-4">
          <div className="flex items-center gap-3">
            <Label htmlFor="completion-form" className="cursor-pointer text-base">
              📄 Completion Form Signed & Uploaded?
            </Label>
          </div>
          <Switch
            id="completion-form"
            checked={status.completionFormUploaded}
            onCheckedChange={(checked) => updateStatus("completionFormUploaded", checked)}
            disabled={loading}
          />
        </div>

        {/* Completion Photos */}
        <div className="flex items-center justify-between rounded-lg bg-gray-50 p-4">
          <div className="flex items-center gap-3">
            <Label htmlFor="completion-photos" className="cursor-pointer text-base">
              📸 Completion Photos Uploaded?
            </Label>
          </div>
          <Switch
            id="completion-photos"
            checked={status.completionPhotosUploaded}
            onCheckedChange={(checked) => updateStatus("completionPhotosUploaded", checked)}
            disabled={loading}
          />
        </div>

        {/* Walkthrough */}
        <div className="flex items-center justify-between rounded-lg bg-gray-50 p-4">
          <div className="flex items-center gap-3">
            <Label htmlFor="walkthrough" className="cursor-pointer text-base">
              ✅ Final Walkthrough Passed?
            </Label>
          </div>
          <Switch
            id="walkthrough"
            checked={status.walkthroughPassed}
            onCheckedChange={(checked) => updateStatus("walkthroughPassed", checked)}
            disabled={loading}
          />
        </div>

        {/* Notes */}
        <div>
          <Label htmlFor="notes" className="mb-2 block text-sm text-gray-600">
            Completion Notes (Optional)
          </Label>
          <Textarea
            id="notes"
            value={status.notes}
            onChange={(e) => setStatus({ ...status, notes: e.target.value })}
            placeholder="Any final notes about the build completion..."
            rows={3}
            className="w-full"
          />
          <Button
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={() => updateStatus("notes", status.notes)}
            disabled={loading}
          >
            Save Notes
          </Button>
        </div>
      </div>

      {allComplete && !status.isComplete && (
        <div className="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
          <p className="font-medium text-blue-800">
            🎯 All requirements met! Status will auto-update on next save.
          </p>
        </div>
      )}
    </div>
  );
}
