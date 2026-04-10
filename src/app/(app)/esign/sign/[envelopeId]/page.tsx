"use client";

/**
 * Remote Signing Page
 *
 * Email link signing with token validation
 */

import { AlertCircle, CheckCircle2, XCircle } from "lucide-react";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { PdfPreview } from "@/components/esign/PdfPreview";
import { SignaturePad } from "@/components/esign/SignaturePad";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { logger } from "@/lib/logger";

function RemoteSigningContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const envelopeId =
    params && typeof params.envelopeId === "string"
      ? params.envelopeId
      : Array.isArray(params?.envelopeId)
        ? params.envelopeId[0]
        : null;
  const token = searchParams?.get("t") ?? null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [envelope, setEnvelope] = useState<any>(null);
  const [signer, setSigner] = useState<any>(null);
  const [printedName, setPrintedName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [signed, setSigned] = useState(false);

  useEffect(() => {
    if (!envelopeId) {
      setError("Invalid signature link - missing envelope ID");
      setLoading(false);
      return;
    }

    if (!token) {
      setError("Invalid signature link - no token provided");
      setLoading(false);
      return;
    }
    void loadEnvelope();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [envelopeId, token]);

  async function loadEnvelope() {
    try {
      const res = await fetch(`/api/esign/envelopes/${envelopeId}`);
      const data = await res.json();
      if (data.ok) {
        setEnvelope(data.envelope);

        // Find signer for this token (simplified - in production, validate token server-side)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const pendingSigner = data.envelope.signers.find((s: any) => s.status === "PENDING");
        if (pendingSigner) {
          setSigner(pendingSigner);
          setPrintedName(pendingSigner.displayName);
        } else {
          setError("All required signatures have been collected");
        }
      } else {
        setError(data.message || "Failed to load document");
      }
    } catch (err) {
      setError("Failed to load document");
      logger.error("Failed to load envelope", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSignatureSave(signatureDataUrl: string) {
    if (!signer) return;
    if (!envelopeId) return;

    try {
      const blob = await fetch(signatureDataUrl).then((r) => r.blob());
      const file = new File([blob], "signature.png", { type: "image/png" });

      // Find signature field for this signer's role
      const signatureField = envelope.fields.find(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (f: any) => f.assignedRole === signer.role && f.type === "SIGNATURE"
      );

      if (!signatureField) {
        alert("Signature field not found");
        return;
      }

      const formData = new FormData();
      formData.append("signature", file);
      formData.append("fieldId", signatureField.id);
      formData.append("printedName", printedName);

      const res = await fetch(
        `/api/esign/envelopes/${envelopeId}/signers/${signer.id}/signature?t=${token}`,
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await res.json();
      if (data.ok) {
        setSigned(true);

        // Check if we should auto-finalize
        await loadEnvelope();
        const updatedEnvelope = await fetch(`/api/esign/envelopes/${envelopeId}`).then((r) =>
          r.json()
        );
        if (
          updatedEnvelope.ok &&
          updatedEnvelope.envelope.signedCount >= updatedEnvelope.envelope.requiredSignerCount
        ) {
          // Auto-finalize (this would need auth - simplified here)
          await fetch(`/api/esign/envelopes/${envelopeId}/finalize`, { method: "POST" });
        }
      } else {
        alert(data.message || "Failed to save signature");
      }
    } catch (err) {
      logger.error("Signature save error:", err);
      alert("Failed to save signature");
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

  if (error) {
    return (
      <PageContainer>
        <Card className="mx-auto max-w-2xl">
          <CardContent className="pt-6">
            <div className="space-y-4 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                <XCircle className="h-10 w-10 text-red-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Unable to Sign Document</h2>
              <p className="text-gray-600">{error}</p>
              <p className="text-sm text-gray-500">
                If you believe this is an error, please contact the sender.
              </p>
            </div>
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  if (signed) {
    return (
      <PageContainer>
        <Card className="mx-auto max-w-2xl">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>
            <CardTitle className="text-2xl">Signature Received!</CardTitle>
            <CardDescription>Thank you for signing this document</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-center text-gray-600">
              Your signature has been securely recorded. You may now close this window.
            </p>
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="mx-auto max-w-4xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{envelope?.title}</CardTitle>
            <CardDescription>Please review and sign the document below</CardDescription>
          </CardHeader>
        </Card>

        {envelope?.sourcePdfPath && (
          <Card>
            <CardContent className="pt-6">
              <PdfPreview pdfUrl={envelope.sourcePdfPath} title="Document Preview" />
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Your Signature</CardTitle>
            <CardDescription>
              Signing as: {signer?.displayName} ({signer?.role})
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label htmlFor="printedName">Printed Name *</Label>
              <Input
                id="printedName"
                value={printedName}
                onChange={(e) => setPrintedName(e.target.value)}
                placeholder="Enter your full name"
                required
              />
            </div>

            <SignaturePad
              onSave={handleSignatureSave}
              signerName={printedName}
              disabled={!printedName}
            />

            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
              <div className="flex gap-3">
                <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600" />
                <div className="text-sm text-blue-900">
                  <p className="font-medium">Legal Notice</p>
                  <p className="mt-1">
                    By signing this document electronically, you agree that your electronic
                    signature is the legal equivalent of your manual signature.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}

export default function RemoteSigningPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <RemoteSigningContent />
    </Suspense>
  );
}
