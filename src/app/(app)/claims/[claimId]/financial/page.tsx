"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { FinancialAnalysisResult } from "@/lib/intel/financial/engine";

export default function ClaimFinancialPage() {
  const params = useParams();
  const claimId = (params?.claimId as string) || "";

  const [analysis, setAnalysis] = useState<FinancialAnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "overview" | "depreciation" | "lineItems" | "supplements" | "projection" | "exports"
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
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to run financial analysis");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Auto-run on load
    runAnalysis();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claimId]);

  if (loading && !analysis) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 animate-spin rounded-full border-b-4 border-green-600"></div>
          <p className="text-xl font-semibold text-gray-700">🧮 Running Financial Analysis...</p>
          <p className="mt-2 text-gray-500">Analyzing estimates, depreciation, and projections</p>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="max-w-md rounded-lg bg-white p-8 shadow-lg">
          <h2 className="mb-4 text-2xl font-semibold">💵 Financial Analysis</h2>
          <p className="mb-6 text-gray-600">
            Generate a comprehensive financial audit including RCV/ACV calculations, underpayment
            detection, and settlement projections.
          </p>
          <button
            onClick={runAnalysis}
            className="w-full rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700"
          >
            🧮 Generate Analysis
          </button>
        </div>
      </div>
    );
  }

  const totals = analysis.totals;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">💵 Financial Analysis Engine</h1>
            <p className="mt-1 text-gray-600">
              Complete financial audit and underpayment detection
            </p>
          </div>
          <button
            onClick={runAnalysis}
            disabled={loading}
            className="rounded-lg bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading ? "Refreshing..." : "🔄 Refresh"}
          </button>
        </div>

        {/* Summary Banner */}
        <div className="mb-6 rounded-lg border-l-4 border-green-600 bg-gradient-to-r from-green-50 to-blue-50 p-6 shadow">
          <p className="text-lg font-medium text-gray-800">{analysis.summary}</p>
          {totals.underpayment > 0 && (
            <div className="mt-4 inline-block rounded-lg bg-red-100 px-4 py-2 text-xl font-bold text-red-800">
              💰 Total Underpayment: $
              {totals.underpayment.toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="mb-6 rounded-lg bg-white shadow-sm">
          <div className="flex gap-2 overflow-x-auto border-b px-4">
            {[
              { key: "overview", label: "📊 Overview", icon: "📊" },
              { key: "depreciation", label: "📉 Depreciation", icon: "📉" },
              { key: "lineItems", label: "📋 Line Items", icon: "📋" },
              { key: "supplements", label: "➕ Supplements", icon: "➕" },
              { key: "projection", label: "🎯 Settlement", icon: "🎯" },
              { key: "exports", label: "📤 Exports", icon: "📤" },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`whitespace-nowrap px-6 py-4 font-medium ${
                  activeTab === tab.key
                    ? "border-b-2 border-green-600 text-green-600"
                    : "text-gray-600 hover:text-gray-800"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-6">
            {/* TAB 1: OVERVIEW */}
            {activeTab === "overview" && (
              <div className="space-y-6">
                <h3 className="mb-6 text-2xl font-bold text-gray-900">Financial Overview</h3>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                  {/* Carrier RCV */}
                  <div className="rounded-lg border-l-4 border-blue-600 bg-blue-50 p-6">
                    <div className="mb-1 text-sm font-medium text-blue-600">Carrier RCV</div>
                    <div className="text-3xl font-bold text-gray-900">
                      ${totals.rcvCarrier.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </div>
                  </div>

                  {/* Contractor RCV */}
                  <div className="rounded-lg border-l-4 border-green-600 bg-green-50 p-6">
                    <div className="mb-1 text-sm font-medium text-green-600">Contractor RCV</div>
                    <div className="text-3xl font-bold text-gray-900">
                      ${totals.rcvContractor.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </div>
                  </div>

                  {/* Deductible */}
                  <div className="rounded-lg border-l-4 border-orange-600 bg-orange-50 p-6">
                    <div className="mb-1 text-sm font-medium text-orange-600">Deductible</div>
                    <div className="text-3xl font-bold text-gray-900">
                      ${totals.deductible.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </div>
                  </div>

                  {/* Total ACV */}
                  <div className="rounded-lg border-l-4 border-purple-600 bg-purple-50 p-6">
                    <div className="mb-1 text-sm font-medium text-purple-600">Total ACV</div>
                    <div className="text-3xl font-bold text-gray-900">
                      ${totals.acvContractor.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </div>
                  </div>

                  {/* Underpayment */}
                  <div className="rounded-lg border-l-4 border-red-600 bg-red-50 p-6">
                    <div className="mb-1 text-sm font-medium text-red-600">Underpayment</div>
                    <div className="text-3xl font-bold text-red-700">
                      ${totals.underpayment.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </div>
                  </div>

                  {/* Payments Received */}
                  <div className="rounded-lg border-l-4 border-gray-600 bg-gray-50 p-6">
                    <div className="mb-1 text-sm font-medium text-gray-600">Payments So Far</div>
                    <div className="text-3xl font-bold text-gray-900">$0.00</div>
                    <div className="mt-1 text-xs text-gray-500">No payments recorded</div>
                  </div>

                  {/* Tax */}
                  <div className="rounded-lg border-l-4 border-indigo-600 bg-indigo-50 p-6">
                    <div className="mb-1 text-sm font-medium text-indigo-600">Tax</div>
                    <div className="text-3xl font-bold text-gray-900">
                      ${totals.tax.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </div>
                  </div>

                  {/* Final Owed */}
                  <div className="rounded-lg border-l-4 border-green-700 bg-green-100 p-6">
                    <div className="mb-1 text-sm font-medium text-green-700">Final Owed</div>
                    <div className="text-3xl font-bold text-green-800">
                      ${totals.netOwed.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>

                {/* Underpayment Reasons */}
                {analysis.underpaymentReasons.length > 0 && (
                  <div className="mt-8">
                    <h4 className="mb-4 text-lg font-bold text-gray-900">
                      🚨 Underpayment Reasons
                    </h4>
                    <div className="space-y-2">
                      {analysis.underpaymentReasons.map((reason, idx) => (
                        <div
                          key={idx}
                          className="rounded-lg border-l-4 border-red-600 bg-red-50 p-4"
                        >
                          <p className="font-medium text-red-800">{reason}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Audit Findings */}
                {analysis.auditFindings.length > 0 && (
                  <div className="mt-8">
                    <h4 className="mb-4 text-lg font-bold text-gray-900">🔍 Audit Findings</h4>
                    <div className="space-y-3">
                      {analysis.auditFindings.map((finding, idx) => (
                        <div
                          key={idx}
                          className={`rounded-lg border-l-4 p-4 ${
                            finding.severity === "high"
                              ? "border-red-600 bg-red-50"
                              : finding.severity === "medium"
                                ? "border-orange-600 bg-orange-50"
                                : "border-yellow-600 bg-yellow-50"
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="font-semibold text-gray-900">{finding.category}</div>
                              <div className="mt-1 text-gray-700">{finding.issue}</div>
                            </div>
                            <div className="text-right">
                              <div className="text-2xl font-bold text-gray-900">
                                $
                                {finding.impact.toLocaleString("en-US", {
                                  minimumFractionDigits: 2,
                                })}
                              </div>
                              <div
                                className={`text-xs font-medium uppercase ${
                                  finding.severity === "high"
                                    ? "text-red-600"
                                    : finding.severity === "medium"
                                      ? "text-orange-600"
                                      : "text-yellow-600"
                                }`}
                              >
                                {finding.severity}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: DEPRECIATION ANALYZER */}
            {activeTab === "depreciation" && (
              <div className="space-y-6">
                <h3 className="mb-6 text-2xl font-bold text-gray-900">📉 Depreciation Analysis</h3>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                  {/* Carrier Applied */}
                  <div className="rounded-lg bg-red-50 p-6">
                    <div className="mb-2 text-sm font-medium text-red-600">Carrier Applied</div>
                    <div className="text-3xl font-bold text-gray-900">
                      $
                      {analysis.depreciation.carrierApplied.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                      })}
                    </div>
                    <div className="mt-2 text-xs text-gray-500">
                      {((analysis.depreciation.carrierApplied / totals.rcvCarrier) * 100).toFixed(
                        1
                      )}
                      % depreciation rate
                    </div>
                  </div>

                  {/* Correct Amount */}
                  <div className="rounded-lg bg-green-50 p-6">
                    <div className="mb-2 text-sm font-medium text-green-600">Correct Amount</div>
                    <div className="text-3xl font-bold text-gray-900">
                      $
                      {analysis.depreciation.correctAmount.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                      })}
                    </div>
                    <div className="mt-2 text-xs text-gray-500">
                      {((analysis.depreciation.correctAmount / totals.rcvContractor) * 100).toFixed(
                        1
                      )}
                      % depreciation rate
                    </div>
                  </div>

                  {/* Difference */}
                  <div className="rounded-lg bg-orange-50 p-6">
                    <div className="mb-2 text-sm font-medium text-orange-600">
                      Recoverable Amount
                    </div>
                    <div className="text-3xl font-bold text-orange-700">
                      $
                      {analysis.depreciation.difference.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                      })}
                    </div>
                    <div className="mt-2 text-xs text-gray-500">Overcalculated depreciation</div>
                  </div>
                </div>

                {/* Explanation */}
                <div className="rounded-lg border-l-4 border-blue-600 bg-blue-50 p-6">
                  <h4 className="mb-2 font-bold text-blue-900">📝 Analysis</h4>
                  <p className="text-blue-800">{analysis.depreciation.explanation}</p>
                </div>

                {/* Depreciation Type */}
                <div className="rounded-lg border bg-white p-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="mb-1 text-sm text-gray-600">Depreciation Type</div>
                      <div className="text-lg font-bold capitalize text-gray-900">
                        {analysis.depreciation.type}
                      </div>
                    </div>
                    <div>
                      <div className="mb-1 text-sm text-gray-600">Status</div>
                      <div
                        className={`text-lg font-bold ${
                          analysis.depreciation.violations &&
                          analysis.depreciation.violations.length > 0
                            ? "text-red-600"
                            : "text-green-600"
                        }`}
                      >
                        {analysis.depreciation.violations &&
                        analysis.depreciation.violations.length > 0
                          ? "⚠️ Violations Found"
                          : "✅ Compliant"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Violations */}
                {analysis.depreciation.violations &&
                  analysis.depreciation.violations.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-bold text-gray-900">🚨 Policy Violations</h4>
                      {analysis.depreciation.violations.map((violation, idx) => (
                        <div
                          key={idx}
                          className="rounded-lg border-l-4 border-red-600 bg-red-50 p-4"
                        >
                          <p className="font-medium text-red-800">{violation}</p>
                        </div>
                      ))}
                    </div>
                  )}
              </div>
            )}

            {/* TAB 3: LINE ITEM AUDIT */}
            {activeTab === "lineItems" && (
              <div className="space-y-6">
                <h3 className="mb-6 text-2xl font-bold text-gray-900">
                  📋 Line Item Financial Audit
                </h3>

                <div className="overflow-hidden rounded-lg border bg-white">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                            Code
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                            Description
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                            Carrier
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                            Contractor
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                            Difference
                          </th>
                          <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 bg-white">
                        {analysis.lineItemAnalysis.map((item, idx) => (
                          <tr key={idx} className={item.missingFromCarrier ? "bg-red-50" : ""}>
                            <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                              {item.lineCode}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-700">
                              {item.description}
                              {item.justification && (
                                <div className="mt-1 text-xs text-gray-500">
                                  {item.justification}
                                </div>
                              )}
                            </td>
                            <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-900">
                              {item.missingFromCarrier ? (
                                <span className="font-medium text-red-600">Missing</span>
                              ) : (
                                `$${item.carrier.toLocaleString("en-US", { minimumFractionDigits: 2 })}`
                              )}
                            </td>
                            <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-900">
                              $
                              {item.contractor.toLocaleString("en-US", {
                                minimumFractionDigits: 2,
                              })}
                            </td>
                            <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-bold">
                              {item.underpaid > 0 ? (
                                <span className="text-red-600">
                                  -$
                                  {item.underpaid.toLocaleString("en-US", {
                                    minimumFractionDigits: 2,
                                  })}
                                </span>
                              ) : (
                                <span className="text-green-600">$0.00</span>
                              )}
                            </td>
                            <td className="whitespace-nowrap px-6 py-4 text-center text-xs">
                              {item.recommendedSupplement ? (
                                <span className="rounded bg-orange-100 px-2 py-1 font-medium text-orange-800">
                                  Supplement
                                </span>
                              ) : (
                                <span className="rounded bg-green-100 px-2 py-1 font-medium text-green-800">
                                  OK
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="rounded-lg bg-blue-50 p-4">
                  <p className="text-sm text-blue-800">
                    <strong>
                      {analysis.lineItemAnalysis.filter((i) => i.missingFromCarrier).length}
                    </strong>{" "}
                    items missing from carrier estimate •{" "}
                    <strong>
                      {analysis.lineItemAnalysis.filter((i) => i.recommendedSupplement).length}
                    </strong>{" "}
                    items recommended for supplement
                  </p>
                </div>
              </div>
            )}

            {/* TAB 4: SUPPLEMENT OPPORTUNITIES */}
            {activeTab === "supplements" && (
              <div className="space-y-6">
                <h3 className="mb-6 text-2xl font-bold text-gray-900">
                  ➕ Supplement Opportunities
                </h3>

                {analysis.requiredSupplements.length === 0 ? (
                  <div className="rounded-lg bg-green-50 p-8 text-center">
                    <div className="mb-4 text-5xl">✅</div>
                    <p className="text-xl font-semibold text-green-800">No supplements required</p>
                    <p className="mt-2 text-green-600">All line items are properly accounted for</p>
                  </div>
                ) : (
                  <>
                    <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
                      <div className="rounded-lg border-l-4 border-red-600 bg-red-50 p-6">
                        <div className="mb-1 text-sm font-medium text-red-600">🔴 HIGH IMPACT</div>
                        <div className="text-3xl font-bold text-gray-900">
                          {
                            analysis.lineItemAnalysis.filter(
                              (i) => i.recommendedSupplement && i.contractor > 1000
                            ).length
                          }
                        </div>
                      </div>
                      <div className="rounded-lg border-l-4 border-orange-600 bg-orange-50 p-6">
                        <div className="mb-1 text-sm font-medium text-orange-600">
                          🟡 MEDIUM IMPACT
                        </div>
                        <div className="text-3xl font-bold text-gray-900">
                          {
                            analysis.lineItemAnalysis.filter(
                              (i) =>
                                i.recommendedSupplement &&
                                i.contractor >= 500 &&
                                i.contractor <= 1000
                            ).length
                          }
                        </div>
                      </div>
                      <div className="rounded-lg border-l-4 border-yellow-600 bg-yellow-50 p-6">
                        <div className="mb-1 text-sm font-medium text-yellow-600">
                          ⚪ LOW IMPACT
                        </div>
                        <div className="text-3xl font-bold text-gray-900">
                          {
                            analysis.lineItemAnalysis.filter(
                              (i) => i.recommendedSupplement && i.contractor < 500
                            ).length
                          }
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {analysis.requiredSupplements.map((supplement, idx) => {
                        const item = analysis.lineItemAnalysis.find(
                          (i) =>
                            supplement.includes(i.lineCode) || supplement.includes(i.description)
                        );
                        const priority =
                          item && item.contractor > 1000
                            ? "high"
                            : item && item.contractor >= 500
                              ? "medium"
                              : "low";

                        return (
                          <div
                            key={idx}
                            className={`rounded-lg border-l-4 p-4 ${
                              priority === "high"
                                ? "border-red-600 bg-red-50"
                                : priority === "medium"
                                  ? "border-orange-600 bg-orange-50"
                                  : "border-yellow-600 bg-yellow-50"
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="font-semibold text-gray-900">
                                  {priority === "high" ? "🔴" : priority === "medium" ? "🟡" : "⚪"}{" "}
                                  {supplement}
                                </div>
                                {item?.justification && (
                                  <div className="mt-1 text-sm text-gray-600">
                                    {item.justification}
                                  </div>
                                )}
                              </div>
                              {item && (
                                <div className="ml-4 text-right">
                                  <div className="text-xl font-bold text-gray-900">
                                    $
                                    {item.contractor.toLocaleString("en-US", {
                                      minimumFractionDigits: 2,
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* TAB 5: SETTLEMENT PROJECTION */}
            {activeTab === "projection" && (
              <div className="space-y-6">
                <h3 className="mb-6 text-2xl font-bold text-gray-900">🎯 Settlement Projection</h3>

                {/* Big Numbers */}
                <div className="rounded-lg border-2 border-green-600 bg-gradient-to-r from-green-50 to-blue-50 p-8">
                  <div className="text-center">
                    <div className="mb-2 text-sm font-medium text-gray-600">
                      PROJECTED SETTLEMENT RANGE
                    </div>
                    <div className="mb-4 text-5xl font-bold text-gray-900">
                      $
                      {analysis.settlementProjection.min.toLocaleString("en-US", {
                        maximumFractionDigits: 0,
                      })}{" "}
                      – $
                      {analysis.settlementProjection.max.toLocaleString("en-US", {
                        maximumFractionDigits: 0,
                      })}
                    </div>
                    <div className="text-xl text-gray-700">
                      Expected:{" "}
                      <span className="font-bold text-green-700">
                        $
                        {analysis.settlementProjection.expected.toLocaleString("en-US", {
                          maximumFractionDigits: 0,
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Confidence Meter */}
                <div className="rounded-lg border bg-white p-6">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Confidence Level</span>
                    <span className="text-2xl font-bold text-green-600">
                      {analysis.settlementProjection.confidence}%
                    </span>
                  </div>
                  <div className="h-6 w-full overflow-hidden rounded-full bg-gray-200">
                    {/* eslint-disable-next-line react/forbid-dom-props */}
                    <div
                      className="flex h-full items-center justify-end rounded-full bg-green-600 pr-2 transition-all"
                      style={
                        {
                          width: `${analysis.settlementProjection.confidence}%`,
                        } as React.CSSProperties
                      }
                    >
                      <span className="text-xs font-bold text-white">
                        {analysis.settlementProjection.confidence >= 50
                          ? `${analysis.settlementProjection.confidence}%`
                          : ""}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Factors */}
                <div>
                  <h4 className="mb-3 font-bold text-gray-900">📊 Projection Factors</h4>
                  <div className="space-y-2">
                    {analysis.settlementProjection.factors.map((factor, idx) => (
                      <div key={idx} className="flex items-start rounded-lg bg-blue-50 p-3">
                        <span className="mr-3 text-blue-600">✓</span>
                        <span className="text-gray-800">{factor}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Risk Assessment */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="rounded-lg border-l-4 border-orange-600 bg-orange-50 p-6">
                    <h4 className="mb-2 font-bold text-orange-900">⚠️ Adjuster Pushback Risk</h4>
                    <div className="mb-2 text-2xl font-bold text-orange-700">
                      {analysis.settlementProjection.confidence > 80
                        ? "Low"
                        : analysis.settlementProjection.confidence > 60
                          ? "Medium"
                          : "High"}
                    </div>
                    <p className="text-sm text-orange-800">
                      {analysis.settlementProjection.confidence > 80
                        ? "Strong documentation and clear justifications"
                        : analysis.settlementProjection.confidence > 60
                          ? "Additional documentation may be required"
                          : "Expect significant negotiation"}
                    </p>
                  </div>

                  <div className="rounded-lg border-l-4 border-blue-600 bg-blue-50 p-6">
                    <h4 className="mb-2 font-bold text-blue-900">📋 Recommended Strategy</h4>
                    <div className="space-y-1 text-sm text-blue-800">
                      <p>✓ Prepare detailed supplement packet</p>
                      <p>✓ Include weather verification</p>
                      <p>✓ Attach manufacturer specs</p>
                      <p>✓ Document all discrepancies</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 6: EXPORTS */}
            {activeTab === "exports" && (
              <div className="space-y-6">
                <h3 className="mb-6 text-2xl font-bold text-gray-900">
                  📤 Export Financial Analysis
                </h3>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  {/* Adjuster PDF */}
                  <div className="rounded-lg border-2 border-blue-600 bg-blue-50 p-6">
                    <div className="mb-2 text-2xl">📄</div>
                    <h4 className="mb-2 text-lg font-bold text-gray-900">Adjuster-Ready Report</h4>
                    <p className="mb-4 text-sm text-gray-600">
                      Professional PDF with full financial audit, depreciation analysis, and
                      supplement justifications
                    </p>
                    <button
                      onClick={() => {
                        const a = analysis!;
                        const lines = [
                          "FINANCIAL ANALYSIS — ADJUSTER REPORT",
                          `Claim: ${claimId}`,
                          `Generated: ${new Date().toLocaleString()}`,
                          "",
                          "=== TOTALS ===",
                          `Carrier RCV: $${a.totals.rcvCarrier.toLocaleString()}`,
                          `Contractor RCV: $${a.totals.rcvContractor.toLocaleString()}`,
                          `Overage: $${a.totals.overage.toLocaleString()}`,
                          `Underpayment: $${a.totals.underpayment.toLocaleString()}`,
                          `Deductible: $${a.totals.deductible.toLocaleString()}`,
                          `Net Owed: $${a.totals.netOwed.toLocaleString()}`,
                          "",
                          "=== SUMMARY ===",
                          a.summary,
                          "",
                          "=== AUDIT FINDINGS ===",
                          ...(a.auditFindings || []).map(
                            (f, i) =>
                              `${i + 1}. [${f.severity}] ${f.category}: ${f.issue} (impact: $${f.impact.toLocaleString()})`
                          ),
                          "",
                          "=== REQUIRED SUPPLEMENTS ===",
                          ...(a.requiredSupplements || []).map((s, i) => `${i + 1}. ${s}`),
                          "",
                          "=== UNDERPAYMENT REASONS ===",
                          ...(a.underpaymentReasons || []).map((r, i) => `${i + 1}. ${r}`),
                          "",
                          "=== LINE ITEM ANALYSIS ===",
                          ...(a.lineItemAnalysis || []).map(
                            (li) =>
                              `• ${li.description}: Carrier $${li.carrier.toLocaleString()} vs Contractor $${li.contractor.toLocaleString()}${li.underpaid > 0 ? ` (underpaid $${li.underpaid.toLocaleString()})` : ""}`
                          ),
                        ];
                        const blob = new Blob([lines.join("\n")], { type: "text/plain" });
                        const url = URL.createObjectURL(blob);
                        const link = document.createElement("a");
                        link.href = url;
                        link.download = `adjuster-report-${claimId}.txt`;
                        link.click();
                        URL.revokeObjectURL(url);
                      }}
                      className="w-full rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
                    >
                      📥 Download Report (Adjuster)
                    </button>
                  </div>

                  {/* Homeowner PDF */}
                  <div className="rounded-lg border-2 border-green-600 bg-green-50 p-6">
                    <div className="mb-2 text-2xl">🏠</div>
                    <h4 className="mb-2 text-lg font-bold text-gray-900">Homeowner Summary</h4>
                    <p className="mb-4 text-sm text-gray-600">
                      Plain-language summary explaining what&apos;s owed, why supplements are
                      needed, and simple pricing breakdown
                    </p>
                    <button
                      onClick={() => {
                        const a = analysis!;
                        const lines = [
                          "YOUR CLAIM FINANCIAL SUMMARY",
                          `Date: ${new Date().toLocaleDateString()}`,
                          "",
                          "Here is a summary of your insurance claim finances:",
                          "",
                          `Total Claim Value: $${a.totals.rcvContractor.toLocaleString()}`,
                          `Insurance Carrier Estimate: $${a.totals.rcvCarrier.toLocaleString()}`,
                          `Underpayment Gap: $${a.totals.underpayment.toLocaleString()}`,
                          `Deductible: $${a.totals.deductible.toLocaleString()}`,
                          `Net Owed to You: $${a.totals.netOwed.toLocaleString()}`,
                          "",
                          a.requiredSupplements?.length
                            ? "ADDITIONAL WORK NEEDED:"
                            : "No additional supplements needed at this time.",
                          ...(a.requiredSupplements || []).map((s, i) => `  ${i + 1}. ${s}`),
                          "",
                          "If you have any questions, please contact your contractor.",
                        ];
                        const blob = new Blob([lines.join("\n")], { type: "text/plain" });
                        const url = URL.createObjectURL(blob);
                        const link = document.createElement("a");
                        link.href = url;
                        link.download = `homeowner-summary-${claimId}.txt`;
                        link.click();
                        URL.revokeObjectURL(url);
                      }}
                      className="w-full rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
                    >
                      📥 Download Summary (Homeowner)
                    </button>
                  </div>

                  {/* JSON Export */}
                  <div className="rounded-lg border-2 border-purple-600 bg-purple-50 p-6">
                    <div className="mb-2 text-2xl">💾</div>
                    <h4 className="mb-2 text-lg font-bold text-gray-900">Raw JSON Data</h4>
                    <p className="mb-4 text-sm text-gray-600">
                      Complete financial analysis data in JSON format for integration with other
                      systems
                    </p>
                    <button
                      onClick={() => {
                        const dataStr = JSON.stringify(analysis, null, 2);
                        const blob = new Blob([dataStr], { type: "application/json" });
                        const url = URL.createObjectURL(blob);
                        const link = document.createElement("a");
                        link.href = url;
                        link.download = `financial-analysis-${claimId}.json`;
                        link.click();
                      }}
                      className="w-full rounded-lg bg-purple-600 px-4 py-2 font-medium text-white hover:bg-purple-700"
                    >
                      📥 Download JSON
                    </button>
                  </div>

                  {/* Email to Carrier */}
                  <div className="rounded-lg border-2 border-orange-600 bg-orange-50 p-6">
                    <div className="mb-2 text-2xl">📧</div>
                    <h4 className="mb-2 text-lg font-bold text-gray-900">Send Supplement Packet</h4>
                    <p className="mb-4 text-sm text-gray-600">
                      Email complete supplement packet directly to carrier adjuster with all
                      documentation
                    </p>
                    <button
                      onClick={() => {
                        alert(
                          "Email integration coming soon. Use the Download buttons to export your report and attach it to an email manually."
                        );
                      }}
                      className="w-full rounded-lg bg-orange-600 px-4 py-2 font-medium text-white hover:bg-orange-700"
                    >
                      ✉️ Send to Adjuster
                    </button>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="rounded-lg bg-gray-50 p-6">
                  <h4 className="mb-4 font-bold text-gray-900">📊 Export Stats</h4>
                  <div className="grid grid-cols-2 gap-4 text-center md:grid-cols-4">
                    <div>
                      <div className="text-2xl font-bold text-gray-900">
                        {analysis.lineItemAnalysis.length}
                      </div>
                      <div className="text-xs text-gray-600">Line Items</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-gray-900">
                        {analysis.auditFindings.length}
                      </div>
                      <div className="text-xs text-gray-600">Audit Findings</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-gray-900">
                        {analysis.requiredSupplements.length}
                      </div>
                      <div className="text-xs text-gray-600">Supplements</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-gray-900">
                        {analysis.settlementProjection.confidence}%
                      </div>
                      <div className="text-xs text-gray-600">Confidence</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
