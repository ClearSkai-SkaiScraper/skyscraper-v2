"use client";

import {
  AlertCircle,
  ArrowRight,
  BadgeCheck,
  Calculator,
  Camera,
  CheckCircle2,
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
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

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
import { Input } from "@/components/ui/input";
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

interface FinalPayoutClientProps {
  claim: ClaimData;
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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function FinalPayoutClient({ claim, orgId, userId }: FinalPayoutClientProps) {
  const [activeTab, setActiveTab] = useState("summary");
  const [payoutStatus, setPayoutStatus] = useState<PayoutStatus>("not_started");
  const [isGeneratingInvoice, setIsGeneratingInvoice] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCertificationDialog, setShowCertificationDialog] = useState(false);
  const [certificationSigned, setCertificationSigned] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
  const [uploadingCategory, setUploadingCategory] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Upload handler for completion photos
  const handlePhotoUpload = useCallback(
    async (categoryId: string, files: FileList | null) => {
      if (!files || files.length === 0) return;
      setUploadingCategory(categoryId);

      let successCount = 0;
      try {
        for (const file of Array.from(files)) {
          // Step 1: Upload file to Supabase via claims/files/upload
          const formData = new FormData();
          formData.append("file", file);
          formData.append("claimId", claim.id);
          formData.append("type", "completion");
          formData.append("category", categoryId);

          const uploadRes = await fetch("/api/claims/files/upload", {
            method: "POST",
            body: formData,
          });

          if (!uploadRes.ok) {
            const err = await uploadRes.json().catch(() => ({}));
            toast.error(`Failed to upload ${file.name}: ${err.error || "Upload error"}`);
            continue;
          }

          const uploadData = await uploadRes.json();
          const fileUrl = uploadData.url || uploadData.publicUrl;

          // Step 2: Create completion_photos DB record via metadata endpoint
          const metaRes = await fetch("/api/completion/upload-photo", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              claimId: claim.id,
              url: fileUrl,
              fileName: file.name,
              fileSize: file.size,
              category: categoryId,
              storageKey: uploadData.storageKey || uploadData.key,
            }),
          });

          if (metaRes.ok) {
            successCount++;
          } else {
            const err = await metaRes.json().catch(() => ({}));
            toast.error(`Failed to save ${file.name}: ${err.error || "Metadata error"}`);
          }
        }

        if (successCount > 0) {
          toast.success(
            `${successCount} photo${successCount > 1 ? "s" : ""} uploaded to ${categoryId}`
          );
          // Update local counts
          setPhotoCategories((prev) =>
            prev.map((cat) =>
              cat.id === categoryId ? { ...cat, uploaded: cat.uploaded + successCount } : cat
            )
          );
        }
      } catch (err) {
        console.error("[FINAL_PAYOUT] Photo upload error:", err);
        toast.error("Photo upload failed. Please try again.");
      } finally {
        setUploadingCategory(null);
        // Reset file input
        const input = fileInputRefs.current[categoryId];
        if (input) input.value = "";
      }
    },
    [claim.id]
  );

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
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
            // No depreciation items yet — show empty state, NOT fake data
            setLineItems([]);
          }

          // Set supplements from API
          if (data.supplements && data.supplements.length > 0) {
            setSupplements(
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              data.supplements.map((s: any) => ({
                id: s.id,
                description: s.description,
                amount: s.amount,
                category: s.category || "other",
                status: s.status || "pending",
              }))
            );
          }

          // Update photo counts from real per-category data
          if (data.completionPhotos) {
            const categoryCounts: Record<string, number> = {};
            for (const photo of data.completionPhotos) {
              const cat = photo.category || "unknown";
              categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
            }
            setPhotoCategories((prev) =>
              prev.map((cat) => ({
                ...cat,
                uploaded: categoryCounts[cat.id] || 0,
              }))
            );
          }

          // Set generated packet URL if exists
          if (data.documents && data.documents.length > 0) {
            const packet = data.documents.find(
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (d: any) => d.type === "FINAL_PACKET" || d.type === "DEPRECIATION"
            );
            if (packet?.url) {
              setGeneratedPacketUrl(packet.url);
            }
          }
        }
      } catch (error) {
        logger.error("Failed to fetch payout data:", error);
        // Show empty state on error, NOT hardcoded fake data
        setLineItems([]);
      } finally {
        setIsLoading(false);
      }
    };

    void fetchPayoutData();
  }, [claim.id]);

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
      // Call unified actions endpoint
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

      // Download PDF if base64 bytes returned
      if (data.packet?.pdfBase64) {
        const byteCharacters = atob(data.packet.pdfBase64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        setGeneratedPacketUrl(url);

        // Auto-download
        const a = document.createElement("a");
        a.href = url;
        a.download = `Final_Payout_${claim.claimNumber || claim.id}.pdf`;
        a.click();
      } else if (data.packet?.url) {
        setGeneratedPacketUrl(data.packet.url);
      }

      setPayoutStatus("invoice_generated");
      toast.success("Final payout packet generated successfully!");
    } catch (error) {
      logger.error("Generate packet error:", error);
      toast.error("Failed to generate invoice");
    } finally {
      setIsGeneratingInvoice(false);
    }
  };

  const handleSubmitToCarrier = async () => {
    if (!certificationSigned) {
      setShowCertificationDialog(true);
      return;
    }

    setIsSubmitting(true);
    try {
      // Call unified actions endpoint
      const res = await fetch(`/api/claims/${claim.id}/final-payout/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "submit",
          confirmationChecks: {
            workCompleted: true,
            documentsUploaded: true,
            invoiceGenerated: true,
          },
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to submit");
      }

      setPayoutStatus("submitted");
      toast.success("Submitted to carrier successfully!");
    } catch (error) {
      logger.error("Submit error:", error);
      toast.error("Failed to submit to carrier");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading final payout data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Page Header — Green gradient */}
      <div className="-mx-6 -mt-6 mb-6 rounded-b-2xl bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600 px-6 py-6 text-white shadow-lg">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm text-emerald-100">
              <Link href="/claims" className="hover:text-white">
                Claims
              </Link>
              <ChevronRight className="h-4 w-4" />
              <Link href={`/claims/${claim.id}/overview`} className="hover:text-white">
                {claim.claimNumber}
              </Link>
              <ChevronRight className="h-4 w-4" />
              <span className="text-white">Final Payout</span>
            </div>
            <h1 className="mt-2 flex items-center gap-3 text-2xl font-bold">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                <Receipt className="h-6 w-6 text-white" />
              </div>
              Recoverable Depreciation & Final Payout
            </h1>
            <p className="mt-1 text-emerald-100">
              {claim.propertyAddress}, {claim.propertyCity}, {claim.propertyState}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="border-white/30 bg-white/10 text-white hover:bg-white/20"
              asChild
            >
              <Link href={`/claims/${claim.id}/overview`}>
                <ArrowRight className="mr-2 h-4 w-4 rotate-180" />
                Back to Claim
              </Link>
            </Button>
            {generatedPacketUrl && (
              <Button
                variant="outline"
                className="border-white/30 bg-white/10 text-white hover:bg-white/20"
                asChild
              >
                <a href={generatedPacketUrl} download>
                  <Download className="mr-2 h-4 w-4" />
                  Download PDF
                </a>
              </Button>
            )}
            {payoutStatus === "invoice_generated" && (
              <Button
                className="bg-white text-emerald-700 hover:bg-emerald-50"
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

      {/* Progress Tracker */}
      <Card>
        <CardContent className="p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium">Payout Progress</span>
            <Badge variant={payoutStatus === "paid" ? "default" : "secondary"}>
              {PAYOUT_STAGES.find((s) => s.id === payoutStatus)?.label}
            </Badge>
          </div>
          <Progress value={getProgressPercent()} className="h-2" />
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
                        ? "bg-green-100 ring-2 ring-green-600"
                        : isComplete
                          ? "bg-green-100"
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
        <TabsList className="grid w-full grid-cols-6">
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
                      ${(claim.coverageB || 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="rounded-lg bg-purple-50 p-3 text-center dark:bg-purple-950">
                    <p className="text-xs text-muted-foreground">Coverage C</p>
                    <p className="text-lg font-bold text-purple-700">
                      ${(claim.coverageC || 0).toLocaleString()}
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
                <Percent className="h-5 w-5" />
                Depreciation Line Items
              </CardTitle>
              <CardDescription>
                Review each line item. Mark as completed and recoverable to include in final
                invoice.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]">Done</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Coverage</TableHead>
                    <TableHead className="text-right">RCV</TableHead>
                    <TableHead className="text-right">Depreciation</TableHead>
                    <TableHead className="text-right">ACV</TableHead>
                    <TableHead className="w-[100px]">Recoverable</TableHead>
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
                      <TableCell>
                        <div>
                          <p className="font-medium">{item.description}</p>
                          {item.notes && <p className="text-xs text-amber-600">{item.notes}</p>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.coverage}</Badge>
                      </TableCell>
                      <TableCell className="text-right">${item.rcv.toLocaleString()}</TableCell>
                      <TableCell className="text-right">
                        ${item.depreciation.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">${item.acv.toLocaleString()}</TableCell>
                      <TableCell>
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

              {/* Totals */}
              <div className="mt-6 flex justify-end">
                <div className="w-80 space-y-2 rounded-lg bg-muted p-4">
                  <div className="flex justify-between">
                    <span>Total RCV (completed)</span>
                    <span className="font-medium">${totalRCV.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total ACV (completed)</span>
                    <span className="font-medium">${totalACV.toLocaleString()}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-lg font-bold text-green-600">
                    <span>Recoverable Depreciation</span>
                    <span>${recoverableDepreciation.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Exclusion Note */}
          <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
            <CardContent className="flex items-start gap-3 p-4">
              <Info className="mt-0.5 h-5 w-5 text-amber-600" />
              <div>
                <p className="font-medium text-amber-800 dark:text-amber-200">
                  Coverage B Exclusion Notice
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  Not requesting depreciation for Coverage B since structure was not repaired. This
                  follows standard carrier requirements for recoverable depreciation.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SUPPLEMENTS TAB */}
        <TabsContent value="supplements" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Supplements
                </CardTitle>
                <CardDescription>Additional items discovered during work</CardDescription>
              </div>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Supplement
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {supplements.map((sup) => (
                    <TableRow key={sup.id}>
                      <TableCell className="font-medium">{sup.description}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {sup.category === "code_upgrade" && "Code Upgrade"}
                          {sup.category === "hidden_damage" && "Hidden Damage"}
                          {sup.category === "manufacturer_req" && "Manufacturer Req."}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">${sup.amount.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            sup.status === "approved"
                              ? "default"
                              : sup.status === "pending"
                                ? "secondary"
                                : "destructive"
                          }
                        >
                          {sup.status.charAt(0).toUpperCase() + sup.status.slice(1)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Supplement Justification */}
              <div className="mt-6 space-y-4">
                <h4 className="font-semibold">Supplement Justification Narrative</h4>
                <Textarea
                  placeholder="Explain the circumstances that led to these supplements. Include code references, manufacturer specifications, or unforeseen conditions discovered during tear-off..."
                  rows={4}
                  defaultValue="During removal of existing shingles, hidden water damage was discovered in the roof decking. Per IRC R905.1, damaged decking must be replaced prior to new roofing installation. Additionally, deck spacing did not meet current code requirements (IRC R905.2.6), requiring 1/8-inch spacing for proper ventilation."
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* CERTIFICATION TAB */}
        <TabsContent value="certification" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSignature className="h-5 w-5" />
                Completion Certification
              </CardTitle>
              <CardDescription>Required attestation for carrier payout approval</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="rounded-lg border p-6">
                <h3 className="mb-4 text-lg font-semibold">Certificate of Completion</h3>
                <div className="space-y-4 text-sm">
                  <p>
                    I, the undersigned property owner/authorized representative, hereby certify
                    that:
                  </p>
                  <ul className="list-disc space-y-2 pl-6">
                    <li>All work described in the insurance estimate has been completed in full</li>
                    <li>Work was completed to current building codes and standards</li>
                    <li>Work was performed according to the approved scope of work</li>
                    <li>I authorize the release of recoverable depreciation to the contractor</li>
                  </ul>
                  <div className="mt-6 grid grid-cols-2 gap-4">
                    <div>
                      <Label>Property Address</Label>
                      <p className="mt-1 font-medium">
                        {claim.propertyAddress}, {claim.propertyCity}, {claim.propertyState}
                      </p>
                    </div>
                    <div>
                      <Label>Claim Number</Label>
                      <p className="mt-1 font-medium">{claim.claimNumber}</p>
                    </div>
                    <div>
                      <Label>Date of Completion</Label>
                      <Input type="date" defaultValue={new Date().toISOString().split("T")[0]} />
                    </div>
                    <div>
                      <Label>Insured Name</Label>
                      <p className="mt-1 font-medium">{claim.insured_name || "Property Owner"}</p>
                    </div>
                  </div>
                  <div className="mt-6">
                    <Label>Digital Signature</Label>
                    <div className="mt-2 flex items-center gap-4">
                      <Input placeholder="Type full legal name to sign" />
                      <Button
                        onClick={() => {
                          setCertificationSigned(true);
                          toast.success("Certification signed!");
                        }}
                      >
                        Sign
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {certificationSigned && (
                <div className="flex items-center gap-2 rounded-lg bg-green-50 p-4 text-green-700 dark:bg-green-950 dark:text-green-300">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-medium">Certification signed and ready for submission</span>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* PHOTOS TAB */}
        <TabsContent value="photos" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="h-5 w-5" />
                Photo Documentation
              </CardTitle>
              <CardDescription>Required photos for depreciation release</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {photoCategories.map((category) => (
                  <Card
                    key={category.id}
                    className={category.uploaded > 0 ? "border-green-200" : "border-amber-200"}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{category.label}</p>
                          <p className="text-sm text-muted-foreground">
                            {category.uploaded} photos uploaded
                            {category.required && " • Required"}
                          </p>
                        </div>
                        {category.uploaded > 0 ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-amber-500" />
                        )}
                      </div>
                      <Button
                        variant="outline"
                        className="mt-3 w-full"
                        size="sm"
                        disabled={uploadingCategory === category.id}
                        onClick={() => fileInputRefs.current[category.id]?.click()}
                      >
                        {uploadingCategory === category.id ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Upload className="mr-2 h-4 w-4" />
                        )}
                        {uploadingCategory === category.id ? "Uploading..." : "Upload Photos"}
                      </Button>
                      <input
                        ref={(el) => {
                          fileInputRefs.current[category.id] = el;
                        }}
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(e) => handlePhotoUpload(category.id, e.target.files)}
                      />
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="mt-6">
                <h4 className="mb-3 font-semibold">Photo Requirements</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    Photos should clearly show completed work
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    Include date stamps when possible
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    Document all repair areas
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    Photos are auto-grouped and labeled for carrier submission
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* FINAL PACKET TAB */}
        <TabsContent value="packet" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Final Claim Close-Out Packet
              </CardTitle>
              <CardDescription>One-click generation of carrier-ready documentation</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Packet Contents */}
              <div className="space-y-3">
                <h4 className="font-semibold">Packet Contents</h4>
                <div className="space-y-2">
                  {[
                    {
                      icon: Receipt,
                      label: "Final Depreciation Invoice",
                      status: payoutStatus !== "not_started",
                    },
                    {
                      icon: FileSignature,
                      label: "Completion Certificate",
                      status: certificationSigned,
                    },
                    {
                      icon: Camera,
                      label: "Photo Documentation Report",
                      status: photoCategories.every((c) => !c.required || c.uploaded > 0),
                    },
                    {
                      icon: FileText,
                      label: "Supplement Justification",
                      status: supplements.length > 0,
                    },
                  ].map((item, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="flex items-center gap-3">
                        <item.icon className="h-5 w-5 text-muted-foreground" />
                        <span>{item.label}</span>
                      </div>
                      {item.status ? (
                        <Badge variant="outline" className="border-green-500 text-green-600">
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                          Ready
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-amber-500 text-amber-600">
                          <Clock className="mr-1 h-3 w-3" />
                          Pending
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Generation Actions */}
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h4 className="font-semibold">Generate & Submit</h4>
                  <p className="text-sm text-muted-foreground">
                    Create the final packet and submit to carrier
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={handleGenerateInvoice}
                    disabled={isGeneratingInvoice}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    {isGeneratingInvoice ? "Generating..." : "Generate Packet"}
                  </Button>
                  <Button
                    onClick={handleSubmitToCarrier}
                    disabled={isSubmitting || payoutStatus === "not_started"}
                  >
                    <Send className="mr-2 h-4 w-4" />
                    {isSubmitting ? "Submitting..." : "Submit to Carrier"}
                  </Button>
                </div>
              </div>

              {/* Delivery Options */}
              <div className="rounded-lg bg-muted p-4">
                <h4 className="mb-3 font-semibold">Delivery Options</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox id="email-carrier" defaultChecked />
                    <Label htmlFor="email-carrier">
                      Email to carrier ({claim.carrier || "Not set"})
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox id="email-adjuster" defaultChecked />
                    <Label htmlFor="email-adjuster">
                      Email to adjuster ({claim.adjusterEmail || "Not set"})
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox id="portal-upload" />
                    <Label htmlFor="portal-upload">Upload to carrier portal</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox id="save-record" defaultChecked />
                    <Label htmlFor="save-record">Save to claim record</Label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Certification Dialog */}
      <Dialog open={showCertificationDialog} onOpenChange={setShowCertificationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Certification Required</DialogTitle>
            <DialogDescription>
              The completion certification must be signed before submitting to the carrier.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Please go to the Certification tab and sign the completion certificate.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCertificationDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                setShowCertificationDialog(false);
                setActiveTab("certification");
              }}
            >
              Go to Certification
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
