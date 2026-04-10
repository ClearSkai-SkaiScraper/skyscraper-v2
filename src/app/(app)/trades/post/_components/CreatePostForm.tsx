"use client";

import { Briefcase } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { StandardButton } from "@/components/ui/StandardButton";

interface CreatePostFormProps {
  userId: string;
  profileId: string | null;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function CreatePostForm({ userId, profileId }: CreatePostFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const tags =
      formData
        .get("tags")
        ?.toString()
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean) || [];

    const data = {
      type: formData.get("type"),
      title: formData.get("title"),
      content: formData.get("content"),
      city: formData.get("city") || null,
      state: formData.get("state") || null,
      payRate: formData.get("payRate") || null,
      startDate: formData.get("startDate") || null,
      tags,
      images: [],
    };

    try {
      const res = await fetch("/api/trades/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create post");
      }

      // Success - redirect to feed
      router.push("/trades?posted=true");
      router.refresh();
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 rounded-2xl border border-[color:var(--border)] bg-[var(--surface-glass)] p-8 backdrop-blur-xl"
    >
      {/* Post Type */}
      <div>
        <label
          htmlFor="post-type"
          className="mb-2 block text-sm font-medium text-[color:var(--text)]"
        >
          Post Type
        </label>
        <select
          id="post-type"
          name="type"
          required
          disabled={loading}
          className="w-full rounded-lg border border-[color:var(--border)] bg-[var(--surface-1)] px-4 py-3 text-[color:var(--text)] focus:border-purple-500 focus:outline-none disabled:opacity-50"
        >
          <option value="job_post">Job Posting</option>
          <option value="opportunity">Opportunity</option>
          <option value="looking_for_work">Looking for Work</option>
          <option value="update">Update</option>
        </select>
      </div>

      {/* Title */}
      <div>
        <label className="mb-2 block text-sm font-medium text-[color:var(--text)]">Title</label>
        <input
          type="text"
          name="title"
          required
          disabled={loading}
          maxLength={200}
          placeholder="e.g. Commercial Roof Replacement - 50,000 sq ft"
          className="w-full rounded-lg border border-[color:var(--border)] bg-[var(--surface-1)] px-4 py-3 text-[color:var(--text)] placeholder:text-slate-400 focus:border-purple-500 focus:outline-none disabled:opacity-50"
        />
      </div>

      {/* Content */}
      <div>
        <label className="mb-2 block text-sm font-medium text-[color:var(--text)]">
          Description
        </label>
        <textarea
          name="content"
          required
          disabled={loading}
          rows={6}
          maxLength={2000}
          placeholder="Describe the opportunity, requirements, pay rate, timeline..."
          className="w-full rounded-lg border border-[color:var(--border)] bg-[var(--surface-1)] px-4 py-3 text-[color:var(--text)] placeholder:text-slate-400 focus:border-purple-500 focus:outline-none disabled:opacity-50"
        />
      </div>

      {/* Location */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-2 block text-sm font-medium text-[color:var(--text)]">City</label>
          <input
            type="text"
            name="city"
            disabled={loading}
            placeholder="Dallas"
            className="w-full rounded-lg border border-[color:var(--border)] bg-[var(--surface-1)] px-4 py-3 text-[color:var(--text)] placeholder:text-slate-400 focus:border-purple-500 focus:outline-none disabled:opacity-50"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-[color:var(--text)]">State</label>
          <input
            type="text"
            name="state"
            disabled={loading}
            placeholder="TX"
            maxLength={2}
            className="w-full rounded-lg border border-[color:var(--border)] bg-[var(--surface-1)] px-4 py-3 text-[color:var(--text)] placeholder:text-slate-400 focus:border-purple-500 focus:outline-none disabled:opacity-50"
          />
        </div>
      </div>

      {/* Pay Rate (optional) */}
      <div>
        <label className="mb-2 block text-sm font-medium text-[color:var(--text)]">
          Pay Rate (Optional)
        </label>
        <input
          type="text"
          name="payRate"
          disabled={loading}
          placeholder="e.g. $30-40/hr or $5,000 for project"
          className="w-full rounded-lg border border-[color:var(--border)] bg-[var(--surface-1)] px-4 py-3 text-[color:var(--text)] placeholder:text-slate-400 focus:border-purple-500 focus:outline-none disabled:opacity-50"
        />
      </div>

      {/* Start Date (optional) */}
      <div>
        <label
          htmlFor="start-date"
          className="mb-2 block text-sm font-medium text-[color:var(--text)]"
        >
          Start Date (Optional)
        </label>
        <input
          id="start-date"
          type="date"
          name="startDate"
          disabled={loading}
          aria-label="Start date for the job posting"
          className="w-full rounded-lg border border-[color:var(--border)] bg-[var(--surface-1)] px-4 py-3 text-[color:var(--text)] focus:border-purple-500 focus:outline-none disabled:opacity-50"
        />
      </div>

      {/* Tags */}
      <div>
        <label className="mb-2 block text-sm font-medium text-[color:var(--text)]">
          Tags (comma-separated)
        </label>
        <input
          type="text"
          name="tags"
          disabled={loading}
          placeholder="Roofing, Commercial, Storm Damage"
          className="w-full rounded-lg border border-[color:var(--border)] bg-[var(--surface-1)] px-4 py-3 text-[color:var(--text)] placeholder:text-slate-400 focus:border-purple-500 focus:outline-none disabled:opacity-50"
        />
        <p className="mt-1 text-xs text-slate-500">Separate multiple tags with commas</p>
      </div>

      {/* Error message */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
          <p className="font-medium">❌ Error</p>
          <p className="mt-1">{error}</p>
        </div>
      )}

      {/* No profile warning */}
      {!profileId && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
          <p className="font-medium">⚠️ No Trades Profile</p>
          <p className="mt-1">
            You need to create a trades profile first. Posts will be linked to your profile.
          </p>
        </div>
      )}

      {/* Submit */}
      <div className="flex gap-3">
        <StandardButton
          variant="purple"
          gradient
          size="lg"
          type="submit"
          disabled={loading || !profileId}
          className="flex-1"
        >
          <Briefcase className="mr-2 h-4 w-4" />
          {loading ? "Publishing..." : "Publish Post"}
        </StandardButton>
        <button
          type="button"
          onClick={() => router.push("/trades")}
          disabled={loading}
          className="flex-1 rounded-lg border border-[color:var(--border)] bg-[var(--surface-1)] px-6 py-3 font-medium text-[color:var(--text)] transition hover:bg-[var(--surface-2)] disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
