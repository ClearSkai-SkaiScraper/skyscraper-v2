/**
 * Work Requests — Incoming requests from connected clients
 *
 * This page shows all work requests sent directly to this Pro company.
 * Requests from connected clients appear here first; if a client doesn't
 * select a specific Pro, the request goes to the public Job Board instead.
 *
 * Flow:
 * 1. Client submits work request via portal
 * 2. If client selects a connected Pro → appears here
 * 3. If no Pro selected → goes to Job Board as public posting
 * 4. Pro can accept, decline, or respond to requests
 */

"use client";

import {
  AlertCircle,
  ArrowRight,
  Calendar,
  CheckCircle,
  Clock,
  DollarSign,
  Filter,
  Inbox,
  MapPin,
  MessageSquare,
  Phone,
  RefreshCw,
  Search,
  ThumbsDown,
  ThumbsUp,
  User,
  XCircle,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

import { PageHero } from "@/components/layout/PageHero";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { logger } from "@/lib/logger";

interface WorkRequest {
  id: string;
  title: string;
  description: string;
  category: string;
  urgency: string;
  status: string;
  preferredDate?: string;
  propertyAddress?: string;
  propertyPhotos: string[];
  budget?: string;
  createdAt: string;
  client: {
    id: string;
    name: string;
    email: string;
    phone: string;
    address: string;
  };
}

const URGENCY_CONFIG = {
  urgent: {
    label: "Urgent",
    color: "text-red-600",
    bg: "bg-red-50 dark:bg-red-900/30",
    badge: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300",
  },
  high: {
    label: "High Priority",
    color: "text-orange-600",
    bg: "bg-orange-50 dark:bg-orange-900/30",
    badge: "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300",
  },
  normal: {
    label: "Normal",
    color: "text-blue-600",
    bg: "bg-blue-50 dark:bg-blue-900/30",
    badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
  },
  low: {
    label: "Low Priority",
    color: "text-slate-600",
    bg: "bg-slate-50 dark:bg-slate-800/50",
    badge: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  },
};

const STATUS_CONFIG = {
  pending: {
    label: "Pending",
    color: "text-amber-600",
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
  },
  in_review: {
    label: "In Review",
    color: "text-blue-600",
    badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
  },
  accepted: {
    label: "Accepted",
    color: "text-emerald-600",
    badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300",
  },
  declined: {
    label: "Declined",
    color: "text-red-600",
    badge: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300",
  },
  completed: {
    label: "Completed",
    color: "text-slate-600",
    badge: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  },
};

export default function WorkRequestsPage() {
  const [workRequests, setWorkRequests] = useState<WorkRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [urgencyFilter, setUrgencyFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("pending");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<WorkRequest | null>(null);

  useEffect(() => {
    void fetchWorkRequests();
  }, []);

  const fetchWorkRequests = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/trades/work-requests");
      if (!res.ok) {
        throw new Error("Failed to fetch work requests");
      }
      const data = await res.json();
      setWorkRequests(data.workRequests || []);
    } catch (err) {
      logger.error("[WORK_REQUESTS_FETCH]", err);
      setError("Failed to load work requests");
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (requestId: string, action: "accepted" | "declined") => {
    setActionLoading(requestId);
    try {
      const res = await fetch("/api/trades/work-requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, status: action }),
      });
      if (res.ok) {
        // Update local state
        setWorkRequests((prev) =>
          prev.map((wr) => (wr.id === requestId ? { ...wr, status: action } : wr))
        );
        setSelectedRequest(null);
      } else {
        const data = await res.json();
        throw new Error(data.error || "Failed to update request");
      }
    } catch (err) {
      logger.error(`[WORK_REQUEST_${action.toUpperCase()}]`, err);
    } finally {
      setActionLoading(null);
    }
  };

  // Filter requests based on tab and filters
  const filteredRequests = workRequests.filter((wr) => {
    // Tab filter
    if (activeTab === "pending" && wr.status !== "pending" && wr.status !== "in_review")
      return false;
    if (activeTab === "accepted" && wr.status !== "accepted") return false;
    if (activeTab === "declined" && wr.status !== "declined") return false;
    if (activeTab === "all" && statusFilter !== "all" && wr.status !== statusFilter) return false;

    // Urgency filter
    if (urgencyFilter !== "all" && wr.urgency !== urgencyFilter) return false;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        wr.title.toLowerCase().includes(query) ||
        wr.description.toLowerCase().includes(query) ||
        wr.client.name.toLowerCase().includes(query) ||
        wr.category.toLowerCase().includes(query)
      );
    }

    return true;
  });

  const pendingCount = workRequests.filter(
    (wr) => wr.status === "pending" || wr.status === "in_review"
  ).length;
  const acceptedCount = workRequests.filter((wr) => wr.status === "accepted").length;
  const declinedCount = workRequests.filter((wr) => wr.status === "declined").length;

  const getUrgencyConfig = (urgency: string) =>
    URGENCY_CONFIG[urgency as keyof typeof URGENCY_CONFIG] || URGENCY_CONFIG.normal;

  const getStatusConfig = (status: string) =>
    STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return "Just now";
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <PageHero
        title="Work Requests"
        subtitle="Incoming requests from your connected clients"
        icon={<Inbox className="h-6 w-6" />}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchWorkRequests} disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Link href="/trades/jobs">
              <Button variant="default" size="sm">
                View Job Board
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        }
      />

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Stats Row */}
        <div className="mb-6 grid gap-4 md:grid-cols-4">
          <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-800/50 dark:bg-amber-950/20">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="rounded-lg bg-amber-100 p-3 dark:bg-amber-900/50">
                <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">
                  {pendingCount}
                </p>
                <p className="text-sm text-amber-600/80 dark:text-amber-400/80">Pending</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-emerald-200 bg-emerald-50/50 dark:border-emerald-800/50 dark:bg-emerald-950/20">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="rounded-lg bg-emerald-100 p-3 dark:bg-emerald-900/50">
                <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                  {acceptedCount}
                </p>
                <p className="text-sm text-emerald-600/80 dark:text-emerald-400/80">Accepted</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-red-200 bg-red-50/50 dark:border-red-800/50 dark:bg-red-950/20">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="rounded-lg bg-red-100 p-3 dark:bg-red-900/50">
                <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-700 dark:text-red-300">{declinedCount}</p>
                <p className="text-sm text-red-600/80 dark:text-red-400/80">Declined</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-800/50 dark:bg-blue-950/20">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="rounded-lg bg-blue-100 p-3 dark:bg-blue-900/50">
                <Inbox className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                  {workRequests.length}
                </p>
                <p className="text-sm text-blue-600/80 dark:text-blue-400/80">Total</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters & Tabs */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto">
            <TabsList className="grid w-full grid-cols-4 sm:w-auto">
              <TabsTrigger value="pending" className="gap-2">
                Pending
                {pendingCount > 0 && (
                  <Badge variant="secondary" className="ml-1 bg-amber-100 text-amber-700">
                    {pendingCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="accepted">Accepted</TabsTrigger>
              <TabsTrigger value="declined">Declined</TabsTrigger>
              <TabsTrigger value="all">All</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 sm:flex-initial">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search requests..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 sm:w-64"
              />
            </div>
            <Select value={urgencyFilter} onValueChange={setUrgencyFilter}>
              <SelectTrigger className="w-36">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Urgency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Urgency</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : error ? (
          <Card className="border-red-200 bg-red-50/50 dark:border-red-800/50 dark:bg-red-950/20">
            <CardContent className="flex flex-col items-center gap-4 py-12">
              <AlertCircle className="h-12 w-12 text-red-500" />
              <p className="text-lg font-medium text-red-700 dark:text-red-300">{error}</p>
              <Button variant="outline" onClick={fetchWorkRequests}>
                Try Again
              </Button>
            </CardContent>
          </Card>
        ) : filteredRequests.length === 0 ? (
          <Card className="border-slate-200 bg-white/80 backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/80">
            <CardContent className="flex flex-col items-center gap-4 py-16">
              <div className="rounded-full bg-slate-100 p-4 dark:bg-slate-800">
                <Inbox className="h-10 w-10 text-slate-400" />
              </div>
              <div className="text-center">
                <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200">
                  No work requests
                </h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {activeTab === "pending"
                    ? "No pending requests from your connected clients"
                    : activeTab === "accepted"
                      ? "No accepted requests yet"
                      : activeTab === "declined"
                        ? "No declined requests"
                        : "Work requests from connected clients will appear here"}
                </p>
              </div>
              <div className="mt-4 flex gap-3">
                <Link href="/company/connections">
                  <Button variant="outline" size="sm">
                    View Connections
                  </Button>
                </Link>
                <Link href="/trades/jobs">
                  <Button variant="default" size="sm">
                    Browse Job Board
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredRequests.map((request) => {
              const urgencyConfig = getUrgencyConfig(request.urgency);
              const statusConfig = getStatusConfig(request.status);
              const isActioning = actionLoading === request.id;

              return (
                <Card
                  key={request.id}
                  className="overflow-hidden border-slate-200 bg-white/80 backdrop-blur-sm transition-all hover:shadow-lg dark:border-slate-700 dark:bg-slate-900/80"
                >
                  <div className="flex flex-col lg:flex-row">
                    {/* Main Content */}
                    <div className="flex-1 p-5">
                      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                            {request.title}
                          </h3>
                          <Badge className={urgencyConfig.badge}>{urgencyConfig.label}</Badge>
                          <Badge className={statusConfig.badge}>{statusConfig.label}</Badge>
                        </div>
                        <span className="text-sm text-slate-500">
                          {formatDate(request.createdAt)}
                        </span>
                      </div>

                      <p className="mb-4 line-clamp-2 text-sm text-slate-600 dark:text-slate-400">
                        {request.description}
                      </p>

                      <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
                        <div className="flex items-center gap-1.5">
                          <User className="h-4 w-4" />
                          <span>{request.client.name}</span>
                        </div>
                        {request.propertyAddress && (
                          <div className="flex items-center gap-1.5">
                            <MapPin className="h-4 w-4" />
                            <span className="max-w-48 truncate">{request.propertyAddress}</span>
                          </div>
                        )}
                        {request.preferredDate && (
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-4 w-4" />
                            <span>
                              {new Date(request.preferredDate).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                              })}
                            </span>
                          </div>
                        )}
                        {request.budget && (
                          <div className="flex items-center gap-1.5">
                            <DollarSign className="h-4 w-4" />
                            <span>{request.budget}</span>
                          </div>
                        )}
                        <Badge variant="outline" className="font-normal">
                          {request.category}
                        </Badge>
                      </div>

                      {/* Photos preview */}
                      {request.propertyPhotos && request.propertyPhotos.length > 0 && (
                        <div className="mt-4 flex gap-2 overflow-x-auto">
                          {request.propertyPhotos.slice(0, 4).map((photo, i) => (
                            <div
                              key={i}
                              className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700"
                            >
                              <Image
                                src={photo}
                                alt={`Property photo ${i + 1}`}
                                fill
                                className="object-cover"
                              />
                            </div>
                          ))}
                          {request.propertyPhotos.length > 4 && (
                            <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100 text-sm font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                              +{request.propertyPhotos.length - 4}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Action Sidebar */}
                    <div className="flex flex-row items-center gap-2 border-t border-slate-200 bg-slate-50/50 p-4 dark:border-slate-700 dark:bg-slate-800/50 lg:w-56 lg:flex-col lg:border-l lg:border-t-0">
                      {request.status === "pending" || request.status === "in_review" ? (
                        <>
                          <Button
                            className="flex-1 gap-2 bg-emerald-600 hover:bg-emerald-700 lg:w-full"
                            onClick={() => handleAction(request.id, "accepted")}
                            disabled={isActioning}
                          >
                            <ThumbsUp className="h-4 w-4" />
                            Accept
                          </Button>
                          <Button
                            variant="outline"
                            className="flex-1 gap-2 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-800 dark:hover:bg-red-950/50 lg:w-full"
                            onClick={() => handleAction(request.id, "declined")}
                            disabled={isActioning}
                          >
                            <ThumbsDown className="h-4 w-4" />
                            Decline
                          </Button>
                        </>
                      ) : request.status === "accepted" ? (
                        <>
                          <Link
                            href={`/messages?clientId=${request.client.id}`}
                            className="flex-1 lg:w-full"
                          >
                            <Button className="w-full gap-2 bg-blue-600 hover:bg-blue-700">
                              <MessageSquare className="h-4 w-4" />
                              Message
                            </Button>
                          </Link>
                          {request.client.phone && (
                            <a href={`tel:${request.client.phone}`} className="flex-1 lg:w-full">
                              <Button variant="outline" className="w-full gap-2">
                                <Phone className="h-4 w-4" />
                                Call
                              </Button>
                            </a>
                          )}
                        </>
                      ) : (
                        <div className="flex flex-1 items-center justify-center text-sm text-slate-500 lg:w-full">
                          Request {request.status}
                        </div>
                      )}

                      <Button
                        variant="ghost"
                        size="sm"
                        className="lg:w-full"
                        onClick={() =>
                          setSelectedRequest(selectedRequest?.id === request.id ? null : request)
                        }
                      >
                        {selectedRequest?.id === request.id ? "Hide Details" : "View Details"}
                      </Button>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {selectedRequest?.id === request.id && (
                    <div className="border-t border-slate-200 bg-slate-50/80 p-5 dark:border-slate-700 dark:bg-slate-800/50">
                      <div className="grid gap-6 md:grid-cols-2">
                        <div>
                          <h4 className="mb-3 font-semibold text-slate-700 dark:text-slate-200">
                            Client Information
                          </h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-slate-400" />
                              <span className="text-slate-600 dark:text-slate-300">
                                {request.client.name}
                              </span>
                            </div>
                            {request.client.email && (
                              <div className="flex items-center gap-2">
                                <span className="text-slate-400">Email:</span>
                                <a
                                  href={`mailto:${request.client.email}`}
                                  className="text-blue-600 hover:underline"
                                >
                                  {request.client.email}
                                </a>
                              </div>
                            )}
                            {request.client.phone && (
                              <div className="flex items-center gap-2">
                                <Phone className="h-4 w-4 text-slate-400" />
                                <a
                                  href={`tel:${request.client.phone}`}
                                  className="text-blue-600 hover:underline"
                                >
                                  {request.client.phone}
                                </a>
                              </div>
                            )}
                            {request.client.address && (
                              <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-slate-400" />
                                <span className="text-slate-600 dark:text-slate-300">
                                  {request.client.address}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div>
                          <h4 className="mb-3 font-semibold text-slate-700 dark:text-slate-200">
                            Request Details
                          </h4>
                          <div className="space-y-2 text-sm">
                            <p className="text-slate-600 dark:text-slate-300">
                              {request.description}
                            </p>
                            {request.propertyAddress && (
                              <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-slate-400" />
                                <span className="text-slate-600 dark:text-slate-300">
                                  Property: {request.propertyAddress}
                                </span>
                              </div>
                            )}
                            {request.budget && (
                              <div className="flex items-center gap-2">
                                <DollarSign className="h-4 w-4 text-slate-400" />
                                <span className="text-slate-600 dark:text-slate-300">
                                  Budget: {request.budget}
                                </span>
                              </div>
                            )}
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-slate-400" />
                              <span className="text-slate-600 dark:text-slate-300">
                                Submitted:{" "}
                                {new Date(request.createdAt).toLocaleString("en-US", {
                                  dateStyle: "medium",
                                  timeStyle: "short",
                                })}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
