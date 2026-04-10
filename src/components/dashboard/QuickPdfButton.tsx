"use client";

import { useState } from "react";

export default function QuickPdfButton() {
  const [loading, setLoading] = useState(false);

  async function handleGenerate() {
    setLoading(true);
    try {
      const res = await fetch("/api/reports/quick", { method: "POST" });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed to generate report");

      // Open the report in a new tab
      window.open(data.url, "_blank");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="group rounded-xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-purple-50 p-6 shadow-sm transition-all hover:scale-[1.02] hover:shadow-lg">
      <h3 className="mb-2 flex items-center gap-2 text-lg font-semibold text-gray-900">
        <span className="text-2xl">⚡</span> Quick PDF Generator
      </h3>
      <p className="mb-4 text-sm text-gray-600">Generate an AI-powered sample report instantly</p>
      <button
        onClick={handleGenerate}
        disabled={loading}
        className="w-full rounded-lg bg-gradient-indigo px-4 py-2.5 font-medium text-white shadow-md transition-all hover:opacity-95 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg
              className="h-4 w-4 animate-spin"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            Generating...
          </span>
        ) : (
          "Generate Quick PDF"
        )}
      </button>
    </div>
  );
}
