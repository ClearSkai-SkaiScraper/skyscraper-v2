/**
 * 📊 PRO MY BIDS PAGE
 *
 * Shows all bids submitted by the contractor and their status.
 */

"use client";

import { useUser } from "@clerk/nextjs";
import {
  CheckCircle,
  Clock,
  ExternalLink,
  FileText,
  Loader2,
  MessageSquare,
  Search,
  TrendingUp,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

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
import { logger } from "@/lib/logger";

// Types
interface MyBid {
  id: string;
  project: {
    id: string;
    title: string;
    type: string;
    client: string;
    location: string;
  };
  amount: number;
  timeline: string;
  status: "pending" | "accepted" | "declined" | "expired" | "withdrawn";
  submittedAt: string;
  respondedAt?: string;
}

// No mock data — bids come from real API

const STATUS_CONFIG = {
  pending: {
    label: "Pending Review",
    color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    icon: Clock,
  },
  accepted: {
    label: "Accepted",
    color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    icon: CheckCircle,
  },
  declined: {
    label: "Declined",
    color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    icon: XCircle,
  },
  expired: {
    label: "Expired",
    color: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
    icon: Clock,
  },
  withdrawn: {
    label: "Withdrawn",
    color: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
    icon: FileText,
  },
};

function formatDate(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function BidCard({ bid, onWithdraw }: { bid: MyBid; onWithdraw: (bidId: string) => void }) {
  const statusConfig = STATUS_CONFIG[bid.status];
  const StatusIcon = statusConfig.icon;

  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-md">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Badge className={statusConfig.color}>
                <StatusIcon className="mr-1 h-3 w-3" />
                {statusConfig.label}
              </Badge>
              <Badge variant="outline" className="capitalize">
                {bid.project.type}
              </Badge>
            </div>

            <h3 className="mt-3 text-lg font-semibold">{bid.project.title}</h3>

            <div className="mt-2 flex items-center gap-2 text-sm text-slate-500">
              <span>{bid.project.client}</span>
              <span>•</span>
              <span>{bid.project.location}</span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div>
                <p className="text-xs font-medium uppercase text-slate-500">Your Quote</p>
                <p className="text-xl font-bold text-blue-600">${bid.amount.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase text-slate-500">Timeline</p>
                <p className="font-medium">{bid.timeline}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase text-slate-500">Submitted</p>
                <p className="font-medium">{formatDate(bid.submittedAt)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Actions based on status */}
        <div className="mt-4 flex flex-wrap gap-2 border-t pt-4 dark:border-slate-700">
          {bid.status === "pending" && (
            <>
              <Button variant="outline" size="sm" onClick={() => onWithdraw(bid.id)}>
                Withdraw Quote
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href={`/trades/jobs/${bid.project.id}`}>
                  <ExternalLink className="mr-1 h-4 w-4" />
                  View Project
                </Link>
              </Button>
            </>
          )}

          {bid.status === "accepted" && (
            <>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700" asChild>
                <Link href="/trades/messages">
                  <MessageSquare className="mr-1 h-4 w-4" />
                  Message Client
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href={`/claims/new?projectId=${bid.project.id}`}>Start Job</Link>
              </Button>
            </>
          )}

          {bid.status === "declined" && (
            <Button variant="outline" size="sm" asChild>
              <Link href="/trades/jobs">Browse More Projects</Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function ProMyBidsPage() {
  const { user: _user, isLoaded } = useUser();
  const [bids, setBids] = useState<MyBid[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const loadBids = async () => {
      try {
        const res = await fetch("/api/bids");
        if (res.ok) {
          const data = await res.json();
          // Map API response to MyBid interface
          const mappedBids: MyBid[] = (data.bids || []).map((b: any) => ({
            id: b.id,
            project: {
              id: b.projectId || b.id,
              title: b.projectTitle || b.message?.slice(0, 60) || "Job Quote",
              type: b.category || "general",
              client: b.clientName || "Client",
              location: b.location || "Your Area",
            },
            amount: Number(b.amount) || 0,
            timeline: b.timeline || "TBD",
            status: b.status || "pending",
            submittedAt: b.createdAt || new Date().toISOString(),
            respondedAt: b.respondedAt || undefined,
          }));
          setBids(mappedBids);
        } else {
          setBids([]);
        }
      } catch (error) {
        logger.error("Failed to load bids:", error);
        setBids([]);
      }
      setIsLoading(false);
    };
    void loadBids();
  }, []);

  const handleWithdraw = async (bidId: string) => {
    try {
      const res = await fetch("/api/bids", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bidId, action: "withdraw" }),
      });

      if (!res.ok) throw new Error("Failed to withdraw");

      setBids((prev) =>
        prev.map((b) => (b.id === bidId ? { ...b, status: "withdrawn" as const } : b))
      );
      toast.success("Quote withdrawn successfully");
    } catch {
      toast.error("Failed to withdraw quote");
    }
  };

  const filteredBids = bids.filter((bid) => {
    const matchesFilter = filter === "all" || bid.status === filter;
    const matchesSearch =
      searchQuery === "" ||
      bid.project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bid.project.client.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const stats = {
    total: bids.length,
    pending: bids.filter((b) => b.status === "pending").length,
    accepted: bids.filter((b) => b.status === "accepted").length,
    successRate:
      bids.length > 0
        ? Math.round(
            (bids.filter((b) => b.status === "accepted").length /
              bids.filter((b) => b.status !== "pending").length) *
              100
          ) || 0
        : 0,
  };

  if (!isLoaded || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50/50 to-white py-8 dark:from-slate-950 dark:to-slate-900">
      <div className="container mx-auto max-w-4xl px-4">
        <PageHero
          section="trades"
          title="My Quotes"
          subtitle="Track all your submitted quotes and their status"
          icon={<FileText className="h-6 w-6" />}
        >
          <Button asChild className="bg-white/20 hover:bg-white/30">
            <Link href="/trades/jobs">
              <Search className="mr-2 h-4 w-4" />
              Browse Projects
            </Link>
          </Button>
        </PageHero>

        {/* Stats */}
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-sm text-slate-600 dark:text-slate-400">Total Quotes</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
              <p className="text-sm text-slate-600 dark:text-slate-400">Pending</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{stats.accepted}</p>
              <p className="text-sm text-slate-600 dark:text-slate-400">Won</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center gap-1">
                <TrendingUp className="h-5 w-5 text-green-500" />
                <p className="text-2xl font-bold">{stats.successRate}%</p>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Win Rate</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search quotes..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Quotes</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="accepted">Accepted</SelectItem>
              <SelectItem value="declined">Declined</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
              <SelectItem value="withdrawn">Withdrawn</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Bids List */}
        {filteredBids.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="mx-auto mb-4 h-12 w-12 text-slate-300" />
              <h3 className="mb-2 text-lg font-semibold">No quotes yet</h3>
              <p className="mb-4 text-slate-600 dark:text-slate-400">
                {bids.length === 0
                  ? "Start by browsing available projects and submitting quotes."
                  : "No quotes match your current filters."}
              </p>
              {bids.length === 0 && (
                <Button asChild className="bg-blue-600 hover:bg-blue-700">
                  <Link href="/trades/jobs">Browse Projects</Link>
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredBids.map((bid) => (
              <BidCard key={bid.id} bid={bid} onWithdraw={handleWithdraw} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
