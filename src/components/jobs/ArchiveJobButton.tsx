"use client";

import { Archive, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

interface ArchiveJobButtonProps {
  jobId: string;
  jobTitle: string;
  type?: "lead" | "claim" | "project";
}

export function ArchiveJobButton({ jobId, jobTitle, type = "lead" }: ArchiveJobButtonProps) {
  const router = useRouter();
  const [archiving, setArchiving] = useState(false);
  const [open, setOpen] = useState(false);

  const handleArchive = async () => {
    setArchiving(true);
    try {
      const res = await fetch("/api/archive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: jobId, itemType: type }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to archive");
      }

      toast.success(`${jobTitle} archived successfully`);
      setOpen(false);
      router.push("/archive");
    } catch (err: any) {
      toast.error(err.message || "Failed to archive job");
    } finally {
      setArchiving(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="outline" className="gap-2 text-muted-foreground hover:text-destructive">
          <Archive className="h-4 w-4" />
          Archive
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Archive this job?</AlertDialogTitle>
          <AlertDialogDescription>
            <strong>{jobTitle}</strong> will be moved to the archive. You can restore it anytime
            from the Archive page. Items are never permanently deleted.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={archiving}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleArchive}
            disabled={archiving}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {archiving ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Archiving...
              </>
            ) : (
              <>
                <Archive className="mr-2 h-4 w-4" />
                Archive
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
