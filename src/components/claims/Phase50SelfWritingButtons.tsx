"use client";

import { useState } from "react";

import { logger } from "@/lib/logger";

interface Phase50ButtonsProps {
  claimId: string;
}

export function Phase50SelfWritingButtons({ claimId }: Phase50ButtonsProps) {
  const [loading, setLoading] = useState<string | null>(null);

  const handleGenerateNarrative = async () => {
    setLoading("narrative");
    try {
      const response = await fetch(`/api/claims/${claimId}/narrative`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tone: "adjuster" }),
      });
      const data = await response.json();

      if (data.success) {
        alert("✅ Narrative generated successfully!\n\nCheck the console for the full narrative.");
        logger.debug("Generated Narrative:", data.narrative);
      } else {
        alert(`❌ Failed: ${data.error || "Unknown error"}`);
      }
    } catch (error) {
      alert("❌ Error generating narrative");
      console.error(error);
    } finally {
      setLoading(null);
    }
  };

  const handleGenerateCode = async () => {
    setLoading("code");
    try {
      const response = await fetch(`/api/claims/${claimId}/code`);
      const data = await response.json();

      if (data.success) {
        const { codeSummary } = data;
        alert(
          `✅ Code Summary Generated!\n\n` +
            `Missing Items: ${codeSummary.missingItems.length}\n` +
            `Urgency: ${codeSummary.urgency}\n` +
            `Est. Cost: $${codeSummary.totalEstimatedCost.toLocaleString()}\n\n` +
            `Check the console for full details.`
        );
        logger.debug("Code Summary:", codeSummary);
      } else {
        alert(`❌ Failed: ${data.error || "Unknown error"}`);
      }
    } catch (error) {
      alert("❌ Error generating code summary");
      console.error(error);
    } finally {
      setLoading(null);
    }
  };

  const handleGenerateAppeal = async () => {
    const reason = prompt("Enter denial reason:");
    if (!reason) return;

    const details = prompt("Additional denial details (optional):");

    setLoading("appeal");
    try {
      const response = await fetch(`/api/claims/${claimId}/appeal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ denialReason: reason, denialDetails: details }),
      });
      const data = await response.json();

      if (data.success) {
        const { appeal } = data;
        alert(
          `✅ Appeal Package Generated!\n\n` +
            `Policy References: ${appeal.policyReferences.length}\n` +
            `Contradictions Found: ${appeal.carrierContradictions.length}\n` +
            `Photo Evidence: ${appeal.photoReferences.length}\n\n` +
            `Check the console for the full appeal letter.`
        );
        logger.debug("Appeal Package:", appeal);
      } else {
        alert(`❌ Failed: ${data.error || "Unknown error"}`);
      }
    } catch (error) {
      alert("❌ Error generating appeal");
      console.error(error);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="mt-4 border-t border-[color:var(--border)] pt-4">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[color:var(--muted)]">
        🔥 Phase 50: Self-Writing Claim Engine
      </h3>
      <div className="flex flex-wrap gap-2 text-xs">
        <button
          onClick={handleGenerateNarrative}
          disabled={loading === "narrative"}
          className="rounded-full bg-gradient-purple px-3 py-1.5 text-white shadow-md transition-all hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading === "narrative" ? "⏳ Generating..." : "✍️ Generate Narrative"}
        </button>
        <button
          onClick={handleGenerateCode}
          disabled={loading === "code"}
          className="rounded-full bg-gradient-cyan px-3 py-1.5 text-white shadow-md transition-all hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading === "code" ? "⏳ Generating..." : "📋 Generate Code Summary"}
        </button>
        <button
          onClick={handleGenerateAppeal}
          disabled={loading === "appeal"}
          className="rounded-full bg-gradient-error px-3 py-1.5 text-white shadow-md transition-all hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading === "appeal" ? "⏳ Generating..." : "⚖️ Generate Appeal"}
        </button>
        <a
          href={`/api/claims/${claimId}/carrier-summary?format=text`}
          download
          className="inline-block rounded-full bg-gradient-success px-3 py-1.5 text-white shadow-md transition-all hover:opacity-95"
        >
          📦 Generate Carrier Packet
        </a>
      </div>
      <p className="mt-2 text-[10px] italic text-[color:var(--muted)]">
        Self-writing claim engine powered by GPT-4o • Generates carrier-ready documentation
        automatically
      </p>
    </div>
  );
}
