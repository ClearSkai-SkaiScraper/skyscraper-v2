/**
 * Client Leads Page
 * Shows work requests/job invitations from clients
 * Pros can view, accept, quote, or convert to claims/projects
 */

"use client";

import {
  ArrowRight,
  Briefcase,
  Calendar,
  CheckCircle,
  Clock,
  Filter,
  Inbox,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  User,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  createdAt: string;
  client: {
    id: string;
    name: string;
    email: string;
    phone: string;
    address?: string;
  };
}

export default function ClientLeadsPage() {
  const [workRequests, setWorkRequests] = useState<WorkRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [selectedRequest, setSelectedRequest] = useState<WorkRequest | null>(null);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [converting, setConverting] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [responseNote, setResponseNote] = useState("");

  useEffect(() => {
    void fetchWorkRequests();
  }, []);

  async function fetchWorkRequests() {
    try {
      const res = await fetch("/api/trades/work-requests");
      const data = await res.json();
      if (data.workRequests) {
        setWorkRequests(data.workRequests);
      }
    } catch (error) {
      logger.error("Failed to fetch work requests:", error);
      toast.error("Failed to load client leads");
    } finally {
      setLoading(false);
    }
  }

  async function handleConvertLead(conversionType: "claim" | "repair" | "oop" | "financed") {
    if (!selectedRequest) return;

    setConverting(true);
    try {
      const res = await fetch("/api/trades/convert-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: selectedRequest.id,
          conversionType,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        // Remove from list (it's now converted)
        setWorkRequests((prev) => prev.filter((wr) => wr.id !== selectedRequest.id));
        setShowConvertModal(false);
        setSelectedRequest(null);

        const typeLabels: Record<string, string> = {
          claim: "Insurance Claim",
          repair: "Repair Job",
          oop: "Out of Pocket Job",
          financed: "Financed Job",
        };

        toast.success(`✅ Lead converted to ${typeLabels[conversionType]}!`, {
          description: data.claimNumber || data.jobNumber,
          action: data.redirectUrl
            ? {
                label: "View",
                onClick: () => (window.location.href = data.redirectUrl),
              }
            : undefined,
        });
      } else {
        toast.error(data.error || "Failed to convert lead");
      }
    } catch (error) {
      logger.error("Convert lead error:", error);
      toast.error("Failed to convert lead");
    } finally {
      setConverting(false);
    }
  }

  async function updateStatus(requestId: string, newStatus: string) {
    try {
      const res = await fetch("/api/trades/work-requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, status: newStatus }),
      });

      if (res.ok) {
        setWorkRequests((prev) =>
          prev.map((wr) => (wr.id === requestId ? { ...wr, status: newStatus } : wr))
        );
        toast.success(`Status updated to ${newStatus}`);
      } else {
        toast.error("Failed to update status");
      }
    } catch (_error) {
      toast.error("Failed to update status");
    }
  }

  function getUrgencyBadge(urgency: string) {
    const variants: Record<string, { label: string; className: string }> = {
      emergency: { label: "🚨 Emergency", className: "bg-red-500 text-white" },
      urgent: { label: "⚡ Urgent", className: "bg-orange-500 text-white" },
      normal: { label: "📅 Normal", className: "bg-blue-500 text-white" },
      flexible: { label: "🌿 Flexible", className: "bg-green-500 text-white" },
    };
    const v = variants[urgency] || variants.normal;
    return <Badge className={v.className}>{v.label}</Badge>;
  }

  function getStatusBadge(status: string) {
    const variants: Record<
      string,
      { variant: "default" | "secondary" | "outline" | "destructive"; label: string }
    > = {
      pending: { variant: "outline", label: "New" },
      viewed: { variant: "secondary", label: "Viewed" },
      quoted: { variant: "default", label: "Quoted" },
      accepted: { variant: "default", label: "Accepted" },
      completed: { variant: "secondary", label: "Completed" },
      cancelled: { variant: "destructive", label: "Cancelled" },
    };
    const v = variants[status] || variants.pending;
    return <Badge variant={v.variant}>{v.label}</Badge>;
  }

  const filteredRequests = workRequests.filter((wr) => {
    if (filter === "all") return true;
    return wr.status === filter;
  });

  const stats = {
    total: workRequests.length,
    new: workRequests.filter((r) => r.status === "pending").length,
    inProgress: workRequests.filter((r) => ["viewed", "quoted"].includes(r.status)).length,
    won: workRequests.filter((r) => r.status === "accepted").length,
  };

  return (
    <PageContainer>
      <PageHero
        section="jobs"
        title="Client Leads"
        description="Job requests and invitations from clients looking for your services"
        icon={<Inbox className="h-8 w-8" />}
        actions={
          <Button onClick={fetchWorkRequests} variant="outline" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        }
      />

      {/* Stats Row */}
      <div className="mb-8 grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Leads</CardDescription>
            <CardTitle className="text-3xl">{stats.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950">
          <CardHeader className="pb-2">
            <CardDescription>New Requests</CardDescription>
            <CardTitle className="text-3xl text-blue-600">{stats.new}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950">
          <CardHeader className="pb-2">
            <CardDescription>In Progress</CardDescription>
            <CardTitle className="text-3xl text-yellow-600">{stats.inProgress}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-green-200 bg-green-50 dark:bg-green-950">
          <CardHeader className="pb-2">
            <CardDescription>Won Jobs</CardDescription>
            <CardTitle className="text-3xl text-green-600">{stats.won}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Pipeline Tabs */}
      <Tabs defaultValue="leads" className="mb-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="leads" className="gap-2">
            <Inbox className="h-4 w-4" />
            Leads
          </TabsTrigger>
          <TabsTrigger value="claims" className="gap-2">
            <Briefcase className="h-4 w-4" />
            Claims
          </TabsTrigger>
          <TabsTrigger value="repairs" className="gap-2">
            <Zap className="h-4 w-4" />
            Repairs
          </TabsTrigger>
          <TabsTrigger value="oop" className="gap-2">
            <CheckCircle className="h-4 w-4" />
            Out of Pocket
          </TabsTrigger>
          <TabsTrigger value="financed" className="gap-2">
            <Clock className="h-4 w-4" />
            Financed
          </TabsTrigger>
        </TabsList>

        <TabsContent value="leads" className="mt-6">
          {/* Filter */}
          <div className="mb-6 flex items-center gap-4">
            <Filter className="h-5 w-5 text-muted-foreground" />
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Leads</SelectItem>
                <SelectItem value="pending">New / Pending</SelectItem>
                <SelectItem value="viewed">Viewed</SelectItem>
                <SelectItem value="quoted">Quoted</SelectItem>
                <SelectItem value="accepted">Accepted</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Leads List */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredRequests.length === 0 ? (
            <Card className="p-12 text-center">
              <Inbox className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="text-lg font-medium">No client leads yet</h3>
              <p className="mt-2 text-muted-foreground">
                When clients invite you to jobs, they&apos;ll appear here
              </p>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredRequests.map((request) => (
                <Card
                  key={request.id}
                  className="cursor-pointer transition-colors hover:border-primary/50"
                  onClick={() => setSelectedRequest(request)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-3">
                        {/* Title & Badges */}
                        <div className="flex flex-wrap items-center gap-3">
                          <h3 className="text-lg font-semibold">{request.title}</h3>
                          {getUrgencyBadge(request.urgency)}
                          {getStatusBadge(request.status)}
                          <Badge variant="outline">{request.category}</Badge>
                        </div>

                        {/* Description */}
                        {request.description && (
                          <p className="line-clamp-2 text-muted-foreground">
                            {request.description}
                          </p>
                        )}

                        {/* Client Info */}
                        <div className="flex items-center gap-6 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <User className="h-4 w-4" />
                            {request.client.name}
                          </span>
                          {request.client.email && (
                            <span className="flex items-center gap-1">
                              <Mail className="h-4 w-4" />
                              {request.client.email}
                            </span>
                          )}
                          {request.client.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-4 w-4" />
                              {request.client.phone}
                            </span>
                          )}
                        </div>

                        {/* Property & Date */}
                        <div className="flex items-center gap-6 text-sm text-muted-foreground">
                          {request.propertyAddress && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-4 w-4" />
                              {request.propertyAddress}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {new Date(request.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col gap-2">
                        {request.status === "pending" && (
                          <>
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                void updateStatus(request.id, "accepted");
                                toast.success(
                                  "Job accepted! You're now connected with the client."
                                );
                              }}
                            >
                              <CheckCircle className="mr-1 h-4 w-4" />
                              Accept
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                void updateStatus(request.id, "viewed");
                              }}
                            >
                              Mark Viewed
                            </Button>
                          </>
                        )}
                        {request.status === "viewed" && (
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              void updateStatus(request.id, "accepted");
                              toast.success("Job accepted! You're now connected with the client.");
                            }}
                          >
                            <CheckCircle className="mr-1 h-4 w-4" />
                            Accept
                          </Button>
                        )}
                        {["pending", "viewed", "accepted"].includes(request.status) && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedRequest(request);
                              setShowConvertModal(true);
                            }}
                          >
                            Convert
                            <ArrowRight className="ml-1 h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Claims Tab */}
        <TabsContent value="claims" className="mt-6">
          <Card className="p-12 text-center">
            <Briefcase className="mx-auto mb-4 h-12 w-12 text-blue-600" />
            <h3 className="text-lg font-medium">Insurance Claims</h3>
            <p className="mt-2 text-muted-foreground">
              Leads converted to insurance claims appear here
            </p>
            <Button
              className="mt-4"
              variant="outline"
              onClick={() => (window.location.href = "/claims")}
            >
              View All Claims
            </Button>
          </Card>
        </TabsContent>

        {/* Repairs Tab */}
        <TabsContent value="repairs" className="mt-6">
          <Card className="p-12 text-center">
            <Zap className="mx-auto mb-4 h-12 w-12 text-green-600" />
            <h3 className="text-lg font-medium">Repair / Service Jobs</h3>
            <p className="mt-2 text-muted-foreground">
              Standard repair and service jobs appear here
            </p>
            <Button
              className="mt-4"
              variant="outline"
              onClick={() => (window.location.href = "/jobs/retail")}
            >
              View All Jobs
            </Button>
          </Card>
        </TabsContent>

        {/* Out of Pocket Tab */}
        <TabsContent value="oop" className="mt-6">
          <Card className="p-12 text-center">
            <CheckCircle className="mx-auto mb-4 h-12 w-12 text-purple-600" />
            <h3 className="text-lg font-medium">Out of Pocket Projects</h3>
            <p className="mt-2 text-muted-foreground">
              Projects where clients pay directly (no insurance)
            </p>
            <Button
              className="mt-4"
              variant="outline"
              onClick={() => (window.location.href = "/jobs/retail?stage=Out%20of%20Pocket")}
            >
              View OOP Projects
            </Button>
          </Card>
        </TabsContent>

        {/* Financed Tab */}
        <TabsContent value="financed" className="mt-6">
          <Card className="p-12 text-center">
            <Clock className="mx-auto mb-4 h-12 w-12 text-orange-600" />
            <h3 className="text-lg font-medium">Financed Jobs</h3>
            <p className="mt-2 text-muted-foreground">
              Jobs with payment plans or financing options
            </p>
            <Button
              className="mt-4"
              variant="outline"
              onClick={() => (window.location.href = "/jobs?stage=Financed")}
            >
              View Financed Jobs
            </Button>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Detail Modal */}
      <Dialog
        open={!!selectedRequest && !showConvertModal}
        onOpenChange={() => setSelectedRequest(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedRequest?.title}</DialogTitle>
            <DialogDescription>Request from {selectedRequest?.client.name}</DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4 py-4">
              <div className="flex gap-2">
                {getUrgencyBadge(selectedRequest.urgency)}
                {getStatusBadge(selectedRequest.status)}
                <Badge variant="outline">{selectedRequest.category}</Badge>
              </div>

              {selectedRequest.description && (
                <div>
                  <Label className="text-muted-foreground">Description</Label>
                  <p className="mt-1">{selectedRequest.description}</p>
                </div>
              )}

              <div className="grid gap-2">
                <Label className="text-muted-foreground">Client Contact</Label>
                <div className="space-y-1 text-sm">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    {selectedRequest.client.name}
                  </div>
                  {selectedRequest.client.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      <a
                        href={`mailto:${selectedRequest.client.email}`}
                        className="text-primary hover:underline"
                      >
                        {selectedRequest.client.email}
                      </a>
                    </div>
                  )}
                  {selectedRequest.client.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      <a
                        href={`tel:${selectedRequest.client.phone}`}
                        className="text-primary hover:underline"
                      >
                        {selectedRequest.client.phone}
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {selectedRequest.propertyAddress && (
                <div>
                  <Label className="text-muted-foreground">Property</Label>
                  <p className="mt-1 flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    {selectedRequest.propertyAddress}
                  </p>
                </div>
              )}

              <div>
                <Label className="text-muted-foreground">Submitted</Label>
                <p className="mt-1 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {new Date(selectedRequest.createdAt).toLocaleString()}
                </p>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setSelectedRequest(null)}>
              Close
            </Button>
            <Button onClick={() => setShowConvertModal(true)}>
              Convert to Project
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Convert Modal */}
      <Dialog open={showConvertModal} onOpenChange={setShowConvertModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convert Lead</DialogTitle>
            <DialogDescription>Choose how to proceed with this client request</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-4">
            <Button
              variant="outline"
              className="h-auto justify-start gap-3 py-4"
              disabled={converting}
              onClick={() => handleConvertLead("claim")}
            >
              <div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-900">
                <Briefcase className="h-5 w-5 text-blue-600" />
              </div>
              <div className="text-left">
                <div className="font-medium">Insurance Claim</div>
                <div className="text-sm text-muted-foreground">
                  Create a new claim for insurance-backed work
                </div>
              </div>
            </Button>

            <Button
              variant="outline"
              className="h-auto justify-start gap-3 py-4"
              disabled={converting}
              onClick={() => handleConvertLead("repair")}
            >
              <div className="rounded-lg bg-green-100 p-2 dark:bg-green-900">
                <Zap className="h-5 w-5 text-green-600" />
              </div>
              <div className="text-left">
                <div className="font-medium">Repair / Service Job</div>
                <div className="text-sm text-muted-foreground">Standard repair or service work</div>
              </div>
            </Button>

            <Button
              variant="outline"
              className="h-auto justify-start gap-3 py-4"
              disabled={converting}
              onClick={() => handleConvertLead("oop")}
            >
              <div className="rounded-lg bg-purple-100 p-2 dark:bg-purple-900">
                <CheckCircle className="h-5 w-5 text-purple-600" />
              </div>
              <div className="text-left">
                <div className="font-medium">Out of Pocket</div>
                <div className="text-sm text-muted-foreground">
                  Client pays directly, no insurance
                </div>
              </div>
            </Button>

            <Button
              variant="outline"
              className="h-auto justify-start gap-3 py-4"
              disabled={converting}
              onClick={() => handleConvertLead("financed")}
            >
              <div className="rounded-lg bg-orange-100 p-2 dark:bg-orange-900">
                <Clock className="h-5 w-5 text-orange-600" />
              </div>
              <div className="text-left">
                <div className="font-medium">Financed</div>
                <div className="text-sm text-muted-foreground">
                  Set up payment plan or financing option
                </div>
              </div>
            </Button>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConvertModal(false)}
              disabled={converting}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
