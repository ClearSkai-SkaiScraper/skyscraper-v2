"use client";

/**
 * Building Code Lookup Page
 * Analyzes property location and provides applicable building codes
 */

import { BookOpen, ExternalLink, Loader2, MapPin, Scale, Search, Sparkles } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { logger } from "@/lib/logger";

interface CodeItem {
  code: string;
  title: string;
  requirement: string;
  category: string;
  source: "irc" | "local" | "manufacturer";
  appliesTo: string;
  citation?: string;
}

interface ClaimData {
  id: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
}

interface CodeAnalysisResult {
  codes: CodeItem[];
  jurisdiction: string;
  adoptedCode: string;
  localAmendments: string[];
  permitRequired: boolean;
  permitFees?: number;
  highWindZone: boolean;
  iceWaterShieldRequired: boolean;
}

const CATEGORY_COLORS: Record<string, string> = {
  underlayment: "bg-blue-100 text-blue-800",
  flashing: "bg-amber-100 text-amber-800",
  ventilation: "bg-green-100 text-green-800",
  fasteners: "bg-purple-100 text-purple-800",
  ice_water: "bg-cyan-100 text-cyan-800",
  drip_edge: "bg-pink-100 text-pink-800",
  valley: "bg-orange-100 text-orange-800",
  other: "bg-slate-100 text-slate-800",
};

// Demo codes data
const DEMO_CODES: CodeAnalysisResult = {
  codes: [
    {
      code: "R905.2.6",
      title: "Ice Barrier Requirements",
      requirement:
        "Ice barrier shall extend from eave edge to a point at least 24 inches inside the exterior wall line in areas where the average daily temperature is 25°F or less.",
      category: "ice_water",
      source: "irc",
      appliesTo: "Roof deck",
      citation: "R905.2.6",
    },
    {
      code: "R905.2.7",
      title: "Underlayment Requirements",
      requirement:
        "Asphalt shingles shall be applied over underlayment as specified. One layer of No. 15 asphalt felt complying with ASTM D226 Type I or ASTM D4869 Type I.",
      category: "underlayment",
      source: "irc",
      appliesTo: "Entire roof area",
      citation: "R905.2.7",
    },
    {
      code: "R905.7.5",
      title: "Wind Resistance Classification",
      requirement:
        "Roofing materials shall be designed for wind resistance in accordance with Section R905.2.4.1 or tested in accordance with ASTM D3161 Class F.",
      category: "fasteners",
      source: "irc",
      appliesTo: "All shingles",
      citation: "R905.7.5",
    },
    {
      code: "R905.2.8.2",
      title: "Drip Edge Requirements",
      requirement:
        "A drip edge shall be provided at eaves and gables of shingle roofs. Adjacent segments shall overlap at least 2 inches.",
      category: "drip_edge",
      source: "irc",
      appliesTo: "Roof perimeter",
      citation: "R905.2.8.2",
    },
    {
      code: "R905.2.5",
      title: "Valley Flashing",
      requirement:
        "Valley linings shall be installed per manufacturer specifications. Minimum 24-gauge corrosion-resistant metal.",
      category: "valley",
      source: "irc",
      appliesTo: "All valleys",
      citation: "R905.2.5",
    },
    {
      code: "R903.2.1",
      title: "Flashing Requirements",
      requirement:
        "Flashings shall be installed at wall and roof intersections, changes in roof slope or direction, and around roof openings.",
      category: "flashing",
      source: "irc",
      appliesTo: "All penetrations",
      citation: "R903.2.1",
    },
  ],
  jurisdiction: "City of Phoenix, Maricopa County",
  adoptedCode: "IRC 2021 with local amendments",
  localAmendments: [
    "City of Phoenix requires Class A fire-rated roofing materials",
    "High wind zone designation requires enhanced fastening schedule",
    "Permit required for all re-roofing projects exceeding 100 sq ft",
  ],
  permitRequired: true,
  permitFees: 385,
  highWindZone: true,
  iceWaterShieldRequired: false,
};

export default function CodesPage() {
  const params = useParams();
  const claimId = Array.isArray(params?.claimId) ? params.claimId[0] : params?.claimId;

  const [claim, setClaim] = useState<ClaimData | null>(null);
  const [codes, setCodes] = useState<CodeAnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch claim data
  useEffect(() => {
    async function fetchClaim() {
      if (!claimId) return;

      // Demo claim handling
      if (claimId === "demo-claim") {
        setClaim({
          id: "demo-claim",
          address: "123 Main Street",
          city: "Phoenix",
          state: "AZ",
          zip: "85001",
        });
        setCodes(DEMO_CODES);
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`/api/claims/${claimId}`);
        if (res.ok) {
          const data = await res.json();
          setClaim(data.claim);
        }
      } catch (err) {
        logger.error("Failed to fetch claim:", err);
      } finally {
        setLoading(false);
      }
    }
    void fetchClaim();
  }, [claimId]);

  const handleAnalyzeCodes = async () => {
    if (!claim) return;

    setAnalyzing(true);
    try {
      // For demo, just show demo codes
      if (claimId === "demo-claim") {
        await new Promise((r) => setTimeout(r, 1500)); // Simulate API call
        setCodes(DEMO_CODES);
        return;
      }

      const res = await fetch("/api/codes/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          claimId,
          address: claim.address,
          city: claim.city,
          state: claim.state,
          zip: claim.zip,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setCodes(data);
      }
    } catch (err) {
      logger.error("Code analysis failed:", err);
      // Fall back to demo codes on error
      setCodes(DEMO_CODES);
    } finally {
      setAnalyzing(false);
    }
  };

  const filteredCodes =
    codes?.codes.filter(
      (code) =>
        code.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        code.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        code.requirement.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl space-y-6 p-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-[500px] w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Scale className="h-6 w-6 text-teal-600" />
            <h1 className="text-2xl font-bold">Building Code Lookup</h1>
          </div>
          <p className="text-slate-500">
            Analyze applicable IRC codes and local requirements for this property
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/claims-ready-folder/${claimId}/sections/code-compliance`}>
            <Button variant="outline">← Back to Folder</Button>
          </Link>
        </div>
      </div>

      {/* Property Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Property Location
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">
                {claim?.address || "No address on file"}
                {claim?.city && `, ${claim.city}`}
                {claim?.state && `, ${claim.state}`}
                {claim?.zip && ` ${claim.zip}`}
              </p>
              {codes && (
                <p className="text-sm text-slate-500">
                  Jurisdiction: {codes.jurisdiction} • {codes.adoptedCode}
                </p>
              )}
            </div>
            <Button onClick={handleAnalyzeCodes} disabled={analyzing}>
              {analyzing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  {codes ? "Re-Analyze" : "Analyze Codes"}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {codes && (
        <>
          {/* Quick Stats */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-3xl font-bold text-teal-600">{codes.codes.length}</div>
                <div className="text-sm text-slate-500">Applicable Codes</div>
              </CardContent>
            </Card>
            <Card className={codes.permitRequired ? "border-amber-200 bg-amber-50" : ""}>
              <CardContent className="pt-6">
                <div className="text-lg font-bold">
                  {codes.permitRequired ? "Required" : "Not Required"}
                </div>
                <div className="text-sm text-slate-500">Permit Status</div>
                {codes.permitFees && (
                  <div className="mt-1 text-sm text-amber-600">~${codes.permitFees} fees</div>
                )}
              </CardContent>
            </Card>
            <Card className={codes.highWindZone ? "border-red-200 bg-red-50" : ""}>
              <CardContent className="pt-6">
                <div className="text-lg font-bold">{codes.highWindZone ? "Yes" : "No"}</div>
                <div className="text-sm text-slate-500">High Wind Zone</div>
              </CardContent>
            </Card>
            <Card className={codes.iceWaterShieldRequired ? "border-blue-200 bg-blue-50" : ""}>
              <CardContent className="pt-6">
                <div className="text-lg font-bold">
                  {codes.iceWaterShieldRequired ? "Required" : "Not Required"}
                </div>
                <div className="text-sm text-slate-500">Ice & Water Shield</div>
              </CardContent>
            </Card>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search codes..."
              className="pl-10"
            />
          </div>

          {/* Code List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Applicable Building Codes
              </CardTitle>
              <CardDescription>
                {filteredCodes.length} codes found for this property
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredCodes.map((code, index) => (
                  <div
                    key={index}
                    className="rounded-lg border border-slate-200 p-4 dark:border-slate-700"
                  >
                    <div className="mb-2 flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="font-mono">
                          {code.code}
                        </Badge>
                        <Badge className={CATEGORY_COLORS[code.category] || CATEGORY_COLORS.other}>
                          {code.category.replace("_", " ")}
                        </Badge>
                        <Badge variant="secondary">{code.source.toUpperCase()}</Badge>
                      </div>
                    </div>
                    <h4 className="mb-1 font-medium">{code.title}</h4>
                    <p className="mb-2 text-sm text-slate-600 dark:text-slate-400">
                      {code.requirement}
                    </p>
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>Applies to: {code.appliesTo}</span>
                      {code.citation && (
                        <a
                          href={`https://codes.iccsafe.org/content/IRC2021P2/${code.citation}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-blue-600 hover:underline"
                        >
                          View Citation <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Local Amendments */}
          {codes.localAmendments && codes.localAmendments.length > 0 && (
            <Card className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950">
              <CardHeader>
                <CardTitle>Local Amendments</CardTitle>
                <CardDescription>
                  Additional requirements specific to {codes.jurisdiction}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="list-disc space-y-1 pl-5">
                  {codes.localAmendments.map((amendment, index) => (
                    <li key={index} className="text-sm">
                      {amendment}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {!codes && !loading && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Scale className="mb-4 h-12 w-12 text-slate-300" />
            <h3 className="mb-2 text-lg font-medium">No Codes Analyzed Yet</h3>
            <p className="mb-4 max-w-md text-center text-sm text-slate-500">
              Click &quot;Analyze Codes&quot; to identify applicable IRC codes and local requirements for this
              property.
            </p>
            <Button onClick={handleAnalyzeCodes}>
              <Sparkles className="mr-2 h-4 w-4" />
              Analyze Codes
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
