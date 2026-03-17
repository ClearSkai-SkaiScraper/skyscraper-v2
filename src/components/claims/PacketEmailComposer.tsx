"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription,DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { DraftedPacketEmail } from "@/lib/email/types";
import { logger } from "@/lib/logger";

interface PacketEmailComposerProps {
  isOpen: boolean;
  onClose: () => void;
  draft: DraftedPacketEmail | null;
  onSend: (data: { to: string; cc?: string; subject: string; message: string }) => Promise<void>;
  isLoading?: boolean;
}

export function PacketEmailComposer({
  isOpen,
  onClose,
  draft,
  onSend,
  isLoading = false,
}: PacketEmailComposerProps) {
  const [to, setTo] = useState(draft?.to ?? "");
  const [cc, setCc] = useState(draft?.cc ?? "");
  const [subject, setSubject] = useState(draft?.subject ?? "");
  const [message, setMessage] = useState(draft?.message ?? "");
  const [sending, setSending] = useState(false);

  // Update fields when draft changes
  useState(() => {
    if (draft) {
      setTo(draft.to);
      setCc(draft.cc ?? "");
      setSubject(draft.subject);
      setMessage(draft.message);
    }
  });

  const handleSend = async () => {
    if (!to || !subject || !message) {
      alert("Please fill in all required fields");
      return;
    }

    setSending(true);
    try {
      await onSend({ to, cc: cc || undefined, subject, message });
      onClose();
    } catch (error) {
      logger.error("Error sending email:", error);
      alert("Failed to send email. Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Send Packet Email</DialogTitle>
          <DialogDescription>
            Review and edit the email before sending. The packet link will be included automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          {/* To */}
          <div className="space-y-2">
            <Label htmlFor="to">
              To <span className="text-destructive">*</span>
            </Label>
            <Input
              id="to"
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="adjuster@carrier.com"
              disabled={isLoading || sending}
            />
          </div>

          {/* CC */}
          <div className="space-y-2">
            <Label htmlFor="cc">CC (optional)</Label>
            <Input
              id="cc"
              type="email"
              value={cc}
              onChange={(e) => setCc(e.target.value)}
              placeholder="manager@company.com"
              disabled={isLoading || sending}
            />
          </div>

          {/* Subject */}
          <div className="space-y-2">
            <Label htmlFor="subject">
              Subject <span className="text-destructive">*</span>
            </Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Claim packet"
              disabled={isLoading || sending}
            />
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label htmlFor="message">
              Message <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Email body..."
              rows={10}
              disabled={isLoading || sending}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              The packet link will be included automatically below your message.
            </p>
          </div>

          {/* Packet URL Preview */}
          {draft?.packetUrl && (
            <div className="rounded-md bg-muted p-3 text-xs">
              <p className="mb-1 font-semibold">Packet URL (will be included):</p>
              <p className="break-all text-muted-foreground">{draft.packetUrl}</p>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading || sending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSend}
            disabled={isLoading || sending || !to || !subject || !message}
          >
            {sending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              "Send Email"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
