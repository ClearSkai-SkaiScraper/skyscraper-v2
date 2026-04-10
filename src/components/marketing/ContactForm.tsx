"use client";
import { useState } from "react";

import { Button } from "@/components/ui/button";

export default function ContactForm() {
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const data = Object.fromEntries(new FormData(form).entries());
    setLoading(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed");
      setStatus("Message sent. We'll follow up soon.");
      form.reset();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_err) {
      setStatus("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }
  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-sm md:col-span-2"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
            Name
          </label>
          <input
            required
            name="name"
            placeholder="Your name"
            aria-label="Name"
            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
            Company
          </label>
          <input
            name="company"
            placeholder="Company"
            aria-label="Company"
            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
            Email
          </label>
          <input
            required
            type="email"
            name="email"
            placeholder="you@example.com"
            aria-label="Email"
            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
            Phone (optional)
          </label>
          <input
            name="phone"
            placeholder="(555) 123-4567"
            aria-label="Phone"
            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
          How can we help?
        </label>
        <textarea
          required
          name="message"
          rows={5}
          placeholder="Tell us what you need help with"
          aria-label="Message"
          className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
        />
      </div>
      <Button disabled={loading} className="w-full" variant="default" size="lg">
        {loading ? "Sending..." : "Send message"}
      </Button>
      {status && (
        <p className="text-xs text-slate-600" role="status">
          {status}
        </p>
      )}
    </form>
  );
}
