import {
  ClockIcon,
  CloudIcon,
  ExclamationTriangleIcon,
  MapPinIcon,
} from "@heroicons/react/24/outline";
import { notFound } from "next/navigation";

import prisma from "@/lib/prisma";

export default async function PublicStormPage({ params }: { params: { publicId: string } }) {
  const { publicId } = params;

  // Fetch storm report by public ID
  const stormReport = await prisma.stormImpact.findUnique({
    where: { publicId },
  });

  if (!stormReport) {
    notFound();
  }

  // Check if report has expired
  if (stormReport.publicExpiresAt && new Date() > stormReport.publicExpiresAt) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md rounded-lg bg-white p-8 text-center shadow-lg">
          <ExclamationTriangleIcon className="mx-auto h-16 w-16 text-yellow-500" />
          <h1 className="mt-4 text-2xl font-bold text-gray-900">Report Expired</h1>
          <p className="mt-2 text-gray-600">
            This storm impact report has expired and is no longer available.
          </p>
        </div>
      </div>
    );
  }

  const getSeverityColor = (category: string) => {
    switch (category.toLowerCase()) {
      case "extreme":
        return "text-red-600 bg-red-50 border-red-200";
      case "severe":
        return "text-orange-600 bg-orange-50 border-orange-200";
      case "moderate":
        return "text-yellow-600 bg-yellow-50 border-yellow-200";
      case "minor":
        return "text-blue-600 bg-blue-50 border-blue-200";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  const deriveSeverityCategory = (score: number): string => {
    if (score >= 8) return "extreme";
    if (score >= 6) return "severe";
    if (score >= 4) return "moderate";
    return "minor";
  };
  const severityCategory = deriveSeverityCategory(stormReport.severityScore);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-8">
          <div className="flex items-center gap-3">
            <CloudIcon className="h-10 w-10 text-blue-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Storm Impact Report</h1>
              <p className="mt-1 text-gray-600">{stormReport.stormName || "Storm Impact Report"}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
        {/* Severity Score */}
        <div className={`rounded-lg border-2 p-8 ${getSeverityColor(severityCategory)}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-wide">Severity Rating</p>
              <p className="mt-2 text-5xl font-bold">{stormReport.severityScore.toFixed(1)}/10</p>
              <p className="mt-2 text-xl font-semibold capitalize">{severityCategory}</p>
            </div>
            <ExclamationTriangleIcon className="h-20 w-20 opacity-30" />
          </div>
        </div>

        {/* Storm Metrics */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stormReport.hailSize && (
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-medium text-gray-600">Hail Size</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">{stormReport.hailSize}&quot;</p>
            </div>
          )}
          {stormReport.windSpeed && (
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-medium text-gray-600">Wind Speed</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">{stormReport.windSpeed} MPH</p>
            </div>
          )}
          {stormReport.stormDistance !== undefined && (
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <MapPinIcon className="mb-2 h-6 w-6 text-gray-600 dark:text-gray-400" />
              <p className="text-sm font-medium text-gray-600">Distance</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">
                {stormReport.stormDistance!.toFixed(1)} mi
              </p>
            </div>
          )}
          {stormReport.stormDuration && (
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <ClockIcon className="mb-2 h-6 w-6 text-gray-600 dark:text-gray-400" />
              <p className="text-sm font-medium text-gray-600">Duration</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">
                {stormReport.stormDuration} min
              </p>
            </div>
          )}
        </div>

        {/* Heatmap Overlay */}
        {stormReport.heatmapUrl && (
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            // eslint-disable-next-line react/jsx-no-comment-textnodes
            <h2 className="mb-4 text-xl font-bold text-gray-900">Storm Impact Overlay</h2>
            // eslint-disable-next-line react/jsx-no-comment-textnodes
            <div className="overflow-hidden rounded-lg border border-gray-300">
              // eslint-disable-next-line @next/next/no-img-element
              <img src={stormReport.heatmapUrl} alt="Storm Impact Heatmap" className="w-full" />
            </div>
          </div>
        )}

        {/* Radar Image */}
        {stormReport.radarImageUrl && (
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            // eslint-disable-next-line react/jsx-no-comment-textnodes
            <h2 className="mb-4 text-xl font-bold text-gray-900">NWS Radar Image</h2>
            // eslint-disable-next-line react/jsx-no-comment-textnodes
            <div className="overflow-hidden rounded-lg border border-gray-300">
              // eslint-disable-next-line @next/next/no-img-element
              <img src={stormReport.radarImageUrl} alt="NWS Radar" className="w-full" />
            </div>
          </div>
        )}

        {/* Impact Analysis */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-bold text-gray-900">Impact Analysis</h2>
          <div className="prose prose-gray max-w-none">
            <p className="whitespace-pre-line leading-relaxed text-gray-700">
              {String(stormReport.impactAnalysis)}
            </p>
          </div>
        </div>

        {/* Storm Events */}
        {(stormReport.noaaData || stormReport.nwsData || stormReport.iaDolData) && (
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-xl font-bold text-gray-900">Storm Events</h2>
            // eslint-disable-next-line react/jsx-no-comment-textnodes
            <div className="space-y-3">
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              {(stormReport.noaaData as any)?.events?.map((event: any, idx: number) => (
                <div
                  key={`noaa-${idx}`}
                  className="flex items-start gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4"
                >
                  <CloudIcon className="mt-0.5 h-6 w-6 flex-shrink-0 text-blue-600" />
                  <div>
                    <p className="font-semibold text-gray-900">{event.type}</p>
                    <p className="mt-1 text-sm text-gray-600">
                      {new Date(event.date).toLocaleDateString()} • {event.distance.toFixed(1)}{" "}
                      miles away
                    </p>
                    {event.hailSize && (
                      <p className="mt-1 text-sm text-gray-700">
                        Hail Size: {event.hailSize}&quot;
                      </p>
                    )}
                    {event.windSpeed && (
                      <p className="text-sm text-gray-700">Wind Speed: {event.windSpeed} MPH</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Report Metadata */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div>
              <p>Report Generated: {new Date(stormReport.createdAt).toLocaleString()}</p>
              // eslint-disable-next-line react/jsx-no-comment-textnodes
              <p className="mt-1">
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                Storm Date: {new Date(stormReport.stormDate as any).toLocaleDateString()}
              </p>
            </div>
            {stormReport.publicExpiresAt && (
              <p>Expires: {new Date(stormReport.publicExpiresAt).toLocaleDateString()}</p>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-12 border-t border-gray-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-8 text-center">
          <p className="text-sm text-gray-600">
            This is an automated storm impact analysis generated by AI.
          </p>
          <p className="mt-2 text-xs text-gray-500">
            Powered by NOAA, NWS, and IA-DOL storm databases
          </p>
        </div>
      </div>
    </div>
  );
}
