"use client";

/**
 * AddTokensModal — Stub
 *
 * Token costs are currently set to 0. This modal is retained
 * for the TokenGate provider contract but does not process payments.
 * TODO: Re-implement with Stripe checkout when token pricing is re-enabled.
 */

import { Coins } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface AddTokensModalProps {
  orgId: string;
  isOpen: boolean;
  onCloseAction: () => void;
  currentBalance?: number;
}

export default function AddTokensModal({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  orgId,
  isOpen,
  onCloseAction,
  currentBalance = 0,
}: AddTokensModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCloseAction()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-amber-500" />
            Add Tokens
          </DialogTitle>
          <DialogDescription>
            Your current balance: <strong>{currentBalance}</strong> tokens. Token purchasing is
            being upgraded. Contact support for assistance.
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end pt-4">
          <Button variant="outline" onClick={onCloseAction}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
