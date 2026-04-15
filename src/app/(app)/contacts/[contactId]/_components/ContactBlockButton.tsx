"use client";

import { Ban, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";

interface ContactBlockButtonProps {
  contactId: string;
  isBlocked: boolean;
}

export function ContactBlockButton({ contactId, isBlocked }: ContactBlockButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [blocked, setBlocked] = useState(isBlocked);

  async function handleToggle() {
    setLoading(true);
    try {
      const res = await fetch(`/api/contacts/${contactId}/block`, {
        method: blocked ? "DELETE" : "POST",
      });
      if (res.ok) {
        setBlocked(!blocked);
        router.refresh();
      }
    } catch {
      // silently fail — user can retry
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      variant={blocked ? "outline" : "destructive"}
      size="sm"
      className="flex-1 gap-2 text-xs"
      onClick={handleToggle}
      disabled={loading}
    >
      {blocked ? (
        <>
          <ShieldCheck className="h-3.5 w-3.5" />
          {loading ? "Unblocking…" : "Unblock"}
        </>
      ) : (
        <>
          <Ban className="h-3.5 w-3.5" />
          {loading ? "Blocking…" : "Block Contact"}
        </>
      )}
    </Button>
  );
}
