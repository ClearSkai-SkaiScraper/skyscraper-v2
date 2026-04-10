"use client";
import { useAtom } from "jotai";

import {
  exportBusyAtom,
  lastExportErrorAtom,
  selectedAddonsAtom,
  selectedTemplateAtom,
} from "../state/builderState";

export default function ExportButtons() {
  const [tpl] = useAtom(selectedTemplateAtom);
  const [addons] = useAtom(selectedAddonsAtom);
  const [busy, setBusy] = useAtom(exportBusyAtom);
  const [, setErr] = useAtom(lastExportErrorAtom);

  const doExport = async () => {
    try {
      setBusy(true);
      setErr(null);
      const res = await fetch("/api/pdf/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportType: tpl, addons }),
      });
      if (!res.ok) throw new Error(`Export failed: ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `skai-${tpl}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      setErr(e.message || "Export failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      <button
        onClick={doExport}
        disabled={busy}
        className="w-full rounded-xl bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {busy ? "Generating…" : "Download Landscape PDF"}
      </button>
    </div>
  );
}
