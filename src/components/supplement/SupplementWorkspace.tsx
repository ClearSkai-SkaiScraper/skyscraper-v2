"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { logger } from "@/lib/logger";
import { money, sumCents } from "@/lib/money";

import SupplementTable from "./SupplementTable";
import SupplementToolbar from "./SupplementToolbar";

type Row = {
  id: string;
  ai?: {
    trade: string;
    code: string;
    desc: string;
    qty: number;
    unit: string;
    unitPriceCents: number;
  };
  adj?: {
    trade: string;
    code: string;
    desc: string;
    qty: number;
    unit: string;
    unitPriceCents: number;
  };
  accepted: boolean;
};

interface SupplementWorkspaceProps {
  claimId: string;
  claimNumber?: string;
}

export default function SupplementWorkspace({ claimId, claimNumber }: SupplementWorkspaceProps) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filterTrade, setFilterTrade] = useState("All");

  // Fetch supplement data from API
  const fetchSupplements = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/supplements?claimId=${claimId}`);
      if (!res.ok) throw new Error("Failed to fetch supplements");

      const data = await res.json();
      const supplements = data.supplements || [];

      // Convert API data to Row format
      const convertedRows: Row[] = [];
      for (const supp of supplements) {
        const items = (supp.data?.items || []) as Array<{
          id: string;
          category: string;
          code?: string;
          description: string;
          quantity: number;
          unit: string;
          unitPrice: number;
          total: number;
          disputed?: boolean;
          source?: "ai" | "adjuster";
        }>;

        for (const item of items) {
          const rowData = {
            trade: item.category || "General",
            code: item.code || "",
            desc: item.description,
            qty: item.quantity,
            unit: item.unit,
            unitPriceCents: Math.round(item.unitPrice * 100),
          };

          convertedRows.push({
            id: item.id,
            ai: item.source !== "adjuster" ? rowData : undefined,
            adj: item.source === "adjuster" ? rowData : undefined,
            accepted: !item.disputed,
          });
        }
      }

      setRows(convertedRows);
    } catch (error) {
      logger.error("Failed to fetch supplements", error);
      toast.error("Failed to load supplement data");
    } finally {
      setLoading(false);
    }
  }, [claimId]);

  useEffect(() => {
    fetchSupplements();
  }, [fetchSupplements]);

  const filtered = useMemo(
    () =>
      filterTrade === "All"
        ? rows
        : rows.filter((r) => r.ai?.trade === filterTrade || r.adj?.trade === filterTrade),
    [rows, filterTrade]
  );

  const counts = useMemo(() => {
    const aiTotal = sumCents(filtered.map((r) => (r.ai ? r.ai.qty * r.ai.unitPriceCents : 0)));
    const adjTotal = sumCents(filtered.map((r) => (r.adj ? r.adj.qty * r.adj.unitPriceCents : 0)));
    const selectedTotal = sumCents(
      filtered.map((r) => (r.accepted && r.ai ? r.ai.qty * r.ai.unitPriceCents : 0))
    );
    const delta = aiTotal - adjTotal;
    return {
      rows: filtered.length,
      aiTotal: money(aiTotal),
      adjTotal: money(adjTotal),
      delta: money(delta),
      selectedTotal: money(selectedTotal),
    };
  }, [filtered]);

  function toggleRow(id: string) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, accepted: !r.accepted } : r)));
  }

  async function handleSave() {
    const acceptedItems = rows
      .filter((r) => r.accepted && r.ai)
      .map((r) => ({
        id: r.id,
        category: r.ai!.trade,
        code: r.ai!.code,
        description: r.ai!.desc,
        quantity: r.ai!.qty,
        unit: r.ai!.unit,
        unitPrice: r.ai!.unitPriceCents / 100,
        total: (r.ai!.qty * r.ai!.unitPriceCents) / 100,
        disputed: false,
        source: "ai" as const,
      }));

    const total = acceptedItems.reduce((sum, item) => sum + item.total, 0);

    try {
      setSaving(true);
      const res = await fetch("/api/supplements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          claimId,
          items: acceptedItems,
          total,
          status: "draft",
          title: `Supplement - ${claimNumber || claimId}`,
        }),
      });

      if (!res.ok) throw new Error("Failed to save supplement");
      toast.success("Supplement saved successfully!");
    } catch (error) {
      logger.error("Failed to save supplement", error);
      toast.error("Failed to save supplement");
    } finally {
      setSaving(false);
    }
  }

  async function handleGenerate() {
    // Get accepted items for PDF
    const acceptedItems = rows.filter((r) => r.accepted && r.ai);
    if (acceptedItems.length === 0) {
      toast.error("No items selected for supplement");
      return;
    }

    try {
      // Dynamically import jsPDF
      const [{ jsPDF }, autoTable] = await Promise.all([
        import("jspdf"),
        import("jspdf-autotable"),
      ]);

      toast.loading("Generating PDF...", { id: "supplement-pdf" });

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();

      // Header
      doc.setFillColor(14, 165, 233);
      doc.rect(0, 0, pageWidth, 35, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.text("SkaiScrape — Supplement Request", 14, 15);

      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text(`Claim #${claimNumber || claimId}`, 14, 26);

      // Date
      doc.setTextColor(100);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      const dateStr = new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      doc.text(`Generated: ${dateStr}`, 14, 45);

      // Total summary
      const totalCents = sumCents(acceptedItems.map((r) => r.ai!.qty * r.ai!.unitPriceCents));
      doc.setFillColor(240, 249, 255);
      doc.setDrawColor(186, 230, 253);
      doc.roundedRect(14, 52, pageWidth - 28, 18, 3, 3, "FD");
      doc.setTextColor(3, 105, 161);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text(`Total Supplement Request: ${money(totalCents)}`, 20, 63);

      // Table
      const tableData = acceptedItems.map((row, i) => [
        (i + 1).toString(),
        row.ai!.trade,
        row.ai!.code,
        row.ai!.desc,
        `${row.ai!.qty} ${row.ai!.unit}`,
        money(row.ai!.qty * row.ai!.unitPriceCents),
      ]);

      (autoTable as unknown as { default: typeof autoTable.default }).default(doc, {
        startY: 78,
        head: [["#", "Trade", "Code", "Description", "Qty", "Total"]],
        body: tableData,
        theme: "striped",
        headStyles: {
          fillColor: [241, 245, 249],
          textColor: [71, 85, 105],
          fontStyle: "bold",
          fontSize: 9,
        },
        bodyStyles: {
          fontSize: 9,
          cellPadding: 4,
        },
        columnStyles: {
          0: { cellWidth: 10, halign: "center" },
          5: { textColor: [5, 150, 105], fontStyle: "bold" },
        },
        margin: { left: 14, right: 14 },
      });

      // Save PDF
      doc.save(`Supplement_${claimNumber || claimId}_${Date.now()}.pdf`);
      toast.success("PDF generated successfully!", { id: "supplement-pdf" });
    } catch (error) {
      logger.error("Failed to generate PDF", error);
      toast.error("Failed to generate PDF", { id: "supplement-pdf" });
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent"></div>
          <p className="mt-2 text-sm text-slate-500">Loading supplement data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <SupplementToolbar
        filterTrade={filterTrade}
        setFilterTradeAction={setFilterTrade}
        counts={counts}
        onGenerateAction={handleGenerate}
        onSaveAction={handleSave}
        saving={saving}
      />

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[color:var(--border)] bg-[var(--surface-1)] p-12 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
            <svg
              className="h-6 w-6 text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-[color:var(--text)]">No Supplement Items</h3>
          <p className="mt-1 text-sm text-[color:var(--muted)]">
            Upload a carrier estimate or use the AI analyzer to generate supplement line items.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <SupplementTable
            title="AI Scope (Proposal)"
            rows={filtered}
            side="ai"
            highlight="added"
            onToggleAction={toggleRow}
          />
          <SupplementTable
            title="Adjuster Scope (Approved)"
            rows={filtered}
            side="adj"
            highlight="missing"
            onToggleAction={toggleRow}
          />
        </div>
      )}
    </div>
  );
}
