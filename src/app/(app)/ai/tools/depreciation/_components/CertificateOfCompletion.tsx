/**
 * Certificate of Completion Component
 * Used in the Depreciation Builder for homeowner sign-off
 * Includes signature pad for legally binding acceptance
 * Can be sent to client for remote signing via messaging
 */

"use client";

import { CheckCircle2, Download, FileSignature, Printer, Send } from "lucide-react";
import { useRef, useState } from "react";
import SignatureCanvas from "react-signature-canvas";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { logger } from "@/lib/logger";

interface CertificateOfCompletionProps {
  claimId: string;
  claimNumber: string;
  propertyOwner: string;
  propertyAddress: string;
  contractorName?: string;
  contractorLicense?: string;
  workDescription?: string;
  completionDate?: string;
  invoiceAmount?: number;
  clientEmail?: string;
  onSign: (signatureDataUrl: string) => void | Promise<void>;
  onSendToClient?: () => void | Promise<void>;
  onDownload?: (signatureDataUrl?: string) => void | Promise<void>;
  signed?: boolean;
  signatureUrl?: string;
}

export function CertificateOfCompletion({
  claimId: _claimId,
  claimNumber,
  propertyOwner,
  propertyAddress,
  contractorName = "Licensed Contractor",
  contractorLicense,
  workDescription = "All repairs described in the attached invoice",
  completionDate,
  invoiceAmount,
  clientEmail,
  onSign,
  onSendToClient,
  onDownload,
  signed = false,
  signatureUrl,
}: CertificateOfCompletionProps) {
  const sigPadRef = useRef<SignatureCanvas>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);

  const today =
    completionDate ||
    new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  const handleClear = () => {
    sigPadRef.current?.clear();
    setHasSignature(false);
  };

  const handleSave = async () => {
    if (!sigPadRef.current || sigPadRef.current.isEmpty()) {
      return;
    }

    if (!acknowledged) {
      return;
    }

    setIsSaving(true);
    try {
      const dataUrl = sigPadRef.current.toDataURL("image/png");
      await onSign(dataUrl);
    } catch (error) {
      logger.error("Failed to save signature:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSendToClient = async () => {
    if (!clientEmail) {
      toast.error("No client email on file. Please add client email to send.");
      return;
    }

    setIsSending(true);
    try {
      if (onSendToClient) {
        await onSendToClient();
        toast.success(`Certificate sent to ${clientEmail}!`);
      }
    } catch (error) {
      logger.error("Failed to send to client:", error);
      toast.error("Failed to send certificate to client");
    } finally {
      setIsSending(false);
    }
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      // Get signature data if signed
      const sigData =
        signed && signatureUrl
          ? signatureUrl
          : hasSignature && sigPadRef.current
            ? sigPadRef.current.toDataURL("image/png")
            : undefined;

      if (onDownload) {
        await onDownload(sigData);
        toast.success("Certificate downloaded and saved to claim!");
      } else {
        // Fallback: trigger print dialog
        window.print();
      }
    } catch (error) {
      logger.error("Failed to download:", error);
      toast.error("Failed to download certificate");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Card className="overflow-hidden print:border-0 print:shadow-none">
      <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white print:bg-white print:text-black">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileSignature className="h-8 w-8" />
            <div>
              <h2 className="text-xl font-bold">Certificate of Completion</h2>
              <p className="text-sm text-white/80 print:text-gray-600">Claim #{claimNumber}</p>
            </div>
          </div>
          {signed && (
            <Badge className="bg-green-500 text-white">
              <CheckCircle2 className="mr-1 h-4 w-4" />
              Signed
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6 p-6">
        {/* Header Section */}
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900">
            HOMEOWNER CERTIFICATE OF COMPLETION
          </h3>
          <p className="text-sm text-gray-500">Insurance Claim Documentation</p>
        </div>

        <Separator />

        {/* Main Certificate Text */}
        <div className="space-y-4 rounded-lg border bg-gray-50 p-6 text-sm leading-relaxed">
          <p>
            I, <strong className="text-blue-700">{propertyOwner || "[Property Owner]"}</strong>,
            hereby certify that all repairs described in the attached invoice have been
            satisfactorily completed at the property located at:
          </p>

          <div className="rounded border bg-white p-3">
            <p className="font-medium text-gray-900">{propertyAddress || "[Property Address]"}</p>
          </div>

          <p>
            The work was performed by <strong>{contractorName}</strong>
            {contractorLicense && (
              <span className="text-gray-600"> (License #{contractorLicense})</span>
            )}{" "}
            and has been inspected and approved by the property owner.
          </p>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded border bg-white p-3">
              <p className="text-xs text-gray-500">Work Completed</p>
              <p className="font-medium">{workDescription}</p>
            </div>
            <div className="rounded border bg-white p-3">
              <p className="text-xs text-gray-500">Date of Certification</p>
              <p className="font-medium">{today}</p>
            </div>
          </div>

          {invoiceAmount && (
            <div className="rounded border bg-white p-3">
              <p className="text-xs text-gray-500">Invoice Amount</p>
              <p className="text-lg font-bold text-green-700">
                {invoiceAmount.toLocaleString(undefined, {
                  style: "currency",
                  currency: "USD",
                })}
              </p>
            </div>
          )}
        </div>

        {/* Acknowledgment */}
        <div className="space-y-3 rounded-lg border-2 border-amber-200 bg-amber-50 p-4">
          <h4 className="font-semibold text-amber-900">Homeowner Acknowledgment</h4>
          <div className="flex items-start gap-3">
            <Checkbox
              id="acknowledge"
              checked={acknowledged}
              onCheckedChange={(checked) => setAcknowledged(checked as boolean)}
              disabled={signed}
            />
            <Label htmlFor="acknowledge" className="text-sm leading-relaxed text-gray-700">
              I acknowledge that I have reviewed and accept the completed work. I understand that by
              signing this certificate, I am confirming that all repairs have been completed to my
              satisfaction and I authorize the release of depreciation recovery funds to the
              contractor.
            </Label>
          </div>
        </div>

        {/* Signature Section */}
        <div className="space-y-4">
          <h4 className="font-semibold">Property Owner Signature</h4>

          {signed && signatureUrl ? (
            // eslint-disable-next-line react/jsx-no-comment-textnodes
            <div className="rounded-lg border bg-gray-50 p-4">
              // eslint-disable-next-line @next/next/no-img-element
              <img src={signatureUrl} alt="Signature" className="mx-auto h-24 object-contain" />
              <p className="mt-2 text-center text-sm text-gray-600">Signed on {today}</p>
            </div>
          ) : (
            <>
              <div className="rounded-lg border-2 border-gray-300 bg-white shadow-inner">
                <SignatureCanvas
                  ref={sigPadRef}
                  canvasProps={{
                    className: "w-full h-40 touch-none cursor-crosshair",
                    style: { touchAction: "none" },
                  }}
                  backgroundColor="white"
                  penColor="black"
                  minWidth={1}
                  maxWidth={3}
                  onBegin={() => setHasSignature(true)}
                  throttle={16}
                />
              </div>
              <p className="text-center text-xs text-gray-500">
                Sign above using your mouse or finger
              </p>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClear}
                  disabled={!hasSignature}
                  className="flex-1"
                >
                  Clear Signature
                </Button>
                <Button
                  type="button"
                  onClick={handleSave}
                  disabled={!hasSignature || !acknowledged || isSaving}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  {isSaving ? "Saving..." : "Sign Certificate"}
                </Button>
              </div>
            </>
          )}
        </div>

        <Separator />

        {/* Actions */}
        <div className="flex flex-wrap justify-between gap-3 print:hidden">
          {/* Send to Client - Primary Action */}
          <Button
            onClick={handleSendToClient}
            disabled={isSending}
            className="gap-2 bg-blue-600 hover:bg-blue-700"
          >
            <Send className="h-4 w-4" />
            {isSending ? "Sending..." : "Send to Client for Signature"}
          </Button>

          <div className="flex gap-2">
            <Button variant="outline" onClick={handlePrint} className="gap-2">
              <Printer className="h-4 w-4" />
              Print
            </Button>
            <Button
              variant="outline"
              onClick={handleDownload}
              disabled={isDownloading}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              {isDownloading ? "Saving..." : "Download & Save"}
            </Button>
          </div>
        </div>

        {/* Client Email Info */}
        {clientEmail && (
          <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-800">
            <span className="font-medium">Client Email:</span> {clientEmail}
          </div>
        )}

        {/* Footer */}
        <div className="rounded-lg bg-gray-100 p-4 text-center text-xs text-gray-500 print:bg-white">
          <p>
            This certificate is generated for insurance claim #{claimNumber} and serves as
            documentation for depreciation recovery. The signed certificate becomes part of the
            official claim file.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
