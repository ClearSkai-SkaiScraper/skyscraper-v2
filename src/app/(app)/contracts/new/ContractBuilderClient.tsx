"use client";

import { CheckCircle, FileSignature, Loader2, Mail, Send, Upload, X } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";

import { JobClaimSelector } from "@/components/trades/JobClaimSelector";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { logger } from "@/lib/logger";

interface ContractBuilderClientProps {
  orgId: string;
  userId: string;
}

type ContractType = "insurance_claim" | "retail" | "bid_sales" | "warranty" | "upgrade" | "other";

interface SignaturePadProps {
  onSave: (dataUrl: string) => void;
  onClear: () => void;
}

function SignaturePad({ onSave, onClear }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  // Fixed canvas dimensions
  const CANVAS_WIDTH = 500;
  const CANVAS_HEIGHT = 150;

  // Get properly scaled coordinates accounting for CSS scaling
  const getScaledCoords = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

    // Scale factor: canvas internal size vs CSS rendered size
    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  }, []);

  const startDrawing = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      setIsDrawing(true);
      const { x, y } = getScaledCoords(e);

      ctx.beginPath();
      ctx.moveTo(x, y);
    },
    [getScaledCoords]
  );

  const draw = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (!isDrawing) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const { x, y } = getScaledCoords(e);

      ctx.strokeStyle = "#1a1a1a";
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.lineTo(x, y);
      ctx.stroke();
      setHasSignature(true);
    },
    [isDrawing, getScaledCoords]
  );

  const stopDrawing = useCallback(() => {
    setIsDrawing(false);
    if (hasSignature && canvasRef.current) {
      onSave(canvasRef.current.toDataURL());
    }
  }, [hasSignature, onSave]);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
    onClear();
  }, [onClear]);

  return (
    <div className="space-y-2">
      <div className="relative rounded-xl border-2 border-dashed border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-900">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="h-[150px] w-full max-w-[500px] cursor-crosshair touch-none"
          style={{ touchAction: "none" }}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
        <p className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs text-muted-foreground">
          Sign above
        </p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={clearCanvas}>
          <X className="mr-1 h-3 w-3" />
          Clear
        </Button>
        {hasSignature && (
          <span className="flex items-center gap-1 text-xs text-emerald-600">
            <CheckCircle className="h-3 w-3" />
            Signature captured
          </span>
        )}
      </div>
    </div>
  );
}

export function ContractBuilderClient({ orgId, userId }: ContractBuilderClientProps) {
  const [selectedType, setSelectedType] = useState<ContractType | null>(null);
  const [selectedJobOrClaim, setSelectedJobOrClaim] = useState<string>("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [clientEmail, setClientEmail] = useState("");
  const [clientName, setClientName] = useState("");
  const [notes, setNotes] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const CONTRACT_TYPES: { id: ContractType; label: string; description: string }[] = [
    {
      id: "insurance_claim",
      label: "Insurance Claim",
      description: "Insurance-backed restoration",
    },
    { id: "retail", label: "Retail / Out-of-Pocket", description: "Direct customer payment" },
    { id: "bid_sales", label: "Bid / Sales Package", description: "Proposal or estimate" },
    { id: "warranty", label: "Warranty Agreement", description: "Warranty documentation" },
    { id: "upgrade", label: "Upgrade Contract", description: "Additional work agreement" },
    { id: "other", label: "Other", description: "Other contract type" },
  ];

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 25 * 1024 * 1024) {
        toast.error("File too large. Maximum size is 25MB.");
        return;
      }
      setUploadedFile(file);
      toast.success(`Selected: ${file.name}`);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (file.size > 25 * 1024 * 1024) {
        toast.error("File too large. Maximum size is 25MB.");
        return;
      }
      setUploadedFile(file);
      toast.success(`Selected: ${file.name}`);
    }
  }, []);

  const handleSendForSignature = useCallback(async () => {
    if (!clientEmail || !clientName) {
      toast.error("Please enter client name and email");
      return;
    }
    if (!uploadedFile && !signatureDataUrl) {
      toast.error("Please upload a contract or add a signature");
      return;
    }

    setSending(true);
    try {
      // Upload file first if present
      let documentUrl = "";
      if (uploadedFile) {
        setUploading(true);
        const formData = new FormData();
        formData.append("file", uploadedFile);
        formData.append("type", "contract");
        formData.append("orgId", orgId);

        const uploadRes = await fetch("/api/uploads", {
          method: "POST",
          body: formData,
        });

        if (!uploadRes.ok) {
          throw new Error("Failed to upload document");
        }

        const uploadData = await uploadRes.json();
        documentUrl = uploadData.url;
        setUploading(false);
      }

      // Parse job/claim ID
      const [type, id] = selectedJobOrClaim.split(":") || [];
      const linkedClaimId = type === "claim" ? id : null;
      const linkedJobId = ["retail", "financed", "repair", "lead"].includes(type) ? id : null;

      // Send contract via email
      const res = await fetch("/api/contracts/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientEmail,
          clientName,
          contractType: selectedType,
          documentUrl,
          signatureDataUrl,
          linkedClaimId,
          linkedJobId,
          notes,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to send contract");
      }

      setSent(true);
      toast.success(`Contract sent to ${clientEmail}!`);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      logger.error("[ContractBuilder] send failed:", error);
      toast.error(error.message || "Failed to send contract");
    } finally {
      setSending(false);
      setUploading(false);
    }
  }, [
    clientEmail,
    clientName,
    uploadedFile,
    signatureDataUrl,
    selectedType,
    selectedJobOrClaim,
    notes,
    orgId,
  ]);

  if (sent) {
    return (
      <Card className="border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/20">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <CheckCircle className="h-16 w-16 text-emerald-600" />
          <h3 className="mt-4 text-xl font-bold text-emerald-800 dark:text-emerald-200">
            Contract Sent!
          </h3>
          <p className="mt-2 text-emerald-600 dark:text-emerald-400">
            We&apos;ve sent the contract to <strong>{clientEmail}</strong> for signature.
          </p>
          <Button className="mt-6" onClick={() => window.location.reload()}>
            Create Another Contract
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Contract Type Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSignature className="h-5 w-5" />
            Contract Type
          </CardTitle>
          <CardDescription>Select the type of contract</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {CONTRACT_TYPES.map((type) => (
              <button
                key={type.id}
                type="button"
                onClick={() => setSelectedType(type.id)}
                className={`rounded-xl border p-3 text-left transition-all hover:shadow-md ${
                  selectedType === type.id
                    ? "border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-950/30"
                    : "border-slate-200 dark:border-slate-700"
                }`}
              >
                <p className="font-medium">{type.label}</p>
                <p className="text-xs text-muted-foreground">{type.description}</p>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Link to Job/Claim */}
      <Card>
        <CardHeader>
          <CardTitle>Link to Job or Claim</CardTitle>
          <CardDescription>Associate this contract with an existing job or claim</CardDescription>
        </CardHeader>
        <CardContent>
          <JobClaimSelector
            value={selectedJobOrClaim}
            onValueChange={setSelectedJobOrClaim}
            placeholder="Select a job or claim to link…"
            className="w-full"
          />
        </CardContent>
      </Card>

      {/* Upload Document */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Contract Document
          </CardTitle>
          <CardDescription>Upload a PDF contract (optional if using signature pad)</CardDescription>
        </CardHeader>
        <CardContent>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={handleFileChange}
            className="hidden"
          />
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
            className={`cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-all hover:bg-slate-50 dark:hover:bg-slate-800/50 ${
              uploadedFile
                ? "border-emerald-300 bg-emerald-50/50 dark:border-emerald-700 dark:bg-emerald-950/20"
                : "border-slate-300 dark:border-slate-700"
            }`}
          >
            {uploadedFile ? (
              <div className="flex flex-col items-center">
                <CheckCircle className="h-10 w-10 text-emerald-600" />
                <p className="mt-2 font-medium">{uploadedFile.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={(e) => {
                    e.stopPropagation();
                    setUploadedFile(null);
                  }}
                >
                  Remove
                </Button>
              </div>
            ) : (
              <>
                <Upload className="mx-auto h-10 w-10 text-slate-400" />
                <p className="mt-2 font-medium">Drop your contract here, or click to browse</p>
                <p className="text-sm text-muted-foreground">PDF, DOC, DOCX up to 25MB</p>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Signature Pad */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSignature className="h-5 w-5" />
            Your Signature (Contractor)
          </CardTitle>
          <CardDescription>
            Sign here to pre-sign the contract before sending to client
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SignaturePad
            onSave={(dataUrl) => setSignatureDataUrl(dataUrl)}
            onClear={() => setSignatureDataUrl(null)}
          />
        </CardContent>
      </Card>

      {/* Client Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Client Details
          </CardTitle>
          <CardDescription>Enter client information to send contract for signature</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="clientName">Client Name</Label>
              <Input
                id="clientName"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="John Smith"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="clientEmail">Client Email</Label>
              <Input
                id="clientEmail"
                type="email"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                placeholder="client@example.com"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional notes for the client…"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" asChild>
          <a href="/contracts">Cancel</a>
        </Button>
        <Button
          onClick={handleSendForSignature}
          disabled={sending || uploading || !clientEmail || !clientName}
          className="gap-2"
        >
          {sending || uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          {uploading ? "Uploading…" : sending ? "Sending…" : "Send for Signature"}
        </Button>
      </div>
    </div>
  );
}
