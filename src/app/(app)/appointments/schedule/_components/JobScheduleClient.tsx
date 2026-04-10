"use client";

import {
  AlertCircle,
  Bell,
  Calendar,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  Filter,
  HardHat,
  Home,
  List,
  MapPin,
  Package,
  Plus,
  Search,
  Send,
  Truck,
  User,
  Users,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { logger } from "@/lib/logger";

// Job types configuration
const JOB_TYPES = [
  { id: "inspection", label: "Inspection", icon: Search, color: "bg-blue-500" },
  { id: "install", label: "Install", icon: HardHat, color: "bg-green-500" },
  { id: "repair", label: "Repair", icon: Wrench, color: "bg-amber-500" },
  { id: "mitigation", label: "Mitigation", icon: AlertCircle, color: "bg-red-500" },
  { id: "followup", label: "Follow-up", icon: Calendar, color: "bg-purple-500" },
  { id: "delivery", label: "Material Delivery", icon: Truck, color: "bg-indigo-500" },
  { id: "pickup", label: "Material Pickup", icon: Package, color: "bg-cyan-500" },
] as const;

// Status configuration
const JOB_STATUSES = [
  { id: "draft", label: "Draft", color: "bg-slate-400" },
  { id: "scheduled", label: "Scheduled", color: "bg-blue-500" },
  { id: "confirmed", label: "Confirmed", color: "bg-green-500" },
  { id: "in_progress", label: "In Progress", color: "bg-amber-500" },
  { id: "completed", label: "Completed", color: "bg-emerald-600" },
  { id: "cancelled", label: "Cancelled", color: "bg-red-500" },
];

// Client notification options
const NOTIFICATION_OPTIONS = [
  { id: "none", label: "No Notification" },
  { id: "email", label: "Email Notification" },
  { id: "sms", label: "SMS Notification" },
  { id: "both", label: "Email & SMS" },
];

interface ScheduledJob {
  id: string;
  title: string;
  jobType: string;
  scheduledStart: string;
  scheduledEnd?: string;
  status: string;
  priority: string;
  property?: {
    address?: string;
    city?: string;
    state?: string;
  };
  claim?: {
    id: string;
    claimNumber?: string;
  };
  retailJob?: {
    id: string;
    name?: string;
  };
  assignedPros?: { id: string; name: string }[];
  assignedTeam?: { id: string; name: string }[];
  notes?: string;
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role?: string;
}

interface Claim {
  id: string;
  claimNumber: string | null;
  insured_name: string | null;
  propertyAddress: string | null;
  homeownerEmail?: string | null;
  homeownerPhone?: string | null;
}

interface RetailJob {
  id: string;
  name: string | null;
  clientName: string | null;
  propertyAddress: string | null;
  clientEmail?: string | null;
  clientPhone?: string | null;
}

interface JobScheduleClientProps {
  orgId: string;
  userId: string;
  prefillData?: {
    type: string;
    title: string;
    address: string;
    date: string;
    notes: string;
    orderId: string;
    openDialog?: boolean;
  };
}

export function JobScheduleClient({
  orgId: _orgId,
  userId: _userId,
  prefillData,
}: JobScheduleClientProps) {
  const [jobs, setJobs] = useState<ScheduledJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [filter, setFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isNewJobDialogOpen, setIsNewJobDialogOpen] = useState(false);

  // Data for dropdowns
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [retailJobs, setRetailJobs] = useState<RetailJob[]>([]);
  const [loadingDropdowns, setLoadingDropdowns] = useState(false);

  // New job form state - ENHANCED with all new fields
  const [newJob, setNewJob] = useState({
    title: "",
    jobType: "inspection",
    scheduledDate: new Date().toISOString().split("T")[0],
    startTime: "09:00",
    endTime: "10:00",
    priority: "medium",
    notes: "",
    linkedWorkspace: "claim", // 'claim' or 'retail'
    linkedEntityId: "",
    // NEW FIELDS
    notifyClient: "none", // 'none', 'email', 'sms', 'both'
    selectedTeamMembers: [] as string[], // array of team member IDs
    deliveryDate: "",
    deliveryTime: "",
    projectStartDate: "",
    projectStartTime: "",
    materialPickupRequired: false,
    pickupDate: "",
    pickupTime: "",
    clientNotes: "", // notes visible to client
    teamNotes: "", // internal notes for team only
  });

  // Load dropdown data when dialog opens
  useEffect(() => {
    if (isNewJobDialogOpen) {
      void loadDropdownData();
    }
  }, [isNewJobDialogOpen]);

  // Handle prefillData from order scheduling
  useEffect(() => {
    if (prefillData && prefillData.openDialog) {
      // Prefill the form with order data
      setNewJob((prev) => ({
        ...prev,
        title: prefillData.title || prev.title,
        jobType: prefillData.type || "delivery",
        scheduledDate: prefillData.date || prev.scheduledDate,
        deliveryDate: prefillData.date || "",
        notes: prefillData.notes || prev.notes,
        notifyClient: "both", // Default to notifying client for order deliveries
      }));
      // Open the dialog
      setIsNewJobDialogOpen(true);
    }
  }, [prefillData]);

  const loadDropdownData = async () => {
    setLoadingDropdowns(true);
    try {
      // Fetch team members, claims, and retail jobs in parallel
      const [teamRes, claimsRes, jobsRes] = await Promise.all([
        fetch("/api/team/members"),
        fetch("/api/claims?limit=100"),
        fetch("/api/jobs/retail?limit=100"),
      ]);

      if (teamRes.ok) {
        const teamData = await teamRes.json();
        setTeamMembers(teamData.members || []);
      }

      if (claimsRes.ok) {
        const claimsData = await claimsRes.json();
        setClaims(claimsData.claims || []);
      }

      if (jobsRes.ok) {
        const jobsData = await jobsRes.json();
        setRetailJobs(jobsData.jobs || []);
      }
    } catch (error) {
      logger.error("Failed to load dropdown data:", error);
    } finally {
      setLoadingDropdowns(false);
    }
  };

  // Auto-fill job details when a claim/retail job is selected
  const handleLinkedEntityChange = (entityId: string) => {
    setNewJob((prev) => ({ ...prev, linkedEntityId: entityId }));

    if (newJob.linkedWorkspace === "claim") {
      const claim = claims.find((c) => c.id === entityId);
      if (claim) {
        setNewJob((prev) => ({
          ...prev,
          linkedEntityId: entityId,
          title:
            prev.title ||
            `${newJob.jobType.charAt(0).toUpperCase() + newJob.jobType.slice(1)} - ${claim.insured_name || claim.claimNumber || "Claim"}`,
        }));
      }
    } else {
      const job = retailJobs.find((j) => j.id === entityId);
      if (job) {
        setNewJob((prev) => ({
          ...prev,
          linkedEntityId: entityId,
          title:
            prev.title ||
            `${newJob.jobType.charAt(0).toUpperCase() + newJob.jobType.slice(1)} - ${job.clientName || job.name || "Job"}`,
        }));
      }
    }
  };

  useEffect(() => {
    void fetchJobs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, selectedDate]);

  const fetchJobs = async () => {
    try {
      const params = new URLSearchParams();
      params.append("month", String(selectedDate.getMonth() + 1));
      params.append("year", String(selectedDate.getFullYear()));
      if (filter !== "all") params.append("jobType", filter);

      const res = await fetch(`/api/jobs/schedule?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setJobs(data.jobs || []);
      } else {
        // Demo data for development
        setJobs(getDemoJobs());
      }
    } catch (error) {
      logger.error("Failed to fetch jobs:", error);
      setJobs(getDemoJobs());
    } finally {
      setLoading(false);
    }
  };

  const getDemoJobs = (): ScheduledJob[] => {
    const today = new Date();
    return [
      {
        id: "job-1",
        title: "Initial Roof Inspection - Smith Residence",
        jobType: "inspection",
        scheduledStart: new Date(today.getTime() + 2 * 60 * 60 * 1000).toISOString(),
        scheduledEnd: new Date(today.getTime() + 4 * 60 * 60 * 1000).toISOString(),
        status: "confirmed",
        priority: "high",
        property: { address: "123 Oak Street", city: "Phoenix", state: "AZ" },
        claim: { id: "claim-1", claimNumber: "CLM-2024-001" },
        assignedTeam: [{ id: "user-1", name: "John Smith" }],
        notes: "Check for hail damage, bring drone",
      },
      {
        id: "job-2",
        title: "Full Roof Replacement - Johnson Property",
        jobType: "install",
        scheduledStart: new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString(),
        scheduledEnd: new Date(today.getTime() + 32 * 60 * 60 * 1000).toISOString(),
        status: "scheduled",
        priority: "medium",
        property: { address: "456 Maple Ave", city: "Scottsdale", state: "AZ" },
        claim: { id: "claim-2", claimNumber: "CLM-2024-002" },
        assignedPros: [{ id: "pro-1", name: "ABC Roofing" }],
        assignedTeam: [{ id: "user-2", name: "Mike Wilson" }],
      },
      {
        id: "job-3",
        title: "Emergency Leak Repair",
        jobType: "repair",
        scheduledStart: new Date(today.getTime() + 48 * 60 * 60 * 1000).toISOString(),
        status: "in_progress",
        priority: "high",
        property: { address: "789 Pine Road", city: "Tempe", state: "AZ" },
        retailJob: { id: "retail-1", name: "Retail Job #1045" },
      },
    ];
  };

  const handleCreateJob = async () => {
    try {
      // Build the payload with all the new fields
      const payload = {
        ...newJob,
        scheduledStart: `${newJob.scheduledDate}T${newJob.startTime}:00`,
        scheduledEnd: `${newJob.scheduledDate}T${newJob.endTime}:00`,
        // Include new fields if they have values
        ...(newJob.deliveryDate && newJob.deliveryTime
          ? { deliveryDateTime: `${newJob.deliveryDate}T${newJob.deliveryTime}:00` }
          : {}),
        ...(newJob.projectStartDate && newJob.projectStartTime
          ? { projectStartDateTime: `${newJob.projectStartDate}T${newJob.projectStartTime}:00` }
          : {}),
        ...(newJob.materialPickupRequired && newJob.pickupDate && newJob.pickupTime
          ? { pickupDateTime: `${newJob.pickupDate}T${newJob.pickupTime}:00` }
          : {}),
        assignedTeamMemberIds: newJob.selectedTeamMembers,
      };

      const res = await fetch("/api/jobs/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();

        // Send notifications if requested
        if (newJob.notifyClient !== "none" && newJob.linkedEntityId) {
          await sendClientNotification(data.job?.id || data.id, newJob.notifyClient);
        }

        // Notify team members
        if (newJob.selectedTeamMembers.length > 0) {
          await notifyTeamMembers(data.job?.id || data.id, newJob.selectedTeamMembers);
        }

        toast.success("Job scheduled successfully");
        setIsNewJobDialogOpen(false);
        void fetchJobs();
        // Reset form with all fields
        setNewJob({
          title: "",
          jobType: "inspection",
          scheduledDate: new Date().toISOString().split("T")[0],
          startTime: "09:00",
          endTime: "10:00",
          priority: "medium",
          notes: "",
          linkedWorkspace: "claim",
          linkedEntityId: "",
          notifyClient: "none",
          selectedTeamMembers: [],
          deliveryDate: "",
          deliveryTime: "",
          projectStartDate: "",
          projectStartTime: "",
          materialPickupRequired: false,
          pickupDate: "",
          pickupTime: "",
          clientNotes: "",
          teamNotes: "",
        });
      } else {
        const error = await res.json().catch(() => ({ error: "Unknown error" }));
        toast.error(error.error || "Failed to schedule job");
      }
    } catch (error) {
      logger.error("Failed to create job:", error);
      toast.error("Failed to schedule job");
    }
  };

  const sendClientNotification = async (jobId: string, type: string) => {
    try {
      await fetch("/api/notifications/job-scheduled", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, notificationType: type }),
      });
    } catch (error) {
      logger.error("Failed to send client notification:", error);
    }
  };

  const notifyTeamMembers = async (jobId: string, memberIds: string[]) => {
    try {
      await fetch("/api/notifications/team-assignment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, memberIds }),
      });
    } catch (error) {
      logger.error("Failed to notify team members:", error);
    }
  };

  const getJobTypeConfig = (type: string) => {
    return JOB_TYPES.find((t) => t.id === type) || JOB_TYPES[0];
  };

  const getStatusConfig = (status: string) => {
    return JOB_STATUSES.find((s) => s.id === status) || JOB_STATUSES[0];
  };

  const filteredJobs = jobs.filter((job) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        job.title.toLowerCase().includes(query) ||
        job.property?.address?.toLowerCase().includes(query) ||
        job.claim?.claimNumber?.toLowerCase().includes(query)
      );
    }
    return true;
  });

  // Calendar helpers
  const getDaysInMonth = (date: Date): (Date | null)[] => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: (Date | null)[] = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay.getDay(); i++) {
      days.push(null);
    }

    // Add all days of the month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  };

  const getJobsForDate = (date: Date | null) => {
    if (!date) return [];
    return filteredJobs.filter((job) => {
      const jobDate = new Date(job.scheduledStart);
      return (
        jobDate.getDate() === date.getDate() &&
        jobDate.getMonth() === date.getMonth() &&
        jobDate.getFullYear() === date.getFullYear()
      );
    });
  };

  const monthDays = getDaysInMonth(selectedDate);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-20 rounded bg-slate-200" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card className="animate-pulse">
          <CardContent className="p-6">
            <div className="h-96 rounded bg-slate-200" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-500 p-2">
                <CalendarDays className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Scheduled Today</p>
                <p className="text-2xl font-bold">
                  {
                    jobs.filter((j) => {
                      const today = new Date();
                      const jobDate = new Date(j.scheduledStart);
                      return jobDate.toDateString() === today.toDateString();
                    }).length
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-green-500 p-2">
                <CheckCircle2 className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Confirmed</p>
                <p className="text-2xl font-bold">
                  {jobs.filter((j) => j.status === "confirmed").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-amber-500 p-2">
                <Clock className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">In Progress</p>
                <p className="text-2xl font-bold">
                  {jobs.filter((j) => j.status === "in_progress").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-purple-200 bg-purple-50/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-purple-500 p-2">
                <Wrench className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">This Week</p>
                <p className="text-2xl font-bold">
                  {
                    jobs.filter((j) => {
                      const jobDate = new Date(j.scheduledStart);
                      const now = new Date();
                      const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
                      const weekEnd = new Date(now.setDate(now.getDate() + 6));
                      return jobDate >= weekStart && jobDate <= weekEnd;
                    }).length
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-1 items-center gap-4">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search jobs, addresses, claims..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {JOB_TYPES.map((type) => (
                <SelectItem key={type.id} value={type.id}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        // eslint-disable-next-line react/jsx-no-comment-textnodes
        <div className="flex items-center gap-2">
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          <Tabs value={viewMode} onValueChange={(v: any) => setViewMode(v)}>
            <TabsList>
              <TabsTrigger value="calendar" className="gap-2">
                <Calendar className="h-4 w-4" />
                Calendar
              </TabsTrigger>
              <TabsTrigger value="list" className="gap-2">
                <List className="h-4 w-4" />
                List
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <Button onClick={() => setIsNewJobDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Schedule Job
          </Button>
        </div>
      </div>

      {/* Calendar View */}
      {viewMode === "calendar" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg">
              {selectedDate.toLocaleString("default", { month: "long", year: "numeric" })}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() =>
                  setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1))
                }
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => setSelectedDate(new Date())}>
                Today
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() =>
                  setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1))
                }
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-0.5 md:gap-1">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div
                  key={day}
                  className="p-2 text-center text-sm font-medium text-muted-foreground"
                >
                  {day}
                </div>
              ))}
              {monthDays.map((date, i) => {
                const dayJobs = getJobsForDate(date);
                const isToday = date?.toDateString() === new Date().toDateString();
                return (
                  <div
                    key={i}
                    className={`min-h-[100px] rounded-lg border p-1 ${
                      date ? "bg-white hover:bg-slate-50" : "bg-slate-50"
                    } ${isToday ? "border-blue-500 bg-blue-50" : "border-slate-200"}`}
                  >
                    {date && (
                      <>
                        <div
                          className={`text-right text-sm ${isToday ? "font-bold text-blue-600" : ""}`}
                        >
                          {date.getDate()}
                        </div>
                        <div className="mt-1 space-y-1">
                          {dayJobs.slice(0, 3).map((job) => {
                            const typeConfig = getJobTypeConfig(job.jobType);
                            return (
                              <Link
                                key={job.id}
                                href={`/appointments/schedule/${job.id}`}
                                className={`block truncate rounded px-1 py-0.5 text-xs text-white ${typeConfig.color}`}
                              >
                                {new Date(job.scheduledStart).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}{" "}
                                {job.title.slice(0, 15)}...
                              </Link>
                            );
                          })}
                          {dayJobs.length > 3 && (
                            <div className="text-center text-xs text-muted-foreground">
                              +{dayJobs.length - 3} more
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* List View */}
      {viewMode === "list" && (
        <div className="space-y-4">
          {filteredJobs.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <CalendarDays className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                <h3 className="mb-2 text-lg font-semibold">No Jobs Scheduled</h3>
                <p className="mb-4 text-muted-foreground">Schedule your first job to get started</p>
                <Button onClick={() => setIsNewJobDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Schedule Job
                </Button>
              </CardContent>
            </Card>
          ) : (
            filteredJobs.map((job) => {
              const typeConfig = getJobTypeConfig(job.jobType);
              const statusConfig = getStatusConfig(job.status);
              const TypeIcon = typeConfig.icon;
              return (
                <Card key={job.id} className="transition-shadow hover:shadow-md">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className={`rounded-lg p-3 ${typeConfig.color}`}>
                        <TypeIcon className="h-5 w-5 text-white" />
                      </div>
                      <div className="flex-1 space-y-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <Link
                              href={`/appointments/schedule/${job.id}`}
                              className="font-semibold hover:text-blue-600"
                            >
                              {job.title}
                            </Link>
                            <div className="mt-1 flex flex-wrap items-center gap-2">
                              <Badge variant="secondary">{typeConfig.label}</Badge>
                              <Badge className={`${statusConfig.color} text-white`}>
                                {statusConfig.label}
                              </Badge>
                              {job.priority === "high" && (
                                <Badge variant="destructive">High Priority</Badge>
                              )}
                            </div>
                          </div>
                          <div className="text-right text-sm">
                            <div className="font-medium">
                              {new Date(job.scheduledStart).toLocaleDateString()}
                            </div>
                            <div className="text-muted-foreground">
                              {new Date(job.scheduledStart).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                              {job.scheduledEnd && (
                                <>
                                  {" - "}
                                  {new Date(job.scheduledEnd).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                          {job.property && (
                            <div className="flex items-center gap-1">
                              <MapPin className="h-4 w-4" />
                              {job.property.address}, {job.property.city}
                            </div>
                          )}
                          {job.claim && (
                            <div className="flex items-center gap-1">
                              <Home className="h-4 w-4" />
                              Claim: {job.claim.claimNumber}
                            </div>
                          )}
                          {job.assignedTeam && job.assignedTeam.length > 0 && (
                            <div className="flex items-center gap-1">
                              <User className="h-4 w-4" />
                              {job.assignedTeam.map((t) => t.name).join(", ")}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* New Job Dialog - ENHANCED */}
      <Dialog open={isNewJobDialogOpen} onOpenChange={setIsNewJobDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-blue-600" />
              Schedule New Job
            </DialogTitle>
            <DialogDescription>
              Create a new scheduled job with client notifications and team assignments
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Section 1: Basic Info */}
            <div className="space-y-4">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <HardHat className="h-4 w-4" />
                Job Details
              </h3>
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Job Title *</Label>
                  <Input
                    id="title"
                    value={newJob.title}
                    onChange={(e) => setNewJob({ ...newJob, title: e.target.value })}
                    placeholder="e.g., Initial Roof Inspection - Smith Residence"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="jobType">Job Type</Label>
                    <Select
                      value={newJob.jobType}
                      onValueChange={(v) => setNewJob({ ...newJob, jobType: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {JOB_TYPES.map((type) => (
                          <SelectItem key={type.id} value={type.id}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="priority">Priority</Label>
                    <Select
                      value={newJob.priority}
                      onValueChange={(v) => setNewJob({ ...newJob, priority: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Link to Claim/Job (Auto-fill) */}
            <div className="space-y-4 rounded-lg bg-slate-50 p-4">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <Home className="h-4 w-4" />
                Link to Claim / Job (Optional)
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Workspace Type</Label>
                  <Select
                    value={newJob.linkedWorkspace}
                    onValueChange={(v) =>
                      setNewJob({ ...newJob, linkedWorkspace: v, linkedEntityId: "" })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="claim">Claims Workspace</SelectItem>
                      <SelectItem value="retail">Retail Workspace</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Select {newJob.linkedWorkspace === "claim" ? "Claim" : "Job"}</Label>
                  <Select value={newJob.linkedEntityId} onValueChange={handleLinkedEntityChange}>
                    <SelectTrigger>
                      <SelectValue placeholder={`Choose a ${newJob.linkedWorkspace}...`} />
                    </SelectTrigger>
                    <SelectContent>
                      {loadingDropdowns ? (
                        <SelectItem value="_loading" disabled>
                          Loading...
                        </SelectItem>
                      ) : newJob.linkedWorkspace === "claim" ? (
                        claims.length > 0 ? (
                          claims.map((claim) => (
                            <SelectItem key={claim.id} value={claim.id}>
                              {claim.claimNumber || "No #"} -{" "}
                              {claim.insured_name || claim.propertyAddress || "Unknown"}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="_none" disabled>
                            No claims found
                          </SelectItem>
                        )
                      ) : retailJobs.length > 0 ? (
                        retailJobs.map((job) => (
                          <SelectItem key={job.id} value={job.id}>
                            {job.name || "Job"} -{" "}
                            {job.clientName || job.propertyAddress || "Unknown"}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="_none" disabled>
                          No retail jobs found
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                💡 Selecting a claim/job will auto-fill the title and enable client notifications
              </p>
            </div>

            {/* Section 3: Scheduling */}
            <div className="space-y-4">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <Clock className="h-4 w-4" />
                Scheduling
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="date">Appointment Date *</Label>
                  <Input
                    id="date"
                    type="date"
                    value={newJob.scheduledDate}
                    onChange={(e) => setNewJob({ ...newJob, scheduledDate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="startTime">Start Time</Label>
                  <Input
                    id="startTime"
                    type="time"
                    value={newJob.startTime}
                    onChange={(e) => setNewJob({ ...newJob, startTime: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endTime">End Time</Label>
                  <Input
                    id="endTime"
                    type="time"
                    value={newJob.endTime}
                    onChange={(e) => setNewJob({ ...newJob, endTime: e.target.value })}
                  />
                </div>
              </div>

              {/* Delivery & Project Start */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Truck className="h-4 w-4" />
                    Material Delivery Date/Time
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="date"
                      value={newJob.deliveryDate}
                      onChange={(e) => setNewJob({ ...newJob, deliveryDate: e.target.value })}
                      placeholder="Date"
                    />
                    <Input
                      type="time"
                      value={newJob.deliveryTime}
                      onChange={(e) => setNewJob({ ...newJob, deliveryTime: e.target.value })}
                      placeholder="Time"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Wrench className="h-4 w-4" />
                    Project Start Date/Time
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="date"
                      value={newJob.projectStartDate}
                      onChange={(e) => setNewJob({ ...newJob, projectStartDate: e.target.value })}
                      placeholder="Date"
                    />
                    <Input
                      type="time"
                      value={newJob.projectStartTime}
                      onChange={(e) => setNewJob({ ...newJob, projectStartTime: e.target.value })}
                      placeholder="Time"
                    />
                  </div>
                </div>
              </div>

              {/* Material Pickup Option */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="materialPickup"
                    checked={newJob.materialPickupRequired}
                    onCheckedChange={(checked) =>
                      setNewJob({ ...newJob, materialPickupRequired: checked as boolean })
                    }
                  />
                  <Label
                    htmlFor="materialPickup"
                    className="flex cursor-pointer items-center gap-2"
                  >
                    <Package className="h-4 w-4" />
                    Material Pickup Required
                  </Label>
                </div>
                {newJob.materialPickupRequired && (
                  <div className="ml-6 grid grid-cols-2 gap-2">
                    <Input
                      type="date"
                      value={newJob.pickupDate}
                      onChange={(e) => setNewJob({ ...newJob, pickupDate: e.target.value })}
                      placeholder="Pickup Date"
                    />
                    <Input
                      type="time"
                      value={newJob.pickupTime}
                      onChange={(e) => setNewJob({ ...newJob, pickupTime: e.target.value })}
                      placeholder="Pickup Time"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Section 4: Team Assignment */}
            <div className="space-y-4 rounded-lg bg-blue-50 p-4">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <Users className="h-4 w-4" />
                Team Assignment
              </h3>
              <div className="space-y-2">
                <Label>Assign Team Members</Label>
                {loadingDropdowns ? (
                  <p className="text-sm text-muted-foreground">Loading team members...</p>
                ) : teamMembers.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2">
                    {teamMembers.map((member) => (
                      <div key={member.id} className="flex items-center gap-2">
                        <Checkbox
                          id={`team-${member.id}`}
                          checked={newJob.selectedTeamMembers.includes(member.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setNewJob({
                                ...newJob,
                                selectedTeamMembers: [...newJob.selectedTeamMembers, member.id],
                              });
                            } else {
                              setNewJob({
                                ...newJob,
                                selectedTeamMembers: newJob.selectedTeamMembers.filter(
                                  (id) => id !== member.id
                                ),
                              });
                            }
                          }}
                        />
                        <Label htmlFor={`team-${member.id}`} className="cursor-pointer text-sm">
                          {member.name || member.email}
                          {member.role && (
                            <span className="ml-1 text-xs text-muted-foreground">
                              ({member.role})
                            </span>
                          )}
                        </Label>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No team members found.{" "}
                    <Link href="/teams" className="text-blue-600 hover:underline">
                      Add team members
                    </Link>
                  </p>
                )}
              </div>
            </div>

            {/* Section 5: Client Notifications */}
            <div className="space-y-4 rounded-lg bg-green-50 p-4">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <Bell className="h-4 w-4" />
                Client Notifications
              </h3>
              <div className="space-y-2">
                <Label>Notify Connected Client</Label>
                <Select
                  value={newJob.notifyClient}
                  onValueChange={(v) => setNewJob({ ...newJob, notifyClient: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {NOTIFICATION_OPTIONS.map((opt) => (
                      <SelectItem key={opt.id} value={opt.id}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!newJob.linkedEntityId && newJob.notifyClient !== "none" && (
                  <p className="text-xs text-amber-600">
                    ⚠️ Select a claim or job above to enable client notifications
                  </p>
                )}
              </div>
            </div>

            {/* Section 6: Notes */}
            <div className="space-y-4">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <FileText className="h-4 w-4" />
                Notes
              </h3>
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="clientNotes">Client Notes (visible to client)</Label>
                  <Textarea
                    id="clientNotes"
                    value={newJob.clientNotes}
                    onChange={(e) => setNewJob({ ...newJob, clientNotes: e.target.value })}
                    placeholder="Instructions or notes for the client..."
                    rows={2}
                    className="bg-green-50/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="teamNotes">Team Notes (internal only)</Label>
                  <Textarea
                    id="teamNotes"
                    value={newJob.teamNotes}
                    onChange={(e) => setNewJob({ ...newJob, teamNotes: e.target.value })}
                    placeholder="Internal notes for team members..."
                    rows={2}
                    className="bg-blue-50/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">General Notes / Instructions</Label>
                  <Textarea
                    id="notes"
                    value={newJob.notes}
                    onChange={(e) => setNewJob({ ...newJob, notes: e.target.value })}
                    placeholder="Special instructions, equipment needed, etc."
                    rows={2}
                  />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsNewJobDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateJob} disabled={!newJob.title} className="gap-2">
              <Send className="h-4 w-4" />
              Schedule Job
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
