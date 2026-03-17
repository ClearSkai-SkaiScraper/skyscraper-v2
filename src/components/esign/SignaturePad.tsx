"use client";

/**
 * SignaturePad Component
 *
 * Mobile-optimized signature capture using react-signature-canvas
 */

import { useRef, useState } from "react";
import SignatureCanvas from "react-signature-canvas";

import { Button } from "@/components/ui/button";
import { logger } from "@/lib/logger";

interface SignaturePadProps {
  onSave: (signatureDataUrl: string) => void | Promise<void>;
  onClear?: () => void;
  disabled?: boolean;
  signerName?: string;
}

export function SignaturePad({ onSave, onClear, disabled, signerName }: SignaturePadProps) {
  const sigPadRef = useRef<SignatureCanvas>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  const handleClear = () => {
    sigPadRef.current?.clear();
    setHasSignature(false);
    onClear?.();
  };

  const handleSave = async () => {
    if (!sigPadRef.current || sigPadRef.current.isEmpty()) {
      alert("Please provide a signature first");
      return;
    }

    setIsSaving(true);
    try {
      const dataUrl = sigPadRef.current.toDataURL("image/png");
      await onSave(dataUrl);
    } catch (error) {
      logger.error("Failed to save signature:", error);
      alert("Failed to save signature. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleBegin = () => {
    setHasSignature(true);
  };

  return (
    <div className="w-full space-y-4">
      {signerName && (
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900">{signerName}</h3>
          <p className="text-sm text-gray-600">Sign in the box below</p>
        </div>
      )}

      <div className="rounded-lg border-2 border-gray-300 bg-white shadow-inner">
        <SignatureCanvas
          ref={sigPadRef}
          canvasProps={{
            className: "w-full h-48 md:h-64 touch-none cursor-crosshair",
            style: { touchAction: "none" },
          }}
          backgroundColor="white"
          penColor="black"
          minWidth={1}
          maxWidth={3}
          onBegin={handleBegin}
          throttle={16}
        />
      </div>

      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={handleClear}
          disabled={disabled || !hasSignature}
          className="flex-1"
        >
          Clear
        </Button>

        <Button
          type="button"
          onClick={handleSave}
          disabled={disabled || !hasSignature || isSaving}
          className="flex-1 bg-blue-600 hover:bg-blue-700"
        >
          {isSaving ? "Saving..." : "Save Signature"}
        </Button>
      </div>

      <p className="text-center text-xs text-gray-500">
        By signing, you agree that this signature is legally binding
      </p>
    </div>
  );
}
