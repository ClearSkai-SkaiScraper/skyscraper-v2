"use client";

/**
 * DEPRECIATION BUILDER CLIENT
 * Full multi-tab workspace for final payout, depreciation recovery,
 * invoices, homeowner acceptance, and contractor statements.
 *
 * This wraps the FinalPayoutClient with a claim selector header.
 */

import {
  AlertCircle,
  ArrowRight,
  BadgeCheck,
  Calculator,
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  Clock,
  DollarSign,
  Download,
  FileSignature,
  FileText,
  Info,
  Loader2,
  Package,
  Percent,
  Plus,
  Receipt,
  Send,
  Shield,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { PageContainer } from "@/components/layout/PageContainer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { logger } from "@/lib/logger";

import { CertificateOfCompletion } from "./CertificateOfCompletion";
import { FinalInvoice } from "./FinalInvoice";

// Types
interface Supplement {
  id: string;
  title: string;
  amount: number | null;
  status: string | null;
  reason: string | null;
  createdAt: string | null;
}

interface Photo {
  id: string;
  url: string | null;
  category: string | null;
  caption: string | null;
  createdAt: string | null;
}

interface Document {
  id: string;
  name: string | null;
  url: string | null;
  type: string | null;
  createdAt: string | null;
}

interface ClaimData {
  id: string;
  claimNumber: string;
  title: string;
  status: string;
  carrier: string | null;
  policyNumber: string | null;
  dateOfLoss: string | null;
  dateOfInspection: string | null;
  insured_name: string | null;
  homeownerEmail: string | null;
  adjusterName: string | null;
  adjusterEmail: string | null;
  adjusterPhone: string | null;
  damageType: string | null;
  propertyAddress: string | null;
  propertyCity: string | null;
  propertyState: string | null;
  propertyZip: string | null;
  estimatedValue: number | null;
  rcvTotal: number | null;
  acvTotal: number | null;
  depreciationTotal: number | null;
  deductible: number | null;
  acvPaid: number | null;
  coverageA: number | null;
  coverageB: number | null;
  coverageC: number | null;
  supplements: Supplement[];
  photos: Photo[];
  documents: Document[];
}

interface ClaimForSelector {
  id: string;
  claimNumber: string;
  title: string | null;
  lossAddress: string | null;
  insured_name: string | null;
  status: string;
}

interface DepreciationBuilderClientProps {
  claim: ClaimData;
  claims: ClaimForSelector[];
  orgId: string;
  userId: string;
}

// Coverage line item type
interface CoverageLineItem {
  id: string;
  description: string;
  coverage: "A" | "B" | "C";
  rcv: number;
  depreciation: number;
  acv: number;
  completed: boolean;
  recoverable: boolean;
  notes?: string;
}

// Payout status
type PayoutStatus =
  | "not_started"
  | "estimate_uploaded"
  | "items_reviewed"
  | "documentation_complete"
  | "invoice_generated"
  | "submitted"
  | "approved"
  | "paid";

const PAYOUT_STAGES = [
  { id: "not_started", label: "Not Started", icon: Clock },
  { id: "estimate_uploaded", label: "Estimate Uploaded", icon: Upload },
  { id: "items_reviewed", label: "Items Reviewed", icon: ClipboardCheck },
  { id: "documentation_complete", label: "Documentation Complete", icon: Camera },
  { id: "invoice_generated", label: "Invoice Generated", icon: Receipt },
  { id: "submitted", label: "Submitted to Carrier", icon: Send },
  { id: "approved", label: "Approved", icon: BadgeCheck },
  { id: "paid", label: "Paid", icon: DollarSign },
];

export function DepreciationBuilderClient({
  claim,
  claims,
  orgId: _orgId,
  userId: _userId,
}: DepreciationBuilderClientProps) {
  const router = useRouter();
  const _searchParams = useSearchParams();

  const [activeTab, setActiveTab] = useState("summary");
  const [payoutStatus, setPayoutStatus] = useState<PayoutStatus>("not_started");
  const [isGeneratingInvoice, setIsGeneratingInvoice] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCertificationDialog, setShowCertificationDialog] = useState(false);
  const [certificationSigned, setCertificationSigned] = useState(false);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notesToCarrier, setNotesToCarrier] = useState("");
  const [generatedPacketUrl, setGeneratedPacketUrl] = useState<string | null>(null);

  // Coverage line items - initialized from API or defaults
  const [lineItems, setLineItems] = useState<CoverageLineItem[]>([]);

  // Supplements state
  const [supplements, setSupplements] = useState<
    {
      id: string;
      description: string;
      amount: number;
      category: string;
      status: "pending" | "approved" | "denied";
    }[]
  >([]);

  // Photo requirements
  const [photoCategories, setPhotoCategories] = useState([
    { id: "tearoff", label: "Tear-Off Photos", required: true, uploaded: 0 },
    { id: "decking", label: "Decking Repairs", required: true, uploaded: 0 },
    { id: "underlayment", label: "Underlayment", required: true, uploaded: 0 },
    { id: "ice_water", label: "Ice & Water Shield", required: true, uploaded: 0 },
    { id: "ventilation", label: "Ventilation", required: false, uploaded: 0 },
    { id: "final", label: "Final Restoration", required: true, uploaded: 0 },
  ]);

  // Handle claim change
  const handleClaimChange = (claimId: string) => {
    router.push(`/ai/tools/depreciation?claimId=${claimId}`);
  };

  // Fetch final payout data from API
  useEffect(() => {
    const fetchPayoutData = async () => {
      try {
        const res = await fetch(`/api/claims/${claim.id}/final-payout`);
        if (res.ok) {
          const data = await res.json();

          // Set payout status from API
          if (data.payoutStatus) {
            const statusMap: Record<string, PayoutStatus> = {
              work_in_progress: "not_started",
              work_completed: "estimate_uploaded",
              docs_uploaded: "documentation_complete",
              invoice_generated: "invoice_generated",
              submitted: "submitted",
              under_review: "submitted",
              approved: "approved",
              paid: "paid",
            };
            setPayoutStatus(statusMap[data.payoutStatus] || "not_started");
          }

          // Set line items from API
          if (data.lineItems && data.lineItems.length > 0) {
            setLineItems(
              data.lineItems.map((item: any) => ({
                id: item.id,
                description: item.description,
                coverage: "A" as const,
                rcv: item.rcv,
                depreciation: item.depreciation || item.rcv - item.acv,
                acv: item.acv,
                completed: item.completed ?? true,
                recoverable: item.recoverable ?? true,
                notes: item.notes,
              }))
            );
          } else {
            // No line items from API — start with empty state
            setLineItems([]);
          }

          // Set supplements from API
          if (data.supplements && data.supplements.length > 0) {
            setSupplements(
              data.supplements.map((s: any) => ({
                id: s.id,
                description: s.description,
                amount: s.amount,
                category: s.category || "other",
                status: s.status || "pending",
              }))
            );
          }

          // Update photo counts
          if (data.completionPhotos) {
            const photoCount = data.completionPhotos.length;
            setPhotoCategories((prev) =>
              prev.map((cat) => ({
                ...cat,
                uploaded: Math.floor(photoCount / 6) + (cat.id === "final" ? photoCount % 6 : 0),
              }))
            );
          }

          // Set generated packet URL if exists
          if (data.documents && data.documents.length > 0) {
            const packet = data.documents.find(
              (d: any) => d.type === "FINAL_PACKET" || d.type === "DEPRECIATION"
            );
            if (packet?.url) {
              setGeneratedPacketUrl(packet.url);
            }
          }
        }
      } catch (error) {
        logger.error("Failed to fetch payout data:", error);
        // Set defaults on error
        setLineItems([
          {
            id: "1",
            description: "Remove & Replace Shingles - Main Roof",
            coverage: "A",
            rcv: claim.rcvTotal || 15420.0,
            depreciation: claim.depreciationTotal || 3084.0,
            acv: claim.acvTotal || 12336.0,
            completed: true,
            recoverable: true,
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    };

    void fetchPayoutData();
  }, [claim.id, claim.rcvTotal, claim.depreciationTotal, claim.acvTotal]);

  // Calculate totals
  const completedItems = lineItems.filter((item) => item.completed);
  const recoverableItems = lineItems.filter((item) => item.recoverable && item.completed);

  const totalRCV = completedItems.reduce((sum, item) => sum + item.rcv, 0);
  const totalDepreciation = recoverableItems.reduce((sum, item) => sum + item.depreciation, 0);
  const totalACV = completedItems.reduce((sum, item) => sum + item.acv, 0);
  const approvedSupplements = supplements
    .filter((s) => s.status === "approved")
    .reduce((sum, s) => sum + s.amount, 0);
  const deductible = claim.deductible || 1000;
  const acvAlreadyPaid = claim.acvPaid || totalACV;

  const recoverableDepreciation = totalDepreciation;
  const totalDue = recoverableDepreciation + approvedSupplements;

  // Format currency helper - removes the $ symbol for cleaner display
  const formatCurrency = (amount: number, showSymbol = false) => {
    const formatted = amount.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return showSymbol ? `$${formatted}` : formatted;
  };

  // Progress calculation
  const getProgressPercent = () => {
    const stageIndex = PAYOUT_STAGES.findIndex((s) => s.id === payoutStatus);
    return ((stageIndex + 1) / PAYOUT_STAGES.length) * 100;
  };

  const handleToggleCompleted = (itemId: string) => {
    setLineItems((items) =>
      items.map((item) => (item.id === itemId ? { ...item, completed: !item.completed } : item))
    );
  };

  const handleToggleRecoverable = (itemId: string) => {
    setLineItems((items) =>
      items.map((item) => (item.id === itemId ? { ...item, recoverable: !item.recoverable } : item))
    );
  };

  const handleGenerateInvoice = async () => {
    setIsGeneratingInvoice(true);
    try {
      const res = await fetch(`/api/claims/${claim.id}/final-payout/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate_packet",
          includePhotos: true,
          includeSupplements: true,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to generate packet");
      }

      const data = await res.json();
      setGeneratedPacketUrl(data.url);
      setPayoutStatus("invoice_generated");
      toast.success("Final payout packet generated successfully!");
    } catch (error) {
      logger.error("Generate packet error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to generate invoice");
    } finally {
      setIsGeneratingInvoice(false);
    }
  };

  // Handle signature from Certificate of Completion
  const handleSignature = async (dataUrl: string) => {
    try {
      setSignatureDataUrl(dataUrl);
      setCertificationSigned(true);

      // Save signature to API via unified actions endpoint
      await fetch(`/api/claims/${claim.id}/final-payout/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "capture_signature",
          signatureData: dataUrl,
          signerName: claim.insured_name || "Property Owner",
          signerRole: "homeowner",
        }),
      });

      toast.success("Certificate signed successfully!");
    } catch (error) {
      logger.error("Failed to save signature:", error);
      toast.error("Failed to save signature");
    }
  };

  // Send certificate to client for remote signature
  const handleSendToClient = async () => {
    try {
      const res = await fetch(`/api/claims/${claim.id}/final-payout/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send_certificate",
          recipientEmail: claim.homeownerEmail || claim.adjusterEmail || "",
          recipientName: claim.insured_name || "Property Owner",
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to send");
      }

      const data = await res.json();
      toast.success(data.message || "Certificate sent to client!");
    } catch (error) {
      logger.error("Failed to send to client:", error);
      toast.error(error instanceof Error ? error.message : "Failed to send certificate");
    }
  };

  // Download certificate and save to claim
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleDownloadCertificate = async (signatureDataUrl?: string) => {
    try {
      // Save to claim first via unified actions endpoint
      await fetch(`/api/claims/${claim.id}/final-payout/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_certificate",
          certificateData: {
            completionDate: new Date().toISOString(),
            notes: `Signed by ${claim.insured_name || "Property Owner"}`,
          },
        }),
      });

      // Trigger print dialog for PDF
      window.print();

      toast.success("Certificate saved to claim!");
    } catch (error) {
      logger.error("Failed to save certificate:", error);
      // Still allow download even if save fails
      window.print();
    }
  };

  const handleSubmitToCarrier = async () => {
    if (!certificationSigned) {
      setShowCertificationDialog(true);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/claims/${claim.id}/final-payout/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "submit",
          confirmationChecks: {
            workCompleted: true,
            documentsUploaded: true,
            invoiceGenerated: !!generatedPacketUrl,
          },
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to submit");
      }

      const data = await res.json();
      setPayoutStatus("submitted");
      toast.success(
        `Submitted to carrier successfully!${data.emailSent ? " Email notification sent." : ""}`
      );
    } catch (error) {
      logger.error("Submit error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to submit to carrier");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show loading state
  if (isLoading) {
    return (
      <PageContainer maxWidth="7xl">
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Loading final payout data...</p>
          </div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer maxWidth="7xl">
      <div className="space-y-6">
        {/* Workspace Hero Header - Green "Payday" Theme */}
        <div className="overflow-hidden rounded-2xl border bg-card">
          <div className="bg-gradient-to-r from-green-600 to-emerald-700 px-6 py-6 text-white">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="flex items-center gap-2 text-sm text-white/80">
                  <Link href="/ai/tools/depreciation" className="hover:text-white">
                    Depreciation Builder
                  </Link>
                  <ChevronRight className="h-4 w-4" />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="flex items-center gap-1 font-medium text-white hover:text-white/90">
                        {claim.claimNumber}
                        <ChevronDown className="h-4 w-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="max-h-[300px] overflow-y-auto">
                      {claims.map((c) => (
                        <DropdownMenuItem
                          key={c.id}
                          onClick={() => handleClaimChange(c.id)}
                          className={c.id === claim.id ? "bg-accent" : ""}
                        >
                          <div className="flex flex-col">
                            <span className="font-medium">{c.claimNumber}</span>
                            <span className="text-xs text-muted-foreground">
                              {c.insured_name || c.lossAddress || "No address"}
                            </span>
                          </div>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <h1 className="mt-3 flex items-center gap-3 text-2xl font-bold md:text-3xl">
                  <Calculator className="h-8 w-8" />
                  Depreciation Builder & Final Payout
                </h1>
                <p className="mt-2 text-white/90">
                  {claim.propertyAddress
                    ? `${claim.propertyAddress}, ${claim.propertyCity}, ${claim.propertyState}`
                    : claim.insured_name || "No address on file"}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" size="sm" asChild>
                  <Link href={`/claims/${claim.id}/overview`}>
                    <ArrowRight className="mr-2 h-4 w-4 rotate-180" />
                    View Claim
                  </Link>
                </Button>
                {payoutStatus === "invoice_generated" && (
                  <Button
                    size="sm"
                    className="bg-white text-green-700 hover:bg-white/90"
                    onClick={handleSubmitToCarrier}
                    disabled={isSubmitting}
                  >
                    <Send className="mr-2 h-4 w-4" />
                    {isSubmitting ? "Submitting..." : "Submit to Carrier"}
                  </Button>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between border-t bg-green-50/50 px-6 py-3 dark:bg-green-950/20">
            <div className="flex items-center gap-4 text-sm">
              <span className="font-medium text-green-800 dark:text-green-200">
                Total Due: {formatCurrency(totalDue)}
              </span>
              <span className="text-muted-foreground">|</span>
              <span className="text-muted-foreground">
                Recoverable: {formatCurrency(recoverableDepreciation)}
              </span>
              {approvedSupplements > 0 && (
                <>
                  <span className="text-muted-foreground">|</span>
                  <span className="text-muted-foreground">
                    Supplements: {formatCurrency(approvedSupplements)}
                  </span>
                </>
              )}
            </div>
            <Badge
              variant="outline"
              className="border-green-600 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
            >
              {PAYOUT_STAGES.find((s) => s.id === payoutStatus)?.label}
            </Badge>
          </div>
        </div>

        {/* Progress Tracker */}
        <Card className="border-green-200/50 dark:border-green-800/50">
          <CardContent className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm font-medium">
                <Receipt className="h-4 w-4 text-green-600" />
                Payout Progress
              </span>
              <span className="text-xs text-muted-foreground">
                Step {PAYOUT_STAGES.findIndex((s) => s.id === payoutStatus) + 1} of{" "}
                {PAYOUT_STAGES.length}
              </span>
            </div>
            <Progress value={getProgressPercent()} className="h-2 bg-green-100" />
            <div className="mt-4 flex justify-between">
              {PAYOUT_STAGES.map((stage, index) => {
                const StageIcon = stage.icon;
                const currentIndex = PAYOUT_STAGES.findIndex((s) => s.id === payoutStatus);
                const isComplete = index <= currentIndex;
                const isCurrent = index === currentIndex;

                return (
                  <div
                    key={stage.id}
                    className={`flex flex-col items-center ${
                      isComplete ? "text-green-600" : "text-muted-foreground"
                    }`}
                  >
                    <div
                      className={`rounded-full p-2 ${
                        isCurrent
                          ? "bg-green-100 ring-2 ring-green-600 dark:bg-green-900"
                          : isComplete
                            ? "bg-green-100 dark:bg-green-900/50"
                            : "bg-muted"
                      }`}
                    >
                      <StageIcon className="h-4 w-4" />
                    </div>
                    <span className="mt-1 hidden text-xs md:block">{stage.label}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="summary">
              <Calculator className="mr-2 h-4 w-4" />
              Summary
            </TabsTrigger>
            <TabsTrigger value="depreciation">
              <Percent className="mr-2 h-4 w-4" />
              Depreciation
            </TabsTrigger>
            <TabsTrigger value="supplements">
              <Plus className="mr-2 h-4 w-4" />
              Supplements
            </TabsTrigger>
            <TabsTrigger value="certification">
              <FileSignature className="mr-2 h-4 w-4" />
              Certification
            </TabsTrigger>
            <TabsTrigger value="invoice">
              <Receipt className="mr-2 h-4 w-4" />
              Invoice
            </TabsTrigger>
            <TabsTrigger value="photos">
              <Camera className="mr-2 h-4 w-4" />
              Photos
            </TabsTrigger>
            <TabsTrigger value="packet">
              <Package className="mr-2 h-4 w-4" />
              Final Packet
            </TabsTrigger>
          </TabsList>

          {/* SUMMARY TAB */}
          <TabsContent value="summary" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Claim Intelligence */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-blue-600" />
                    Claim Intelligence
                  </CardTitle>
                  <CardDescription>Data extracted from carrier estimate</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">Carrier</Label>
                      <p className="font-medium">{claim.carrier || "Not specified"}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Policy #</Label>
                      <p className="font-medium">{claim.policyNumber || "Not specified"}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Date of Loss</Label>
                      <p className="font-medium">
                        {claim.dateOfLoss
                          ? new Date(claim.dateOfLoss).toLocaleDateString()
                          : "Not specified"}
                      </p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Damage Type</Label>
                      <p className="font-medium">{claim.damageType || "Not specified"}</p>
                    </div>
                  </div>
                  <Separator />
                  <div className="grid grid-cols-3 gap-4">
                    <div className="rounded-lg bg-blue-50 p-3 text-center dark:bg-blue-950">
                      <p className="text-xs text-muted-foreground">Coverage A</p>
                      <p className="text-lg font-bold text-blue-700">
                        ${(claim.coverageA || totalRCV).toLocaleString()}
                      </p>
                    </div>
                    <div className="rounded-lg bg-amber-50 p-3 text-center dark:bg-amber-950">
                      <p className="text-xs text-muted-foreground">Coverage B</p>
                      <p className="text-lg font-bold text-amber-700">
                        {claim.coverageB != null ? `$${claim.coverageB.toLocaleString()}` : "N/A"}
                      </p>
                    </div>
                    <div className="rounded-lg bg-purple-50 p-3 text-center dark:bg-purple-950">
                      <p className="text-xs text-muted-foreground">Coverage C</p>
                      <p className="text-lg font-bold text-purple-700">
                        {claim.coverageC != null ? `$${claim.coverageC.toLocaleString()}` : "N/A"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Financial Summary */}
              <Card className="border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 dark:border-green-800 dark:from-green-950 dark:to-emerald-950">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-green-800 dark:text-green-200">
                    <DollarSign className="h-5 w-5" />
                    Amount Due from Carrier
                  </CardTitle>
                  <CardDescription className="text-green-700 dark:text-green-300">
                    Final payout calculation
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Recoverable Depreciation</span>
                    <span className="font-medium">${recoverableDepreciation.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Approved Supplements</span>
                    <span className="font-medium">${approvedSupplements.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Deductible (already applied)</span>
                    <span>-${deductible.toLocaleString()}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-lg font-bold text-green-700 dark:text-green-300">
                    <span>TOTAL DUE</span>
                    <span>${totalDue.toLocaleString()}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    ACV of ${acvAlreadyPaid.toLocaleString()} already paid by carrier
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Quick Status Cards */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="rounded-full bg-blue-100 p-2 dark:bg-blue-900">
                    <FileText className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{lineItems.length}</p>
                    <p className="text-sm text-muted-foreground">Line Items</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="rounded-full bg-green-100 p-2 dark:bg-green-900">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{completedItems.length}</p>
                    <p className="text-sm text-muted-foreground">Completed</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="rounded-full bg-amber-100 p-2 dark:bg-amber-900">
                    <AlertCircle className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {supplements.filter((s) => s.status === "pending").length}
                    </p>
                    <p className="text-sm text-muted-foreground">Pending Supplements</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="rounded-full bg-purple-100 p-2 dark:bg-purple-900">
                    <Camera className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {photoCategories.reduce((sum, c) => sum + c.uploaded, 0)}
                    </p>
                    <p className="text-sm text-muted-foreground">Photos Uploaded</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* DEPRECIATION TAB */}
          <TabsContent value="depreciation" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Percent className="h-5 w-5 text-amber-600" />
                  Line Item Depreciation Tracker
                </CardTitle>
                <CardDescription>
                  Track completed work and recoverable depreciation by line item
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40px]">Done</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">RCV</TableHead>
                      <TableHead className="text-right">Depreciation</TableHead>
                      <TableHead className="text-right">ACV</TableHead>
                      <TableHead className="w-[80px] text-center">Recoverable</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lineItems.map((item) => (
                      <TableRow key={item.id} className={!item.completed ? "opacity-50" : ""}>
                        <TableCell>
                          <Checkbox
                            checked={item.completed}
                            onCheckedChange={() => handleToggleCompleted(item.id)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{item.description}</TableCell>
                        <TableCell className="text-right">
                          ${item.rcv.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right text-amber-600">
                          $
                          {item.depreciation.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                          })}
                        </TableCell>
                        <TableCell className="text-right">
                          ${item.acv.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-center">
                          <Checkbox
                            checked={item.recoverable}
                            onCheckedChange={() => handleToggleRecoverable(item.id)}
                            disabled={!item.completed}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <Separator className="my-4" />

                <div className="flex justify-end gap-8">
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Total RCV</p>
                    <p className="text-lg font-bold">${totalRCV.toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Recoverable Depreciation</p>
                    <p className="text-lg font-bold text-amber-600">
                      ${totalDepreciation.toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Total ACV</p>
                    <p className="text-lg font-bold">${totalACV.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* SUPPLEMENTS TAB */}
          <TabsContent value="supplements" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5 text-blue-600" />
                  Supplements & Additional Work
                </CardTitle>
                <CardDescription>Track approved supplements for final payout</CardDescription>
              </CardHeader>
              <CardContent>
                {supplements.length === 0 ? (
                  <div className="py-8 text-center">
                    <Plus className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                    <p className="text-muted-foreground">No supplements added yet</p>
                    <p className="text-sm text-muted-foreground">
                      Supplements will appear here once added to the claim
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Description</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {supplements.map((s) => (
                        <TableRow key={s.id}>
                          <TableCell className="font-medium">{s.description}</TableCell>
                          <TableCell className="capitalize">{s.category}</TableCell>
                          <TableCell className="text-right">${s.amount.toLocaleString()}</TableCell>
                          <TableCell className="text-center">
                            <Badge
                              variant={
                                s.status === "approved"
                                  ? "default"
                                  : s.status === "denied"
                                    ? "destructive"
                                    : "secondary"
                              }
                            >
                              {s.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* CERTIFICATION TAB */}
          <TabsContent value="certification" className="space-y-6">
            <CertificateOfCompletion
              claimId={claim.id}
              claimNumber={claim.claimNumber}
              propertyOwner={claim.insured_name || "Property Owner"}
              propertyAddress={
                claim.propertyAddress
                  ? `${claim.propertyAddress}, ${claim.propertyCity}, ${claim.propertyState} ${claim.propertyZip}`
                  : "Property Address"
              }
              invoiceAmount={totalDue}
              clientEmail={claim.homeownerEmail || undefined}
              signed={certificationSigned}
              signatureUrl={signatureDataUrl ?? undefined}
              onSign={handleSignature}
              onSendToClient={handleSendToClient}
              onDownload={handleDownloadCertificate}
            />

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Notes to Carrier (Optional)</CardTitle>
                <CardDescription>
                  Add any additional context for the insurance carrier
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  id="notes"
                  placeholder="Add any additional notes or context for the carrier..."
                  value={notesToCarrier}
                  onChange={(e) => setNotesToCarrier(e.target.value)}
                  rows={4}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* INVOICE TAB */}
          <TabsContent value="invoice" className="space-y-6">
            <FinalInvoice
              claimNumber={claim.claimNumber}
              policyNumber={claim.policyNumber || undefined}
              carrier={claim.carrier || undefined}
              propertyOwner={claim.insured_name || "Property Owner"}
              propertyAddress={claim.propertyAddress || ""}
              propertyCity={claim.propertyCity || undefined}
              propertyState={claim.propertyState || undefined}
              propertyZip={claim.propertyZip || undefined}
              ownerEmail={claim.homeownerEmail || undefined}
              lineItems={lineItems}
              deductible={claim.deductible || 0}
              acvPaid={claim.acvPaid || totalACV}
              supplements={supplements
                .filter((s) => s.status === "approved")
                .map((s) => ({
                  description: s.description,
                  amount: s.amount,
                }))}
              notes={notesToCarrier}
            />
          </TabsContent>

          {/* PHOTOS TAB */}
          <TabsContent value="photos" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Camera className="h-5 w-5 text-green-600" />
                  Completion Photo Documentation
                </CardTitle>
                <CardDescription>
                  Upload photos documenting completed work for depreciation recovery
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {photoCategories.map((cat) => (
                    <Card key={cat.id} className={cat.uploaded > 0 ? "border-green-200" : ""}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{cat.label}</p>
                            <p className="text-sm text-muted-foreground">
                              {cat.uploaded} photos uploaded
                              {cat.required && " • Required"}
                            </p>
                          </div>
                          {cat.uploaded > 0 ? (
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                          ) : (
                            <Upload className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                <div className="mt-4 flex justify-center">
                  <Button variant="outline">
                    <Upload className="mr-2 h-4 w-4" />
                    Upload More Photos
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* FINAL PACKET TAB */}
          <TabsContent value="packet" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-emerald-600" />
                  Generate Final Payout Packet
                </CardTitle>
                <CardDescription>
                  Create the complete documentation package for carrier submission
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-900">
                  <h4 className="mb-3 font-medium">Packet Contents:</h4>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      Final Invoice with Line Item Breakdown
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      Certificate of Completion
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      Lien Waiver / Release Form
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      Completion Photo Documentation
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      Supplement Approval Documentation
                    </li>
                  </ul>
                </div>

                {generatedPacketUrl ? (
                  <div className="flex flex-col items-center gap-4 rounded-lg border-2 border-green-200 bg-green-50 p-6 dark:border-green-800 dark:bg-green-950">
                    <CheckCircle2 className="h-12 w-12 text-green-600" />
                    <p className="font-medium">Packet Generated Successfully!</p>
                    <div className="flex gap-2">
                      <Button asChild>
                        <a href={generatedPacketUrl} target="_blank" rel="noopener noreferrer">
                          <Download className="mr-2 h-4 w-4" />
                          Download Packet
                        </a>
                      </Button>
                      <Button variant="outline" onClick={handleSubmitToCarrier}>
                        <Send className="mr-2 h-4 w-4" />
                        Submit to Carrier
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-center">
                    <Button
                      size="lg"
                      onClick={handleGenerateInvoice}
                      disabled={isGeneratingInvoice || !certificationSigned}
                    >
                      {isGeneratingInvoice ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Package className="mr-2 h-4 w-4" />
                          Generate Final Payout Packet
                        </>
                      )}
                    </Button>
                  </div>
                )}

                {!certificationSigned && (
                  <p className="text-center text-sm text-amber-600">
                    <Info className="mr-1 inline h-4 w-4" />
                    Please complete the certification tab before generating the packet
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Certification Dialog */}
      <Dialog open={showCertificationDialog} onOpenChange={setShowCertificationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sign Certificate of Completion</DialogTitle>
            <DialogDescription>
              Please review and sign the certificate before submitting to the carrier.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm">
              I certify that all repairs have been completed satisfactorily and I authorize the
              release of depreciation funds.
            </p>
            <div className="flex items-center gap-2">
              <Checkbox
                id="dialogCert"
                checked={certificationSigned}
                onCheckedChange={(checked) => setCertificationSigned(checked as boolean)}
              />
              <Label htmlFor="dialogCert">I agree and sign this certificate</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCertificationDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                setShowCertificationDialog(false);
                if (certificationSigned) {
                  void handleSubmitToCarrier();
                }
              }}
              disabled={!certificationSigned}
            >
              Sign & Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
