"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

interface ContactDeleteButtonProps {
  contactId: string;
}

export function ContactDeleteButton({ contactId }: ContactDeleteButtonProps) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/contacts/${contactId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Contact removed");
      router.push("/contacts");
      router.refresh();
    } catch {
      toast.error("Failed to remove contact");
    } finally {
      setDeleting(false);
      setConfirming(false);
    }
  };

  if (confirming) {
    return (
      <div className="flex flex-1 gap-2">
        <Button
          variant="destructive"
          size="sm"
          className="flex-1 gap-2 text-xs"
          onClick={handleDelete}
          disabled={deleting}
        >
          <Trash2 className="h-3 w-3" />
          {deleting ? "Removing…" : "Confirm Remove"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="text-xs"
          onClick={() => setConfirming(false)}
          disabled={deleting}
        >
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <Button
      variant="destructive"
      size="sm"
      className="w-full flex-1 gap-2 text-xs"
      onClick={() => setConfirming(true)}
    >
      <Trash2 className="h-3 w-3" />
      Remove Contact
    </Button>
  );
}
