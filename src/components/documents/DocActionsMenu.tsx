"use client";

import {
  Archive,
  Download,
  Mail,
  MessageSquare,
  MoreVertical,
  Printer,
  Trash2,
} from "lucide-react";
import { useCallback, useState } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { logger } from "@/lib/logger";

/* ─────────────────────────────── types ─────────────────────────────── */
export interface DocActionItem {
  /** Display title of the document */
  title: string;
  /** URL for viewing / downloading the doc (can be Supabase signed URL) */
  url?: string | null;
  /** Document ID (for API calls) */
  id: string;
  /** Optional email address to pre-fill email to */
  recipientEmail?: string | null;
  /** Optional file MIME type for email attachment */
  mimeType?: string | null;
}

export interface DocActionsMenuProps {
  doc: DocActionItem;
  /** Show download action (default: true) */
  showDownload?: boolean;
  /** Show print action (default: true) */
  showPrint?: boolean;
  /** Show email action (default: true) */
  showEmail?: boolean;
  /** Show attach to message action (default: false — only show where messaging exists) */
  showAttach?: boolean;
  /** Show archive action (default: true) */
  showArchive?: boolean;
  /** Show delete action (default: true) */
  showDelete?: boolean;
  /** Callback when archive is confirmed */
  onArchive?: (docId: string) => void | Promise<void>;
  /** Callback when delete is confirmed */
  onDelete?: (docId: string) => void | Promise<void>;
  /** Callback for "Attach to Message" */
  onAttach?: (docId: string) => void | Promise<void>;
  /** Compact mode — smaller trigger button */
  compact?: boolean;
}

/* ───────────────────── helpers ───────────────────── */

/** Open the browser's native print dialog for a document URL */
function printDocument(url: string, title: string) {
  const printWindow = window.open("", "_blank", "width=800,height=600");
  if (!printWindow) {
    // Popup blocked — fall back to printing current page
    window.print();
    return;
  }

  // Determine if the URL is a PDF or image
  const isPdf = url.toLowerCase().endsWith(".pdf") || url.includes("application/pdf");

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Print — ${title}</title>
        <style>
          @media print {
            body { margin: 0; padding: 0; }
            iframe, img { width: 100%; height: auto; border: none; }
            .print-header { display: none; }
          }
          body {
            font-family: system-ui, sans-serif;
            margin: 0; padding: 20px;
            background: #f8fafc;
          }
          .print-header {
            text-align: center;
            padding: 12px 0 16px;
            border-bottom: 1px solid #e2e8f0;
            margin-bottom: 16px;
          }
          .print-header h2 { margin: 0; font-size: 16px; color: #334155; }
          .print-header p { margin: 4px 0 0; font-size: 12px; color: #94a3b8; }
          iframe { width: 100%; height: calc(100vh - 100px); border: none; }
          img { max-width: 100%; height: auto; display: block; margin: 0 auto; }
        </style>
      </head>
      <body>
        <div class="print-header">
          <h2>${title}</h2>
          <p>Printed on ${new Date().toLocaleDateString()}</p>
        </div>
        ${
          isPdf
            ? `<iframe src="${url}" onload="setTimeout(function(){ window.print(); }, 500);"></iframe>`
            : `<img src="${url}" onload="setTimeout(function(){ window.print(); }, 300);" />`
        }
      </body>
    </html>
  `);
  printWindow.document.close();
}

/** Open native email client with document link */
function emailDocument(doc: DocActionItem) {
  const subject = encodeURIComponent(`Document: ${doc.title}`);
  const body = encodeURIComponent(
    `Hi,\n\nPlease find the document "${doc.title}" linked below:\n\n${doc.url || "(Document link unavailable)"}\n\nBest regards`
  );
  const to = doc.recipientEmail ? encodeURIComponent(doc.recipientEmail) : "";
  window.location.href = `mailto:${to}?subject=${subject}&body=${body}`;
}

/* ───────────────────── component ───────────────────── */

export function DocActionsMenu({
  doc,
  showDownload = true,
  showPrint = true,
  showEmail = true,
  showAttach = false,
  showArchive = true,
  showDelete = true,
  onArchive,
  onDelete,
  onAttach,
  compact = false,
}: DocActionsMenuProps) {
  const [confirmAction, setConfirmAction] = useState<"archive" | "delete" | null>(null);
  const [loading, setLoading] = useState(false);

  const handleConfirm = useCallback(async () => {
    if (!confirmAction) return;
    setLoading(true);
    try {
      if (confirmAction === "archive" && onArchive) {
        await onArchive(doc.id);
      } else if (confirmAction === "delete" && onDelete) {
        await onDelete(doc.id);
      }
    } catch (error) {
      logger.error(`[DocActionsMenu] ${confirmAction} failed:`, error);
    } finally {
      setLoading(false);
      setConfirmAction(null);
    }
  }, [confirmAction, doc.id, onArchive, onDelete]);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size={compact ? "sm" : "icon"}
            className={compact ? "h-7 w-7 p-0" : "h-8 w-8"}
          >
            <MoreVertical className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
            <span className="sr-only">Actions</span>
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-48">
          {/* ── View / Download ── */}
          {showDownload && doc.url && (
            <DropdownMenuItem onClick={() => window.open(doc.url!, "_blank")} className="gap-2">
              <Download className="h-4 w-4" />
              Download
            </DropdownMenuItem>
          )}

          {/* ── Print ── */}
          {showPrint && doc.url && (
            <DropdownMenuItem onClick={() => printDocument(doc.url!, doc.title)} className="gap-2">
              <Printer className="h-4 w-4" />
              Print
            </DropdownMenuItem>
          )}

          {/* ── Email ── */}
          {showEmail && (
            <DropdownMenuItem onClick={() => emailDocument(doc)} className="gap-2">
              <Mail className="h-4 w-4" />
              Email
            </DropdownMenuItem>
          )}

          {/* ── Attach to Message ── */}
          {showAttach && onAttach && (
            <DropdownMenuItem onClick={() => onAttach(doc.id)} className="gap-2">
              <MessageSquare className="h-4 w-4" />
              Attach to Message
            </DropdownMenuItem>
          )}

          {(showArchive || showDelete) && <DropdownMenuSeparator />}

          {/* ── Archive ── */}
          {showArchive && onArchive && (
            <DropdownMenuItem
              onClick={() => setConfirmAction("archive")}
              className="gap-2 text-amber-600 dark:text-amber-400"
            >
              <Archive className="h-4 w-4" />
              Archive
            </DropdownMenuItem>
          )}

          {/* ── Delete ── */}
          {showDelete && onDelete && (
            <DropdownMenuItem
              onClick={() => setConfirmAction("delete")}
              className="gap-2 text-red-600 dark:text-red-400"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* ── Confirm Dialog ── */}
      <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction === "delete" ? "Delete Document" : "Archive Document"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction === "delete"
                ? `Are you sure you want to permanently delete "${doc.title}"? This action cannot be undone.`
                : `Are you sure you want to archive "${doc.title}"? You can restore it later.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              disabled={loading}
              className={
                confirmAction === "delete"
                  ? "bg-red-600 text-white hover:bg-red-700"
                  : "bg-amber-600 text-white hover:bg-amber-700"
              }
            >
              {loading ? "Processing…" : confirmAction === "delete" ? "Delete" : "Archive"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default DocActionsMenu;
