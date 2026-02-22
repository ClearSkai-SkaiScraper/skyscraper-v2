"use client";

import { useState } from "react";

import { FinancialAnalysisResult } from "@/lib/intel/financial/engine";

interface ClaimFinancialAnalysisProps {
  claimId: string;
  initialAnalysis?: FinancialAnalysisResult;
}

export default function ClaimFinancialAnalysis({
  claimId,
  initialAnalysis,
}: ClaimFinancialAnalysisProps) {
  const [analysis, setAnalysis] = useState<FinancialAnalysisResult | null>(initialAnalysis || null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "overview" | "depreciation" | "lineItems" | "supplements" | "projection"
  >("overview");

  async function runAnalysis() {
    setLoading(true);
    try {
      const res = await fetch("/api/intel/financial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ claimId }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setAnalysis(data.analysis);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (!analysis) {
    return (
      <div className="rounded bg-gray-50 p-8 shadow">
        <h2 className="mb-4 text-2xl font-semibold">💵 Financial Analysis</h2>
        <p className="mb-6 text-gray-600">
          Generate a comprehensive financial audit of this claim including RCV/ACV calculations,
          underpayment detection, and settlement projections.
        </p>
        <button
          onClick={runAnalysis}
          disabled={loading}
          className="rounded bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700 disabled:bg-gray-400"
        >
          {loading ? "Analyzing..." : "🧮 Run Financial Analysis"}
        </button>
      </div>
    );
  }

  const totals = analysis.totals;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">💵 Financial Analysis</h2>
        <button
          onClick={runAnalysis}
          disabled={loading}
          className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:bg-gray-400"
        >
          {loading ? "Refreshing..." : "🔄 Refresh Analysis"}
        </button>
      </div>

      {/* Summary Card */}
      <div className="rounded-lg border-l-4 border-green-600 bg-green-50 p-6">
        <p className="text-lg text-gray-800">{analysis.summary}</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b">
        {[
          { key: "overview", label: "Overview" },
          { key: "depreciation", label: "Depreciation" },
          { key: "lineItems", label: "Line Items" },
          { key: "supplements", label: "Supplements" },
          { key: "projection", label: "Settlement Forecast" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`px-4 py-2 font-medium ${
              activeTab === tab.key
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-gray-600 hover:text-gray-800"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <div className="grid gap-6 md:grid-cols-3">
          <FinancialCard
            title="Carrier RCV"
            value={totals.rcvCarrier}
            subtitle="Replacement Cost Value"
            color="blue"
          />
          <FinancialCard
            title="Contractor RCV"
            value={totals.rcvContractor}
            subtitle="Replacement Cost Value"
            color="purple"
          />
          <FinancialCard
            title={totals.underpayment > 0 ? "Underpayment" : "Overage"}
            value={totals.underpayment > 0 ? totals.underpayment : totals.overage}
            subtitle="Difference"
            color={totals.underpayment > 0 ? "red" : "green"}
          />
          <FinancialCard
            title="Carrier ACV"
            value={totals.acvCarrier}
            subtitle="Actual Cash Value"
            color="gray"
          />
          <FinancialCard
            title="Contractor ACV"
            value={totals.acvContractor}
            subtitle="Actual Cash Value"
            color="gray"
          />
          <FinancialCard
            title="Net Owed"
            value={totals.netOwed}
            subtitle="After Deductible & Tax"
            color="green"
          />
          <FinancialCard
            title="Deductible"
            value={totals.deductible}
            subtitle="Policy Deductible"
            color="orange"
          />
          <FinancialCard title="Tax" value={totals.tax} subtitle="Sales Tax" color="yellow" />
        </div>
      )}

      {/* Depreciation Tab */}
      {activeTab === "depreciation" && (
        <div className="space-y-6">
          <div className="grid gap-6 md:grid-cols-3">
            <FinancialCard
              title="Carrier Applied"
              value={analysis.depreciation.carrierApplied}
              subtitle="Depreciation"
              color="red"
            />
            <FinancialCard
              title="Correct Amount"
              value={analysis.depreciation.correctAmount}
              subtitle="Should Be"
              color="green"
            />
            <FinancialCard
              title="Difference"
              value={analysis.depreciation.difference}
              subtitle="Overcalculated"
              color="orange"
            />
          </div>

          <div className="rounded bg-white p-6 shadow">
            <h3 className="mb-3 text-lg font-semibold">Depreciation Analysis</h3>
            <p className="mb-4 text-gray-700">{analysis.depreciation.explanation}</p>

            <div className="text-sm">
              <span className="font-medium">Type:</span>{" "}
              <span className="rounded bg-gray-100 px-2 py-1">{analysis.depreciation.type}</span>
            </div>

            {analysis.depreciation.violations && analysis.depreciation.violations.length > 0 && (
              <div className="mt-4 border-l-4 border-red-600 bg-red-50 p-4">
                <h4 className="mb-2 font-semibold text-red-800">⚠️ Policy Violations:</h4>
                <ul className="ml-6 list-disc space-y-1 text-red-700">
                  {analysis.depreciation.violations.map((v, i) => (
                    <li key={i}>{v}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Line Items Tab */}
      {activeTab === "lineItems" && (
        <div className="overflow-hidden rounded bg-white shadow">
          <table className="w-full">
            <thead className="bg-gray-100">
              <tr>
                <th scope="col" className="p-3 text-left font-semibold">
                  Code
                </th>
                <th scope="col" className="p-3 text-left font-semibold">
                  Description
                </th>
                <th scope="col" className="p-3 text-right font-semibold">
                  Carrier
                </th>
                <th scope="col" className="p-3 text-right font-semibold">
                  Contractor
                </th>
                <th scope="col" className="p-3 text-right font-semibold">
                  Underpaid
                </th>
                <th scope="col" className="p-3 text-center font-semibold">
                  Supplement
                </th>
              </tr>
            </thead>
            <tbody>
              {analysis.lineItemAnalysis.map((item, i) => (
                <tr
                  key={i}
                  className={`border-b ${
                    item.missingFromCarrier
                      ? "bg-red-50"
                      : item.underpaid > 100
                        ? "bg-yellow-50"
                        : ""
                  }`}
                >
                  <td className="p-3 font-mono text-sm">{item.lineCode}</td>
                  <td className="p-3">
                    {item.description}
                    {item.justification && (
                      <div className="mt-1 text-xs text-gray-600">{item.justification}</div>
                    )}
                  </td>
                  <td className="p-3 text-right">${item.carrier.toFixed(2)}</td>
                  <td className="p-3 text-right font-semibold">${item.contractor.toFixed(2)}</td>
                  <td className="p-3 text-right font-semibold text-red-600">
                    {item.underpaid > 0 ? `$${item.underpaid.toFixed(2)}` : "-"}
                  </td>
                  <td className="p-3 text-center">
                    {item.recommendedSupplement ? (
                      <span className="rounded bg-orange-100 px-2 py-1 text-xs font-medium text-orange-800">
                        Yes
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Supplements Tab */}
      {activeTab === "supplements" && (
        <div className="space-y-4">
          <div className="rounded border-l-4 border-orange-600 bg-orange-50 p-6">
            <h3 className="mb-2 text-lg font-semibold">
              📋 {analysis.requiredSupplements.length} Supplement Opportunities
            </h3>
            <p className="text-gray-700">
              These line items should be included in supplement requests to the carrier.
            </p>
          </div>

          <div className="space-y-3">
            {analysis.requiredSupplements.map((item, i) => (
              <div key={i} className="rounded border-l-4 border-orange-400 bg-white p-4 shadow">
                <div className="font-medium">{item}</div>
              </div>
            ))}
          </div>

          {analysis.auditFindings.length > 0 && (
            <div className="mt-8">
              <h3 className="mb-4 text-lg font-semibold">🔍 Audit Findings</h3>
              <div className="space-y-3">
                {analysis.auditFindings.map((finding, i) => (
                  <div
                    key={i}
                    className={`rounded border-l-4 p-4 shadow ${
                      finding.severity === "high"
                        ? "border-red-600 bg-red-50"
                        : finding.severity === "medium"
                          ? "border-yellow-600 bg-yellow-50"
                          : "border-blue-600 bg-blue-50"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-semibold text-gray-800">{finding.category}</div>
                        <div className="mt-1 text-gray-700">{finding.issue}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-red-600">
                          ${finding.impact.toFixed(0)}
                        </div>
                        <div className="text-xs uppercase text-gray-600">{finding.severity}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Settlement Projection Tab */}
      {activeTab === "projection" && (
        <div className="space-y-6">
          <div className="rounded-lg bg-purple-50 p-8 shadow">
            <h3 className="mb-6 text-xl font-semibold">📈 Settlement Forecast</h3>

            <div className="mb-6 grid gap-6 md:grid-cols-3">
              <div>
                <div className="mb-1 text-sm text-gray-600">Conservative</div>
                <div className="text-3xl font-bold text-blue-600">
                  ${analysis.settlementProjection.min.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="mb-1 text-sm text-gray-600">Expected</div>
                <div className="text-4xl font-bold text-purple-600">
                  ${analysis.settlementProjection.expected.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="mb-1 text-sm text-gray-600">Optimistic</div>
                <div className="text-3xl font-bold text-green-600">
                  ${analysis.settlementProjection.max.toLocaleString()}
                </div>
              </div>
            </div>

            <div className="mb-6 flex items-center gap-2">
              <div className="text-sm font-medium text-gray-700">Confidence:</div>
              <div className="h-3 flex-1 overflow-hidden rounded-full bg-gray-200">
                <div
                  className="h-full rounded-full bg-green-600 transition-all"
                  style={
                    { width: `${analysis.settlementProjection.confidence}%` } as React.CSSProperties
                  }
                />
              </div>
              <div className="text-sm font-bold text-green-600">
                {analysis.settlementProjection.confidence}%
              </div>
            </div>
            <div>
              <h4 className="mb-3 font-semibold text-gray-800">Projection Factors:</h4>
              <ul className="space-y-2">
                {analysis.settlementProjection.factors.map((factor, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-purple-600">•</span>
                    <span className="text-gray-700">{factor}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {analysis.underpaymentReasons.length > 0 && (
            <div className="rounded bg-white p-6 shadow">
              <h4 className="mb-4 text-lg font-semibold">🎯 Underpayment Drivers</h4>
              <ul className="space-y-2">
                {analysis.underpaymentReasons.map((reason, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-red-600">⚠️</span>
                    <span className="text-gray-700">{reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function FinancialCard({
  title,
  value,
  subtitle,
  color,
}: {
  title: string;
  value: number;
  subtitle: string;
  color: "blue" | "purple" | "red" | "green" | "gray" | "orange" | "yellow";
}) {
  const colorClasses = {
    blue: "bg-blue-50 border-blue-600 text-blue-700",
    purple: "bg-purple-50 border-purple-600 text-purple-700",
    red: "bg-red-50 border-red-600 text-red-700",
    green: "bg-green-50 border-green-600 text-green-700",
    gray: "bg-gray-50 border-gray-600 text-gray-700",
    orange: "bg-orange-50 border-orange-600 text-orange-700",
    yellow: "bg-yellow-50 border-yellow-600 text-yellow-700",
  };

  return (
    <div className={`rounded-lg border-l-4 p-6 shadow ${colorClasses[color]}`}>
      <div className="mb-1 text-sm font-medium text-gray-600">{title}</div>
      <div className="mb-1 text-3xl font-bold">
        ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </div>
      <div className="text-xs text-gray-600">{subtitle}</div>
    </div>
  );
}
