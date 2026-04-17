"use client";

import { Ban, MoreVertical, Trash2, UserX } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ClientRowActionsProps {
  contactId: string;
  name: string;
  /** "client" | "vendor" | "subcontractor" | "contractor" */
  type: string;
  /** For connections: the connection/member ID for disconnect */
  connectionId?: string;
  /** For connections: the profile ID for blocking */
  profileId?: string;
}

export function ClientRowActions({
  contactId,
  name,
  type,
  connectionId,
  profileId,
}: ClientRowActionsProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`))
      return;

    setIsLoading(true);
    try {
      const res = await fetch(`/api/contacts/${contactId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete contact");
      }
      toast.success(`"${name}" has been deleted.`);
      router.refresh();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      toast.error(error.message || "Failed to delete contact");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`Remove "${name}" from your connections?`)) return;

    setIsLoading(true);
    try {
      const res = await fetch("/api/trades/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "disconnect", connectionId: connectionId || contactId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to remove connection");
      }
      toast.success(`"${name}" has been removed from your connections.`);
      router.refresh();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      toast.error(error.message || "Failed to remove connection");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBlock = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`Block "${name}"? This will remove the connection and prevent future contact.`))
      return;

    setIsLoading(true);
    try {
      const id = profileId || connectionId || contactId;
      const res = await fetch("/api/connections/block", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blockedId: id, reason: "Blocked from Clients & Connections page" }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to block");
      }
      toast.success(`"${name}" has been blocked.`);
      router.refresh();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      toast.error(error.message || "Failed to block user");
    } finally {
      setIsLoading(false);
    }
  };

  const isClient = type === "client";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          disabled={isLoading}
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        {isClient ? (
          <>
            <DropdownMenuItem onClick={handleDelete} className="text-red-600 focus:text-red-700">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Contact
            </DropdownMenuItem>
          </>
        ) : (
          <>
            <DropdownMenuItem
              onClick={handleDisconnect}
              className="text-amber-600 focus:text-amber-700"
            >
              <UserX className="mr-2 h-4 w-4" />
              Remove Connection
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleBlock} className="text-red-600 focus:text-red-700">
              <Ban className="mr-2 h-4 w-4" />
              Block
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
