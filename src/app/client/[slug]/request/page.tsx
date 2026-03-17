"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { logger } from "@/lib/logger";

interface ClientRequestPageProps {
  params: { slug: string };
}

export default function ClientRequestPage({ params }: ClientRequestPageProps) {
  const { slug } = params;
  const router = useRouter();
  const [formData, setFormData] = useState({
    subject: "",
    description: "",
    priority: "normal" as "low" | "normal" | "high",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/client-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: formData.subject,
          description: formData.description,
          priority: formData.priority,
          clientId: slug,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setSubmitted(true);
        // Reset form after 3 seconds
        setTimeout(() => {
          setFormData({ subject: "", description: "", priority: "normal" });
          setSubmitted(false);
        }, 3000);
      } else {
        alert("Failed to submit request. Please try again.");
      }
    } catch (error) {
      logger.error("Failed to submit request:", error);
      alert("An error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="space-y-6">
        <div className="space-y-4 rounded-lg border bg-card p-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20">
            <svg
              className="h-8 w-8 text-green-600 dark:text-green-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground">Request Submitted!</h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Your contractor will respond to your request soon.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-foreground">New Request</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Submit a request, question, or update to your contractor.
        </p>
        <p className="text-xs text-slate-600 dark:text-slate-400">Network ID: {slug}</p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-5 rounded-lg border bg-card p-6">
        <div className="space-y-2">
          <label htmlFor="subject" className="block text-sm font-medium text-foreground">
            Subject *
          </label>
          <input
            id="subject"
            type="text"
            required
            value={formData.subject}
            onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
            placeholder="Brief summary of your request"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary dark:placeholder:text-slate-400"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="description" className="block text-sm font-medium text-foreground">
            Description *
          </label>
          <textarea
            id="description"
            required
            rows={5}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Provide details about your request, question, or concern..."
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary dark:placeholder:text-slate-400"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="priority" className="block text-sm font-medium text-foreground">
            Priority
          </label>
          <select
            id="priority"
            value={formData.priority}
            onChange={(e) =>
              setFormData({ ...formData, priority: e.target.value as "low" | "normal" | "high" })
            }
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="low">Low - General question or non-urgent</option>
            <option value="normal">Normal - Standard request</option>
            <option value="high">High - Time-sensitive or urgent</option>
          </select>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? "Submitting..." : "Submit Request"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
