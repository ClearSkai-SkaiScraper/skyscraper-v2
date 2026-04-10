/**
 * 🔥 PHASE 30: PUBLIC ADJUSTER PACKET PAGE
 *
 * /packet/[publicId] - Public adjuster-friendly inspection packet
 * No auth required, shareable like /watch/[publicId]
 *
 * NOTE: This page queries ai_reports by ID. The publicId param is treated as the report ID.
 * Future schema updates may add dedicated publicId/isPublic fields.
 */

import {
  AlertCircle,
  Calendar,
  CheckCircle,
  FileText,
  Film,
  MapPin,
  Shield,
  Video,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import prisma from "@/lib/prisma";

// Extended type for packet with optional video/lead fields (future schema support)
interface PacketData {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
  orgName?: string;
  contractorName?: string;
  // Video fields (future)
  videoUrl?: string;
  thumbnailUrl?: string;
  duration?: number;
  // Lead/script fields (future)
  lead?: {
    description?: string;
    aiUrgencyScore?: number;
    aiJobType?: string;
    aiFlags?: unknown[];
    aiNextActions?: unknown[];
    aiSummaryJson?: { summary?: string };
    contact?: {
      street?: string;
      city?: string;
      state?: string;
      zip?: string;
      firstName?: string;
      lastName?: string;
      email?: string;
    };
  };
  scriptJson?: { sections?: { label?: string; narration?: string; description?: string }[] };
}

async function getPublicPacket(publicId: string): Promise<PacketData | null> {
  // Query by report ID - the publicId route param is used as the report ID
  const report = await prisma.ai_reports.findUnique({
    where: {
      id: publicId,
    },
    include: {
      Org: true,
    },
  });

  if (!report) return null;

  // Map to packet data structure
  return {
    id: report.id,
    title: report.title,
    content: report.content,
    createdAt: report.createdAt,
    orgName: report.Org?.name,
  };
}

export default async function AdjusterPacketPage({ params }: { params: { publicId: string } }) {
  const packet = await getPublicPacket(params.publicId);

  if (!packet) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center justify-center gap-2 text-center text-red-600">
              <AlertCircle className="h-5 w-5" />
              Packet Not Available
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-gray-700 dark:text-gray-300">
              This adjuster packet link is either invalid or has expired.
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-600">
              Please contact the contractor for a new packet link.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const lead = packet.lead;
  const contact = lead?.contact;
  const script = packet.scriptJson;
  const aiSummary = lead?.aiSummaryJson;
  const contractorName = packet.contractorName || packet.orgName || "Contractor";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="mx-auto max-w-5xl px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <FileText className="h-6 w-6 text-blue-600" />
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  AI-Enhanced Inspection Packet
                </h1>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-600">
                Prepared by {contractorName}
              </p>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 dark:text-gray-600">
                <Calendar className="h-4 w-4" />
                {new Date(packet.createdAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </div>
              <Badge variant="outline" className="mt-2">
                AI-Assisted Report
              </Badge>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-4 py-8">
        {/* Property & Claim Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-blue-600" />
              Property & Claim Information
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <p className="mb-1 text-sm text-gray-600 dark:text-gray-400 dark:text-gray-600">
                Property Address
              </p>
              <p className="font-medium text-gray-900 dark:text-gray-100">
                {contact?.street || "Address not available"}
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {contact?.city && contact?.state
                  ? `${contact.city}, ${contact.state} ${contact.zip || ""}`
                  : "Location not available"}
              </p>
            </div>
            <div>
              <p className="mb-1 text-sm text-gray-600 dark:text-gray-400 dark:text-gray-600">
                Homeowner
              </p>
              <p className="font-medium text-gray-900 dark:text-gray-100">
                {contact?.firstName || contact?.lastName
                  ? `${contact.firstName || ""} ${contact.lastName || ""}`.trim()
                  : "Name not available"}
              </p>
              {contact?.email && (
                <p className="text-sm text-gray-700 dark:text-gray-300">{contact.email}</p>
              )}
            </div>
            {lead?.description && (
              <div className="md:col-span-2">
                <p className="mb-1 text-sm text-gray-600 dark:text-gray-400 dark:text-gray-600">
                  Claim Description
                </p>
                <p className="text-gray-900 dark:text-gray-100">{lead.description}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* AI Summary & Damage Overview */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* AI Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                AI Analysis Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {lead?.aiUrgencyScore !== null && lead?.aiUrgencyScore !== undefined && (
                <div>
                  <p className="mb-1 text-sm text-gray-600 dark:text-gray-400 dark:text-gray-600">
                    Urgency Level
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                      {/* eslint-disable-next-line react/forbid-dom-props */}
                      <div
                        className={`h-full ${
                          lead.aiUrgencyScore >= 70
                            ? "bg-red-600"
                            : lead.aiUrgencyScore >= 40
                              ? "bg-yellow-600"
                              : "bg-green-600"
                        }`}
                        style={{ width: `${lead.aiUrgencyScore}%` }}
                      />
                    </div>
                    <span className="font-bold text-gray-900 dark:text-gray-100">
                      {lead.aiUrgencyScore}/100
                    </span>
                  </div>
                </div>
              )}
              {lead?.aiJobType && (
                <div>
                  <p className="mb-1 text-sm text-gray-600 dark:text-gray-400 dark:text-gray-600">
                    Job Classification
                  </p>
                  <Badge variant="outline" className="font-normal">
                    {lead.aiJobType}
                  </Badge>
                </div>
              )}
              {aiSummary?.summary && (
                <div>
                  <p className="mb-1 text-sm text-gray-600 dark:text-gray-400 dark:text-gray-600">
                    Summary
                  </p>
                  <p className="text-sm text-gray-900 dark:text-gray-100">{aiSummary.summary}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Safety & Concerns */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-orange-600" />
                Safety Concerns & Flags
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {lead?.aiFlags && Array.isArray(lead.aiFlags) && lead.aiFlags.length > 0 ? (
                <ul className="space-y-2">
                  {lead.aiFlags.map((flag, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-orange-600" />
                      <span className="text-sm text-gray-900 dark:text-gray-100">
                        {typeof flag === "string"
                          ? flag
                          : String(
                              (flag as Record<string, unknown>)?.description ||
                                "Safety concern noted"
                            )}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm italic text-gray-600 dark:text-gray-400 dark:text-gray-600">
                  No immediate safety concerns identified by AI analysis.
                </p>
              )}
              {lead?.aiNextActions &&
                Array.isArray(lead.aiNextActions) &&
                lead.aiNextActions.length > 0 && (
                  <div className="mt-4 border-t border-gray-200 pt-4 dark:border-gray-700">
                    <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                      Recommended Actions
                    </p>
                    <ul className="space-y-1">
                      {lead.aiNextActions.slice(0, 3).map((action, idx) => (
                        <li
                          key={idx}
                          className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-600"
                        >
                          •{" "}
                          {typeof action === "string"
                            ? action
                            : String((action as Record<string, unknown>)?.description || action)}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
            </CardContent>
          </Card>
        </div>

        {/* Video Report */}
        {packet.videoUrl ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Video className="h-5 w-5 text-purple-600" />
                AI-Generated Video Report
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="aspect-video overflow-hidden rounded-lg bg-black shadow-lg">
                <video
                  controls
                  className="h-full w-full"
                  poster={packet.thumbnailUrl || undefined}
                  preload="metadata"
                >
                  <source src={packet.videoUrl} type="video/mp4" />
                  Your browser does not support video playback.
                </video>
              </div>
              {packet.title && (
                <p className="mt-3 text-sm text-gray-700 dark:text-gray-300">{packet.title}</p>
              )}
              {packet.duration && (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 dark:text-gray-600">
                  Duration: {Math.floor(packet.duration)} seconds
                </p>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Film className="h-5 w-5 text-purple-600" />
                Video Report
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex aspect-video items-center justify-center rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900">
                <div className="px-4 text-center">
                  <Film className="mx-auto mb-3 h-12 w-12 text-gray-600 dark:text-gray-400" />
                  <p className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-600">
                    Video report is being processed
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Detailed Script Sections */}
        {script && script.sections && script.sections.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                Detailed Inspection Findings
              </CardTitle>
            </CardHeader>
            // eslint-disable-next-line react/jsx-no-comment-textnodes
            <CardContent className="space-y-4">
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              {script.sections.map((section: any, idx: number) => (
                <div key={idx} className="border-l-4 border-blue-600 pl-4">
                  <h3 className="mb-2 font-semibold text-gray-900 dark:text-gray-100">
                    {section.label || `Section ${idx + 1}`}
                  </h3>
                  <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                    {section.narration || section.description || "Details not available"}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Disclaimer Footer */}
        <Card className="border-gray-300 bg-gray-50 dark:border-gray-600 dark:bg-gray-800">
          <CardContent className="py-6">
            <div className="space-y-2 text-center text-xs text-gray-600 dark:text-gray-400 dark:text-gray-600">
              <p className="font-semibold text-gray-700 dark:text-gray-300">Important Disclaimer</p>
              <p>
                This is an AI-assisted preliminary property inspection report generated for
                informational purposes only. This report does not constitute a professional
                engineering assessment, structural analysis, or insurance claim determination.
              </p>
              <p>
                All findings should be verified by licensed professionals (engineers, inspectors,
                contractors) before any repair decisions are made. The AI analysis is based on
                available photos and information at the time of inspection and may not capture all
                property conditions.
              </p>
              <p className="mt-3 text-gray-500 dark:text-gray-500">
                Report generated: {new Date(packet.createdAt).toLocaleString("en-US")}
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
