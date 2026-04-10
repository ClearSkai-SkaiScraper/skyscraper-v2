/**
 * StartDraftGate.tsx
 *
 * Modal that appears before first autosave in Claims wizard.
 * Requires explicit user confirmation to create draft (compliance requirement).
 *
 * Unique to Claims (Retail auto-creates draft silently).
 */

"use client";

import { AlertCircle,Shield } from "lucide-react";
import { useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface StartDraftGateProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  carrierName?: string;
  claimNumber?: string;
}

export function StartDraftGate({
  open,
  onConfirm,
  onCancel,
  carrierName,
  claimNumber,
}: StartDraftGateProps) {
  const [isConfirming, setIsConfirming] = useState(false);

  const handleConfirm = async () => {
    setIsConfirming(true);
    // eslint-disable-next-line @typescript-eslint/await-thenable
    await onConfirm();
    setIsConfirming(false);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-600" />
            Create Draft Claim Report?
          </DialogTitle>
          <DialogDescription>
            You&apos;re about to create a draft claim report {carrierName && `for ${carrierName}`}
            {claimNumber && ` (Claim #${claimNumber})`}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Important:</strong> Once you create this draft, your changes will be
              auto-saved every 2 seconds. You can resume this draft later if you need to leave.
            </AlertDescription>
          </Alert>

          <div className="text-sm text-muted-foreground">
            <p className="mb-2">This draft will include:</p>
            <ul className="ml-4 list-disc space-y-1">
              <li>Carrier and claim information</li>
              <li>Property damage details</li>
              <li>Inspection findings</li>
              <li>Photos and documentation</li>
              <li>Settlement recommendations</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={isConfirming}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isConfirming}>
            {isConfirming ? "Creating Draft..." : "Create Draft"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
