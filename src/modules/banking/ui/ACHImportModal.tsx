// Feature 2 - ACH Import Modal UI
"use client";

import { useState } from "react";

import type { ACHPayment, JobMatchCandidate } from "@/modules/banking/parsers/ach";

interface ACHImportModalProps {
  orgId: string;
  onClose: () => void;
  onImportComplete: () => void;
}

interface PaymentWithMatch extends ACHPayment {
  selectedJobId?: string;
  matchCandidates?: JobMatchCandidate[];
}

export function ACHImportModal({ orgId: _orgId, onClose, onImportComplete }: ACHImportModalProps) {
  const [step, setStep] = useState<"upload" | "preview" | "processing">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [csvContent, setCsvContent] = useState<string>("");
  const [payments, setPayments] = useState<PaymentWithMatch[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith(".csv")) {
      alert("Please upload a CSV file");
      return;
    }

    setFile(selectedFile);

    // Read file content
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setCsvContent(content);
    };
    reader.readAsText(selectedFile);
  };

  const handleParseAndMatch = async () => {
    if (!csvContent) return;

    setLoading(true);
    try {
      const response = await fetch("/api/banking/import-ach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csvContent }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to parse CSV");
      }

      const data = await response.json();
      setPayments(data.payments || []);
      setErrors(data.errors || []);
      setStep("preview");
    } catch (error: any) {
      console.error("Error parsing CSV:", error);
      alert(error.message || "Failed to parse CSV");
    } finally {
      setLoading(false);
    }
  };

  const handleJobSelect = (paymentIndex: number, jobId: string) => {
    setPayments((prev) =>
      prev.map((p, i) => (i === paymentIndex ? { ...p, selectedJobId: jobId } : p))
    );
  };

  const handleApproveMatches = async () => {
    const approvedPayments = payments.filter((p) => p.selectedJobId);

    if (approvedPayments.length === 0) {
      alert("Please select at least one job match");
      return;
    }

    setLoading(true);
    setStep("processing");

    try {
      const response = await fetch("/api/funding/add-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payments: approvedPayments.map((p) => ({
            jobId: p.selectedJobId,
            amount: p.amount,
            postedDate: p.postedDate,
            memo: p.memo,
            ref: p.ref,
            payor: "carrier", // Default to carrier for ACH imports
            method: "ach",
          })),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create funding records");
      }

      const data = await response.json();
      alert(`Successfully imported ${data.created} payments`);
      onImportComplete();
      onClose();
    } catch (error: any) {
      console.error("Error importing payments:", error);
      alert(error.message || "Failed to import payments");
      setStep("preview");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg bg-white shadow-xl">
        <div className="border-b border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">Import ACH Remittance</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
              disabled={loading}
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        <div className="space-y-6 p-6">
          {/* Step 1: Upload */}
          {step === "upload" && (
            <div className="space-y-4">
              <div className="rounded-lg border-2 border-dashed border-gray-300 p-8 text-center">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="ach-file-upload"
                />
                <label
                  htmlFor="ach-file-upload"
                  className="flex cursor-pointer flex-col items-center"
                >
                  <svg
                    className="mb-4 h-12 w-12 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                  <span className="text-sm font-medium text-gray-900">
                    {file ? file.name : "Click to upload CSV file"}
                  </span>
                  <span className="mt-1 text-xs text-gray-500">
                    ACH remittance CSV with columns: date, amount, description, reference
                  </span>
                </label>
              </div>

              {file && csvContent && (
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">
                    File: <span className="font-medium">{file.name}</span> ({file.size} bytes)
                  </p>
                  <button
                    onClick={handleParseAndMatch}
                    disabled={loading}
                    className="w-full rounded bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {loading ? "Parsing & Matching..." : "Parse & Match Jobs"}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Preview & Match */}
          {step === "preview" && (
            <div className="space-y-4">
              {errors.length > 0 && (
                <div className="rounded border border-yellow-200 bg-yellow-50 p-4">
                  <h3 className="mb-2 font-semibold text-yellow-900">Parsing Warnings:</h3>
                  <ul className="list-inside list-disc text-sm text-yellow-800">
                    {errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="rounded border border-blue-200 bg-blue-50 p-4">
                <p className="text-sm text-blue-900">
                  Found <strong>{payments.length}</strong> payments. Select matching jobs below.
                </p>
              </div>

              <div className="overflow-hidden rounded border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                        Date
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                        Amount
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                        Description
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                        Match to Job
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {payments.map((payment, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {new Date(payment.postedDate).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          ${payment.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {payment.memo || payment.ref || "N/A"}
                        </td>
                        <td className="px-4 py-3">
                          {payment.matchCandidates && payment.matchCandidates.length > 0 ? (
                            <select
                              value={payment.selectedJobId || ""}
                              onChange={(e) => handleJobSelect(index, e.target.value)}
                              className="block w-full rounded border-gray-300 text-sm"
                            >
                              <option value="">-- Select Job --</option>
                              {payment.matchCandidates.map((candidate) => (
                                <option key={candidate.jobId} value={candidate.jobId}>
                                  {candidate.job.claimNumber ||
                                    candidate.job.insured_name ||
                                    "Unknown"}{" "}
                                  ({candidate.matchReason}) - Score: {candidate.score}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className="text-sm text-gray-500">No matches found</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setStep("upload")}
                  disabled={loading}
                  className="rounded bg-gray-100 px-4 py-2 font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50"
                >
                  Back
                </button>
                <button
                  onClick={handleApproveMatches}
                  disabled={loading || payments.filter((p) => p.selectedJobId).length === 0}
                  className="rounded bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Approve & Import ({payments.filter((p) => p.selectedJobId).length} selected)
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Processing */}
          {step === "processing" && (
            <div className="py-8 text-center">
              <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
              <p className="mt-4 text-gray-600">Importing payments...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
