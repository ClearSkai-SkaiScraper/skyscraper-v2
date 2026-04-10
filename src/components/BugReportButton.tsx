"use client";

import { useAuth } from "@clerk/nextjs";
import { Bug, CheckCircle2, Loader2, Send, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type BugSeverity = "critical" | "high" | "medium" | "low";

/**
 * Bug Report Button + Modal
 *
 * Captures:
 * - Description
 * - Severity level
 * - Current page URL
 * - User agent
 * - Screen dimensions
 * - User/org IDs (automatic)
 * - Optional screenshot URL
 *
 * Posts to /api/support/tickets
 */
export function BugReportButton({ className }: { className?: string }) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { userId, orgId } = useAuth();
  const pathname = usePathname();

  const [isOpen, setIsOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState<BugSeverity>("medium");
  const [stepsToReproduce, setStepsToReproduce] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const reset = useCallback(() => {
    setDescription("");
    setSeverity("medium");
    setStepsToReproduce("");
    setIsSubmitted(false);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!description.trim()) {
      toast.error("Please describe the issue");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/support/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "bug",
          severity,
          description: description.trim(),
          stepsToReproduce: stepsToReproduce.trim() || null,
          context: {
            page: pathname,
            userAgent: navigator.userAgent,
            screenWidth: window.innerWidth,
            screenHeight: window.innerHeight,
            timestamp: new Date().toISOString(),
          },
        }),
      });

      if (!res.ok) throw new Error("Failed to submit");

      setIsSubmitted(true);
      toast.success("Bug report submitted! We'll look into it.");

      setTimeout(() => {
        setIsOpen(false);
        reset();
      }, 2000);
    } catch {
      toast.error("Failed to submit bug report. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }, [description, severity, stepsToReproduce, pathname, reset]);

  if (!userId) return null;

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className={cn("gap-1.5", className)}
      >
        <Bug className="h-3.5 w-3.5" />
        Report Bug
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-md rounded-xl border bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
            {isSubmitted ? (
              <div className="flex flex-col items-center gap-3 py-8">
                <CheckCircle2 className="h-12 w-12 text-green-500" />
                <p className="text-lg font-semibold">Report Submitted!</p>
                <p className="text-center text-sm text-muted-foreground">
                  Our team has been notified. We&apos;ll follow up if we need more details.
                </p>
              </div>
            ) : (
              <>
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-base font-semibold">Report a Bug</h3>
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      reset();
                    }}
                    className="text-muted-foreground hover:text-foreground"
                    aria-label="Close"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="space-y-3">
                  {/* Severity */}
                  <div>
                    <label className="mb-1 block text-xs font-medium">Severity</label>
                    <Select value={severity} onValueChange={(v) => setSeverity(v as BugSeverity)}>
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="critical">🔴 Critical — App unusable</SelectItem>
                        <SelectItem value="high">🟠 High — Feature broken</SelectItem>
                        <SelectItem value="medium">🟡 Medium — Works but wrong</SelectItem>
                        <SelectItem value="low">🟢 Low — Minor issue</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="mb-1 block text-xs font-medium">What happened?</label>
                    <Textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Describe the issue..."
                      className="min-h-[80px] resize-none text-sm"
                      maxLength={2000}
                      autoFocus
                    />
                  </div>

                  {/* Steps to reproduce */}
                  <div>
                    <label className="mb-1 block text-xs font-medium">
                      Steps to reproduce <span className="text-muted-foreground">(optional)</span>
                    </label>
                    <Textarea
                      value={stepsToReproduce}
                      onChange={(e) => setStepsToReproduce(e.target.value)}
                      placeholder="1. Go to...&#10;2. Click...&#10;3. See error"
                      className="min-h-[60px] resize-none text-sm"
                      maxLength={2000}
                    />
                  </div>

                  {/* Context info */}
                  <div className="rounded-md bg-zinc-50 p-2 text-xs text-muted-foreground dark:bg-zinc-800">
                    <p>📍 Page: {pathname}</p>
                    <p>
                      🖥️ Screen:{" "}
                      {typeof window !== "undefined"
                        ? `${window.innerWidth}×${window.innerHeight}`
                        : "—"}
                    </p>
                  </div>

                  {/* Submit */}
                  <div className="flex justify-end gap-2 pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setIsOpen(false);
                        reset();
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSubmit}
                      disabled={isSubmitting || !description.trim()}
                      className="gap-1.5"
                    >
                      {isSubmitting ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Send className="h-3.5 w-3.5" />
                      )}
                      Submit Report
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
