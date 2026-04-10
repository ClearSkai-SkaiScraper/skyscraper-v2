"use client";

import { format, parseISO } from "date-fns";
import { AlertTriangle, Calendar, Loader2, MapPin } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { logger } from "@/lib/logger";

interface QuickDOLCandidate {
  date: string;
  score: number;
  peril?: string | null;
  description?: string | null;
  source?: string | null;
  confidence: "high" | "medium" | "low";
}

interface QuickDOLFinderProps {
  claimId?: string;
  leadId?: string;
  initialAddress?: string;
  onSelectDate?: (date: string, candidate: QuickDOLCandidate) => void;
}

export function QuickDOLFinder({
  claimId,
  leadId,
  initialAddress,
  onSelectDate,
}: QuickDOLFinderProps) {
  const [address, setAddress] = useState(initialAddress || "");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [candidates, setCandidates] = useState<QuickDOLCandidate[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    address?: string;
    startDate?: string;
    endDate?: string;
  }>({});

  const handleSearch = async () => {
    const errors: { address?: string; startDate?: string; endDate?: string } = {};
    if (!address.trim()) errors.address = "Property address is required";
    if (!startDate) errors.startDate = "Start date is required";
    if (!endDate) errors.endDate = "End date is required";
    if (startDate && endDate && startDate > endDate)
      errors.endDate = "End date must be after start date";

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    setFieldErrors({});
    setCandidates([]);

    try {
      const response = await fetch("/api/weather/quick-dol", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address,
          dateFrom: startDate,
          dateTo: endDate,
          claimId,
          leadId,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to fetch DOL candidates");
      }

      const data = await response.json();
      const incoming = Array.isArray(data.candidates) ? data.candidates : [];

      const normalized: QuickDOLCandidate[] = incoming
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((candidate: any) => {
          const rawScore =
            typeof candidate.score === "number"
              ? candidate.score
              : typeof candidate.confidence === "number"
                ? candidate.confidence
                : 0;

          const scorePercent = Math.max(0, Math.min(100, rawScore > 1 ? rawScore : rawScore * 100));

          const confidence: QuickDOLCandidate["confidence"] =
            scorePercent >= 75 ? "high" : scorePercent >= 50 ? "medium" : "low";

          return {
            date: candidate.date,
            score: Math.round(scorePercent),
            peril: candidate.peril || candidate.lossType || null,
            description: candidate.description || candidate.reason || candidate.reasoning || null,
            source: candidate.source || "Quick DOL AI",
            confidence,
          } as QuickDOLCandidate;
        })
        .filter((c) => typeof c.date === "string" && c.date.length > 0);

      setCandidates(normalized);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to search for DOL candidates");
      logger.error("Quick DOL search error:", err);
    } finally {
      setLoading(false);
    }
  };

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case "high":
        return "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20";
      case "medium":
        return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20";
      case "low":
        return "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20";
      default:
        return "bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20";
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600 dark:text-green-400";
    if (score >= 60) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Quick DOL Finder
        </CardTitle>
        <CardDescription>
          Find potential dates of loss using weather events, CAP alerts, and storm reports
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search Form */}
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2 md:col-span-3">
            <Label htmlFor="address" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Property Address
            </Label>
            <Input
              id="address"
              placeholder="Enter property address…"
              value={address}
              onChange={(e) => {
                setAddress(e.target.value);
                if (fieldErrors.address)
                  setFieldErrors((prev) => ({ ...prev, address: undefined }));
              }}
              disabled={loading}
              className={fieldErrors.address ? "border-red-500" : ""}
            />
            {fieldErrors.address && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">{fieldErrors.address}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="startDate">Search From</Label>
            <Input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                if (fieldErrors.startDate)
                  setFieldErrors((prev) => ({ ...prev, startDate: undefined }));
              }}
              disabled={loading}
              className={fieldErrors.startDate ? "border-red-500" : ""}
            />
            {fieldErrors.startDate && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">{fieldErrors.startDate}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="endDate">Search To</Label>
            <Input
              id="endDate"
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                if (fieldErrors.endDate)
                  setFieldErrors((prev) => ({ ...prev, endDate: undefined }));
              }}
              disabled={loading}
              className={fieldErrors.endDate ? "border-red-500" : ""}
            />
            {fieldErrors.endDate && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">{fieldErrors.endDate}</p>
            )}
          </div>
          <div className="flex items-end">
            <Button
              onClick={handleSearch}
              disabled={loading || !address.trim() || !startDate || !endDate}
              className="w-full"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? "Searching..." : "Find DOL Candidates"}
            </Button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="flex items-center gap-2 rounded-md border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-400">
            <AlertTriangle className="h-4 w-4" />
            {error}
          </div>
        )}

        {/* Results Table */}
        {candidates.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium">
              Found {candidates.length} potential date{candidates.length !== 1 ? "s" : ""} of loss
            </h3>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Peril</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead className="text-center">Score</TableHead>
                    <TableHead className="text-center">Confidence</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {candidates.map((candidate, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">
                        {format(parseISO(candidate.date), "MMM dd, yyyy")}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{candidate.peril || "unknown"}</Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {candidate.description || "No reasoning provided"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {candidate.source || "Weather AI"}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={`font-semibold ${getScoreColor(candidate.score)}`}>
                          {candidate.score}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className={getConfidenceColor(candidate.confidence)}>
                          {candidate.confidence}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => onSelectDate?.(candidate.date, candidate)}
                        >
                          Use as DOL
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && candidates.length === 0 && !error && (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Enter a property address and date range to find potential dates of loss
          </div>
        )}
      </CardContent>
    </Card>
  );
}
