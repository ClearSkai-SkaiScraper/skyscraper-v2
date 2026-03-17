"use client";

import { Loader2,Mail } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import type { DraftedPacketEmail, PacketRecipientType } from "@/lib/email/types";
import { logger } from "@/lib/logger";

import { PacketEmailComposer } from "./PacketEmailComposer";

interface SendPacketButtonProps {
  itemId: string;
  itemType: "report" | "estimate" | "supplement";
  recipientType: PacketRecipientType;
  label?: string;
  variant?: "default" | "outline" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

export function SendPacketButton({
  itemId,
  itemType,
  recipientType,
  label,
  variant = "ghost",
  size = "sm",
  className = "",
}: SendPacketButtonProps) {
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [draft, setDraft] = useState<DraftedPacketEmail | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleOpenComposer = async () => {
    setIsLoading(true);
    try {
      // Call draft-email API
      const res = await fetch(`/api/${itemType}s/${itemId}/draft-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientType }),
      });

      if (!res.ok) {
        throw new Error("Failed to draft email");
      }

      const data = await res.json();
      setDraft(data);
      setIsComposerOpen(true);
    } catch (error) {
      logger.error("Error drafting email:", error);
      alert("Failed to prepare email. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async (emailData: {
    to: string;
    cc?: string;
    subject: string;
    message: string;
  }) => {
    // Call send-packet API
    const res = await fetch(`/api/${itemType}s/${itemId}/send-packet`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...emailData,
        recipientType,
      }),
    });

    if (!res.ok) {
      throw new Error("Failed to send email");
    }

    // Show success toast (you can add a toast library later)
    alert("Email sent successfully!");
    
    // Refresh page to show updated claim timeline
    window.location.reload();
  };

  const defaultLabel = label ?? (
    recipientType === "adjuster" ? "Send to Adjuster" : "Send to Homeowner"
  );

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={handleOpenComposer}
        disabled={isLoading}
        className={className}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            <Mail className="mr-1 h-3 w-3" />
            {defaultLabel}
          </>
        )}
      </Button>

      <PacketEmailComposer
        isOpen={isComposerOpen}
        onClose={() => setIsComposerOpen(false)}
        draft={draft}
        onSend={handleSend}
        isLoading={isLoading}
      />
    </>
  );
}
