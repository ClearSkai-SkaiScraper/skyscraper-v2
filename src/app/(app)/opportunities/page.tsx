/**
 * 💼 BID OPPORTUNITIES PAGE
 *
 * Unified page for pros to find and bid on client projects.
 * Combines job board + project browsing into one clean interface.
 */

"use client";

import {
  Briefcase,
  Building2,
  Calendar,
  CheckCircle,
  Clock,
  DollarSign,
  Filter,
  Home,
  MapPin,
  MessageSquare,
  Paperclip,
  RefreshCw,
  Search,
  Send,
  Star,
  Upload,
  User,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { logger } from "@/lib/logger";

// Types
interface Project {
  id: string;
  title: string;
  description: string;
  projectType: string;
  urgency: string;
  budgetRange?: string;
  address?: string;
  city?: string;
  state?: string;
  status: string;
  createdAt: string;
  client: {
    name: string;
    clientType?: string;
  };
  isSpecialtyMatch?: boolean;
  bidCount?: number;
}

interface BidFormData {
  projectId: string;
  amount: string;
  message: string;
  estimateFile: File | null;
  timeline: string;
}

export default function BidOpportunitiesPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [urgencyFilter, setUrgencyFilter] = useState("all");

  // Bid modal state
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [bidModalOpen, setBidModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [bidForm, setBidForm] = useState<BidFormData>({
    projectId: "",
    amount: "",
    message: "",
    estimateFile: null,
    timeline: "",
  });

  useEffect(() => {
    void fetchProjects();
  }, []);

  async function fetchProjects() {
    setLoading(true);
    try {
      // Fetch from both APIs and merge
      const [jobsRes, projectsRes] = await Promise.all([
        fetch("/api/trades/job-board").catch(() => null),
        fetch("/api/projects/browse").catch(() => null),
      ]);

      const jobsData = jobsRes?.ok ? await jobsRes.json() : { jobs: [] };
      const projectsData = projectsRes?.ok ? await projectsRes.json() : { projects: [] };

      // Merge and dedupe
      const allProjects: Project[] = [
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...(jobsData.jobs || []).map((j: any) => ({
          id: j.id,
          title: j.title,
          description: j.description,
          projectType: j.category || "General",
          urgency: j.urgency || "normal",
          address: j.propertyAddress,
          status: j.status || "open",
          createdAt: j.createdAt,
          client: { name: j.client?.name || "Client" },
          isSpecialtyMatch: j.isSpecialtyMatch,
        })),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...(projectsData.projects || []).map((p: any) => ({
          id: p.id,
          title: p.title,
          description: p.description,
          projectType: p.projectType,
          urgency: p.urgency || "normal",
          budgetRange: p.budgetRange,
          city: p.city,
          state: p.state,
          status: p.status || "open",
          createdAt: p.createdAt,
          client: { name: "Client", clientType: p.clientType },
          bidCount: p._count?.bids || 0,
        })),
      ];

      // Remove duplicates by ID
      const uniqueProjects = allProjects.filter(
        (p, i, arr) => arr.findIndex((x) => x.id === p.id) === i
      );

      setProjects(uniqueProjects);
    } catch (error) {
      logger.error("Failed to fetch projects:", error);
      toast.error("Failed to load opportunities");
    } finally {
      setLoading(false);
    }
  }

  function openBidModal(project: Project) {
    setSelectedProject(project);
    setBidForm({
      projectId: project.id,
      amount: "",
      message: "",
      estimateFile: null,
      timeline: "",
    });
    setBidModalOpen(true);
  }

  async function submitBid() {
    if (!selectedProject) return;

    if (!bidForm.amount || !bidForm.message) {
      toast.error("Please fill in bid amount and message");
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("projectId", selectedProject.id);
      formData.append("amount", bidForm.amount);
      formData.append("message", bidForm.message);
      formData.append("timeline", bidForm.timeline);

      if (bidForm.estimateFile) {
        formData.append("estimate", bidForm.estimateFile);
      }

      const res = await fetch("/api/bids", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        toast.success("Bid submitted successfully! The client will be notified.");
        setBidModalOpen(false);
        void fetchProjects(); // Refresh to update bid counts
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to submit bid");
      }
    } catch (error) {
      logger.error("Bid submission error:", error);
      toast.error("Failed to submit bid");
    } finally {
      setSubmitting(false);
    }
  }

  // Filtering
  const filteredProjects = projects.filter((project) => {
    // Tab filter
    if (activeTab === "specialty" && !project.isSpecialtyMatch) return false;
    if (activeTab === "urgent" && project.urgency !== "urgent" && project.urgency !== "emergency")
      return false;

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matches =
        project.title.toLowerCase().includes(term) ||
        project.description?.toLowerCase().includes(term) ||
        project.projectType.toLowerCase().includes(term) ||
        project.city?.toLowerCase().includes(term);
      if (!matches) return false;
    }

    // Category filter
    if (categoryFilter !== "all" && project.projectType !== categoryFilter) return false;

    // Urgency filter
    if (urgencyFilter !== "all" && project.urgency !== urgencyFilter) return false;

    return true;
  });

  function getUrgencyBadge(urgency: string) {
    const variants: Record<string, { label: string; className: string }> = {
      emergency: { label: "🚨 Emergency", className: "bg-red-500 text-white" },
      urgent: { label: "⚡ Urgent", className: "bg-orange-500 text-white" },
      normal: { label: "📅 Normal", className: "bg-blue-100 text-blue-700" },
      flexible: { label: "🌿 Flexible", className: "bg-green-100 text-green-700" },
    };
    const v = variants[urgency] || variants.normal;
    return <Badge className={v.className}>{v.label}</Badge>;
  }

  function getClientTypeIcon(type?: string) {
    switch (type) {
      case "business_owner":
        return <Building2 className="h-4 w-4" />;
      case "landlord":
      case "property_manager":
        return <Home className="h-4 w-4" />;
      default:
        return <User className="h-4 w-4" />;
    }
  }

  return (
    <PageContainer>
      <PageHero
        section="jobs"
        title="Bid Opportunities"
        description="Find projects from clients and submit your bids"
        icon={<Briefcase className="h-8 w-8" />}
        actions={
          <Button onClick={fetchProjects} variant="outline" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        }
      />

      {/* Stats Banner */}
      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="flex items-center gap-3 p-4">
            <Briefcase className="h-8 w-8 text-green-600" />
            <div>
              <p className="text-2xl font-bold text-green-700">{projects.length}</p>
              <p className="text-sm text-green-600">Open Projects</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-yellow-200 bg-yellow-50/50">
          <CardContent className="flex items-center gap-3 p-4">
            <Star className="h-8 w-8 text-yellow-600" />
            <div>
              <p className="text-2xl font-bold text-yellow-700">
                {projects.filter((p) => p.isSpecialtyMatch).length}
              </p>
              <p className="text-sm text-yellow-600">Match Your Specialty</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-orange-200 bg-orange-50/50">
          <CardContent className="flex items-center gap-3 p-4">
            <Zap className="h-8 w-8 text-orange-600" />
            <div>
              <p className="text-2xl font-bold text-orange-700">
                {projects.filter((p) => p.urgency === "urgent" || p.urgency === "emergency").length}
              </p>
              <p className="text-sm text-orange-600">Urgent Jobs</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="flex items-center gap-3 p-4">
            <Calendar className="h-8 w-8 text-blue-600" />
            <div>
              <p className="text-2xl font-bold text-blue-700">
                {
                  projects.filter((p) => {
                    const date = new Date(p.createdAt);
                    const today = new Date();
                    return today.getTime() - date.getTime() < 24 * 60 * 60 * 1000;
                  }).length
                }
              </p>
              <p className="text-sm text-blue-600">New Today</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs & Filters */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <TabsList>
            <TabsTrigger value="all" className="gap-2">
              <Briefcase className="h-4 w-4" />
              All Projects
            </TabsTrigger>
            <TabsTrigger value="specialty" className="gap-2">
              <Star className="h-4 w-4" />
              My Specialty
            </TabsTrigger>
            <TabsTrigger value="urgent" className="gap-2">
              <Zap className="h-4 w-4" />
              Urgent
            </TabsTrigger>
          </TabsList>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search projects..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64 pl-9"
              />
            </div>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-40">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="Roofing">Roofing</SelectItem>
                <SelectItem value="Plumbing">Plumbing</SelectItem>
                <SelectItem value="Electrical">Electrical</SelectItem>
                <SelectItem value="HVAC">HVAC</SelectItem>
                <SelectItem value="General">General</SelectItem>
                <SelectItem value="Painting">Painting</SelectItem>
                <SelectItem value="Flooring">Flooring</SelectItem>
                <SelectItem value="Remodel">Remodel</SelectItem>
              </SelectContent>
            </Select>

            <Select value={urgencyFilter} onValueChange={setUrgencyFilter}>
              <SelectTrigger className="w-36">
                <Clock className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Urgency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="emergency">Emergency</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="flexible">Flexible</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Project List */}
        <TabsContent value={activeTab} className="mt-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredProjects.length === 0 ? (
            <Card className="p-12 text-center">
              <Briefcase className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="text-lg font-medium">No opportunities found</h3>
              <p className="mt-2 text-muted-foreground">
                {searchTerm || categoryFilter !== "all" || urgencyFilter !== "all"
                  ? "Try adjusting your filters"
                  : "Check back later for new projects"}
              </p>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredProjects.map((project) => (
                <Card
                  key={project.id}
                  className={`transition-all hover:shadow-md ${
                    project.isSpecialtyMatch
                      ? "border-green-200 bg-green-50/30 dark:border-green-900 dark:bg-green-950/20"
                      : ""
                  }`}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-3">
                        {/* Title & Badges */}
                        <div className="flex flex-wrap items-center gap-3">
                          <h3 className="text-lg font-semibold">{project.title}</h3>
                          {getUrgencyBadge(project.urgency)}
                          <Badge variant="outline">{project.projectType}</Badge>
                          {project.isSpecialtyMatch && (
                            <Badge className="bg-green-500 text-white">
                              <Star className="mr-1 h-3 w-3" />
                              Matches Specialty
                            </Badge>
                          )}
                          {project.bidCount !== undefined && project.bidCount > 0 && (
                            <Badge variant="secondary">
                              {project.bidCount} bid{project.bidCount !== 1 ? "s" : ""}
                            </Badge>
                          )}
                        </div>

                        {/* Description */}
                        {project.description && (
                          <p className="line-clamp-2 text-muted-foreground">
                            {project.description}
                          </p>
                        )}

                        {/* Details */}
                        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            {getClientTypeIcon(project.client.clientType)}
                            {project.client.name}
                          </span>
                          {(project.city || project.address) && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-4 w-4" />
                              {project.city && project.state
                                ? `${project.city}, ${project.state}`
                                : project.address}
                            </span>
                          )}
                          {project.budgetRange && (
                            <span className="flex items-center gap-1">
                              <DollarSign className="h-4 w-4" />
                              {project.budgetRange}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {new Date(project.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col gap-2">
                        <Button onClick={() => openBidModal(project)} className="gap-2">
                          <Send className="h-4 w-4" />
                          Submit Bid
                        </Button>
                        <Button variant="outline" size="sm" className="gap-2">
                          <MessageSquare className="h-4 w-4" />
                          Message
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Bid Submission Modal */}
      <Dialog open={bidModalOpen} onOpenChange={setBidModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-green-600" />
              Submit Bid
            </DialogTitle>
            <DialogDescription>
              {selectedProject?.title && (
                <span>
                  Submitting bid for: <strong>{selectedProject.title}</strong>
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Bid Amount */}
            <div className="space-y-2">
              <Label htmlFor="amount">Bid Amount *</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="amount"
                  type="number"
                  placeholder="5000"
                  value={bidForm.amount}
                  onChange={(e) => setBidForm({ ...bidForm, amount: e.target.value })}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Timeline */}
            <div className="space-y-2">
              <Label htmlFor="timeline">Estimated Timeline</Label>
              <Select
                value={bidForm.timeline}
                onValueChange={(v) => setBidForm({ ...bidForm, timeline: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select timeline" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1-2 days">1-2 days</SelectItem>
                  <SelectItem value="3-5 days">3-5 days</SelectItem>
                  <SelectItem value="1 week">1 week</SelectItem>
                  <SelectItem value="2 weeks">2 weeks</SelectItem>
                  <SelectItem value="1 month">1 month</SelectItem>
                  <SelectItem value="custom">Custom - specify in message</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Message */}
            <div className="space-y-2">
              <Label htmlFor="message">Message to Client *</Label>
              <Textarea
                id="message"
                placeholder="Introduce yourself, highlight relevant experience, and explain your approach to this project..."
                value={bidForm.message}
                onChange={(e) => setBidForm({ ...bidForm, message: e.target.value })}
                rows={4}
              />
            </div>

            {/* Estimate Attachment */}
            <div className="space-y-2">
              <Label>Attach Estimate (PDF)</Label>
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById("estimate-upload")?.click()}
                  className="gap-2"
                >
                  <Upload className="h-4 w-4" />
                  {bidForm.estimateFile ? "Change File" : "Upload Estimate"}
                </Button>
                <input
                  id="estimate-upload"
                  type="file"
                  accept=".pdf,.doc,.docx"
                  aria-label="Upload estimate file"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setBidForm({ ...bidForm, estimateFile: file });
                    }
                  }}
                />
                {bidForm.estimateFile && (
                  <div className="flex items-center gap-2 rounded-md bg-green-50 px-3 py-1.5 text-sm text-green-700">
                    <Paperclip className="h-4 w-4" />
                    {bidForm.estimateFile.name}
                    <button
                      onClick={() => setBidForm({ ...bidForm, estimateFile: null })}
                      aria-label="Remove file"
                      className="ml-1 hover:text-red-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Attach a detailed estimate to stand out from other bidders
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setBidModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitBid} disabled={submitting} className="gap-2">
              {submitting ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Submit Bid
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
