"use client";

/**
 * Claims-Ready Folder Page
 * Carrier-compliant insurance packets—auto-assembled from inspection to submission
 */

import {
  ArrowRight,
  Calendar,
  Camera,
  CheckSquare,
  ChevronRight,
  CloudLightning,
  DollarSign,
  Download,
  Eye,
  FileSignature,
  FileText,
  FolderOpen,
  List,
  Loader2,
  Paperclip,
  PenTool,
  Scale,
  Sparkles,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { ReadinessScore } from "@/components/claims-folder/ReadinessScore";
import { SectionCard } from "@/components/claims-folder/SectionCard";
import { PageHero } from "@/components/layout/PageHero";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FOLDER_SECTIONS,
  type FolderSectionKey,
  SECTION_METADATA,
} from "@/lib/claims-folder/folderSchema";
import { logger } from "@/lib/logger";

interface ClaimOption {
  id: string;
  title: string;
  claimNumber?: string;
  address?: string;
  status: string;
  dateOfLoss?: string;
}

interface SectionStatus {
  key: FolderSectionKey;
  status: "complete" | "partial" | "missing" | "loading";
  dataAvailable: boolean;
}

// Default sections - will be updated with real data when claim selected
const DEFAULT_SECTIONS: SectionStatus[] = [
  { key: FOLDER_SECTIONS.COVER_SHEET, status: "missing", dataAvailable: false },
  { key: FOLDER_SECTIONS.TABLE_OF_CONTENTS, status: "missing", dataAvailable: false },
  { key: FOLDER_SECTIONS.EXECUTIVE_SUMMARY, status: "missing", dataAvailable: false },
  { key: FOLDER_SECTIONS.WEATHER_CAUSE_OF_LOSS, status: "missing", dataAvailable: false },
  { key: FOLDER_SECTIONS.INSPECTION_OVERVIEW, status: "missing", dataAvailable: false },
  { key: FOLDER_SECTIONS.DAMAGE_GRIDS, status: "missing", dataAvailable: false },
  { key: FOLDER_SECTIONS.PHOTO_EVIDENCE, status: "missing", dataAvailable: false },
  { key: FOLDER_SECTIONS.TEST_CUTS, status: "missing", dataAvailable: false },
  { key: FOLDER_SECTIONS.CODE_COMPLIANCE, status: "missing", dataAvailable: false },
  { key: FOLDER_SECTIONS.SCOPE_PRICING, status: "missing", dataAvailable: false },
  { key: FOLDER_SECTIONS.SUPPLEMENTS_VARIANCES, status: "missing", dataAvailable: false },
  { key: FOLDER_SECTIONS.REPAIR_JUSTIFICATION, status: "missing", dataAvailable: false },
  { key: FOLDER_SECTIONS.CONTRACTOR_SUMMARY, status: "missing", dataAvailable: false },
  { key: FOLDER_SECTIONS.TIMELINE, status: "missing", dataAvailable: false },
  { key: FOLDER_SECTIONS.HOMEOWNER_STATEMENT, status: "missing", dataAvailable: false },
  { key: FOLDER_SECTIONS.ADJUSTER_COVER_LETTER, status: "missing", dataAvailable: false },
  { key: FOLDER_SECTIONS.CLAIM_CHECKLIST, status: "missing", dataAvailable: false },
  { key: FOLDER_SECTIONS.DIGITAL_SIGNATURES, status: "missing", dataAvailable: false },
  { key: FOLDER_SECTIONS.ATTACHMENTS, status: "missing", dataAvailable: false },
];

// Demo sections showing full flow with real-looking data
const DEMO_SECTIONS: SectionStatus[] = [
  { key: FOLDER_SECTIONS.COVER_SHEET, status: "complete", dataAvailable: true },
  { key: FOLDER_SECTIONS.TABLE_OF_CONTENTS, status: "complete", dataAvailable: true },
  { key: FOLDER_SECTIONS.EXECUTIVE_SUMMARY, status: "complete", dataAvailable: true },
  { key: FOLDER_SECTIONS.WEATHER_CAUSE_OF_LOSS, status: "complete", dataAvailable: true },
  { key: FOLDER_SECTIONS.INSPECTION_OVERVIEW, status: "complete", dataAvailable: true },
  { key: FOLDER_SECTIONS.DAMAGE_GRIDS, status: "complete", dataAvailable: true },
  { key: FOLDER_SECTIONS.PHOTO_EVIDENCE, status: "complete", dataAvailable: true },
  { key: FOLDER_SECTIONS.TEST_CUTS, status: "partial", dataAvailable: true },
  { key: FOLDER_SECTIONS.CODE_COMPLIANCE, status: "complete", dataAvailable: true },
  { key: FOLDER_SECTIONS.SCOPE_PRICING, status: "partial", dataAvailable: true },
  { key: FOLDER_SECTIONS.SUPPLEMENTS_VARIANCES, status: "missing", dataAvailable: false },
  { key: FOLDER_SECTIONS.REPAIR_JUSTIFICATION, status: "partial", dataAvailable: true },
  { key: FOLDER_SECTIONS.CONTRACTOR_SUMMARY, status: "complete", dataAvailable: true },
  { key: FOLDER_SECTIONS.TIMELINE, status: "complete", dataAvailable: true },
  { key: FOLDER_SECTIONS.HOMEOWNER_STATEMENT, status: "partial", dataAvailable: true },
  { key: FOLDER_SECTIONS.ADJUSTER_COVER_LETTER, status: "complete", dataAvailable: true },
  { key: FOLDER_SECTIONS.CLAIM_CHECKLIST, status: "complete", dataAvailable: true },
  { key: FOLDER_SECTIONS.DIGITAL_SIGNATURES, status: "missing", dataAvailable: true },
  { key: FOLDER_SECTIONS.ATTACHMENTS, status: "partial", dataAvailable: true },
];

export default function ClaimsReadyFolderPage() {
  const router = useRouter();
  const [claims, setClaims] = useState<ClaimOption[]>([]);
  // Default to empty — auto-select first real claim when loaded
  const [selectedClaimId, setSelectedClaimId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [sections, setSections] = useState<SectionStatus[]>(DEFAULT_SECTIONS);
  const [showSampleModal, setShowSampleModal] = useState(false);
  const [readinessScore, setReadinessScore] = useState(0);
  const [scoreLoading, setScoreLoading] = useState(false);

  // Fetch available claims
  useEffect(() => {
    async function fetchClaims() {
      try {
        const res = await fetch("/api/claims/list-lite");
        if (res.ok) {
          const data = await res.json();
          const realClaims = data.claims || [];
          setClaims(realClaims);
          // Auto-select first real claim, fallback to demo
          if (realClaims.length > 0 && !selectedClaimId) {
            setSelectedClaimId(realClaims[0].id);
          } else if (realClaims.length === 0 && !selectedClaimId) {
            setSelectedClaimId("demo-claim");
          }
        }
      } catch (error) {
        logger.error("Failed to fetch claims:", error);
        if (!selectedClaimId) setSelectedClaimId("demo-claim");
      } finally {
        setLoading(false);
      }
    }
    fetchClaims();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch real section statuses when claim is selected
  useEffect(() => {
    async function fetchClaimData() {
      if (!selectedClaimId) {
        // Reset to default for no selection
        setSections(DEFAULT_SECTIONS);
        setReadinessScore(0);
        return;
      }

      if (selectedClaimId === "demo-claim") {
        // Use demo sections to show the full flow
        setSections(DEMO_SECTIONS);
        setReadinessScore(85);
        return;
      }

      setScoreLoading(true);
      try {
        // Fetch the readiness score for this claim
        const scoreRes = await fetch(`/api/claims-folder/score?claimId=${selectedClaimId}`);
        if (scoreRes.ok) {
          const scoreData = await scoreRes.json();
          if (scoreData.success) {
            setReadinessScore(scoreData.score || 0);

            // Update section statuses based on breakdown
            const breakdown = scoreData.breakdown || {};
            setSections((prev) =>
              prev.map((section) => {
                // Map sections to breakdown categories
                let status: "complete" | "partial" | "missing" = "missing";
                let dataAvailable = false;

                if (section.key === FOLDER_SECTIONS.WEATHER_CAUSE_OF_LOSS) {
                  const weatherScore = breakdown.weather || 0;
                  status =
                    weatherScore >= 15 ? "complete" : weatherScore > 0 ? "partial" : "missing";
                  dataAvailable = weatherScore > 0;
                } else if (section.key === FOLDER_SECTIONS.PHOTO_EVIDENCE) {
                  const photoScore = breakdown.photos || 0;
                  status = photoScore >= 20 ? "complete" : photoScore > 0 ? "partial" : "missing";
                  dataAvailable = photoScore > 0;
                } else if (section.key === FOLDER_SECTIONS.CODE_COMPLIANCE) {
                  const codeScore = breakdown.codes || 0;
                  status = codeScore >= 15 ? "complete" : codeScore > 0 ? "partial" : "missing";
                  dataAvailable = codeScore > 0;
                } else if (section.key === FOLDER_SECTIONS.SCOPE_PRICING) {
                  const scopeScore = breakdown.scope || 0;
                  status = scopeScore >= 20 ? "complete" : scopeScore > 0 ? "partial" : "missing";
                  dataAvailable = scopeScore > 0;
                } else if (section.key === FOLDER_SECTIONS.TIMELINE) {
                  const timelineScore = breakdown.timeline || 0;
                  status =
                    timelineScore >= 5 ? "complete" : timelineScore > 0 ? "partial" : "missing";
                  dataAvailable = timelineScore > 0;
                } else if (section.key === FOLDER_SECTIONS.DIGITAL_SIGNATURES) {
                  const sigScore = breakdown.signatures || 0;
                  status = sigScore >= 10 ? "complete" : sigScore > 0 ? "partial" : "missing";
                  dataAvailable = sigScore > 0;
                } else if (
                  section.key === FOLDER_SECTIONS.COVER_SHEET ||
                  section.key === FOLDER_SECTIONS.TABLE_OF_CONTENTS
                ) {
                  // These are auto-generated from claim data
                  status = "complete";
                  dataAvailable = true;
                } else if (
                  section.key === FOLDER_SECTIONS.EXECUTIVE_SUMMARY ||
                  section.key === FOLDER_SECTIONS.REPAIR_JUSTIFICATION ||
                  section.key === FOLDER_SECTIONS.ADJUSTER_COVER_LETTER
                ) {
                  // Narrative sections
                  const narrativeScore = breakdown.narratives || 0;
                  status =
                    narrativeScore >= 15 ? "complete" : narrativeScore > 0 ? "partial" : "missing";
                  dataAvailable = true; // Can be generated
                } else {
                  // Other sections - mark as partial if claim exists
                  status = "partial";
                  dataAvailable = true;
                }

                return { ...section, status, dataAvailable };
              })
            );
          }
        }
      } catch (error) {
        logger.error("Failed to fetch claim data:", error);
      } finally {
        setScoreLoading(false);
      }
    }

    fetchClaimData();
  }, [selectedClaimId]);

  const handleGenerateFolder = async () => {
    if (!selectedClaimId) {
      toast.info("Please select a claim to generate the folder");
      return;
    }

    setGenerating(true);
    // Navigate to builder page - works for both real claims and demo
    router.push(`/claims-ready-folder/${selectedClaimId}`);
  };

  // Handle section card click - navigate to section detail page
  const handleSectionClick = (sectionKey: string) => {
    // If no claim selected, prompt user
    if (!selectedClaimId) {
      toast.info("Please select a claim first to view section details");
      return;
    }

    // Section key is already kebab-case (e.g., "cover-sheet") from FOLDER_SECTIONS
    // Navigate to the section detail page - works for demo-claim too
    router.push(`/claims-ready-folder/${selectedClaimId}/sections/${sectionKey}`);
  };

  const readinessCategories = [
    {
      key: "weather",
      label: "Weather",
      score: 15,
      maxScore: 15,
      status: "complete" as const,
      icon: <CloudLightning className="h-4 w-4" />,
    },
    {
      key: "photos",
      label: "Photos",
      score: 20,
      maxScore: 20,
      status: "complete" as const,
      icon: <Camera className="h-4 w-4" />,
    },
    {
      key: "codes",
      label: "Codes",
      score: 15,
      maxScore: 15,
      status: "complete" as const,
      icon: <Scale className="h-4 w-4" />,
    },
    {
      key: "scope",
      label: "Scope",
      score: 10,
      maxScore: 20,
      status: "partial" as const,
      icon: <DollarSign className="h-4 w-4" />,
    },
    {
      key: "narratives",
      label: "Narratives",
      score: 0,
      maxScore: 15,
      status: "missing" as const,
      icon: <FileText className="h-4 w-4" />,
    },
    {
      key: "signatures",
      label: "Signatures",
      score: 0,
      maxScore: 10,
      status: "missing" as const,
      icon: <PenTool className="h-4 w-4" />,
    },
    {
      key: "timeline",
      label: "Timeline",
      score: 5,
      maxScore: 5,
      status: "complete" as const,
      icon: <Calendar className="h-4 w-4" />,
    },
  ];

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      {/* Hero Section */}
      <div className="mb-12">
        <PageHero
          title="Claim Packet"
          subtitle="Carrier-compliant insurance packets—auto-assembled from inspection to submission."
          icon={<FolderOpen className="h-5 w-5" />}
        />

        {/* CTAs */}
        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <div className="flex items-center gap-2">
            <Select value={selectedClaimId} onValueChange={setSelectedClaimId}>
              <SelectTrigger className="w-[280px]">
                <SelectValue placeholder="Select a claim..." />
              </SelectTrigger>
              <SelectContent>
                {claims.length === 0 && !loading && (
                  <SelectItem value="demo" disabled>
                    No claims found
                  </SelectItem>
                )}
                {claims.map((claim) => (
                  <SelectItem key={claim.id} value={claim.id}>
                    {claim.claimNumber || claim.title} - {claim.address || "No address"}
                  </SelectItem>
                ))}
                <SelectItem value="demo-claim">🎯 Demo: Storm Damage Claim</SelectItem>
              </SelectContent>
            </Select>

            <Button
              size="lg"
              onClick={handleGenerateFolder}
              disabled={!selectedClaimId || generating}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            >
              {generating ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <FolderOpen className="mr-2 h-5 w-5" />
                  Generate Folder
                </>
              )}
            </Button>
          </div>

          <Button variant="outline" size="lg" onClick={() => setShowSampleModal(true)}>
            <Eye className="mr-2 h-5 w-5" />
            View Sample Packet
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="mb-12 grid gap-4 md:grid-cols-4">
        <Card className="border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 dark:border-green-800 dark:from-green-950/30 dark:to-emerald-950/30">
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="rounded-full bg-green-100 p-3 dark:bg-green-900/50">
              <Zap className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-700 dark:text-green-400">17</p>
              <p className="text-sm text-green-600 dark:text-green-500">Sections</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 dark:border-blue-800 dark:from-blue-950/30 dark:to-indigo-950/30">
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="rounded-full bg-blue-100 p-3 dark:bg-blue-900/50">
              <Sparkles className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">AI</p>
              <p className="text-sm text-blue-600 dark:text-blue-500">Powered</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-violet-50 dark:border-purple-800 dark:from-purple-950/30 dark:to-violet-950/30">
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="rounded-full bg-purple-100 p-3 dark:bg-purple-900/50">
              <Download className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-purple-700 dark:text-purple-400">4</p>
              <p className="text-sm text-purple-600 dark:text-purple-500">Export Formats</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 dark:border-amber-800 dark:from-amber-950/30 dark:to-orange-950/30">
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="rounded-full bg-amber-100 p-3 dark:bg-amber-900/50">
              <CheckSquare className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">100%</p>
              <p className="text-sm text-amber-600 dark:text-amber-500">Carrier Compliant</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-8 lg:grid-cols-3">
        {/* Left: Section Grid */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <List className="h-5 w-5" />
                What&apos;s Inside the Folder
              </CardTitle>
              <CardDescription>
                17 sections automatically assembled from your claim data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {sections.map((section) => {
                  const meta = SECTION_METADATA[section.key];
                  return (
                    <SectionCard
                      key={section.key}
                      sectionKey={section.key}
                      title={meta.title}
                      description={meta.description}
                      icon={meta.icon}
                      status={section.status}
                      required={meta.required}
                      dataAvailable={section.dataAvailable}
                      onClick={() => handleSectionClick(section.key)}
                    />
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Readiness Score & Actions */}
        <div className="space-y-6">
          <ReadinessScore
            score={readinessScore}
            categories={readinessCategories}
            recommendation={
              readinessScore < 80
                ? "Add repair justification and contractor summary to improve score"
                : "Your folder is nearly complete!"
            }
          />

          {/* Export Options */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                Export Options
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full justify-between" variant="outline">
                <span className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-red-500" />
                  PDF Bundle
                </span>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button className="w-full justify-between" variant="outline">
                <span className="flex items-center gap-2">
                  <Paperclip className="h-4 w-4 text-blue-500" />
                  ZIP Package
                </span>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button className="w-full justify-between" variant="outline">
                <span className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-green-500" />
                  Xactimate ESX
                </span>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button className="w-full justify-between" variant="outline" disabled>
                <span className="flex items-center gap-2">
                  <FileSignature className="h-4 w-4 text-purple-500" />
                  DOCX (Coming Soon)
                </span>
                <Badge variant="outline" className="text-xs">
                  Soon
                </Badge>
              </Button>
            </CardContent>
          </Card>

          {/* Quick Links */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Related Tools</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link
                href="/ai/tools/supplement"
                className="flex items-center justify-between rounded-lg border border-slate-200 p-3 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
              >
                <span className="text-sm font-medium">Supplement Builder</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/quick-dol"
                className="flex items-center justify-between rounded-lg border border-slate-200 p-3 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
              >
                <span className="text-sm font-medium">Quick DOL</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/reports/contractor-packet"
                className="flex items-center justify-between rounded-lg border border-slate-200 p-3 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
              >
                <span className="text-sm font-medium">Contractor Packet</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Feature Highlights */}
      <div className="mt-12">
        <h2 className="mb-6 text-center text-2xl font-bold text-slate-900 dark:text-white">
          Why Claims-Ready Folder?
        </h2>
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="border-none bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30">
            <CardContent className="pt-6">
              <div className="mb-4 inline-flex rounded-lg bg-blue-100 p-3 dark:bg-blue-900/50">
                <Zap className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-slate-900 dark:text-white">
                One-Click Assembly
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                All your claim data, weather verification, photos, and code citations assembled into
                a single carrier-ready packet.
              </p>
            </CardContent>
          </Card>

          <Card className="border-none bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30">
            <CardContent className="pt-6">
              <div className="mb-4 inline-flex rounded-lg bg-green-100 p-3 dark:bg-green-900/50">
                <CheckSquare className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-slate-900 dark:text-white">
                Carrier Compliant
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Pre-formatted for major carriers. Includes all required documentation adjusters
                expect in a professional submission.
              </p>
            </CardContent>
          </Card>

          <Card className="border-none bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-950/30 dark:to-violet-950/30">
            <CardContent className="pt-6">
              <div className="mb-4 inline-flex rounded-lg bg-purple-100 p-3 dark:bg-purple-900/50">
                <Sparkles className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-slate-900 dark:text-white">
                AI-Powered Narratives
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Auto-generated repair justifications, contractor summaries, and adjuster cover
                letters written by AI.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Sample Packet Modal */}
      <Dialog open={showSampleModal} onOpenChange={setShowSampleModal}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Sample Claims-Ready Packet</DialogTitle>
            <DialogDescription>
              Preview what a complete claims-ready folder looks like
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-6 dark:border-slate-700 dark:bg-slate-900">
            <div className="space-y-6">
              <div className="rounded-lg border border-slate-300 bg-white p-6 dark:border-slate-600 dark:bg-slate-800">
                <h3 className="mb-4 text-center text-xl font-bold">CLAIMS DOCUMENTATION PACKET</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p>
                      <strong>Property:</strong> 123 Main Street, Phoenix, AZ 85001
                    </p>
                    <p>
                      <strong>Policyholder:</strong> John Smith
                    </p>
                    <p>
                      <strong>Date of Loss:</strong> January 15, 2026
                    </p>
                  </div>
                  <div>
                    <p>
                      <strong>Claim #:</strong> CLM-2026-00123
                    </p>
                    <p>
                      <strong>Carrier:</strong> State Farm
                    </p>
                    <p>
                      <strong>Contractor:</strong> ClearSkai Technologies LLC
                    </p>
                  </div>
                </div>
              </div>

              <div className="text-center text-sm text-slate-500">
                <p>📄 Full sample available for download</p>
                <Button className="mt-4" variant="outline">
                  <Download className="mr-2 h-4 w-4" />
                  Download Sample PDF
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
