// src/app/(app)/claims/[claimId]/trades/page.tsx
"use client";

import { Hammer, Loader2, Mail, Phone, Trash2 } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { logger } from "@/lib/logger";
import { inputBase, selectBase } from "@/lib/ui/inputStyles";

import SectionCard from "../_components/SectionCard";

interface Trade {
  id: string;
  tradeName: string;
  tradeType: string;
  contactName: string;
  phone: string;
  email: string;
  status: string;
  estimatedCost: number | null;
  createdAt: string;
}

const TRADE_TYPES = [
  "Roofing",
  "Gutters",
  "Siding",
  "Drywall",
  "Painting",
  "Flooring",
  "HVAC",
  "Plumbing",
  "Electrical",
  "Structural",
  "Other",
];

export default function TradesPage() {
  const params = useParams();
  const claimIdParam = params?.claimId;
  const claimId = Array.isArray(claimIdParam) ? claimIdParam[0] : claimIdParam;
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    tradeName: "",
    tradeType: "Roofing",
    contactName: "",
    phone: "",
    email: "",
    estimatedCost: "",
  });

  useEffect(() => {
    void fetchTrades();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claimId]);

  if (!claimId) return null;

  const fetchTrades = async () => {
    try {
      const res = await fetch(`/api/claims/${claimId}/trades`);
      const data = await res.json();
      if (data.trades) {
        setTrades(data.trades);
      }
    } catch (error) {
      logger.error("Failed to fetch trades:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/claims/${claimId}/trades`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          estimatedCost: formData.estimatedCost ? parseFloat(formData.estimatedCost) || 0 : null,
        }),
      });

      if (!res.ok) {
        alert("❌ Failed to add trade. Please try again.");
        setSaving(false);
        return;
      }

      setFormData({
        tradeName: "",
        tradeType: "Roofing",
        contactName: "",
        phone: "",
        email: "",
        estimatedCost: "",
      });
      setShowForm(false);
      void fetchTrades();
    } catch (error) {
      logger.error("Failed to add trade:", error);
      alert("Failed to add trade");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (tradeId: string) => {
    if (!confirm("Are you sure you want to remove this trade?")) return;

    try {
      const res = await fetch(`/api/claims/${claimId}/trades`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tradeId }),
      });

      if (!res.ok) {
        alert("❌ Failed to delete trade. Please try again.");
        return;
      }
      void fetchTrades();
    } catch (error) {
      logger.error("Failed to delete trade:", error);
      alert("Failed to delete trade");
    }
  };

  if (loading) {
    return (
      <SectionCard title="Trades">
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      </SectionCard>
    );
  }

  return (
    <SectionCard
      title="Trades"
      action={
        !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            Add Trade
          </button>
        )
      }
    >
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="mb-6 space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800"
        >
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Trade Company
              </label>
              <input
                type="text"
                required
                value={formData.tradeName}
                onChange={(e) => setFormData({ ...formData, tradeName: e.target.value })}
                className={inputBase + " px-3 py-2"}
                placeholder="ABC Roofing Co."
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Trade Type
              </label>
              <select
                value={formData.tradeType}
                onChange={(e) => setFormData({ ...formData, tradeType: e.target.value })}
                className={selectBase + " px-3 py-2"}
                aria-label="Select trade type"
              >
                {TRADE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Contact Name
              </label>
              <input
                type="text"
                required
                value={formData.contactName}
                onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                className={inputBase + " px-3 py-2"}
                placeholder="John Smith"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Phone
              </label>
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className={inputBase + " px-3 py-2"}
                placeholder="(555) 123-4567"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Email
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className={inputBase + " px-3 py-2"}
                placeholder="contact@company.com"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Estimated Cost
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.estimatedCost}
                onChange={(e) => setFormData({ ...formData, estimatedCost: e.target.value })}
                className={inputBase + " px-3 py-2"}
                placeholder="5000.00"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-50"
            >
              {saving ? "Adding..." : "Add Trade"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {trades.length === 0 ? (
        <div className="py-16 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
            <Hammer className="h-8 w-8 text-slate-400 dark:text-slate-500" />
          </div>
          <p className="mb-4 text-slate-700 dark:text-slate-300">No trades assigned yet</p>
          <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
            Add roofing, gutters, drywall, and other trades
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {trades.map((trade) => (
            <div
              key={trade.id}
              className="flex items-start justify-between rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800"
            >
              <div className="flex-1">
                <div className="mb-2 flex items-center gap-2">
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                    {trade.tradeName}
                  </h3>
                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                    {trade.tradeType}
                  </span>
                </div>
                <div className="space-y-1 text-sm text-slate-700 dark:text-slate-300">
                  <p>{trade.contactName}</p>
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {trade.phone}
                    </span>
                    <span className="flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {trade.email}
                    </span>
                  </div>
                  {trade.estimatedCost && (
                    <p className="text-green-400">Est: ${trade.estimatedCost.toLocaleString()}</p>
                  )}
                </div>
              </div>
              <button
                onClick={() => handleDelete(trade.id)}
                className="rounded-lg bg-red-600 p-2 text-white transition-colors hover:bg-red-700"
                aria-label="Delete trade"
                title="Delete trade"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}
