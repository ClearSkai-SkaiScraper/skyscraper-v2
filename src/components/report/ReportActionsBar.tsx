"use client";

import { useState } from "react";

type Props = {
  reportId: string;
  defaultAdjusterEmail?: string | null;
  defaultHomeownerEmail?: string | null;
};

export function ReportActionsBar({
  reportId,
  defaultAdjusterEmail,
  defaultHomeownerEmail,
}: Props) {
  const [sending, setSending] = useState<null | "ADJUSTER" | "HOMEOWNER" | "CUSTOM">(null);
  const [error, setError] = useState<string | null>(null);
  const [customEmail, setCustomEmail] = useState("");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function sendEmail(recipientType: "ADJUSTER" | "HOMEOWNER" | "CUSTOM") {
    try {
      setError(null);
      setSuccessMessage(null);
      setSending(recipientType);

      let toEmail: string | undefined;

      if (recipientType === "ADJUSTER") {
        toEmail = defaultAdjusterEmail || undefined;
      } else if (recipientType === "HOMEOWNER") {
        toEmail = defaultHomeownerEmail || undefined;
      } else {
        toEmail = customEmail || undefined;
      }

      const res = await fetch(`/api/reports/${reportId}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientType, toEmail }),
      });

      const json = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(json?.error || "Failed to send email.");
      }

      setSuccessMessage("Email sent successfully.");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setError(err.message || "Failed to send email.");
    } finally {
      setSending(null);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => sendEmail("ADJUSTER")}
        disabled={sending !== null}
        className="rounded-full border px-3 py-1.5 text-[11px] hover:bg-gray-50 disabled:opacity-50"
      >
        {sending === "ADJUSTER" ? "Sending…" : "📬 Send to Adjuster"}
      </button>

      <button
        type="button"
        onClick={() => sendEmail("HOMEOWNER")}
        disabled={sending !== null}
        className="rounded-full border px-3 py-1.5 text-[11px] hover:bg-gray-50 disabled:opacity-50"
      >
        {sending === "HOMEOWNER" ? "Sending…" : "🏠 Send to Homeowner"}
      </button>

      <div className="flex items-center gap-1">
        <input
          type="email"
          value={customEmail}
          onChange={(e) => setCustomEmail(e.target.value)}
          placeholder="custom@email.com"
          className="w-40 rounded-md border px-2 py-1 text-[11px]"
        />
        <button
          type="button"
          onClick={() => sendEmail("CUSTOM")}
          disabled={sending !== null || !customEmail}
          className="rounded-full border px-3 py-1.5 text-[11px] hover:bg-gray-50 disabled:opacity-50"
        >
          {sending === "CUSTOM" ? "Sending…" : "✉️ Send Custom"}
        </button>
      </div>

      {error && (
        <span className="text-[11px] text-red-600">
          {error}
        </span>
      )}
      {successMessage && (
        <span className="text-[11px] text-emerald-600">
          {successMessage}
        </span>
      )}
    </div>
  );
}
