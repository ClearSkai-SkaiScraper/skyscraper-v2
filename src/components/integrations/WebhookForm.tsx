"use client";

import { AlertCircle,Loader2, Plus, Webhook } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface WebhookFormProps {
  onSuccess?: () => void;
}

const EVENT_OPTIONS = [
  { value: "claim.created", label: "Claim Created" },
  { value: "claim.updated", label: "Claim Updated" },
  { value: "claim.deleted", label: "Claim Deleted" },
  { value: "property.created", label: "Property Created" },
  { value: "property.updated", label: "Property Updated" },
  { value: "team.member.added", label: "Team Member Added" },
  { value: "team.member.removed", label: "Team Member Removed" },
];

export default function WebhookForm({ onSuccess }: WebhookFormProps) {
  const [url, setUrl] = useState("");
  const [events, setEvents] = useState<string[]>([]);
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/webhooks/manage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, events, description }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create webhook");
      }

      const data = await response.json();
      setCreatedSecret(data.secret);
      setShowSecret(true);
      toast.success("Webhook created successfully!");
      
      // Reset form
      setUrl("");
      setEvents([]);
      setDescription("");
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create webhook");
    } finally {
      setLoading(false);
    }
  };

  const toggleEvent = (event: string) => {
    setEvents((prev) =>
      prev.includes(event)
        ? prev.filter((e) => e !== event)
        : [...prev, event]
    );
  };

  if (showSecret && createdSecret) {
    return (
      <div className="rounded-2xl border-2 border-yellow-400 bg-yellow-50 p-6 dark:border-yellow-600 dark:bg-yellow-900/20">
        <div className="mb-4 flex items-start gap-3">
          <AlertCircle className="mt-1 h-6 w-6 flex-shrink-0 text-yellow-600 dark:text-yellow-400" />
          <div className="flex-1">
            <h3 className="mb-2 text-lg font-bold text-gray-900 dark:text-white">
              ⚠️ Save Your Webhook Secret
            </h3>
            <p className="mb-4 text-sm text-gray-700 dark:text-gray-300">
              This secret is only shown once. You&apos;ll need it to verify webhook signatures.
            </p>
            <div className="break-all rounded-xl border border-gray-300 bg-white p-4 font-mono text-sm dark:border-gray-600 dark:bg-gray-800">
              {createdSecret}
            </div>
          </div>
        </div>
        <button
          onClick={() => {
            setShowSecret(false);
            setCreatedSecret(null);
          }}
          className="w-full rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700"
        >
          I&apos;ve Saved the Secret
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-2xl border border-[color:var(--border)] bg-[var(--surface-glass)] p-6 backdrop-blur-xl">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-lg bg-purple-100 p-2 dark:bg-purple-900/30">
            <Webhook className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          </div>
          <h3 className="text-xl font-bold text-[color:var(--text)]">Create Webhook</h3>
        </div>

        <div className="space-y-4">
          {/* URL Input */}
          <div>
            <label className="mb-2 block text-sm font-medium text-[color:var(--text)]">
              Endpoint URL *
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
              placeholder="https://api.yourapp.com/webhooks"
              className="w-full rounded-xl border border-[color:var(--border)] bg-[var(--surface-2)] px-4 py-3 text-[color:var(--text)] placeholder:text-[color:var(--muted)] focus:outline-none focus:ring-2 focus:ring-[color:var(--primary)]"
            />
          </div>

          {/* Event Selection */}
          <div>
            <label className="mb-2 block text-sm font-medium text-[color:var(--text)]">
              Events to Subscribe *
            </label>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              {EVENT_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className="flex cursor-pointer items-center gap-2 rounded-lg bg-[var(--surface-2)] p-3 transition hover:bg-[var(--surface-glass)]"
                >
                  <input
                    type="checkbox"
                    checked={events.includes(option.value)}
                    onChange={() => toggleEvent(option.value)}
                    className="h-4 w-4 rounded text-[color:var(--primary)] focus:ring-2 focus:ring-[color:var(--primary)]"
                  />
                  <span className="text-sm text-[color:var(--text)]">
                    {option.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="mb-2 block text-sm font-medium text-[color:var(--text)]">
              Description (Optional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Production webhook for claim sync"
              className="w-full rounded-xl border border-[color:var(--border)] bg-[var(--surface-2)] px-4 py-3 text-[color:var(--text)] placeholder:text-[color:var(--muted)] focus:outline-none focus:ring-2 focus:ring-[color:var(--primary)]"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || !url || events.length === 0}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] px-6 py-3 font-semibold text-white shadow-[var(--glow)] transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Creating Webhook...
              </>
            ) : (
              <>
                <Plus className="h-5 w-5" />
                Create Webhook
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  );
}
