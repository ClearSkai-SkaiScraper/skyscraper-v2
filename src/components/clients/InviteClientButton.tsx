"use client";

import { Loader2,Mail } from "lucide-react";
import { useState } from "react";

import { logger } from "@/lib/logger";

interface InviteClientButtonProps {
  clientId: string;
  email: string;
}

export default function InviteClientButton({ clientId, email }: InviteClientButtonProps) {
  const [isInviting, setIsInviting] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");

  const handleInvite = async () => {
    setIsInviting(true);
    setStatus("idle");

    try {
      const response = await fetch("/api/client-portal/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, email }),
      });

      if (!response.ok) {
        throw new Error("Failed to invite client");
      }

      setStatus("success");
      setTimeout(() => setStatus("idle"), 3000);
    } catch (error) {
      logger.error("Error inviting client:", error);
      setStatus("error");
      setTimeout(() => setStatus("idle"), 3000);
    } finally {
      setIsInviting(false);
    }
  };

  return (
    <button
      onClick={handleInvite}
      disabled={isInviting || status === "success"}
      className={`inline-flex items-center gap-1.5 rounded px-2 py-1 text-xs font-medium transition-colors ${
        status === "success"
          ? "bg-green-100 text-green-700"
          : status === "error"
            ? "bg-red-100 text-red-700"
            : "bg-blue-100 text-blue-700 hover:bg-blue-200 disabled:opacity-50"
      }`}
    >
      {isInviting ? (
        <>
          <Loader2 className="h-3 w-3 animate-spin" />
          Inviting...
        </>
      ) : status === "success" ? (
        "Invited ✓"
      ) : status === "error" ? (
        "Failed"
      ) : (
        <>
          <Mail className="h-3 w-3" />
          Invite to Portal
        </>
      )}
    </button>
  );
}
