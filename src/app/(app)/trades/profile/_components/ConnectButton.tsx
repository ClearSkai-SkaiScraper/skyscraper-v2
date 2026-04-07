/**
 * Connect Button for Trades Profile
 * Allows users to connect with contractors
 */

"use client";

import { Loader2, UserCheck, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { StandardButton } from "@/components/ui/StandardButton";
import { logger } from "@/lib/logger";

interface ConnectButtonProps {
  userId: string;
}

export default function ConnectButton({ userId }: ConnectButtonProps) {
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [status, setStatus] = useState<"none" | "pending" | "accepted">("none");

  // Check existing connection status on mount
  useEffect(() => {
    async function checkStatus() {
      try {
        const res = await fetch(`/api/portal/connect-pro?proId=${userId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.status === "accepted" || data.status === "ACCEPTED") {
            setStatus("accepted");
          } else if (data.status === "pending" || data.status === "PENDING") {
            setStatus("pending");
          }
        }
      } catch {
        // No existing connection — default to "none"
      } finally {
        setChecking(false);
      }
    }
    void checkStatus();
  }, [userId]);

  async function handleConnect() {
    setLoading(true);
    try {
      const res = await fetch("/api/portal/connect-pro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proId: userId }),
      });

      if (res.ok) {
        setStatus("pending");
        toast.success("Connection request sent!");
      } else {
        const data = await res.json();
        if (data.error?.includes("already") || data.error?.includes("exists")) {
          setStatus("pending");
        } else {
          toast.error(data.error || "Failed to connect");
        }
      }
    } catch (error) {
      logger.error("Connect error:", error);
      toast.error("Failed to send connection request");
    } finally {
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <StandardButton disabled variant="outline">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Checking...
      </StandardButton>
    );
  }

  if (status === "accepted") {
    return (
      <StandardButton disabled variant="outline">
        <UserCheck className="mr-2 h-4 w-4 text-green-600" />
        Connected
      </StandardButton>
    );
  }

  if (status === "pending") {
    return (
      <StandardButton disabled variant="outline">
        <UserPlus className="mr-2 h-4 w-4" />
        Request Sent
      </StandardButton>
    );
  }

  return (
    <StandardButton onClick={handleConnect} disabled={loading}>
      {loading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <UserPlus className="mr-2 h-4 w-4" />
      )}
      Connect
    </StandardButton>
  );
}
