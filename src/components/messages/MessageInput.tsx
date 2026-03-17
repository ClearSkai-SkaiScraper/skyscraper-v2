"use client";

import { Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AttachmentUploadButton } from "@/components/messages/AttachmentUploadButton";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { logger } from "@/lib/logger";

interface MessageInputProps {
  threadId: string;
  onMessageSent?: () => void;
}

export default function MessageInput({ threadId, onMessageSent }: MessageInputProps) {
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [attachments, setAttachments] = useState<string[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!body.trim() && attachments.length === 0) || sending) return;

    setSending(true);
    try {
      const res = await fetch("/api/messages/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          threadId,
          body: body.trim() || (attachments.length > 0 ? "📎 Attachment" : ""),
          attachments: attachments.length > 0 ? attachments : undefined,
        }),
      });

      if (res.ok) {
        setBody("");
        setAttachments([]);
        onMessageSent?.();
      } else {
        const error = await res.json().catch(() => ({ error: "Unknown error" }));
        logger.error("[MessageInput] Send failed:", error);
        toast.error(error.error || "Failed to send message");
      }
    } catch (error) {
      logger.error("Send message error:", error);
      toast.error("Failed to send message. Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="flex items-end gap-2">
        <AttachmentUploadButton attachments={attachments} onAttachmentsChange={setAttachments} />
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Type a message to your client or partner…"
          className="flex-1 resize-none"
          rows={3}
          disabled={sending}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
        />
        <Button
          type="submit"
          disabled={(!body.trim() && attachments.length === 0) || sending}
          size="icon"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </form>
  );
}
