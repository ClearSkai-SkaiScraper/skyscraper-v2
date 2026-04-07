// src/app/(app)/claims-ready-folder/[claimId]/sections/code-compliance/page.tsx
"use client";

import { BookOpen, ExternalLink, FileCode, Scale, Search } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

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

interface CodeComplianceData {
  codes: CodeItem[];
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

export default function CodeCompliancePage() {
  const params = useParams();
  const claimId = Array.isArray(params?.claimId) ? params.claimId[0] : params?.claimId;

  const [data, setData] = useState<CodeComplianceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchData = useCallback(async () => {
    if (!claimId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/claims-folder/sections/code-compliance?claimId=${claimId}`);
      if (res.ok) {
        const json = await res.json();
        setData(json.data);
      }
    } catch (err) {
      logger.error("Failed to fetch code compliance data:", err);
    } finally {
      setLoading(false);
    }
  }, [claimId]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const filteredCodes =
    data?.codes.filter(
      (code) =>
        code.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        code.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        code.requirement.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-[500px] w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Scale className="h-6 w-6 text-teal-600" />
            <h1 className="text-2xl font-bold">Code Compliance</h1>
          </div>
          <p className="text-slate-500">IRC citations, local codes, and permit requirements</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">Section 8 of 17</Badge>
          <Link href={`/claims/${claimId}/codes`}>
            <Button variant="outline">
              <BookOpen className="mr-2 h-4 w-4" />
              Code Lookup
            </Button>
          </Link>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-3xl font-bold text-teal-600">{data?.codes.length || 0}</div>
            <div className="text-sm text-slate-500">Applicable Codes</div>
          </CardContent>
        </Card>
        <Card className={data?.permitRequired ? "border-amber-200 bg-amber-50" : ""}>
          <CardContent className="pt-6">
            <div className="text-lg font-bold">
              {data?.permitRequired ? "Required" : "Not Required"}
            </div>
            <div className="text-sm text-slate-500">Permit Status</div>
            {data?.permitFees && (
              <div className="mt-1 text-sm text-amber-600">~${data.permitFees} fees</div>
            )}
          </CardContent>
        </Card>
        <Card className={data?.highWindZone ? "border-red-200 bg-red-50" : ""}>
          <CardContent className="pt-6">
            <div className="text-lg font-bold">{data?.highWindZone ? "Yes" : "No"}</div>
            <div className="text-sm text-slate-500">High Wind Zone</div>
          </CardContent>
        </Card>
        <Card className={data?.iceWaterShieldRequired ? "border-blue-200 bg-blue-50" : ""}>
          <CardContent className="pt-6">
            <div className="text-lg font-bold">
              {data?.iceWaterShieldRequired ? "Required" : "Not Required"}
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
            <FileCode className="h-5 w-5" />
            Applicable Building Codes
          </CardTitle>
          <CardDescription>{filteredCodes.length} codes applicable to this project</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredCodes.length > 0 ? (
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
          ) : (
            <div className="py-12 text-center text-slate-500">
              <Scale className="mx-auto mb-4 h-12 w-12 text-slate-300" />
              <p>No codes found. Run code analysis to identify applicable building codes.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Local Amendments */}
      {data?.localAmendments && data.localAmendments.length > 0 && (
        <Card className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950">
          <CardHeader>
            <CardTitle>Local Amendments</CardTitle>
            <CardDescription>Additional requirements specific to this jurisdiction</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="list-disc space-y-1 pl-5">
              {data.localAmendments.map((amendment, index) => (
                <li key={index} className="text-sm">
                  {amendment}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
