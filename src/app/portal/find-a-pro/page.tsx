/**
 * Find a Pro Page - Facebook-Style Social Search
 *
 * Features:
 * - Large, scrollable feed of pros
 * - Real search with filters
 * - Big pro cards showing: years in trade, reviews/stars, licensed/bonded/insured
 * - Click to view full profile
 * - Invite to existing job or create new project
 */

"use client";

import { useUser } from "@clerk/nextjs";
import {
  Award,
  BadgeCheck,
  Bookmark,
  BookmarkCheck,
  Briefcase,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  Filter,
  Loader2,
  MapPin,
  MessageCircle,
  Plus,
  Search,
  Shield,
  ShieldCheck,
  Star,
  UserPlus,
  Users,
  Verified,
  Zap,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

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
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { TooltipProvider } from "@/components/ui/tooltip";
import { logger } from "@/lib/logger";

// Trade types from config
const TRADE_OPTIONS = [
  "All Trades",
  "Roofing",
  "General Contracting",
  "Drywall",
  "Framing",
  "Painting",
  "Electrical",
  "Plumbing",
  "HVAC",
  "Flooring",
  "Siding",
  "Windows & Doors",
  "Masonry",
  "Concrete",
  "Landscaping",
  "Smart Home & Technology",
  "Security Systems",
  "Solar",
  "Pool Contractor",
  "Pool Service",
  "Pest Control",
  "Tree Service",
  "Fencing",
  "Gutters",
  "Water Damage Restoration",
  "Fire Damage Restoration",
  "Mold Remediation",
];

interface Pro {
  id: string;
  slug?: string | null;
  companyId?: string | null;
  name: string;
  companyName?: string | null;
  tradeType: string;
  avatar?: string | null;
  coverPhoto?: string | null;
  tagline?: string | null;
  bio?: string | null;
  city?: string | null;
  state?: string | null;
  distance?: number | null;
  rating: number;
  reviewCount: number;
  yearsExperience?: number | null;
  foundedYear?: number | null;
  teamSize?: string | null;
  isVerified: boolean;
  isLicensed: boolean;
  isBonded: boolean;
  isInsured: boolean;
  rocNumber?: string | null;
  phone?: string | null;
  website?: string | null;
  portfolioImages?: string[];
  emergencyAvailable?: boolean;
  freeEstimates?: boolean;
  responseTime?: string | null;
  engagementScore?: number;
}

interface Job {
  id: string;
  title: string;
  status: string;
  tradeType?: string;
}

// No demo profile - show real contractors only

export default function FindAProPage() {
  const { user } = useUser();

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [selectedTrade, setSelectedTrade] = useState("All Trades");
  const [radius, setRadius] = useState(50);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [minRating, setMinRating] = useState("any");
  const [showFilters, setShowFilters] = useState(false);

  // Results state
  const [pros, setPros] = useState<Pro[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Saved/Connected state
  const [savedProIds, setSavedProIds] = useState<string[]>([]);
  const [connectedProIds, setConnectedProIds] = useState<string[]>([]);
  const [pendingProIds, setPendingProIds] = useState<string[]>([]);

  // Invite modal state
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedPro, setSelectedPro] = useState<Pro | null>(null);
  const [activeJobs, setActiveJobs] = useState<Job[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [newProjectTitle, setNewProjectTitle] = useState("");
  const [newProjectDescription, setNewProjectDescription] = useState("");
  const [inviteMode, setInviteMode] = useState<"existing" | "new">("existing");
  const [sendingInvite, setSendingInvite] = useState(false);

  const fetchPros = useCallback(
    async (reset = false) => {
      try {
        if (reset) {
          setLoading(true);
        } else {
          setLoadingMore(true);
        }

        const params = new URLSearchParams();
        if (selectedTrade !== "All Trades") params.set("trade", selectedTrade);
        if (verifiedOnly) params.set("verifiedOnly", "true");
        if (minRating !== "any") params.set("minRating", minRating);
        if (searchQuery) params.set("search", searchQuery);
        if (zipCode) params.set("zip", zipCode);
        params.set("radius", String(radius));
        params.set("limit", "20");
        params.set("offset", String(reset ? 0 : (page - 1) * 20));

        const res = await fetch(`/api/portal/find-pro?${params}`);

        if (res.ok) {
          const data = await res.json();
          const newPros = data.pros || [];

          if (reset) {
            setPros(newPros);
          } else {
            setPros((prev) => [...prev, ...newPros]);
          }

          setHasMore(data.pros?.length === 20);
        } else {
          // Log the actual error for debugging
          const errorText = await res.text().catch(() => "unknown");
          logger.error(`[find-a-pro] API returned ${res.status}:`, errorText);

          // On auth error, retry once after a short delay (Clerk cookie race)
          if (res.status === 401 && reset) {
            logger.warn("[find-a-pro] Auth failed, retrying in 1s...");
            await new Promise((r) => setTimeout(r, 1000));
            const retry = await fetch(`/api/portal/find-pro?${params}`);
            if (retry.ok) {
              const data = await retry.json();
              setPros(data.pros || []);
              setHasMore(data.pros?.length === 20);
              return;
            }
          }

          setPros([]);
          setHasMore(false);
        }
      } catch (error) {
        logger.error("Failed to fetch pros:", error);
        setPros([]);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [selectedTrade, verifiedOnly, minRating, searchQuery, zipCode, radius, page]
  );

  async function loadConnectionStatus() {
    try {
      const res = await fetch("/api/portal/connections");
      if (res.ok) {
        const data = await res.json();
        const connections = data.connections || [];

        // Separate connected and pending IDs
        const connected: string[] = [];
        const pending: string[] = [];

        connections.forEach((conn: { id: string; connectionStatus: string }) => {
          // connectionStatus comes as lowercase from API
          if (
            conn.connectionStatus?.toLowerCase() === "accepted" ||
            conn.connectionStatus?.toLowerCase() === "connected"
          ) {
            connected.push(conn.id);
          } else if (conn.connectionStatus?.toLowerCase() === "pending") {
            pending.push(conn.id);
          }
        });

        setConnectedProIds(connected);
        setPendingProIds(pending);
      }
    } catch (error) {
      logger.error("Failed to load connection status:", error);
    }
  }

  // Load initial data
  useEffect(() => {
    void fetchPros(true);
    void loadSavedStatus();
    void loadConnectionStatus();
    void loadActiveJobs();
  }, [fetchPros]);

  // Refetch when filters change
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      void fetchPros(true);
    }, 300);
    return () => clearTimeout(timer);
  }, [selectedTrade, verifiedOnly, minRating, zipCode, fetchPros]);

  async function loadSavedStatus() {
    try {
      const res = await fetch("/api/portal/save-pro");
      if (res.ok) {
        const data = await res.json();
        setSavedProIds(data.savedProIds || []);
      }
    } catch (error) {
      logger.error("Failed to load saved status:", error);
    }
  }

  async function loadActiveJobs() {
    try {
      const res = await fetch("/api/portal/work-requests");
      if (res.ok) {
        const data = await res.json();
        setActiveJobs(
          data.requests?.filter((j: Job) =>
            ["pending", "in_progress", "active"].includes(j.status?.toLowerCase())
          ) || []
        );
      }
    } catch (error) {
      logger.error("Failed to load jobs:", error);
    }
  }

  const handleSearch = useCallback(() => {
    setPage(1);
    void fetchPros(true);
  }, [fetchPros]);

  const handleLoadMore = useCallback(() => {
    setPage((prev) => prev + 1);
    void fetchPros(false);
  }, [fetchPros]);

  async function handleSave(pro: Pro) {
    const saveId = pro.companyId || pro.id;
    const isSaved = savedProIds.includes(saveId);

    // Optimistic update
    if (isSaved) {
      setSavedProIds((prev) => prev.filter((id) => id !== saveId));
    } else {
      setSavedProIds((prev) => [...prev, saveId]);
    }

    try {
      const res = await fetch("/api/portal/save-pro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proId: saveId, action: isSaved ? "unsave" : "save" }),
      });

      if (!res.ok) throw new Error("Failed to save");
      toast.success(isSaved ? "Removed from saved" : "Saved to My Pros! 💜");
    } catch {
      // Revert on error
      if (isSaved) {
        setSavedProIds((prev) => [...prev, saveId]);
      } else {
        setSavedProIds((prev) => prev.filter((id) => id !== saveId));
      }
      toast.error("Failed to save");
    }
  }

  async function handleConnect(pro: Pro) {
    const connId = pro.companyId || pro.id;
    if (connectedProIds.includes(connId) || pendingProIds.includes(connId)) return;

    // Optimistic update
    setPendingProIds((prev) => [...prev, connId]);

    try {
      const res = await fetch("/api/portal/connect-pro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proId: pro.id }),
      });

      if (!res.ok) throw new Error("Failed to connect");
      toast.success("Connection request sent! 🎉");
    } catch {
      setPendingProIds((prev) => prev.filter((id) => id !== connId));
      toast.error("Failed to connect");
    }
  }

  function openInviteModal(pro: Pro) {
    setSelectedPro(pro);
    setSelectedJobId("");
    setNewProjectTitle("");
    setNewProjectDescription("");
    setInviteMode(activeJobs.length > 0 ? "existing" : "new");
    setShowInviteModal(true);
  }

  async function handleSendInvite() {
    if (!selectedPro) return;

    setSendingInvite(true);
    try {
      if (inviteMode === "existing" && selectedJobId) {
        // Invite to existing job
        const res = await fetch("/api/portal/job-invite", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            proId: selectedPro.id,
            jobId: selectedJobId,
          }),
        });

        if (!res.ok) throw new Error("Failed to send invite");
        toast.success(`Invitation sent to ${selectedPro.companyName || selectedPro.name}! 🎉`);
      } else if (inviteMode === "new" && newProjectTitle) {
        // Create new project and invite
        const res = await fetch("/api/portal/work-requests", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: newProjectTitle,
            description: newProjectDescription,
            tradeType: selectedPro.tradeType,
            inviteProId: selectedPro.id,
          }),
        });

        if (!res.ok) throw new Error("Failed to create project");
        toast.success(
          `Project created and invitation sent to ${selectedPro.companyName || selectedPro.name}! 🎉`
        );

        // Refresh jobs list
        void loadActiveJobs();
      }

      setShowInviteModal(false);
    } catch (error) {
      logger.error("Invite error:", error);
      toast.error("Failed to send invitation");
    } finally {
      setSendingInvite(false);
    }
  }

  const getYearsInBusiness = (foundedYear?: number | null, yearsExperience?: number | null) => {
    if (yearsExperience) return yearsExperience;
    if (foundedYear) return new Date().getFullYear() - foundedYear;
    return null;
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header - Fixed Search Bar */}
        <div className="sticky top-0 z-20 -mx-4 -mt-4 bg-gradient-to-b from-slate-50 to-slate-50/95 px-4 pb-4 pt-4 backdrop-blur-sm dark:from-slate-900 dark:to-slate-900/95 md:-mx-6 md:px-6">
          <div className="mx-auto max-w-4xl">
            {/* Title */}
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 p-2.5 text-white shadow-lg">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Find a Pro</h1>
                <p className="text-sm text-slate-500">
                  Connect with trusted local trades professionals
                </p>
              </div>
            </div>

            {/* Search Bar */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  placeholder="Search trades professionals by name, specialty, or location..."
                  aria-label="Search trades professionals"
                  className="h-12 pl-10 pr-4 text-base"
                />
              </div>
              <Select value={selectedTrade} onValueChange={setSelectedTrade}>
                <SelectTrigger className="h-12 w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TRADE_OPTIONS.map((trade) => (
                    <SelectItem key={trade} value={trade}>
                      {trade}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="icon"
                className="h-12 w-12"
                onClick={() => setShowFilters(!showFilters)}
                aria-label={showFilters ? "Hide filters" : "Show filters"}
                aria-expanded={showFilters}
              >
                <Filter className="h-5 w-5" />
              </Button>
              <Button className="h-12 px-6" onClick={handleSearch}>
                <Search className="mr-2 h-4 w-4" />
                Search
              </Button>
            </div>

            {/* Expandable Filters */}
            {showFilters && (
              <Card className="mt-4 border-slate-200 dark:border-slate-700">
                <CardContent className="flex flex-wrap items-center gap-6 p-4">
                  {/* ZIP Code */}
                  <div className="flex items-center gap-2">
                    <Label className="text-sm text-slate-500">
                      <MapPin className="mr-1 inline h-4 w-4" />
                      ZIP Code:
                    </Label>
                    <Input
                      value={zipCode}
                      onChange={(e) => setZipCode(e.target.value.replace(/\D/g, "").slice(0, 5))}
                      placeholder="85001"
                      className="w-[100px]"
                      maxLength={5}
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      id="verified"
                      checked={verifiedOnly}
                      onCheckedChange={setVerifiedOnly}
                    />
                    <Label htmlFor="verified" className="flex cursor-pointer items-center gap-1.5">
                      <BadgeCheck className="h-4 w-4 text-blue-500" />
                      Verified Only
                    </Label>
                  </div>

                  <div className="flex items-center gap-2">
                    <Label className="text-sm text-slate-500">Min Rating:</Label>
                    <Select value={minRating} onValueChange={setMinRating}>
                      <SelectTrigger className="w-[100px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">Any</SelectItem>
                        <SelectItem value="4.5">4.5+ ★</SelectItem>
                        <SelectItem value="4">4.0+ ★</SelectItem>
                        <SelectItem value="3.5">3.5+ ★</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center gap-3">
                    <Label className="text-sm text-slate-500">Radius:</Label>
                    <div className="flex items-center gap-2">
                      <Slider
                        value={[radius]}
                        onValueChange={([val]) => setRadius(val)}
                        min={10}
                        max={100}
                        step={10}
                        className="w-[120px]"
                      />
                      <Badge variant="outline" className="font-mono">
                        {radius} mi
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Results Count */}
        {!loading && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">
              {pros.length} trades professional{pros.length !== 1 ? "s" : ""} found
              {selectedTrade !== "All Trades" && ` in ${selectedTrade}`}
            </p>
            <div className="flex gap-2">
              <Badge variant="secondary" className="gap-1">
                <Shield className="h-3 w-3" />
                Background Checked
              </Badge>
            </div>
          </div>
        )}

        {/* Pro Feed - Large Cards */}
        <div className="space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="mb-4 h-10 w-10 animate-spin text-blue-600" />
              <p className="text-slate-500">Finding trades professionals near you...</p>
            </div>
          ) : pros.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <div className="mb-4 rounded-full bg-blue-100 p-4 dark:bg-blue-900/30">
                  <Search className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="mb-2 text-xl font-semibold">No Trades Professionals Found</h3>
                <p className="mb-6 max-w-md text-slate-500">
                  We&apos;re building our trades network. Try adjusting your filters or check back
                  soon for new pros in your area.
                </p>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setVerifiedOnly(false);
                      setMinRating("any");
                      setSelectedTrade("All Trades");
                    }}
                  >
                    Reset Filters
                  </Button>
                  <Link href="/portal/network">
                    <Button>
                      <Users className="mr-2 h-4 w-4" />
                      Browse Network
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              {pros.map((pro) => {
                const connId = pro.companyId || pro.id;
                const saveId = pro.companyId || pro.id;
                return (
                  <ProCard
                    key={pro.id}
                    pro={pro}
                    isSaved={savedProIds.includes(saveId)}
                    isConnected={connectedProIds.includes(connId)}
                    isPending={pendingProIds.includes(connId)}
                    onSave={() => handleSave(pro)}
                    onConnect={() => handleConnect(pro)}
                    onInvite={() => openInviteModal(pro)}
                    yearsInBusiness={getYearsInBusiness(pro.foundedYear, pro.yearsExperience)}
                  />
                );
              })}

              {hasMore && (
                <div className="flex justify-center pt-4">
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    className="w-full max-w-xs"
                  >
                    {loadingMore ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      <>
                        <Plus className="mr-2 h-4 w-4" />
                        Load More Trades Pros
                      </>
                    )}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Invite Modal */}
        <Dialog open={showInviteModal} onOpenChange={setShowInviteModal}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-blue-600" />
                Invite to Project
              </DialogTitle>
              <DialogDescription>
                Send a project invitation to {selectedPro?.companyName || selectedPro?.name}
              </DialogDescription>
            </DialogHeader>

            <Tabs value={inviteMode} onValueChange={(v) => setInviteMode(v as "existing" | "new")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="existing" disabled={activeJobs.length === 0}>
                  Existing Project
                </TabsTrigger>
                <TabsTrigger value="new">New Project</TabsTrigger>
              </TabsList>

              <TabsContent value="existing" className="space-y-4 pt-4">
                {activeJobs.length > 0 ? (
                  <div className="space-y-2">
                    <Label>Select a project</Label>
                    <Select value={selectedJobId} onValueChange={setSelectedJobId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a project..." />
                      </SelectTrigger>
                      <SelectContent>
                        {activeJobs.map((job) => (
                          <SelectItem key={job.id} value={job.id}>
                            {job.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <p className="py-4 text-center text-slate-500">
                    No active projects. Create a new one below.
                  </p>
                )}
              </TabsContent>

              <TabsContent value="new" className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="projectTitle">Project Title *</Label>
                  <Input
                    id="projectTitle"
                    value={newProjectTitle}
                    onChange={(e) => setNewProjectTitle(e.target.value)}
                    placeholder="e.g., Roof Inspection, Kitchen Remodel..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="projectDesc">Description (optional)</Label>
                  <Textarea
                    id="projectDesc"
                    value={newProjectDescription}
                    onChange={(e) => setNewProjectDescription(e.target.value)}
                    placeholder="Describe what you need help with..."
                    rows={3}
                  />
                </div>
              </TabsContent>
            </Tabs>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowInviteModal(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSendInvite}
                disabled={
                  sendingInvite || (inviteMode === "existing" ? !selectedJobId : !newProjectTitle)
                }
              >
                {sendingInvite ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <MessageCircle className="mr-2 h-4 w-4" />
                    Send Invitation
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}

// ============================================================================
// Pro Card Component - Large Facebook-Style Card
// ============================================================================

interface ProCardProps {
  pro: Pro;
  isSaved: boolean;
  isConnected: boolean;
  isPending: boolean;
  yearsInBusiness: number | null;
  onSave: () => void;
  onConnect: () => void;
  onInvite: () => void;
}

function ProCard({
  pro,
  isSaved,
  isConnected,
  isPending,
  yearsInBusiness,
  onSave,
  onConnect,
  onInvite,
}: ProCardProps) {
  const [saving, setSaving] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [avatarError, setAvatarError] = useState(false);

  const initials =
    (pro.companyName || pro.name)
      ?.split(" ")
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "PR";

  const location = [pro.city, pro.state].filter(Boolean).join(", ");

  // Validate avatar URL
  const validAvatarUrl =
    pro.avatar &&
    !avatarError &&
    (pro.avatar.startsWith("http") || pro.avatar.startsWith("/") || pro.avatar.includes("supabase"))
      ? pro.avatar
      : null;

  const handleSaveClick = async () => {
    setSaving(true);
    // eslint-disable-next-line @typescript-eslint/await-thenable
    await onSave();
    setSaving(false);
  };

  const handleConnectClick = async () => {
    setConnecting(true);
    // eslint-disable-next-line @typescript-eslint/await-thenable
    await onConnect();
    setConnecting(false);
  };

  // Show person name + company
  const displayName = pro.name || pro.companyName || "Pro";
  const subtitle = pro.companyName ? `${pro.companyName} • ${pro.tradeType}` : pro.tradeType;

  // Validate cover photo URL - accept http/https URLs or Supabase storage URLs
  const coverPhotoUrl =
    pro.coverPhoto &&
    (pro.coverPhoto.startsWith("http") ||
      pro.coverPhoto.startsWith("/") ||
      pro.coverPhoto.includes("supabase"))
      ? pro.coverPhoto
      : null;

  return (
    <Card className="overflow-hidden border-slate-200 bg-white transition-all hover:shadow-xl dark:border-slate-700 dark:bg-slate-900">
      {/* Cover Photo */}
      <div className="relative h-48 overflow-hidden rounded-t-xl bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 md:h-56">
        {coverPhotoUrl ? (
          <Image
            src={coverPhotoUrl}
            alt={`${pro.companyName || pro.name} cover`}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 800px"
            priority={false}
            onError={(e) => {
              // Hide broken images
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />

        {/* Top badges */}
        <div className="absolute right-3 top-3 flex gap-2">
          {pro.isVerified && (
            <Badge className="bg-blue-500 px-2 py-0.5 text-xs text-white shadow-lg">
              <BadgeCheck className="mr-1 h-3 w-3" />
              Verified
            </Badge>
          )}
          {pro.emergencyAvailable && (
            <Badge className="bg-red-500 px-2 py-0.5 text-xs text-white shadow-lg">
              <Zap className="mr-1 h-3 w-3" />
              24/7
            </Badge>
          )}
        </div>

        {/* Save button */}
        <button
          onClick={handleSaveClick}
          disabled={saving}
          aria-label={isSaved ? "Remove from saved pros" : "Save this pro"}
          className={`absolute left-3 top-3 flex h-9 w-9 items-center justify-center rounded-full shadow-lg backdrop-blur-sm transition-all ${
            isSaved ? "bg-pink-500 text-white" : "bg-white/20 text-white hover:bg-white/30"
          }`}
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isSaved ? (
            <BookmarkCheck className="h-4 w-4" />
          ) : (
            <Bookmark className="h-4 w-4" />
          )}
        </button>
      </div>

      <CardContent className="relative -mt-10 p-5">
        {/* Avatar + Basic Info */}
        <div className="flex items-start gap-4">
          {/* Use direct Image instead of Avatar to avoid white background issues */}
          {validAvatarUrl ? (
            <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-xl">
              <Image
                src={validAvatarUrl}
                alt={displayName}
                width={80}
                height={80}
                className="h-full w-full object-cover"
                onError={() => setAvatarError(true)}
              />
            </div>
          ) : (
            <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-xl">
              <span className="text-xl font-bold text-white">{initials}</span>
            </div>
          )}

          <div className="flex-1 pt-6">
            <div className="flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="truncate text-lg font-bold text-slate-900 dark:text-white">
                    {displayName}
                  </h3>
                  {pro.isVerified && <Verified className="h-5 w-5 flex-shrink-0 text-blue-500" />}
                </div>
                <p className="truncate text-sm text-slate-500">{subtitle}</p>
              </div>

              {/* Rating */}
              <div className="ml-3 flex-shrink-0 text-right">
                <div className="flex items-center gap-1">
                  <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
                  <span className="text-lg font-bold">{pro.rating?.toFixed(1) || "New"}</span>
                </div>
                <p className="text-xs text-slate-500">{pro.reviewCount || 0} reviews</p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="mt-4 flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
          {yearsInBusiness && (
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4 text-blue-500" />
              {yearsInBusiness} years
            </span>
          )}
          {location && (
            <span className="flex items-center gap-1">
              <MapPin className="h-4 w-4 text-red-500" />
              {location}
            </span>
          )}
          {pro.teamSize && (
            <span className="flex items-center gap-1">
              <Users className="h-4 w-4 text-purple-500" />
              {pro.teamSize}
            </span>
          )}
        </div>

        {/* Trust Badges */}
        <div className="mt-4 flex flex-wrap gap-2">
          {pro.isLicensed && (
            <Badge
              variant="outline"
              className="border-green-300 bg-green-50 px-2 py-0.5 text-xs text-green-700"
            >
              <Award className="mr-1 h-3 w-3" />
              Licensed
            </Badge>
          )}
          {pro.isBonded && (
            <Badge
              variant="outline"
              className="border-blue-300 bg-blue-50 px-2 py-0.5 text-xs text-blue-700"
            >
              <Shield className="mr-1 h-3 w-3" />
              Bonded
            </Badge>
          )}
          {pro.isInsured && (
            <Badge
              variant="outline"
              className="border-purple-300 bg-purple-50 px-2 py-0.5 text-xs text-purple-700"
            >
              <ShieldCheck className="mr-1 h-3 w-3" />
              Insured
            </Badge>
          )}
          {pro.freeEstimates && (
            <Badge variant="outline" className="px-2 py-0.5 text-xs text-slate-600">
              <CheckCircle2 className="mr-1 h-3 w-3" />
              Free Estimates
            </Badge>
          )}
        </div>

        {/* Action Buttons */}
        <div className="mt-5 grid grid-cols-3 gap-3">
          <Link href={`/portal/profiles/${pro.slug || pro.companyId || pro.id}`}>
            <Button variant="outline" className="h-10 w-full">
              <ExternalLink className="mr-2 h-4 w-4" />
              View Profile
            </Button>
          </Link>

          <Button
            variant="outline"
            onClick={handleConnectClick}
            disabled={connecting || isConnected || isPending}
            className={`h-10 ${
              isConnected
                ? "border-green-500 text-green-600"
                : isPending
                  ? "border-amber-500 text-amber-600"
                  : ""
            }`}
          >
            {connecting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : isConnected ? (
              <CheckCircle2 className="mr-2 h-4 w-4" />
            ) : isPending ? (
              <Clock className="mr-2 h-4 w-4" />
            ) : (
              <UserPlus className="mr-2 h-4 w-4" />
            )}
            {isConnected ? "Connected" : isPending ? "Pending" : "Connect"}
          </Button>

          <Button
            onClick={() => onInvite()}
            className="h-10 bg-gradient-to-r from-blue-600 to-indigo-600"
          >
            <Briefcase className="mr-2 h-4 w-4" />
            Invite to Job
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
