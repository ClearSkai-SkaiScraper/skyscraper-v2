"use client";

import { useAuth } from "@clerk/nextjs";
import { CheckCircle2, Loader2, MessageSquarePlus, Send, X } from "lucide-react";
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

type FeedbackType = "bug" | "feature" | "ux" | "performance" | "other";

const FEEDBACK_TYPES: { value: FeedbackType; label: string; emoji: string }[] = [
  { value: "bug", label: "Bug Report", emoji: "🐛" },
  { value: "feature", label: "Feature Request", emoji: "💡" },
  { value: "ux", label: "UX Issue", emoji: "🎨" },
  { value: "performance", label: "Performance", emoji: "⚡" },
  { value: "other", label: "Other", emoji: "💬" },
];

const RATING_LABELS = ["Terrible", "Poor", "Okay", "Good", "Great"];

export function FeedbackWidget() {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { userId, orgId } = useAuth();
  const pathname = usePathname();

  const [isOpen, setIsOpen] = useState(false);
  const [type, setType] = useState<FeedbackType>("bug");
  const [message, setMessage] = useState("");
  const [rating, setRating] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const reset = useCallback(() => {
    setType("bug");
    setMessage("");
    setRating(null);
    setIsSubmitted(false);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!message.trim()) {
      toast.error("Please describe your feedback");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          message: message.trim(),
          rating,
          page: pathname,
          userAgent: navigator.userAgent,
          screenWidth: window.innerWidth,
          screenHeight: window.innerHeight,
        }),
      });

      if (!res.ok) throw new Error("Failed to submit feedback");

      setIsSubmitted(true);
      toast.success("Feedback submitted! Thank you 🙏");

      setTimeout(() => {
        setIsOpen(false);
        reset();
      }, 2000);
    } catch {
      toast.error("Failed to submit feedback. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }, [type, message, rating, pathname, reset]);

  if (!userId) return null;

  return (
    <>
      {/* Floating trigger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "fixed bottom-6 right-6 z-50 flex h-12 w-12 items-center justify-center",
          "rounded-full bg-indigo-600 text-white shadow-lg transition-all",
          "hover:scale-105 hover:bg-indigo-700 active:scale-95",
          "focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2",
          isOpen && "rotate-45"
        )}
        aria-label={isOpen ? "Close feedback" : "Send feedback"}
      >
        {isOpen ? <X className="h-5 w-5" /> : <MessageSquarePlus className="h-5 w-5" />}
      </button>

      {/* Feedback panel */}
      {isOpen && (
        <div
          className={cn(
            "fixed bottom-20 right-6 z-50 w-80 rounded-xl border bg-white p-4 shadow-2xl",
            "duration-200 animate-in fade-in slide-in-from-bottom-4",
            "dark:border-zinc-800 dark:bg-zinc-900"
          )}
        >
          {isSubmitted ? (
            <div className="flex flex-col items-center gap-3 py-8">
              <CheckCircle2 className="h-12 w-12 text-green-500" />
              <p className="text-lg font-semibold">Thank you!</p>
              <p className="text-center text-sm text-muted-foreground">
                Your feedback helps us improve SkaiScraper for everyone.
              </p>
            </div>
          ) : (
            <>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold">Send Feedback</h3>
                <span className="text-xs text-muted-foreground">{pathname}</span>
              </div>

              {/* Type selector */}
              <Select value={type} onValueChange={(v) => setType(v as FeedbackType)}>
                <SelectTrigger className="mb-3 h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FEEDBACK_TYPES.map((ft) => (
                    <SelectItem key={ft.value} value={ft.value}>
                      {ft.emoji} {ft.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Message */}
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Tell us what's on your mind..."
                className="mb-3 min-h-[100px] resize-none text-sm"
                maxLength={2000}
                autoFocus
              />

              {/* Rating */}
              <div className="mb-3">
                <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                  How&apos;s your experience? {rating !== null && `— ${RATING_LABELS[rating]}`}
                </p>
                <div className="flex gap-1">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <button
                      key={i}
                      onClick={() => setRating(i === rating ? null : i)}
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-md text-lg transition-all",
                        "hover:bg-indigo-50 dark:hover:bg-indigo-950",
                        rating !== null && i <= rating
                          ? "bg-indigo-100 dark:bg-indigo-900"
                          : "bg-zinc-50 dark:bg-zinc-800"
                      )}
                      aria-label={`Rate ${RATING_LABELS[i]}`}
                    >
                      {i <= 1 ? "😟" : i === 2 ? "😐" : i === 3 ? "🙂" : "🤩"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Character count + Submit */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{message.length}/2000</span>
                <Button
                  size="sm"
                  onClick={handleSubmit}
                  disabled={isSubmitting || !message.trim()}
                  className="gap-1.5"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Send className="h-3.5 w-3.5" />
                  )}
                  Submit
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
