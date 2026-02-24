"use client";

/**
 * Depreciation Center
 * Shows final payment workflow: status, readiness check, prepare packet, send to carrier
 */

import { AlertCircle, CheckCircle2, Clock, FileText, Info, Send } from "lucide-react";
import React, { useEffect, useState } from "react";

type DepStatus =
  | "not_ready"
  | "ready"
  | "filed"
  | "acknowledged"
  | "info_requested"
  | "released"
  | "failed";

interface DepReadiness {
  status: DepStatus;
  ready: boolean;
  missing: string[];
  carrier?: string;
  filedAt?: string;
  nudgeInDays?: number;
  errorMessage?: string;
}

interface DepCenterProps {
  jobId: string;
}

export function DepCenter({ jobId }: DepCenterProps) {
  const [readiness, setReadiness] = useState<DepReadiness | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [sending, setSending] = useState(false);
  const [selectedCarrier, setSelectedCarrier] = useState<string>("");

  useEffect(() => {
    void loadReadiness();
  }, [jobId]);

  async function loadReadiness() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/depreciation/ready?jobId=${jobId}`);
      if (!res.ok) {
        throw new Error("Failed to check readiness");
      }
      const data = await res.json();
      setReadiness(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handlePrepare() {
    if (!selectedCarrier) {
      setError("Please select a carrier first");
      return;
    }
    setPreparing(true);
    setError(null);
    try {
      const res = await fetch("/api/depreciation/prepare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, carrier: selectedCarrier }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Failed to prepare packet");
      }
      const data = await res.json();
      alert(
        `Packet prepared:\n\nSubject: ${data.subject}\n\nAttachments: ${data.attachments.join(", ")}`
      );
      await loadReadiness();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setPreparing(false);
    }
  }

  async function handleSend() {
    if (!confirm("Send depreciation packet to carrier now?")) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/depreciation/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Failed to send packet");
      }
      await loadReadiness();
      alert("Depreciation packet sent successfully!");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  const statusConfig: Record<DepStatus, { label: string; color: string; icon: React.ElementType }> =
    {
      not_ready: { label: "Not Ready", color: "bg-gray-100 text-gray-800", icon: AlertCircle },
      ready: { label: "Ready", color: "bg-green-100 text-green-800", icon: CheckCircle2 },
      filed: { label: "Filed", color: "bg-blue-100 text-blue-800", icon: FileText },
      acknowledged: {
        label: "Acknowledged",
        color: "bg-indigo-100 text-indigo-800",
        icon: CheckCircle2,
      },
      info_requested: {
        label: "Info Requested",
        color: "bg-yellow-100 text-yellow-800",
        icon: Info,
      },
      released: { label: "Released", color: "bg-green-100 text-green-800", icon: CheckCircle2 },
      failed: { label: "Failed", color: "bg-red-100 text-red-800", icon: AlertCircle },
    };

  if (loading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
          <p className="text-sm text-gray-600">Checking depreciation status...</p>
        </div>
      </div>
    );
  }

  if (error && !readiness) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6">
        <div className="flex items-center gap-2 text-red-800">
          <AlertCircle className="h-5 w-5" />
          <p className="font-semibold">Error</p>
        </div>
        <p className="mt-2 text-sm text-red-700">{error}</p>
        <button
          type="button"
          onClick={loadReadiness}
          className="mt-3 rounded-md bg-red-100 px-3 py-1 text-sm font-medium text-red-800 hover:bg-red-200"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!readiness) return null;

  const StatusIcon = statusConfig[readiness.status].icon;

  return (
    <div className="space-y-4">
      {/* Status Card */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="h-6 w-6 text-gray-600" />
            <div>
              <h2 className="font-semibold text-gray-900">Final Payment Request</h2>
              <p className="text-sm text-gray-500">Depreciation workflow</p>
            </div>
          </div>
          <div
            className={`flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium ${statusConfig[readiness.status].color}`}
          >
            <StatusIcon className="h-4 w-4" />
            {statusConfig[readiness.status].label}
          </div>
        </div>

        {readiness.nudgeInDays !== undefined && readiness.nudgeInDays > 0 && (
          <div className="mt-4 flex items-center gap-2 rounded-md bg-yellow-50 p-3 text-sm text-yellow-800">
            <Clock className="h-4 w-4" />
            <span>Follow up in {readiness.nudgeInDays} days</span>
          </div>
        )}

        {readiness.carrier && (
          <div className="mt-4 text-sm text-gray-600">
            <span className="font-medium">Carrier:</span> {readiness.carrier}
          </div>
        )}

        {readiness.filedAt && (
          <div className="mt-2 text-sm text-gray-600">
            <span className="font-medium">Filed:</span>{" "}
            {new Date(readiness.filedAt).toLocaleDateString()}
          </div>
        )}
      </div>

      {/* Readiness Check */}
      {!readiness.ready && readiness.missing.length > 0 && (
        <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
          <div className="flex items-center gap-2 text-orange-800">
            <AlertCircle className="h-5 w-5" />
            <p className="font-semibold">Missing Documents</p>
          </div>
          <ul className="mt-2 space-y-1 text-sm text-orange-700">
            {readiness.missing.map((item, i) => (
              <li key={i}>• {item}</li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-orange-600">
            Complete these documents before preparing the depreciation packet.
          </p>
        </div>
      )}

      {/* Actions */}
      {readiness.ready && readiness.status === "ready" && (
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 font-semibold text-gray-900">Prepare Packet</h3>

          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium text-gray-700">Select Carrier</label>
            <select
              value={selectedCarrier}
              onChange={(e) => setSelectedCarrier(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              aria-label="Select insurance carrier"
            >
              <option value="">-- Choose Carrier --</option>
              <option value="state-farm">State Farm</option>
              <option value="allstate">Allstate</option>
              <option value="farmers">Farmers</option>
              <option value="usaa">USAA</option>
              <option value="liberty-mutual">Liberty Mutual</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handlePrepare}
              disabled={!selectedCarrier || preparing}
              className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              <FileText className="h-4 w-4" />
              {preparing ? "Preparing..." : "Prepare Packet"}
            </button>
          </div>
        </div>
      )}

      {readiness.status === "filed" && (
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 font-semibold text-gray-900">Send to Carrier</h3>
          <p className="mb-4 text-sm text-gray-600">
            Packet prepared and ready to send. Review attachments before sending.
          </p>
          <button
            type="button"
            onClick={handleSend}
            disabled={sending}
            className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            {sending ? "Sending..." : "Send to Carrier"}
          </button>
        </div>
      )}

      {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}
    </div>
  );
}
