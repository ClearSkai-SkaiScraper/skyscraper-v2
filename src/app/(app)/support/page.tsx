"use client";

import { useUser } from "@clerk/nextjs";
import { Bug, Lightbulb, Mail, MessageCircle, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { logger } from "@/lib/logger";

type TicketType = "bug" | "feature" | "support" | "other";

export default function SupportPage() {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { user } = useUser();
  const [type, setType] = useState<TicketType>("bug");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!title.trim() || !description.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    setIsSubmitting(true);

    try {
      // Auto-capture context
      const context = {
        // eslint-disable-next-line no-restricted-syntax
        buildSHA: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA?.substring(0, 8) || "local",
        currentPage: window.location.pathname,
        userAgent: navigator.userAgent,
      };

      const res = await fetch("/api/support/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          title,
          description,
          ...context,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to submit ticket");
        return;
      }

      toast.success("Ticket submitted successfully! We'll get back to you soon.");
      setTitle("");
      setDescription("");
      setType("bug");
    } catch (error) {
      toast.error("Failed to submit ticket. Please try emailing support@skaiscrape.com");
      logger.error("[SUPPORT_SUBMIT]", error);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="container max-w-4xl py-12">
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold">Support & Feedback</h1>
        <p className="text-lg text-muted-foreground">
          We&apos;re here to help! Report bugs, request features, or get in touch with our team.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Contact Cards */}
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-900">
              <Mail className="h-5 w-5" />
              Email Support
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-3 text-sm text-blue-800">
              For urgent issues or detailed questions, email us directly:
            </p>
            <Button asChild variant="outline" size="sm" className="w-full">
              <a href="mailto:support@skaiscrape.com">support@skaiscrape.com</a>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-purple-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-purple-900">
              <MessageCircle className="h-5 w-5" />
              Response Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-purple-800">
              <strong>Beta Testing:</strong> We typically respond within <strong>24 hours</strong>{" "}
              during weekdays. Critical issues are prioritized.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Ticket Form */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Submit a Ticket</CardTitle>
          <CardDescription>
            Tell us what you need help with. We automatically capture technical details to help
            debug issues faster.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-3">
              <Label>What type of request is this?</Label>
              <RadioGroup value={type} onValueChange={(val) => setType(val as TicketType)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="bug" id="bug" />
                  <Label
                    htmlFor="bug"
                    className="flex cursor-pointer items-center gap-2 font-normal"
                  >
                    <Bug className="h-4 w-4 text-red-500" />
                    <span>Bug Report - Something isn&apos;t working correctly</span>
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="feature" id="feature" />
                  <Label
                    htmlFor="feature"
                    className="flex cursor-pointer items-center gap-2 font-normal"
                  >
                    <Lightbulb className="h-4 w-4 text-yellow-500" />
                    <span>Feature Request - I have an idea for improvement</span>
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="support" id="support" />
                  <Label
                    htmlFor="support"
                    className="flex cursor-pointer items-center gap-2 font-normal"
                  >
                    <MessageCircle className="h-4 w-4 text-blue-500" />
                    <span>General Support - I need help with something</span>
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="other" id="other" />
                  <Label
                    htmlFor="other"
                    className="flex cursor-pointer items-center gap-2 font-normal"
                  >
                    <Mail className="h-4 w-4 text-gray-500" />
                    <span>Other</span>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Title / Summary</Label>
              <Input
                id="title"
                placeholder="Brief description of the issue or request"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Detailed Description</Label>
              <Textarea
                id="description"
                placeholder={
                  type === "bug"
                    ? "What were you trying to do? What happened? What did you expect to happen?"
                    : type === "feature"
                      ? "Describe the feature you'd like to see. How would it help you?"
                      : "Tell us how we can help you..."
                }
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                rows={6}
              />
            </div>

            <div className="rounded-lg border bg-muted/50 p-3 text-xs text-muted-foreground">
              <p className="font-semibold">Auto-captured context:</p>
              <ul className="mt-1 space-y-0.5">
                <li>• Your organization ID and user ID</li>
                <li>
                  • Current page: {typeof window !== "undefined" ? window.location.pathname : "—"}
                </li>
                <li>
                  // eslint-disable-next-line react/jsx-no-comment-textnodes
                  • Build version:{" "}
                  // eslint-disable-next-line no-restricted-syntax
                  {process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA?.substring(0, 8) || "local"}
                </li>
                <li>
                  • Browser:{" "}
                  {typeof navigator !== "undefined"
                    ? navigator.userAgent.split(" ").slice(-2).join(" ")
                    : "—"}
                </li>
              </ul>
            </div>

            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Submit Ticket
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="mt-6 border-green-200 bg-green-50">
        <CardHeader>
          <CardTitle className="text-lg text-green-900">Thank You for Beta Testing!</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-green-800">
            Your feedback is invaluable in making SkaiScraper better. Every bug report and feature
            request helps us improve the platform for everyone. We truly appreciate your time and
            input! 🙏
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
