/**
 * Client Portal - Contractor Profile Page
 * Facebook-style full profile view with timeline, featured work, highlights
 */

"use client";

import {
  ArrowLeft,
  Award,
  BadgeCheck,
  Bookmark,
  BookmarkCheck,
  Briefcase,
  Calendar,
  CheckCircle,
  CheckCircle2,
  Clock,
  ExternalLink,
  Facebook,
  Globe,
  Hammer,
  Image as ImageIcon,
  Instagram,
  Linkedin,
  Loader2,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Shield,
  ShieldCheck,
  Star,
  Twitter,
  UserCheck,
  UserPlus,
  Users,
  Verified,
  Wrench,
  Youtube,
  Zap,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { ConnectionsList } from "@/components/portal/ConnectionsList";
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

interface ContractorProfile {
  id: string;
  firstName?: string;
  lastName?: string;
  jobTitle?: string;
  avatar?: string;
  bio?: string;
  yearsExperience?: number;
  specialties?: string[];
  skills?: string[];
  certifications?: string[];
  businessName?: string;
  coverPhotoUrl?: string;
  coverPhoto?: string;
  tagline?: string;
  aboutCompany?: string;
  foundedYear?: number;
  teamSize?: string;
  phone?: string;
  officePhone?: string;
  mobilePhone?: string;
  email?: string;
  website?: string;
  serviceAreas?: string[];
  city?: string;
  state?: string;
  zip?: string;
  hoursOfOperation?: Record<string, string>;
  emergencyAvailable?: boolean;
  freeEstimates?: boolean;
  rocNumber?: string;
  rocExpiration?: string;
  insuranceProvider?: string;
  insuranceExpiration?: string;
  bondAmount?: string;
  tradeType?: string;
  portfolioImages?: string[];
  portfolioUrls?: string[];
  rating?: number;
  reviewCount?: number;
  averageRating?: number;
  totalReviewsCount?: number;
  socialLinks?: Record<string, string>;
  paymentMethods?: string[];
  languages?: string[];
  warrantyInfo?: string;
  workHistory?: Array<{
    company?: string;
    role?: string;
    startYear?: number;
    endYear?: number;
    description?: string;
  }>;
  lookingFor?: string[];
  isVerified?: boolean;
  tradeProfileId?: string;
  companyId?: string;
  companySlug?: string;
  companyLogo?: string;
}

interface Job {
  id: string;
  title: string;
  status: string;
  tradeType?: string;
}

// Connection status type
type ConnectionStatus = "none" | "pending" | "connected";

export default function ContractorProfilePage() {
  const params = useParams<{ companyId: string }>();
  const router = useRouter();
  const companyId = params?.companyId;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<ContractorProfile | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("none");
  const [isSaved, setIsSaved] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [saving, setSaving] = useState(false);

  // Modal states
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  // Invite modal state
  const [activeJobs, setActiveJobs] = useState<Job[]>([]);
  const [selectedJobId, setSelectedJobId] = useState("");
  const [newProjectTitle, setNewProjectTitle] = useState("");
  const [newProjectDescription, setNewProjectDescription] = useState("");
  const [inviteMode, setInviteMode] = useState<"existing" | "new">("new");
  const [sendingInvite, setSendingInvite] = useState(false);

  useEffect(() => {
    if (!companyId) return;
    void loadProfile();
    void loadConnectionStatus();
    void loadSavedStatus();
    void loadActiveJobs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  async function loadProfile(retries = 2) {
    try {
      logger.debug(`[Profile] Loading profile for ID: ${companyId}`);
      const res = await fetch(`/api/trades/profile/${companyId}/public`);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        logger.error(`[Profile] API error:`, res.status, errorData);
        // Retry on server errors (5xx) or rate limits (429)
        if (retries > 0 && (res.status >= 500 || res.status === 429)) {
          logger.debug(`[Profile] Retrying... (${retries} left)`);
          await new Promise((r) => setTimeout(r, 500));
          return loadProfile(retries - 1);
        }
        throw new Error(errorData.error || "Contractor not found");
      }
      const data = await res.json();
      logger.debug(`[Profile] Loaded profile:`, data.profile?.id);
      setProfile(data.profile);
      setError(null);
    } catch (err) {
      // Retry on network errors
      if (retries > 0 && err instanceof TypeError) {
        logger.debug(`[Profile] Network error, retrying... (${retries} left)`);
        await new Promise((r) => setTimeout(r, 500));
        return loadProfile(retries - 1);
      }
      const errMsg = err instanceof Error ? err.message : "Failed to load contractor profile";
      logger.error(`[Profile] Load error:`, errMsg);
      setError(errMsg);
      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  }

  async function loadConnectionStatus() {
    try {
      const res = await fetch("/api/portal/connections");
      if (res.ok) {
        const data = await res.json();
        const connections = data.connections || [];
        const connection = connections.find(
          (c: { id: string; connectionStatus: string }) => c.id === companyId
        );
        if (connection) {
          const status = (connection.connectionStatus || "").toLowerCase();
          setConnectionStatus(
            status === "accepted" || status === "connected" ? "connected" : "pending"
          );
        }
      }
    } catch (error) {
      logger.error("Failed to load connection status:", error);
    }
  }

  async function loadSavedStatus() {
    try {
      const res = await fetch("/api/portal/save-pro");
      if (res.ok) {
        const data = await res.json();
        setIsSaved((data.savedProIds || []).includes(companyId));
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

  async function handleConnect() {
    if (connectionStatus !== "none" || connecting) return;

    setConnecting(true);
    // Optimistic update - show pending immediately
    setConnectionStatus("pending");

    try {
      const res = await fetch("/api/portal/connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proId: profile?.id }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to connect");
      }

      toast.success("Connection request sent! 🎉");
    } catch (error) {
      // Revert on error
      setConnectionStatus("none");
      const errMsg = error instanceof Error ? error.message : "Failed to send connection request";
      toast.error(errMsg);
    } finally {
      setConnecting(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    const wasSaved = isSaved;
    // Optimistic update
    setIsSaved(!isSaved);

    try {
      const res = await fetch("/api/portal/save-pro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proId: profile?.id, action: wasSaved ? "unsave" : "save" }),
      });

      if (!res.ok) throw new Error("Failed to save");
      toast.success(wasSaved ? "Removed from saved" : "Saved to My Pros! 💜");
    } catch {
      // Revert on error
      setIsSaved(wasSaved);
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleSendMessage() {
    if (!profile || !message.trim()) {
      toast.error("Please enter a message");
      return;
    }

    setSending(true);

    try {
      const res = await fetch("/api/portal/messages/create-thread", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contractorId: profile.id,
          subject: `Inquiry about ${profile.tradeType || "services"}`,
          initialMessage: message,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to send message");
      }

      toast.success("Message sent successfully!");
      setShowMessageModal(false);
      setMessage("");
      router.push(`/portal/messages/${data.threadId}`);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : "Failed to send message";
      toast.error(errMsg);
    } finally {
      setSending(false);
    }
  }

  async function handleSendInvite() {
    if (!profile) return;

    setSendingInvite(true);
    try {
      if (inviteMode === "existing" && selectedJobId) {
        // Invite to existing job
        const res = await fetch("/api/portal/job-invite", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            proId: profile.id,
            jobId: selectedJobId,
          }),
        });

        if (!res.ok) throw new Error("Failed to send invite");
        toast.success(`Invitation sent to ${profile.businessName || displayName}! 🎉`);
      } else if (inviteMode === "new" && newProjectTitle) {
        // Create new project and invite
        const res = await fetch("/api/portal/work-requests", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: newProjectTitle,
            description: newProjectDescription,
            tradeType: profile.tradeType,
            inviteProId: profile.id,
          }),
        });

        if (!res.ok) throw new Error("Failed to create project");
        toast.success(
          `Project created and invitation sent to ${profile.businessName || displayName}! 🎉`
        );

        // Refresh jobs list
        void loadActiveJobs();
      }

      setShowInviteModal(false);
      setNewProjectTitle("");
      setNewProjectDescription("");
      setSelectedJobId("");
    } catch (error) {
      logger.error("Invite error:", error);
      toast.error("Failed to send invitation");
    } finally {
      setSendingInvite(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          <p className="text-slate-500">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            Trades Professional Not Found
          </h2>
          <p className="mt-2 text-slate-500 dark:text-slate-400">
            {error || "This profile may have been removed or is unavailable."}
          </p>
          <p className="mt-1 text-xs text-slate-400">Profile ID: {companyId}</p>
          <div className="mt-4 flex items-center justify-center gap-3">
            <Button variant="outline" onClick={() => router.back()}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
            </Button>
            <Link href="/portal/find-a-pro">
              <Button>Find Contractors</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const personName = [profile.firstName, profile.lastName].filter(Boolean).join(" ");
  const displayName = personName || profile.businessName || "Contractor";
  const initials = displayName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const location = [profile.city, profile.state].filter(Boolean).join(", ");
  const currentYear = new Date().getFullYear();
  const yearsInBusiness = profile.foundedYear
    ? currentYear - profile.foundedYear
    : profile.yearsExperience;

  // Derive verification badges
  const isLicensed = !!profile.rocNumber;
  const isInsured = !!profile.insuranceProvider;
  const isBonded = !!profile.bondAmount;
  const isVerified = isLicensed && isInsured;

  // Connection button styling based on status
  const getConnectButtonStyle = () => {
    switch (connectionStatus) {
      case "connected":
        return "border-green-500 bg-green-50 text-green-700 hover:bg-green-100";
      case "pending":
        return "border-amber-500 bg-amber-50 text-amber-700 hover:bg-amber-100";
      default:
        return "";
    }
  };

  const getConnectButtonContent = () => {
    if (connecting) {
      return (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Sending...
        </>
      );
    }
    switch (connectionStatus) {
      case "connected":
        return (
          <>
            <UserCheck className="mr-2 h-4 w-4" />
            Connected
          </>
        );
      case "pending":
        return (
          <>
            <Clock className="mr-2 h-4 w-4" />
            Invite Sent
          </>
        );
      default:
        return (
          <>
            <UserPlus className="mr-2 h-4 w-4" />
            Connect
          </>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Back Link */}
      <Link
        href="/portal/find-a-pro"
        className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Find a Pro
      </Link>

      {/* Cover Photo + Avatar Header - Facebook Style */}
      <div className="overflow-hidden rounded-2xl bg-white shadow-xl dark:bg-slate-900">
        {/* Cover Photo */}
        <div className="relative h-48 overflow-hidden rounded-t-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 md:h-72">
          {(profile.coverPhotoUrl || profile.coverPhoto) &&
          (profile.coverPhotoUrl || profile.coverPhoto)?.startsWith("http") ? (
            <Image
              src={(profile.coverPhotoUrl || profile.coverPhoto)!}
              alt={`${profile.businessName || displayName} cover`}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 1200px"
              priority
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

          {/* Save Button - Top Left */}
          <button
            onClick={handleSave}
            disabled={saving}
            className={`absolute left-4 top-4 flex h-10 w-10 items-center justify-center rounded-full shadow-lg backdrop-blur-sm transition-all ${
              isSaved ? "bg-pink-500 text-white" : "bg-white/20 text-white hover:bg-white/30"
            }`}
          >
            {saving ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : isSaved ? (
              <BookmarkCheck className="h-5 w-5" />
            ) : (
              <Bookmark className="h-5 w-5" />
            )}
          </button>

          {/* Top Right Badges */}
          <div className="absolute right-4 top-4 flex gap-2">
            {isVerified && (
              <Badge className="bg-blue-500 px-3 py-1 text-white shadow-lg">
                <BadgeCheck className="mr-1 h-4 w-4" />
                Verified Pro
              </Badge>
            )}
            {profile.emergencyAvailable && (
              <Badge className="bg-red-500 px-3 py-1 text-white shadow-lg">
                <Zap className="mr-1 h-4 w-4" />
                24/7 Emergency
              </Badge>
            )}
          </div>
        </div>

        {/* Profile Info Section */}
        <div className="relative px-6 pb-6">
          {/* Avatar - Overlapping Cover */}
          <div className="-mt-16 flex flex-col gap-4 md:-mt-14 md:flex-row md:items-end md:justify-between">
            <div className="flex flex-col items-center gap-4 md:flex-row md:items-end">
              {profile.avatar && profile.avatar.startsWith("http") ? (
                <div className="h-32 w-32 flex-shrink-0 overflow-hidden rounded-full shadow-2xl md:h-40 md:w-40">
                  <Image
                    src={profile.avatar}
                    alt={displayName}
                    width={160}
                    height={160}
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                      (e.target as HTMLImageElement).parentElement!.innerHTML =
                        `<div class="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600 text-4xl font-bold text-white">${initials}</div>`;
                    }}
                  />
                </div>
              ) : (
                <div className="flex h-32 w-32 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-blue-500 to-purple-600 shadow-2xl md:h-40 md:w-40">
                  <span className="text-4xl font-bold text-white">{initials}</span>
                </div>
              )}

              <div className="pb-2 pt-2 text-center md:pt-0 md:text-left">
                <div className="flex items-center justify-center gap-2 md:justify-start">
                  <h1 className="text-2xl font-bold text-slate-900 dark:text-white md:text-3xl">
                    {displayName}
                  </h1>
                  {isVerified && <Verified className="h-6 w-6 text-blue-500" />}
                </div>
                {profile.businessName && profile.businessName !== displayName && (
                  <Link
                    href={`/portal/company/${profile.companySlug || profile.companyId || ""}`}
                    className="text-lg text-blue-600 hover:underline dark:text-blue-400"
                  >
                    {profile.businessName}
                  </Link>
                )}
                <p className="text-slate-500">
                  {profile.jobTitle || profile.tradeType || "Contractor"}
                </p>
                {location && (
                  <p className="mt-1 flex items-center justify-center gap-1 text-sm text-slate-500 md:justify-start">
                    <MapPin className="h-4 w-4" />
                    {location}
                  </p>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3 pt-4 md:pt-0">
              <Button
                variant="outline"
                onClick={handleConnect}
                disabled={connecting || connectionStatus !== "none"}
                className={getConnectButtonStyle()}
              >
                {getConnectButtonContent()}
              </Button>
              <Button variant="outline" onClick={() => setShowMessageModal(true)}>
                <MessageCircle className="mr-2 h-4 w-4" />
                Message
              </Button>
              <Button
                className="bg-gradient-to-r from-blue-600 to-indigo-600 shadow-lg"
                onClick={() => setShowInviteModal(true)}
              >
                <Briefcase className="mr-2 h-4 w-4" />
                Invite to Job
              </Button>
              {profile.companySlug && (
                <Link href={`/portal/company/${profile.companySlug}`}>
                  <Button
                    variant="outline"
                    className="border-indigo-300 text-indigo-700 hover:bg-indigo-50"
                  >
                    <Users className="mr-2 h-4 w-4" />
                    View Company Page
                  </Button>
                </Link>
              )}
            </div>
          </div>

          {/* Quick Stats Bar */}
          <div className="mt-6 grid grid-cols-2 gap-4 rounded-xl bg-slate-50 p-4 dark:bg-slate-800 md:grid-cols-4">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-xl font-bold text-slate-900 dark:text-white">
                <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
                {profile.rating?.toFixed(1) || "5.0"}
              </div>
              <p className="text-sm text-slate-500">{profile.reviewCount || 0} reviews</p>
            </div>
            {yearsInBusiness && (
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-xl font-bold text-slate-900 dark:text-white">
                  <Calendar className="h-5 w-5 text-blue-500" />
                  {yearsInBusiness}
                </div>
                <p className="text-sm text-slate-500">Years Experience</p>
              </div>
            )}
            {profile.teamSize && (
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-xl font-bold text-slate-900 dark:text-white">
                  <Users className="h-5 w-5 text-purple-500" />
                  {profile.teamSize}
                </div>
                <p className="text-sm text-slate-500">Team Size</p>
              </div>
            )}
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-xl font-bold text-slate-900 dark:text-white">
                <CheckCircle className="h-5 w-5 text-green-500" />
                {profile.freeEstimates ? "Free" : "Paid"}
              </div>
              <p className="text-sm text-slate-500">Estimates</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabbed Content - Facebook Style */}
      <Tabs defaultValue="about" className="space-y-6">
        <TabsList className="w-full justify-start overflow-x-auto border-b border-slate-200 [-ms-overflow-style:none] [scrollbar-width:none] dark:border-slate-700 [&::-webkit-scrollbar]:hidden">
          <TabsTrigger value="about" className="gap-2">
            <Users className="h-4 w-4" />
            About
          </TabsTrigger>
          <TabsTrigger value="portfolio" className="gap-2">
            <ImageIcon className="h-4 w-4" />
            Portfolio
          </TabsTrigger>
          <TabsTrigger value="credentials" className="gap-2">
            <Shield className="h-4 w-4" />
            Credentials
          </TabsTrigger>
          <TabsTrigger value="services" className="gap-2">
            <Wrench className="h-4 w-4" />
            Services
          </TabsTrigger>
          <TabsTrigger value="contact" className="gap-2">
            <Phone className="h-4 w-4" />
            Contact
          </TabsTrigger>
        </TabsList>

        {/* About Tab */}
        <TabsContent value="about" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Bio / About */}
            <Card>
              <CardHeader>
                <CardTitle>About {displayName}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {profile.tagline && (
                  <p className="text-lg italic text-slate-600 dark:text-slate-400">
                    &quot;{profile.tagline}&quot;
                  </p>
                )}
                {(profile.aboutCompany || profile.bio) && (
                  <p className="text-slate-600 dark:text-slate-400">
                    {profile.aboutCompany || profile.bio}
                  </p>
                )}
                {!profile.tagline && !profile.aboutCompany && !profile.bio && (
                  <p className="text-slate-500">No bio provided yet.</p>
                )}
              </CardContent>
            </Card>

            {/* Highlights */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-amber-500" />
                  Highlights
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {yearsInBusiness && (
                  <div className="flex items-center gap-3 rounded-lg bg-blue-50 p-3 dark:bg-blue-900/20">
                    <Calendar className="h-5 w-5 text-blue-600" />
                    <span className="font-medium">{yearsInBusiness} years in business</span>
                  </div>
                )}
                {isVerified && (
                  <div className="flex items-center gap-3 rounded-lg bg-green-50 p-3 dark:bg-green-900/20">
                    <BadgeCheck className="h-5 w-5 text-green-600" />
                    <span className="font-medium">Verified Professional</span>
                  </div>
                )}
                {profile.freeEstimates && (
                  <div className="flex items-center gap-3 rounded-lg bg-purple-50 p-3 dark:bg-purple-900/20">
                    <CheckCircle2 className="h-5 w-5 text-purple-600" />
                    <span className="font-medium">Free Estimates Available</span>
                  </div>
                )}
                {profile.emergencyAvailable && (
                  <div className="flex items-center gap-3 rounded-lg bg-red-50 p-3 dark:bg-red-900/20">
                    <Zap className="h-5 w-5 text-red-600" />
                    <span className="font-medium">24/7 Emergency Service</span>
                  </div>
                )}
                {profile.teamSize && (
                  <div className="flex items-center gap-3 rounded-lg bg-indigo-50 p-3 dark:bg-indigo-900/20">
                    <Users className="h-5 w-5 text-indigo-600" />
                    <span className="font-medium">{profile.teamSize} team members</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Skills */}
          {profile.skills && profile.skills.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Hammer className="h-5 w-5 text-orange-500" />
                  Skills
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {profile.skills.map((skill, i) => (
                    <Badge key={i} variant="outline" className="px-3 py-1.5 text-sm">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Work History */}
          {profile.workHistory && profile.workHistory.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-blue-600" />
                  Work History
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {profile.workHistory.map((entry, i) => (
                  <div
                    key={i}
                    className="flex gap-4 border-l-2 border-blue-200 pl-4 dark:border-blue-700"
                  >
                    <div className="flex-1">
                      <p className="font-semibold text-slate-900 dark:text-white">
                        {entry.role || "Contractor"}
                      </p>
                      {entry.company && <p className="text-sm text-blue-600">{entry.company}</p>}
                      {(entry.startYear || entry.endYear) && (
                        <p className="text-xs text-slate-400">
                          {entry.startYear || "?"} — {entry.endYear || "Present"}
                        </p>
                      )}
                      {entry.description && (
                        <p className="mt-1 text-sm text-slate-500">{entry.description}</p>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Social Links */}
          {profile.socialLinks && Object.keys(profile.socialLinks).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Social &amp; Online</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3">
                  {Object.entries(profile.socialLinks).map(([platform, url]) => {
                    if (!url) return null;
                    const iconMap: Record<string, React.ReactNode> = {
                      facebook: <Facebook className="h-5 w-5 text-blue-600" />,
                      instagram: <Instagram className="h-5 w-5 text-pink-600" />,
                      twitter: <Twitter className="h-5 w-5 text-sky-500" />,
                      linkedin: <Linkedin className="h-5 w-5 text-blue-700" />,
                      youtube: <Youtube className="h-5 w-5 text-red-600" />,
                      website: <Globe className="h-5 w-5 text-slate-600" />,
                    };
                    return (
                      <a
                        key={platform}
                        href={url.startsWith("http") ? url : `https://${url}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium capitalize transition-colors hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                      >
                        {iconMap[platform.toLowerCase()] || (
                          <Globe className="h-5 w-5 text-slate-500" />
                        )}
                        {platform}
                        <ExternalLink className="h-3 w-3 text-slate-400" />
                      </a>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Languages & Payment */}
          <div className="grid gap-6 md:grid-cols-2">
            {profile.languages && profile.languages.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Languages</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-600 dark:text-slate-400">
                    {profile.languages.join(", ")}
                  </p>
                </CardContent>
              </Card>
            )}
            {profile.paymentMethods && profile.paymentMethods.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Payment Methods</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {profile.paymentMethods.map((method, i) => (
                      <Badge key={i} variant="outline">
                        {method}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Portfolio Tab */}
        <TabsContent value="portfolio" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5 text-blue-600" />
                Work Portfolio
              </CardTitle>
              <CardDescription>Recent projects and work samples</CardDescription>
            </CardHeader>
            <CardContent>
              {(profile.portfolioImages || profile.portfolioUrls || []).length > 0 ? (
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                  {(profile.portfolioImages || profile.portfolioUrls || []).map((img, i) => (
                    <div
                      key={i}
                      className="group relative aspect-square overflow-hidden rounded-xl"
                    >
                      <Image
                        src={img}
                        alt={`Work sample ${i + 1}`}
                        fill
                        className="object-cover transition-transform group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/20" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="mb-4 rounded-full bg-slate-100 p-4 dark:bg-slate-800">
                    <ImageIcon className="h-8 w-8 text-slate-400" />
                  </div>
                  <p className="text-slate-500">No portfolio images available yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Credentials Tab */}
        <TabsContent value="credentials" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-green-600" />
                Trust & Credentials
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {isLicensed && (
                  <div className="rounded-xl border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
                    <div className="flex items-center gap-3">
                      <Award className="h-8 w-8 text-green-600" />
                      <div>
                        <p className="font-semibold text-green-800 dark:text-green-200">
                          Licensed Contractor
                        </p>
                        {profile.rocNumber && (
                          <p className="text-sm text-green-700 dark:text-green-300">
                            License #{profile.rocNumber}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                {isInsured && (
                  <div className="rounded-xl border border-purple-200 bg-purple-50 p-4 dark:border-purple-800 dark:bg-purple-900/20">
                    <div className="flex items-center gap-3">
                      <ShieldCheck className="h-8 w-8 text-purple-600" />
                      <div>
                        <p className="font-semibold text-purple-800 dark:text-purple-200">
                          Fully Insured
                        </p>
                        <p className="text-sm text-purple-700 dark:text-purple-300">
                          {profile.insuranceProvider}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                {isBonded && (
                  <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
                    <div className="flex items-center gap-3">
                      <Shield className="h-8 w-8 text-blue-600" />
                      <div>
                        <p className="font-semibold text-blue-800 dark:text-blue-200">Bonded</p>
                        {profile.bondAmount && (
                          <p className="text-sm text-blue-700 dark:text-blue-300">
                            ${profile.bondAmount}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {!isLicensed && !isInsured && !isBonded && (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <p className="text-slate-500">No credentials information provided yet</p>
                </div>
              )}

              {/* Certifications */}
              {profile.certifications && profile.certifications.length > 0 && (
                <div className="mt-6">
                  <h4 className="mb-3 font-semibold text-slate-900 dark:text-white">
                    Certifications
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {profile.certifications.map((cert, i) => (
                      <Badge key={i} variant="outline" className="px-3 py-1.5">
                        <Award className="mr-1 h-3 w-3" />
                        {cert}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Warranty Info */}
              {profile.warrantyInfo && (
                <div className="mt-6 rounded-xl bg-amber-50 p-4 dark:bg-amber-900/20">
                  <h4 className="mb-2 font-semibold text-amber-800 dark:text-amber-200">
                    Warranty Information
                  </h4>
                  <p className="text-amber-700 dark:text-amber-300">{profile.warrantyInfo}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contact Tab */}
        <TabsContent value="contact" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {profile.phone && (
                <a
                  href={`tel:${profile.phone}`}
                  className="flex items-center gap-3 rounded-xl bg-slate-50 p-4 transition-colors hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
                    <Phone className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Phone</p>
                    <p className="font-semibold text-slate-900 dark:text-white">{profile.phone}</p>
                  </div>
                </a>
              )}
              {profile.email && (
                <a
                  href={`mailto:${profile.email}`}
                  className="flex items-center gap-3 rounded-xl bg-slate-50 p-4 transition-colors hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
                    <Mail className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Email</p>
                    <p className="font-semibold text-slate-900 dark:text-white">{profile.email}</p>
                  </div>
                </a>
              )}
              {profile.website && (
                <a
                  href={profile.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-xl bg-slate-50 p-4 transition-colors hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900">
                    <Globe className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-slate-500">Website</p>
                    <p className="font-semibold text-slate-900 dark:text-white">Visit Website</p>
                  </div>
                  <ExternalLink className="h-5 w-5 text-slate-400" />
                </a>
              )}
            </CardContent>
          </Card>

          {/* Service Areas */}
          {profile.serviceAreas && profile.serviceAreas.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-red-500" />
                  Service Areas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {profile.serviceAreas.map((area, i) => (
                    <Badge key={i} variant="secondary" className="px-3 py-1.5">
                      <MapPin className="mr-1 h-3 w-3" />
                      {area}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Network Tab - Connections List */}
        <TabsContent value="network" className="space-y-6">
          <ConnectionsList
            title="My Connections"
            description="Contractors and professionals in your network"
            profileType="client"
            maxDisplay={9}
          />
        </TabsContent>
      </Tabs>

      {/* Message Modal */}
      <Dialog open={showMessageModal} onOpenChange={setShowMessageModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Message {displayName}</DialogTitle>
            <DialogDescription>
              Send a message about your project or request a quote
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Describe your project and what you need help with..."
            rows={5}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMessageModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSendMessage} disabled={sending || !message.trim()}>
              {sending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                "Send Message"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invite to Job Modal */}
      <Dialog open={showInviteModal} onOpenChange={setShowInviteModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-blue-600" />
              Invite to Project
            </DialogTitle>
            <DialogDescription>
              Send a project invitation to {profile.businessName || displayName}
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
  );
}
