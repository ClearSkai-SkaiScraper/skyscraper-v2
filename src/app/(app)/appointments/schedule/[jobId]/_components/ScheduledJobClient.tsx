"use client";

import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Edit,
  HardHat,
  Home,
  Mail,
  MapPin,
  Package,
  Phone,
  Play,
  Search,
  Truck,
  User,
  Wrench,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";

// Job types configuration
const JOB_TYPES = [
  {
    id: "inspection",
    label: "Inspection",
    icon: Search,
    color: "bg-blue-500",
    textColor: "text-blue-600",
  },
  {
    id: "install",
    label: "Installation",
    icon: HardHat,
    color: "bg-green-500",
    textColor: "text-green-600",
  },
  {
    id: "repair",
    label: "Repair",
    icon: Wrench,
    color: "bg-amber-500",
    textColor: "text-amber-600",
  },
  {
    id: "mitigation",
    label: "Mitigation",
    icon: AlertCircle,
    color: "bg-red-500",
    textColor: "text-red-600",
  },
  {
    id: "followup",
    label: "Follow-up",
    icon: Calendar,
    color: "bg-purple-500",
    textColor: "text-purple-600",
  },
] as const;

// Status configuration
const JOB_STATUSES = [
  { id: "draft", label: "Draft", color: "bg-slate-400", icon: Clock },
  { id: "scheduled", label: "Scheduled", color: "bg-blue-500", icon: Calendar },
  { id: "confirmed", label: "Confirmed", color: "bg-green-500", icon: CheckCircle2 },
  { id: "in_progress", label: "In Progress", color: "bg-amber-500", icon: Play },
  { id: "completed", label: "Completed", color: "bg-emerald-600", icon: Check },
  { id: "cancelled", label: "Cancelled", color: "bg-red-500", icon: XCircle },
];

interface ScheduledJob {
  id: string;
  title: string;
  jobType: string;
  status: string;
  priority: string;
  scheduledStart: string;
  scheduledEnd?: string;
  property?: {
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
  };
  claim?: {
    id: string;
    claimNumber?: string;
    insurer?: string;
    policyNumber?: string;
  };
  retailJob?: {
    id: string;
    name?: string;
    type?: string;
  };
  customer?: {
    name: string;
    phone?: string;
    email?: string;
  };
  assignedTeam?: { id: string; name: string; role?: string }[];
  assignedPros?: { id: string; name: string; specialty?: string }[];
  materials?: { id: string; name: string; quantity: number; unit: string; status: string }[];
  delivery?: {
    vendor: string;
    scheduledDate: string;
    address: string;
    instructions?: string;
    status: string;
  };
  notes?: string;
  checklist?: { id: string; task: string; completed: boolean }[];
  createdAt?: string;
  updatedAt?: string;
}

interface ScheduledJobClientProps {
  job: ScheduledJob;
  orgId: string;
  userId: string;
}

export function ScheduledJobClient({
  job,
  orgId: _orgId,
  userId: _userId,
}: ScheduledJobClientProps) {
  const [checklist, setChecklist] = useState(job.checklist || []);
  const [status, setStatus] = useState(job.status);

  const getJobTypeConfig = (type: string) => {
    return JOB_TYPES.find((t) => t.id === type) || JOB_TYPES[0];
  };

  const getStatusConfig = (s: string) => {
    return JOB_STATUSES.find((st) => st.id === s) || JOB_STATUSES[0];
  };

  const typeConfig = getJobTypeConfig(job.jobType);
  const statusConfig = getStatusConfig(status);
  const _TypeIcon = typeConfig.icon;
  const StatusIcon = statusConfig.icon;

  const completedTasks = checklist.filter((c) => c.completed).length;
  const totalTasks = checklist.length;
  const progressPercent = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  const handleToggleChecklistItem = (itemId: string) => {
    setChecklist((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, completed: !item.completed } : item))
    );
    toast.success("Checklist updated");
  };

  const handleStatusChange = (newStatus: string) => {
    setStatus(newStatus);
    toast.success(`Job status updated to ${getStatusConfig(newStatus).label}`);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getMaterialStatusBadge = (matStatus: string) => {
    switch (matStatus) {
      case "delivered":
        return <Badge className="bg-green-500">Delivered</Badge>;
      case "ordered":
        return <Badge className="bg-blue-500">Ordered</Badge>;
      case "on-truck":
        return <Badge className="bg-amber-500">On Truck</Badge>;
      default:
        return <Badge variant="secondary">{matStatus}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Workspace Hero Header - Yellow "Job Scheduling" Theme */}
      <div className="overflow-hidden rounded-2xl border bg-card">
        <div className="bg-gradient-to-r from-amber-500 to-yellow-500 px-6 py-6 text-white">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="flex items-start gap-4">
              <Link href="/appointments/schedule">
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Badge className="bg-white/20 text-white">{typeConfig.label}</Badge>
                  <Badge className="bg-white/90 text-amber-700">
                    <StatusIcon className="mr-1 h-3 w-3" />
                    {statusConfig.label}
                  </Badge>
                  {job.priority === "high" && (
                    <Badge className="bg-red-500 text-white">High Priority</Badge>
                  )}
                </div>
                <h1 className="text-2xl font-bold md:text-3xl">{job.title}</h1>
                <p className="mt-2 text-white/90">
                  {formatDate(job.scheduledStart)} • {formatTime(job.scheduledStart)}
                  {job.scheduledEnd && ` - ${formatTime(job.scheduledEnd)}`}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="sm">
                <Edit className="mr-2 h-4 w-4" />
                Edit Job
              </Button>
              {status === "scheduled" || status === "confirmed" ? (
                <Button
                  size="sm"
                  className="bg-white text-amber-700 hover:bg-white/90"
                  onClick={() => handleStatusChange("in_progress")}
                >
                  <Play className="mr-2 h-4 w-4" />
                  Start Job
                </Button>
              ) : status === "in_progress" ? (
                <Button
                  size="sm"
                  className="bg-green-600 text-white hover:bg-green-700"
                  onClick={() => handleStatusChange("completed")}
                >
                  <Check className="mr-2 h-4 w-4" />
                  Complete Job
                </Button>
              ) : null}
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between border-t bg-amber-50/50 px-6 py-3 dark:bg-amber-950/20">
          <div className="flex items-center gap-4 text-sm">
            {job.property && (
              <span className="flex items-center gap-1 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                {job.property.address}, {job.property.city}
              </span>
            )}
            {job.customer && (
              <span className="flex items-center gap-1 text-muted-foreground">
                <User className="h-4 w-4" />
                {job.customer.name}
              </span>
            )}
          </div>
          {totalTasks > 0 && (
            <span className="text-xs text-muted-foreground">
              {completedTasks}/{totalTasks} tasks complete
            </span>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="space-y-6 lg:col-span-2">
          {/* Property & Customer Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Home className="h-5 w-5 text-blue-500" />
                Location & Customer
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {job.property && (
                <div className="flex items-start gap-3">
                  <MapPin className="mt-0.5 h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{job.property.address}</p>
                    <p className="text-sm text-muted-foreground">
                      {job.property.city}, {job.property.state} {job.property.zipCode}
                    </p>
                    <a
                      href={`https://maps.google.com/?q=${encodeURIComponent(
                        `${job.property.address}, ${job.property.city}, ${job.property.state}`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 text-sm text-blue-600 hover:underline"
                    >
                      Open in Maps →
                    </a>
                  </div>
                </div>
              )}

              {job.customer && (
                <div className="border-t pt-4">
                  <div className="mb-2 flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{job.customer.name}</span>
                  </div>
                  <div className="flex flex-wrap gap-4">
                    {job.customer.phone && (
                      <a
                        href={`tel:${job.customer.phone}`}
                        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-blue-600"
                      >
                        <Phone className="h-4 w-4" />
                        {job.customer.phone}
                      </a>
                    )}
                    {job.customer.email && (
                      <a
                        href={`mailto:${job.customer.email}`}
                        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-blue-600"
                      >
                        <Mail className="h-4 w-4" />
                        {job.customer.email}
                      </a>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Linked Claim/Job */}
          {(job.claim || job.retailJob) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {job.claim ? (
                    <>
                      <AlertCircle className="h-5 w-5 text-amber-500" />
                      Linked Claim
                    </>
                  ) : (
                    <>
                      <Wrench className="h-5 w-5 text-green-500" />
                      Linked Retail Job
                    </>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {job.claim && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Claim Number</span>
                      <span className="font-medium">{job.claim.claimNumber}</span>
                    </div>
                    {job.claim.insurer && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Insurer</span>
                        <span>{job.claim.insurer}</span>
                      </div>
                    )}
                    {job.claim.policyNumber && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Policy</span>
                        <span>{job.claim.policyNumber}</span>
                      </div>
                    )}
                    <Link
                      href={`/claims/${job.claim.id}`}
                      className="mt-2 inline-flex text-sm text-blue-600 hover:underline"
                    >
                      View Full Claim →
                    </Link>
                  </div>
                )}
                {job.retailJob && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Job Name</span>
                      <span className="font-medium">{job.retailJob.name}</span>
                    </div>
                    {job.retailJob.type && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Job Type</span>
                        <span>{job.retailJob.type}</span>
                      </div>
                    )}
                    <Link
                      href={`/jobs/retail/${job.retailJob.id}`}
                      className="mt-2 inline-flex text-sm text-blue-600 hover:underline"
                    >
                      View Full Job →
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Materials */}
          {job.materials && job.materials.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-purple-500" />
                  Materials ({job.materials.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {job.materials.map((material) => (
                    <div
                      key={material.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div>
                        <p className="font-medium">{material.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {material.quantity} {material.unit}
                        </p>
                      </div>
                      {getMaterialStatusBadge(material.status)}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Delivery */}
          {job.delivery && (
            <Card className="border-amber-200 bg-amber-50/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5 text-amber-600" />
                  Scheduled Delivery
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Vendor</span>
                  <span className="font-medium">{job.delivery.vendor}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Scheduled</span>
                  <span>{formatDate(job.delivery.scheduledDate)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <Badge
                    className={
                      job.delivery.status === "delivered"
                        ? "bg-green-500"
                        : job.delivery.status === "in_transit"
                          ? "bg-blue-500"
                          : "bg-amber-500"
                    }
                  >
                    {job.delivery.status === "scheduled"
                      ? "Scheduled"
                      : job.delivery.status === "in_transit"
                        ? "In Transit"
                        : "Delivered"}
                  </Badge>
                </div>
                {job.delivery.instructions && (
                  <div className="border-t pt-3">
                    <p className="text-sm text-muted-foreground">Drop Instructions</p>
                    <p className="text-sm">{job.delivery.instructions}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          {job.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Notes & Instructions</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm">{job.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Progress */}
          {checklist.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Job Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span>
                    {completedTasks} of {totalTasks} tasks
                  </span>
                  <span className="font-medium">{Math.round(progressPercent)}%</span>
                </div>
                <Progress value={progressPercent} className="h-2" />
              </CardContent>
            </Card>
          )}

          {/* Assigned Team */}
          {(job.assignedTeam?.length || job.assignedPros?.length) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4" />
                  Assigned Team
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {job.assignedTeam?.map((member) => (
                  <div key={member.id} className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                      <User className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{member.name}</p>
                      {member.role && (
                        <p className="text-xs text-muted-foreground">{member.role}</p>
                      )}
                    </div>
                  </div>
                ))}
                {job.assignedPros?.map((pro) => (
                  <div key={pro.id} className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                      <HardHat className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{pro.name}</p>
                      {pro.specialty && (
                        <p className="text-xs text-muted-foreground">{pro.specialty}</p>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Checklist */}
          {checklist.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4" />
                  Job Checklist
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {checklist.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-slate-50"
                    >
                      <Checkbox
                        id={item.id}
                        checked={item.completed}
                        onCheckedChange={() => handleToggleChecklistItem(item.id)}
                      />
                      <label
                        htmlFor={item.id}
                        className={`cursor-pointer text-sm ${
                          item.completed ? "text-muted-foreground line-through" : ""
                        }`}
                      >
                        {item.task}
                      </label>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {job.customer?.phone && (
                <a href={`tel:${job.customer.phone}`} className="block">
                  <Button variant="outline" className="w-full justify-start gap-2">
                    <Phone className="h-4 w-4" />
                    Call Customer
                  </Button>
                </a>
              )}
              {job.customer?.email && (
                <a href={`mailto:${job.customer.email}`} className="block">
                  <Button variant="outline" className="w-full justify-start gap-2">
                    <Mail className="h-4 w-4" />
                    Email Customer
                  </Button>
                </a>
              )}
              {job.property && (
                <a
                  href={`https://maps.google.com/?q=${encodeURIComponent(
                    `${job.property.address}, ${job.property.city}, ${job.property.state}`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  <Button variant="outline" className="w-full justify-start gap-2">
                    <MapPin className="h-4 w-4" />
                    Navigate
                  </Button>
                </a>
              )}
              <Link href="/vendors/orders" className="block">
                <Button variant="outline" className="w-full justify-start gap-2">
                  <Package className="h-4 w-4" />
                  Order Materials
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Status Change */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Update Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                {JOB_STATUSES.filter((s) => s.id !== "draft").map((s) => {
                  const SIcon = s.icon;
                  return (
                    <Button
                      key={s.id}
                      variant={status === s.id ? "default" : "outline"}
                      size="sm"
                      className={status === s.id ? s.color : ""}
                      onClick={() => handleStatusChange(s.id)}
                    >
                      <SIcon className="mr-1 h-3 w-3" />
                      {s.label}
                    </Button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Job Meta */}
          <Card>
            <CardContent className="pt-4">
              <div className="space-y-2 text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <span>Job ID</span>
                  <span className="font-mono">{job.id}</span>
                </div>
                {job.createdAt && (
                  <div className="flex justify-between">
                    <span>Created</span>
                    <span>{new Date(job.createdAt).toLocaleDateString()}</span>
                  </div>
                )}
                {job.updatedAt && (
                  <div className="flex justify-between">
                    <span>Updated</span>
                    <span>{new Date(job.updatedAt).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
