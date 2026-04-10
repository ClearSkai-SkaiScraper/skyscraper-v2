"use client";

import { ClockIcon, CloudIcon, ExclamationTriangleIcon,MapPinIcon } from "@heroicons/react/24/outline";
import React, { useEffect, useState } from "react";

import { logger } from "@/lib/logger";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface StormEvent {
  date: string;
  type: string;
  hailSize?: number;
  windSpeed?: number;
  distance: number;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface HeatmapZone {
  intensity: number;
  radius: number;
  color: string;
}

interface StormImpact {
  id: string;
  leadId: string;
  orgId: string;
  propertyAddress: string;
  propertyLat: number;
  propertyLng: number;
  stormDate: Date;
  hailSize?: number;
  windSpeed?: number;
  stormDistance?: number;
  stormDuration?: number;
  severityScore: number;
  severityCategory: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  noaaData?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  nwsData?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  iaDolData?: any;
  heatmapUrl?: string;
  radarImageUrl?: string;
  impactAnalysis: string;
  publicId?: string;
  publicUrl?: string;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export default function StormImpactPanel({ leadId }: { leadId: string }) {
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [stormReport, setStormReport] = useState<StormImpact | null>(null);
  const [error, setError] = useState<string | null>(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    void fetchStormReport();
  }, [leadId]);

  const fetchStormReport = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/storm/${leadId}`);
      if (response.ok) {
        const data = await response.json();
        setStormReport(data);
      } else {
        setStormReport(null);
      }
    } catch (err) {
      logger.error("Error fetching storm report:", err);
      setError("Failed to load storm report");
    } finally {
      setLoading(false);
    }
  };

  const generateStormReport = async () => {
    try {
      setGenerating(true);
      setError(null);
      const response = await fetch(`/api/storm/${leadId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate storm report");
      }

      const data = await response.json();
      setStormReport(data);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      logger.error("Error generating storm report:", err);
      setError(err.message || "Failed to generate storm report");
    } finally {
      setGenerating(false);
    }
  };

  const togglePublicLink = async () => {
    if (!stormReport) return;

    try {
      const response = await fetch(`/api/storm/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: stormReport.publicId ? "revoke" : "share",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to toggle public link");
      }

      const data = await response.json();
      setStormReport(data);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      logger.error("Error toggling public link:", err);
      setError(err.message);
    }
  };

  const copyPublicLink = () => {
    if (stormReport?.publicUrl) {
      void navigator.clipboard.writeText(stormReport.publicUrl);
      alert("Public link copied to clipboard!");
    }
  };

  const getSeverityColor = (category: string) => {
    switch (category.toLowerCase()) {
      case "extreme":
        return "text-red-600 bg-red-50";
      case "severe":
        return "text-orange-600 bg-orange-50";
      case "moderate":
        return "text-yellow-600 bg-yellow-50";
      case "minor":
        return "text-blue-600 bg-blue-50";
      default:
        return "text-gray-600 bg-gray-50";
    }
  };

  if (loading) {
    return (
      <div className="p-6 text-center">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
        <p className="mt-4 text-gray-600">Loading storm data...</p>
      </div>
    );
  }

  if (!stormReport) {
    return (
      <div className="p-6">
        <div className="py-12 text-center">
          <CloudIcon className="mx-auto h-16 w-16 text-gray-400" />
          <h3 className="mt-4 text-lg font-semibold text-gray-900">No Storm Report Yet</h3>
          <p className="mt-2 text-gray-600">
            Generate a comprehensive storm impact analysis for this property.
          </p>
          <button
            onClick={generateStormReport}
            disabled={generating}
            className="mt-6 rounded-lg bg-blue-600 px-6 py-3 font-medium text-white transition-colors hover:bg-blue-700 disabled:bg-gray-400"
          >
            {generating ? "Analyzing Storm Data..." : "Generate Storm Report"}
          </button>
          {error && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4">
              <p className="text-red-600">{error}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Storm Impact Analysis</h2>
          <p className="mt-1 text-gray-600">{stormReport.propertyAddress}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={togglePublicLink}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium transition-colors hover:bg-gray-50"
          >
            {stormReport.publicId ? "Revoke Public Link" : "Share Public Link"}
          </button>
          {stormReport.publicUrl && (
            <button
              onClick={copyPublicLink}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
            >
              Copy Link
            </button>
          )}
        </div>
      </div>

      {/* Severity Score */}
      <div className={`rounded-lg border-2 p-6 ${getSeverityColor(stormReport.severityCategory)}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide">Severity Rating</p>
            <p className="mt-1 text-3xl font-bold">{stormReport.severityScore.toFixed(1)}/10</p>
            <p className="mt-1 text-lg font-semibold capitalize">{stormReport.severityCategory}</p>
          </div>
          <ExclamationTriangleIcon className="h-16 w-16 opacity-30" />
        </div>
      </div>

      {/* Storm Metrics */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stormReport.hailSize && (
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-sm text-gray-600">Hail Size</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{stormReport.hailSize}&quot;</p>
          </div>
        )}
        {stormReport.windSpeed && (
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-sm text-gray-600">Wind Speed</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{stormReport.windSpeed} MPH</p>
          </div>
        )}
        {stormReport.stormDistance !== undefined && (
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <MapPinIcon className="mb-2 h-5 w-5 text-gray-400" />
            <p className="text-sm text-gray-600">Distance</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{stormReport.stormDistance.toFixed(1)} mi</p>
          </div>
        )}
        {stormReport.stormDuration && (
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <ClockIcon className="mb-2 h-5 w-5 text-gray-400" />
            <p className="text-sm text-gray-600">Duration</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{stormReport.stormDuration} min</p>
          </div>
        )}
      // eslint-disable-next-line react/jsx-no-comment-textnodes
      </div>

      // eslint-disable-next-line react/jsx-no-comment-textnodes
      {/* Heatmap Overlay */}
      // eslint-disable-next-line @next/next/no-img-element
      {stormReport.heatmapUrl && (
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">Storm Impact Overlay</h3>
          <img
            src={stormReport.heatmapUrl}
            alt="Storm Impact Heatmap"
            className="w-full rounded-lg border border-gray-300"
          />
        </div>
      // eslint-disable-next-line react/jsx-no-comment-textnodes
      )}

      // eslint-disable-next-line react/jsx-no-comment-textnodes
      {/* Radar Image */}
      // eslint-disable-next-line @next/next/no-img-element
      {stormReport.radarImageUrl && (
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">NWS Radar Image</h3>
          <img
            src={stormReport.radarImageUrl}
            alt="NWS Radar"
            className="w-full rounded-lg border border-gray-300"
          />
        </div>
      )}

      {/* Impact Analysis */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">Impact Analysis</h3>
        <p className="whitespace-pre-line text-gray-700">{stormReport.impactAnalysis}</p>
      </div>

      {/* Storm Events */}
      {(stormReport.noaaData || stormReport.nwsData || stormReport.iaDolData) && (
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">Storm Events</h3>
          // eslint-disable-next-line react/jsx-no-comment-textnodes
          <div className="space-y-3">
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            {stormReport.noaaData?.events?.map((event: any, idx: number) => (
              <div key={`noaa-${idx}`} className="flex items-start gap-3 rounded-lg bg-gray-50 p-3">
                <CloudIcon className="mt-0.5 h-5 w-5 text-blue-600" />
                <div>
                  <p className="font-medium text-gray-900">{event.type}</p>
                  <p className="text-sm text-gray-600">
                    {new Date(event.date).toLocaleDateString()} • {event.distance.toFixed(1)} miles away
                  </p>
                  {event.hailSize && <p className="text-sm text-gray-700">Hail: {event.hailSize}&quot;</p>}
                  {event.windSpeed && <p className="text-sm text-gray-700">Wind: {event.windSpeed} MPH</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Regenerate Button */}
      <div className="flex justify-center pt-4">
        <button
          onClick={generateStormReport}
          disabled={generating}
          className="rounded-lg bg-blue-600 px-6 py-3 font-medium text-white transition-colors hover:bg-blue-700 disabled:bg-gray-400"
        >
          {generating ? "Regenerating..." : "Regenerate Storm Report"}
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-red-600">{error}</p>
        </div>
      )}
    </div>
  );
}
