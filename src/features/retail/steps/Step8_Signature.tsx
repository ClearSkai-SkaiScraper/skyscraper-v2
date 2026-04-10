"use client";

import React from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ClaimPacketData } from "@/lib/claims/templates";
import { cn } from "@/lib/utils";

interface Step8Props {
  data: ClaimPacketData;
  updateData: (updates: Partial<ClaimPacketData>) => void;
  validationErrors?: string[];
}

/**
 * Step 8: Signature & Terms (ENHANCED)
 *
 * Required Fields:
 * - clientPrintedName OR clientSignature (at least one)
 * - termsAccepted (checkbox - must be true)
 *
 * Optional Fields:
 * - clientEmail
 * - clientPhone
 * - signatureQRCode (URL for e-signature)
 * - witnessName, witnessSignature, witnessDate
 */
export function Step8_Signature({ data, updateData, validationErrors }: Step8Props) {
  const hasError = (field: string) => {
    return validationErrors?.some((err) => err.toLowerCase().includes(field.toLowerCase()));
  };

  // Check if at least one signature method is provided
  const hasSignature = data.clientPrintedName || data.clientSignature;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Signature & Terms</h2>
        <p className="mt-2 text-sm text-gray-600">
          Capture client agreement and acceptance. Either a printed name or signature is required,
          plus acceptance of terms.
        </p>
      </div>

      {/* Client Information */}
      <div className="space-y-6">
        <h3 className="border-b pb-2 text-lg font-semibold text-gray-800">Client Information</h3>

        {/* Printed Name */}
        <div className="space-y-2">
          <Label htmlFor="clientPrintedName" className="text-sm font-medium">
            Printed Name {!data.clientSignature && <span className="text-red-500">*</span>}
          </Label>
          <Input
            id="clientPrintedName"
            type="text"
            placeholder="John Smith"
            value={data.clientPrintedName || ""}
            onChange={(e) => updateData({ clientPrintedName: e.target.value })}
            className={cn(
              "w-full",
              hasError("clientPrintedName") && "border-red-500 focus-visible:ring-red-500"
            )}
          />
          {hasError("clientPrintedName") && !hasSignature && (
            <p className="text-sm text-red-600">Either printed name or signature is required</p>
          )}
          <p className="text-xs text-gray-500">Client&apos;s full legal name</p>
        </div>

        {/* Email & Phone (Side by Side) */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="clientEmail" className="text-sm font-medium">
              Email Address
            </Label>
            <Input
              id="clientEmail"
              type="email"
              placeholder="client@example.com"
              value={data.clientEmail || ""}
              onChange={(e) => updateData({ clientEmail: e.target.value })}
              className="w-full"
            />
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <Label htmlFor="clientPhone" className="text-sm font-medium">
              Phone Number
            </Label>
            <Input
              id="clientPhone"
              type="tel"
              placeholder="(555) 123-4567"
              value={data.clientPhone || ""}
              onChange={(e) => updateData({ clientPhone: e.target.value })}
              className="w-full"
            />
          </div>
        </div>
      </div>

      {/* Signature Section */}
      <div className="space-y-6">
        <h3 className="border-b pb-2 text-lg font-semibold text-gray-800">Signature</h3>

        {/* Digital Signature (Stub) */}
        <div className="space-y-2">
          <Label htmlFor="clientSignature" className="text-sm font-medium">
            Digital Signature {!data.clientPrintedName && <span className="text-red-500">*</span>}
          </Label>
          <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-8 text-center">
            {data.clientSignature ? (
              <div className="space-y-2">
                <p className="text-sm font-medium text-green-600">✓ Signature Captured</p>
                <button
                  type="button"
                  onClick={() => updateData({ clientSignature: undefined })}
                  className="text-xs text-red-600 hover:underline"
                >
                  Clear Signature
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-gray-600">Signature pad integration coming in Phase 2</p>
                <button
                  type="button"
                  onClick={() => updateData({ clientSignature: "PLACEHOLDER_SIG" })}
                  className="text-xs text-blue-600 hover:underline"
                >
                  Simulate Signature (for testing)
                </button>
              </div>
            )}
          </div>
          {hasError("clientSignature") && !hasSignature && (
            <p className="text-sm text-red-600">Either printed name or signature is required</p>
          )}
          <p className="text-xs text-gray-500">Client&apos;s digital signature (coming in Phase 2)</p>
        </div>

        {/* E-Signature QR Code (Optional) */}
        <div className="space-y-2">
          <Label htmlFor="signatureQRCode" className="text-sm font-medium">
            E-Signature QR Code (Optional)
          </Label>
          <Input
            id="signatureQRCode"
            type="url"
            placeholder="https://example.com/esign/12345"
            value={data.signatureQRCode || ""}
            onChange={(e) => updateData({ signatureQRCode: e.target.value })}
            className="w-full"
          />
          <p className="text-xs text-gray-500">
            URL for remote e-signature (will be converted to QR code in packet)
          </p>
        </div>
      </div>

      {/* Terms & Conditions */}
      <div className="space-y-6">
        <h3 className="border-b pb-2 text-lg font-semibold text-gray-800">Terms & Conditions</h3>

        {/* Terms Accepted Checkbox */}
        <div
          className={cn(
            "flex items-start space-x-3 rounded-lg border-2 p-4",
            hasError("termsAccepted") ? "border-red-300 bg-red-50" : "border-gray-200 bg-gray-50"
          )}
        >
          <Checkbox
            id="termsAccepted"
            checked={data.termsAccepted || false}
            onCheckedChange={(checked) => updateData({ termsAccepted: checked === true })}
            className="mt-1"
            aria-required="true"
            aria-invalid={hasError("termsAccepted")}
          />
          <div className="flex-1">
            <Label htmlFor="termsAccepted" className="cursor-pointer text-sm font-medium">
              I accept the terms and conditions <span className="text-red-500">*</span>
            </Label>
            <p className="mt-1 text-xs text-gray-600">
              By checking this box, the client acknowledges they have read and agree to the terms
              and conditions outlined in this packet.
            </p>
          </div>
        </div>
        {hasError("termsAccepted") && (
          <p className="text-sm text-red-600">
            You must accept the terms and conditions to proceed
          </p>
        )}
      </div>

      {/* Witness Section (Optional) */}
      <div className="space-y-6">
        <h3 className="border-b pb-2 text-lg font-semibold text-gray-800">Witness (Optional)</h3>

        <div className="space-y-4">
          {/* Witness Name */}
          <div className="space-y-2">
            <Label htmlFor="witnessName" className="text-sm font-medium">
              Witness Name
            </Label>
            <Input
              id="witnessName"
              type="text"
              placeholder="Jane Doe"
              value={data.witnessName || ""}
              onChange={(e) => updateData({ witnessName: e.target.value })}
              className="w-full"
            />
          </div>

          {/* Witness Signature (Stub) */}
          <div className="space-y-2">
            <Label htmlFor="witnessSignature" className="text-sm font-medium">
              Witness Signature
            </Label>
            <Textarea
              id="witnessSignature"
              placeholder="Signature pad integration coming in Phase 2"
              value={data.witnessSignature || ""}
              onChange={(e) => updateData({ witnessSignature: e.target.value })}
              className="min-h-[60px] w-full"
              disabled
            />
            <p className="text-xs text-gray-500">Witness signature capture (Phase 2 feature)</p>
          </div>

          {/* Witness Date */}
          <div className="space-y-2">
            <Label htmlFor="witnessDate" className="text-sm font-medium">
              Witness Date
            </Label>
            <Input
              id="witnessDate"
              type="date"
              value={data.witnessDate || ""}
              onChange={(e) => updateData({ witnessDate: e.target.value })}
              className="w-full md:w-64"
            />
          </div>
        </div>
      </div>

      {/* Help Text */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3 flex-1">
            <p className="text-sm text-blue-700">
              <strong>Tip:</strong> Digital signature capture will be available in Phase 2. For now,
              you can use the printed name field or simulate a signature for testing. The QR code
              feature allows clients to sign remotely via email link.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
