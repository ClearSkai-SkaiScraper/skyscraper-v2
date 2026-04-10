"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

export function DominusCommandBar({ claimId }: { claimId: string }) {
  const [loading, setLoading] = useState<string | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function run(path: string, label: string, body: any = {}) {
    try {
      setLoading(label);
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ claimId, ...body }),
      });

      if (!res.ok) throw new Error(await res.text());

      toast.success(`${label} completed successfully`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      console.error(err);
      toast.error(`${label} failed: ${err.message}`);
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="mb-6 rounded-xl border bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-lg font-semibold">Skai Automation Controls</h3>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        <Button
          disabled={loading !== null}
          onClick={() => run("/api/intel/automation/run", "Skai Automation")}
        >
          {loading === "Skai Automation" ? "Processing…" : "Run Skai Automation"}
        </Button>

        <Button
          variant="secondary"
          disabled={loading !== null}
          onClick={() => run("/api/intel/financial/run", "Financial Analysis")}
        >
          {loading === "Financial Analysis" ? "Running…" : "💰 Run Financial Analysis"}
        </Button>

        <Button
          disabled={loading !== null}
          onClick={() => run("/api/intel/claims-packet/run", "Claims Packet")}
        >
          {loading === "Claims Packet" ? "Building…" : "📄 Generate Claims Packet"}
        </Button>

        <Button
          disabled={loading !== null}
          onClick={() => run("/api/intel/supplements/run", "Supplement Packet")}
        >
          {loading === "Supplement Packet" ? "Building…" : "🧾 Generate Supplement Packet"}
        </Button>

        <Button
          disabled={loading !== null}
          onClick={() => run("/api/intel/forensic-weather/run", "Forensic Weather")}
        >
          {loading === "Forensic Weather" ? "Analyzing…" : "🌩️ Forensic Weather Report"}
        </Button>

        <Button
          disabled={loading !== null}
          variant="outline"
          onClick={() =>
            run("/api/intel/financial/send-email", "Send to Adjuster", {
              audience: "ADJUSTER",
            })
          }
        >
          {loading === "Send to Adjuster" ? "Sending…" : "📤 Send to Adjuster"}
        </Button>

        <Button
          disabled={loading !== null}
          variant="outline"
          onClick={() =>
            run("/api/intel/financial/send-email", "Send to Homeowner", {
              audience: "HOMEOWNER",
            })
          }
        >
          {loading === "Send to Homeowner" ? "Sending…" : "🏡 Send Homeowner Summary"}
        </Button>
      </div>
    </div>
  );
}
