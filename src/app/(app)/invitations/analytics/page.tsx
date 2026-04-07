/**
 * Invitation Analytics Dashboard
 * Comprehensive tracking and analytics for invitation performance
 */

"use client";

import { format } from "date-fns";
import {
  ArrowLeft,
  BarChart3,
  Check,
  Clock,
  Download,
  Eye,
  MessageSquare,
  Send,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { logger } from "@/lib/logger";

interface InvitationStats {
  period: string;
  sent: number;
  viewed: number;
  accepted: number;
  expired: number;
  pending: number;
  viewRate: number;
  acceptanceRate: number;
}

interface TimelineEvent {
  id: string;
  type: "sent" | "viewed" | "accepted" | "expired";
  email: string;
  name?: string;
  timestamp: string;
}

export default function InvitationAnalytics() {
  const [stats, setStats] = useState<InvitationStats[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("30d");

  useEffect(() => {
    void loadAnalytics();

    // Auto-refresh every 30 seconds for real-time updates
    const interval = setInterval(loadAnalytics, 30000);
    return () => clearInterval(interval);
  }, [period]);

  const loadAnalytics = async () => {
    try {
      const response = await fetch(`/api/invitations/analytics?period=${period}`);
      if (!response.ok) throw new Error("Failed to load analytics");

      const data = await response.json();
      setStats(data.stats || []);
      setTimeline(data.timeline || []);
    } catch (error) {
      logger.error("Error loading analytics:", error);
      toast.error("Failed to load analytics");
    } finally {
      setLoading(false);
    }
  };

  const downloadReport = async () => {
    try {
      const response = await fetch(`/api/invitations/analytics/export?period=${period}`);
      if (!response.ok) throw new Error("Failed to export report");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `invitation-analytics-${period}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success("Report downloaded successfully!");
    } catch (error) {
      logger.error("Error downloading report:", error);
      toast.error("Failed to download report");
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-64 rounded bg-slate-200"></div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 rounded-lg bg-slate-200"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Calculate totals from latest stats
  const latestStats = stats[stats.length - 1] || {
    sent: 0,
    viewed: 0,
    accepted: 0,
    expired: 0,
    pending: 0,
    viewRate: 0,
    acceptanceRate: 0,
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case "sent":
        return <Send className="h-4 w-4 text-blue-600" />;
      case "viewed":
        return <Eye className="h-4 w-4 text-yellow-600" />;
      case "accepted":
        return <Check className="h-4 w-4 text-green-600" />;
      case "expired":
        return <X className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case "sent":
        return "border-blue-200 bg-blue-50";
      case "viewed":
        return "border-yellow-200 bg-yellow-50";
      case "accepted":
        return "border-green-200 bg-green-50";
      case "expired":
        return "border-red-200 bg-red-50";
      default:
        return "border-gray-200 bg-gray-50";
    }
  };

  return (
    <PageContainer maxWidth="7xl">
      <PageHero section="network" title="Invitation Analytics">
        <div className="flex items-center gap-3">
          <Button asChild variant="outline">
            <Link href="/invitations">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Invitations
            </Link>
          </Button>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">7 Days</SelectItem>
              <SelectItem value="30d">30 Days</SelectItem>
              <SelectItem value="90d">90 Days</SelectItem>
              <SelectItem value="1y">1 Year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={downloadReport}>
            <Download className="mr-1 h-4 w-4" />
            Export
          </Button>
        </div>
      </PageHero>

      <div className="mt-8 space-y-8">
        {/* Key Metrics */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-slate-900">{latestStats.sent}</div>
                  <div className="text-sm text-slate-600">Sent</div>
                </div>
                <Send className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-slate-900">{latestStats.viewed}</div>
                  <div className="text-sm text-slate-600">Viewed</div>
                </div>
                <Eye className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-slate-900">{latestStats.accepted}</div>
                  <div className="text-sm text-slate-600">Accepted</div>
                </div>
                <Check className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-slate-900">{latestStats.pending}</div>
                  <div className="text-sm text-slate-600">Pending</div>
                </div>
                <Clock className="h-8 w-8 text-gray-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-slate-900">{latestStats.expired}</div>
                  <div className="text-sm text-slate-600">Expired</div>
                </div>
                <X className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    {Math.round(latestStats.viewRate)}%
                  </div>
                  <div className="text-sm text-slate-600">View Rate</div>
                </div>
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    {Math.round(latestStats.acceptanceRate)}%
                  </div>
                  <div className="text-sm text-slate-600">Accept Rate</div>
                </div>
                <Users className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Performance Chart Placeholder */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Invitation Performance Overview
              </CardTitle>
              <CardDescription>Visual breakdown of your team seat invitations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Sent */}
                <div className="flex items-center gap-3">
                  <div className="w-20 text-sm font-medium text-slate-600">Sent</div>
                  <div className="flex-1">
                    <div className="h-8 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="flex h-full items-center rounded-full bg-blue-500 px-3 text-xs font-semibold text-white transition-all duration-500"
                        style={{ width: latestStats.sent > 0 ? "100%" : "0%" }}
                      >
                        {latestStats.sent}
                      </div>
                    </div>
                  </div>
                </div>
                {/* Accepted */}
                <div className="flex items-center gap-3">
                  <div className="w-20 text-sm font-medium text-slate-600">Accepted</div>
                  <div className="flex-1">
                    <div className="h-8 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="flex h-full items-center rounded-full bg-green-500 px-3 text-xs font-semibold text-white transition-all duration-500"
                        style={{
                          width:
                            latestStats.sent > 0
                              ? `${(latestStats.accepted / latestStats.sent) * 100}%`
                              : "0%",
                          minWidth: latestStats.accepted > 0 ? "2rem" : "0",
                        }}
                      >
                        {latestStats.accepted}
                      </div>
                    </div>
                  </div>
                </div>
                {/* Pending */}
                <div className="flex items-center gap-3">
                  <div className="w-20 text-sm font-medium text-slate-600">Pending</div>
                  <div className="flex-1">
                    <div className="h-8 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="flex h-full items-center rounded-full bg-amber-500 px-3 text-xs font-semibold text-white transition-all duration-500"
                        style={{
                          width:
                            latestStats.sent > 0
                              ? `${(latestStats.pending / latestStats.sent) * 100}%`
                              : "0%",
                          minWidth: latestStats.pending > 0 ? "2rem" : "0",
                        }}
                      >
                        {latestStats.pending}
                      </div>
                    </div>
                  </div>
                </div>
                {/* Expired */}
                {latestStats.expired > 0 && (
                  <div className="flex items-center gap-3">
                    <div className="w-20 text-sm font-medium text-slate-600">Expired</div>
                    <div className="flex-1">
                      <div className="h-8 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="flex h-full items-center rounded-full bg-red-500 px-3 text-xs font-semibold text-white transition-all duration-500"
                          style={{
                            width: `${(latestStats.expired / latestStats.sent) * 100}%`,
                            minWidth: "2rem",
                          }}
                        >
                          {latestStats.expired}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              {latestStats.sent === 0 && (
                <div className="mt-6 text-center text-sm text-slate-500">
                  No invitations sent yet. Use the{" "}
                  <Link href="/teams" className="text-blue-600 underline">
                    Company Seats
                  </Link>{" "}
                  page to invite team members.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Recent Activity
              </CardTitle>
              <CardDescription>Latest invitation events and status changes</CardDescription>
            </CardHeader>
            <CardContent>
              {timeline.length === 0 ? (
                <div className="py-8 text-center text-slate-600">
                  <MessageSquare className="mx-auto mb-2 h-8 w-8" />
                  <p className="text-sm">No recent activity</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {timeline.slice(0, 8).map((event) => (
                    <div
                      key={event.id}
                      className={`rounded-lg border p-3 ${getEventColor(event.type)}`}
                    >
                      <div className="flex items-center gap-3">
                        {getEventIcon(event.type)}
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-slate-900">
                            {event.name || event.email}
                          </div>
                          <div className="text-xs capitalize text-slate-600">
                            {event.type} • {format(new Date(event.timestamp), "MMM d, h:mm a")}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {timeline.length > 8 && (
                    <div className="pt-2 text-center">
                      <Button variant="ghost" size="sm">
                        View All Activity
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Performance Insights */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Performance Insights
            </CardTitle>
            <CardDescription>Real-time metrics from your team seat invitations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                <div className="text-sm font-medium text-green-800">Acceptance Rate</div>
                <div className="text-2xl font-bold text-green-900">
                  {latestStats.sent > 0 ? Math.round(latestStats.acceptanceRate) : 0}%
                </div>
                <div className="text-sm text-green-700">
                  {latestStats.accepted} of {latestStats.sent} invites accepted
                </div>
              </div>

              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                <div className="text-sm font-medium text-blue-800">Pending Invites</div>
                <div className="text-2xl font-bold text-blue-900">{latestStats.pending}</div>
                <div className="text-sm text-blue-700">
                  {latestStats.pending > 0
                    ? "Awaiting team member acceptance"
                    : "All invites have been resolved"}
                </div>
              </div>

              <div className="rounded-lg border border-purple-200 bg-purple-50 p-4">
                <div className="text-sm font-medium text-purple-800">Team Growth</div>
                <div className="text-2xl font-bold text-purple-900">
                  {latestStats.accepted + 1} members
                </div>
                <div className="text-sm text-purple-700">
                  Including you + {latestStats.accepted} accepted invite
                  {latestStats.accepted !== 1 ? "s" : ""}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
