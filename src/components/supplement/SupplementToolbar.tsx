"use client";
import { useState } from "react";

export default function SupplementToolbar({
  filterTrade,
  setFilterTradeAction,
  counts,
  onGenerateAction,
  onSaveAction,
  saving,
}: {
  filterTrade: string;
  setFilterTradeAction: (v: string) => void;
  counts: { rows: number; aiTotal: string; adjTotal: string; delta: string; selectedTotal: string };
  onGenerateAction: () => void;
  onSaveAction?: () => void;
  saving?: boolean;
}) {
  const [busy, setBusy] = useState(false);

  async function generate() {
    setBusy(true);
    try {
      await onGenerateAction();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[color:var(--border)] bg-[var(--surface-1)] p-4">
      <div className="flex items-center gap-3">
        <select
          value={filterTrade}
          onChange={(e) => setFilterTradeAction(e.target.value)}
          className="rounded-xl border border-[color:var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm"
          aria-label="Filter by trade type"
        >
          {["All", "Roofing", "Gutters", "Interior", "Other"].map((opt) => (
            <option key={opt}>{opt}</option>
          ))}
        </select>
        <div className="text-xs text-[color:var(--muted)]">{counts.rows} lines</div>
      </div>

      <div className="flex items-center gap-5 text-sm">
        <Metric label="AI" value={counts.aiTotal} />
        <Metric label="Adjuster" value={counts.adjTotal} />
        <Metric label="Δ" value={counts.delta} />
        <Metric label="Selected" value={counts.selectedTotal} strong />
      </div>

      <div className="flex items-center gap-2">
        {onSaveAction && (
          <button
            onClick={onSaveAction}
            disabled={saving}
            className={`rounded-xl border border-[color:var(--border)] px-4 py-2 transition ${saving ? "cursor-wait opacity-70" : "hover:bg-[var(--surface-2)]"} bg-[var(--surface-1)] text-[color:var(--text)]`}
          >
            {saving ? "Saving…" : "Save Draft"}
          </button>
        )}
        <button
          onClick={generate}
          disabled={busy}
          className={`rounded-xl px-4 py-2 shadow-[var(--glow)] transition ${busy ? "cursor-wait opacity-70" : "hover:scale-[1.01]"} bg-[var(--primary)] text-white`}
        >
          {busy ? "Generating…" : "Generate PDF"}
        </button>
      </div>
    </div>
  );
}

function Metric({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="text-right">
      <div className="text-xs text-[color:var(--muted)]">{label}</div>
      <div className={`leading-tight ${strong ? "font-semibold text-[color:var(--primary)]" : ""}`}>
        {value}
      </div>
    </div>
  );
}
