"use client";

import { CheckCircle2, FileText, Loader2, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface DepreciationPackagePanelProps {
  claimId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  packageData?: any;
  onPackageGenerated?: () => void;
}

export function DepreciationPackagePanel({
  claimId,
  packageData,
  onPackageGenerated,
}: DepreciationPackagePanelProps) {
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [localPackage, setLocalPackage] = useState(packageData);

  const generatePackage = async () => {
    try {
      setGenerating(true);
      toast.info("🔥 Generating depreciation package...");

      const res = await fetch("/api/depreciation/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ claimId }),
      });

      if (!res.ok) throw new Error(await res.text());

      const data = await res.json();
      setLocalPackage(data);
      toast.success(
        `✅ Depreciation package generated! $${data.totalDepreciationOwed.toFixed(2)} owed`
      );

      if (onPackageGenerated) onPackageGenerated();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      toast.error(`Failed to generate package: ${error.message}`);
    } finally {
      setGenerating(false);
    }
  };

  const sendPackage = async () => {
    if (!localPackage) {
      toast.error("Generate package first");
      return;
    }

    if (!recipientEmail || !recipientEmail.includes("@")) {
      toast.error("Enter valid email address");
      return;
    }

    try {
      setSending(true);
      toast.info("📧 Sending depreciation packet...");

      const res = await fetch("/api/depreciation/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packageId: localPackage.id,
          recipients: [recipientEmail],
        }),
      });

      if (!res.ok) throw new Error(await res.text());

      const data = await res.json();
      toast.success(`✅ ${data.message}`);
      setRecipientEmail("");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      toast.error(`Failed to send: ${error.message}`);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="rounded-xl border bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-semibold">💰 Final Depreciation Package</h3>

      {!localPackage ? (
        <div>
          <p className="mb-4 text-sm text-gray-600">
            Generate the final depreciation release packet including invoice, contractor statement,
            homeowner acceptance, and all supporting documentation.
          </p>

          <Button
            onClick={generatePackage}
            disabled={generating}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            {generating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating Package...
              </>
            ) : (
              <>
                <FileText className="mr-2 h-4 w-4" />
                Generate Final Depreciation Package
              </>
            )}
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Package Summary */}
          <div className="rounded-lg border border-green-200 bg-green-50 p-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-1 h-5 w-5 flex-shrink-0 text-green-600" />
              <div className="flex-1">
                <h4 className="mb-2 font-semibold text-green-900">
                  Package Generated Successfully
                </h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-green-700">Total Invoice:</span>
                    <p className="font-semibold text-green-900">
                      ${Number(localPackage.finalInvoiceTotal).toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <span className="text-green-700">Payments Received:</span>
                    <p className="font-semibold text-green-900">
                      ${Number(localPackage.paymentsReceived).toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <span className="text-green-700">Depreciation Owed:</span>
                    <p className="text-lg font-bold text-green-900">
                      ${Number(localPackage.totalDepreciationOwed).toFixed(2)}
                    </p>
                  </div>
                  {localPackage.supplementAmount > 0 && (
                    <div>
                      <span className="text-green-700">Supplements:</span>
                      <p className="font-semibold text-green-900">
                        ${Number(localPackage.supplementAmount).toFixed(2)}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Package Contents */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-gray-700">📦 Package Contents:</h4>
            <ul className="space-y-1 text-sm text-gray-600">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                Final Invoice with line items
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                Contractor Completion Statement
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                Homeowner Acceptance & Authorization
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                Completion Photos ({localPackage.photoAppendix.length})
              </li>
              {localPackage.supplement && (
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  Approved Supplement Summary
                </li>
              )}
              {localPackage.weatherVerification && (
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  Weather Verification Report
                </li>
              )}
            </ul>
          </div>

          {/* Send Section */}
          <div className="border-t pt-4">
            <h4 className="mb-3 text-sm font-semibold text-gray-700">📧 Send to Adjuster</h4>
            <div className="space-y-3">
              <div>
                <Label htmlFor="adjuster-email" className="text-sm">
                  Adjuster Email
                </Label>
                <Input
                  id="adjuster-email"
                  type="email"
                  placeholder="adjuster@insurance.com"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  className="mt-1"
                />
              </div>
              <Button
                onClick={sendPackage}
                disabled={sending || !recipientEmail}
                className="w-full"
              >
                {sending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Send Depreciation Release Packet
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
