"use client";

/**
 * On-Site Signing Flow
 *
 * Contractor-led signature collection at the door
 */

import { CheckCircle2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { SignaturePad } from "@/components/esign/SignaturePad";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { logger } from "@/lib/logger";

interface Signer {
  id: string;
  role: string;
  displayName: string;
  status: string;
}

interface Envelope {
  id: string;
  title: string;
  status: string;
  signedCount: number;
  requiredSignerCount: number;
  signers: Signer[];
}

export default function OnSiteSigningPage() {
  const params = useParams();
  const router = useRouter();
  const envelopeId =
    params && typeof params.envelopeId === "string"
      ? params.envelopeId
      : Array.isArray(params?.envelopeId)
        ? params.envelopeId[0]
        : null;

  const [envelope, setEnvelope] = useState<Envelope | null>(null);
  const [currentSignerIndex, setCurrentSignerIndex] = useState(0);
  const [printedName, setPrintedName] = useState("");
  const [loading, setLoading] = useState(true);
  const [finalized, setFinalized] = useState(false);

  useEffect(() => {
    if (!envelopeId) {
      setLoading(false);
      return;
    }

    void loadEnvelope();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [envelopeId]);

  async function loadEnvelope() {
    try {
      const res = await fetch(`/api/esign/envelopes/${envelopeId}`);
      const data = await res.json();
      if (data.ok) {
        setEnvelope(data.envelope);
        // Find first unsigned signer
        const firstUnsigned = data.envelope.signers.findIndex(
          (s: Signer) => s.status === "PENDING"
        );
        if (firstUnsigned >= 0) {
          setCurrentSignerIndex(firstUnsigned);
        }
      }
    } catch (error) {
      logger.error("Failed to load envelope:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSignatureSave(signatureDataUrl: string) {
    if (!envelope) return;
    if (!envelopeId) return;

    const currentSigner = envelope.signers[currentSignerIndex];
    const fieldId = `field_${currentSigner.role.toLowerCase()}_sig`; // Simplified - should match actual field

    try {
      // Convert data URL to file
      const blob = await fetch(signatureDataUrl).then((r) => r.blob());
      const file = new File([blob], "signature.png", { type: "image/png" });

      const formData = new FormData();
      formData.append("signature", file);
      formData.append("fieldId", fieldId);
      formData.append("printedName", printedName);

      const res = await fetch(
        `/api/esign/envelopes/${envelopeId}/signers/${currentSigner.id}/signature`,
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await res.json();
      if (data.ok) {
        // Move to next signer or finalize
        if (currentSignerIndex < envelope.signers.length - 1) {
          setCurrentSignerIndex(currentSignerIndex + 1);
          setPrintedName("");
          await loadEnvelope(); // Reload to update status
        } else {
          // All signed - proceed to finalize
          await handleFinalize();
        }
      } else {
        alert(data.message || "Failed to save signature");
      }
    } catch (error) {
      logger.error("Signature save error:", error);
      alert("Failed to save signature");
    }
  }

  async function handleFinalize() {
    try {
      const res = await fetch(`/api/esign/envelopes/${envelopeId}/finalize`, {
        method: "POST",
      });

      const data = await res.json();
      if (data.ok) {
        setFinalized(true);
      } else {
        alert(data.message || "Failed to finalize");
      }
    } catch (error) {
      logger.error("Finalize error:", error);
      alert("Failed to finalize");
    }
  }

  if (loading) {
    return (
      <PageContainer>
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
        </div>
      </PageContainer>
    );
  }

  if (!envelope) {
    return (
      <PageContainer>
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-gray-600">Envelope not found</p>
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  if (finalized) {
    return (
      <PageContainer>
        <Card className="mx-auto max-w-2xl">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>
            <CardTitle className="text-2xl">Document Signed Successfully!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-center text-gray-600">
              All signatures have been collected and the document has been finalized.
            </p>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => router.push(`/claims/${envelope.id}`)}
                className="flex-1"
              >
                Back to Claim
              </Button>
              <Button onClick={() => window.print()} className="flex-1">
                Print Document
              </Button>
            </div>
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  const currentSigner = envelope.signers[currentSignerIndex];
  const progress = ((currentSignerIndex + 1) / envelope.signers.length) * 100;

  return (
    <PageContainer>
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Progress */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium">{envelope.title}</span>
                <span className="text-gray-600">
                  {currentSignerIndex + 1} of {envelope.signers.length} signatures
                </span>
              </div>
              <progress className="h-2 w-full" max={100} value={progress} />
            </div>
          </CardContent>
        </Card>

        {/* Signature Collection */}
        <Card>
          <CardHeader>
            <CardTitle>{currentSigner.role} Signature</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label htmlFor="printedName">Printed Name *</Label>
              <Input
                id="printedName"
                value={printedName}
                onChange={(e) => setPrintedName(e.target.value)}
                placeholder={currentSigner.displayName}
                required
              />
            </div>

            <SignaturePad
              onSave={handleSignatureSave}
              signerName={`${currentSigner.displayName} - ${currentSigner.role}`}
              disabled={!printedName}
            />
          </CardContent>
        </Card>

        {/* Signer List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Signature Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {envelope.signers.map((signer, index) => (
                <div
                  key={signer.id}
                  className={`flex items-center justify-between rounded p-2 ${
                    index === currentSignerIndex ? "bg-blue-50" : ""
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {signer.status === "SIGNED" ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    ) : index === currentSignerIndex ? (
                      <div className="h-5 w-5 rounded-full border-2 border-blue-600" />
                    ) : (
                      <div className="h-5 w-5 rounded-full border-2 border-gray-300" />
                    )}
                    <span className="text-sm font-medium">{signer.displayName}</span>
                    <span className="text-xs text-gray-600">({signer.role})</span>
                  </div>
                  <span className="text-xs text-gray-500">{signer.status}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
