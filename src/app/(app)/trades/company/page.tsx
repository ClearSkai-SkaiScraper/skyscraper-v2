"use client";

import {
  Award,
  Banknote,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  Edit,
  ExternalLink,
  FileText,
  Globe,
  Globe2,
  Loader2,
  Lock,
  Mail,
  MapPin,
  Phone,
  PhoneCall,
  Plus,
  Shield,
  ShieldCheck,
  Smartphone,
  Star,
  UserPlus,
  Users,
  XCircle,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { UpgradeModal } from "@/components/trades/UpgradeModal";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { logger } from "@/lib/logger";

interface MemberSettings {
  tagline?: string;
  aboutCompany?: string;
  foundedYear?: number;
  teamSize?: string;
  hoursOfOperation?: any; // JSON object e.g. { mon: "8a–5p", ... }
  officePhone?: string;
  mobilePhone?: string;
  emergencyAvailable?: boolean;
  freeEstimates?: boolean;
  warrantyInfo?: string;
  socialLinks?: any; // JSON object e.g. { facebook, linkedin, ... }
  paymentMethods?: string[];
  languages?: string[];
  rocNumber?: string;
  insuranceProvider?: string;
  coverPhoto?: string;
}

interface CompanyData {
  company: {
    id: string;
    name: string;
    description?: string;
    logo?: string;
    coverPhoto?: string;
    website?: string;
    phone?: string;
    email?: string;
    city?: string;
    state?: string;
    address?: string;
    zip?: string;
    specialties?: string[];
    yearsInBusiness?: number;
    licenseNumber?: string;
    verified?: boolean;
  } | null;
  memberSettings?: MemberSettings;
  members: Array<{
    id: string;
    firstName?: string;
    lastName?: string;
    avatar?: string;
    role: string;
    isAdmin: boolean;
    title?: string;
    tradeType?: string;
  }>;
  isAdmin: boolean;
  companyPageUnlocked: boolean;
  unlockReason?: string;
  requirementsToUnlock?:
    | string
    | {
        needsPlan?: string;
        orNeedsMembers?: number;
        currentMembers?: number;
        currentPlan?: string;
      };
}

interface SeatsData {
  totalSeats: number;
  usedSeats: number;
  pendingInvites: number;
  availableSeats: number;
  currentPlan: string;
  canManageSeats: boolean;
}

interface JoinRequest {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  jobTitle?: string;
  tradeType?: string;
  status: string;
  createdAt: string;
}

export default function CompanyPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<CompanyData | null>(null);
  const [seats, setSeats] = useState<SeatsData | null>(null);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [processingRequest, setProcessingRequest] = useState<string | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    void loadData();
  }, []);

  const loadData = async () => {
    try {
      const [companyRes, seatsRes, joinRes] = await Promise.all([
        fetch("/api/trades/company"),
        fetch("/api/trades/company/seats"),
        fetch("/api/trades/company/join-requests"),
      ]);

      if (companyRes.ok) {
        const companyData = await companyRes.json();
        // API returns members nested under company.members — normalize to top level
        if (companyData.company?.members && !companyData.members) {
          companyData.members = companyData.company.members;
        }
        // Ensure members always exists as an array
        if (!companyData.members) {
          companyData.members = [];
        }
        setData(companyData);
      } else {
        // If API returned a non-ok response, still try to parse it for error info
        const errBody = await companyRes.json().catch(() => ({}));
        // Provide a fallback data shape so the page renders the "No Company" state cleanly
        setData({
          company: null,
          members: [],
          isAdmin: false,
          companyPageUnlocked: errBody.companyPageUnlocked ?? true,
          unlockReason: errBody.unlockReason,
          requirementsToUnlock: errBody.requirementsToUnlock,
        });
      }

      if (seatsRes.ok) {
        const raw = await seatsRes.json();
        // Normalize nested API response to flat SeatsData shape
        setSeats({
          totalSeats: raw.seats?.total ?? raw.totalSeats ?? 1,
          usedSeats: raw.seats?.used ?? raw.usedSeats ?? 1,
          availableSeats: raw.seats?.available ?? raw.availableSeats ?? 0,
          pendingInvites: Array.isArray(raw.pendingInvites)
            ? raw.pendingInvites.length
            : (raw.pendingInvites ?? 0),
          currentPlan: raw.plan?.key ?? raw.currentPlan ?? "solo",
          canManageSeats: raw.canManageSeats ?? false,
        });
      }

      if (joinRes.ok) {
        const joinData = await joinRes.json();
        setJoinRequests(joinData.requests || []);
      }
    } catch (error) {
      logger.error("Failed to load company data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;

    setInviting(true);
    try {
      const res = await fetch("/api/trades/company/seats/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 402 || data.error === "Seat limit reached") {
          setShowInviteModal(false);
          setShowUpgradeModal(true);
        } else if (res.status === 403) {
          toast.error("Only admins or owners can invite team members.");
        } else {
          toast.error(data.error || "Failed to send invite. Please try again.");
        }
        return;
      }

      if (data.emailSent === false) {
        toast.warning("Member added but email failed to send. Share this link manually:", {
          duration: 15000,
          description: data.inviteLink || "Check the team page for the invite link.",
          action: data.inviteLink
            ? {
                label: "Copy Link",
                onClick: () => {
                  void navigator.clipboard.writeText(data.inviteLink);
                  toast.success("Link copied!");
                },
              }
            : undefined,
        });
      } else {
        toast.success("Invite sent successfully!");
      }
      setInviteEmail("");
      setShowInviteModal(false);
      void loadData();
    } catch (error) {
      logger.error("Failed to send invite:", error);
      toast.error("Failed to send invite");
    } finally {
      setInviting(false);
    }
  };

  const handleJoinRequest = async (requestId: string, action: "approve" | "reject") => {
    setProcessingRequest(requestId);
    try {
      const res = await fetch("/api/trades/company/join-requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, action }),
      });

      const result = await res.json();
      if (!res.ok) {
        toast.error(result.error || "Failed to process request");
        return;
      }

      toast.success(action === "approve" ? "Employee approved! 🎉" : "Request declined.");
      void loadData();
    } catch (error) {
      logger.error("Failed to process join request:", error);
      toast.error("Failed to process request");
    } finally {
      setProcessingRequest(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 via-blue-50/60 to-amber-50/40 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // No company exists
  if (!data?.company) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 via-blue-50/60 to-amber-50/40 p-6 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
        <Card className="max-w-md text-center">
          <CardContent className="p-8">
            <Building2 className="mx-auto mb-4 h-12 w-12 text-gray-400" />
            <h1 className="mb-2 text-xl font-semibold">No Company Found</h1>
            <p className="mb-6 text-gray-600 dark:text-gray-400">
              Create a company profile to showcase your business and manage your team.
            </p>
            <Link href="/trades/setup">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Company
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Company page locked
  if (!data.companyPageUnlocked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 via-blue-50/60 to-amber-50/40 p-6 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
        <Card className="max-w-lg">
          <CardContent className="p-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/40">
              <Lock className="h-8 w-8 text-blue-600" />
            </div>
            <h1 className="mb-2 text-2xl font-bold">Company Page Locked</h1>
            <p className="mb-6 text-gray-600 dark:text-gray-400">
              {typeof data.requirementsToUnlock === "object" && data.requirementsToUnlock
                ? `Upgrade to a ${data.requirementsToUnlock.needsPlan || "paid"} plan or add ${(data.requirementsToUnlock.orNeedsMembers || 3) - (data.requirementsToUnlock.currentMembers || 1)} more team member${(data.requirementsToUnlock.orNeedsMembers || 3) - (data.requirementsToUnlock.currentMembers || 1) !== 1 ? "s" : ""} to unlock your company page.`
                : data.requirementsToUnlock || "Upgrade your plan to unlock your company page."}
            </p>

            <div className="mb-6 space-y-3 text-left">
              <div className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                <Building2 className="h-5 w-5 text-blue-600" />
                <span className="text-sm">Showcase your company to homeowners</span>
              </div>
              <div className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                <Users className="h-5 w-5 text-blue-600" />
                <span className="text-sm">Add team members with dedicated seats</span>
              </div>
              <div className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                <Star className="h-5 w-5 text-blue-600" />
                <span className="text-sm">Get priority in search results</span>
              </div>
            </div>

            <div className="space-y-3">
              <Button className="w-full" size="lg" asChild>
                <Link href="/settings/billing">
                  <Zap className="mr-2 h-4 w-4" />
                  Upgrade to Unlock
                </Link>
              </Button>
              {(data.members?.length ?? 0) < 3 && (
                <p className="text-xs text-gray-500">
                  Or add {3 - (data.members?.length ?? 0)} more team member
                  {3 - (data.members?.length ?? 0) !== 1 ? "s" : ""} to unlock automatically
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const company = data.company;
  const ms = data.memberSettings || ({} as MemberSettings);

  // Parse hours of operation
  const hours: Record<string, string> =
    typeof ms.hoursOfOperation === "object" && ms.hoursOfOperation
      ? ms.hoursOfOperation
      : typeof ms.hoursOfOperation === "string"
        ? (() => {
            try {
              return JSON.parse(ms.hoursOfOperation);
            } catch {
              return {};
            }
          })()
        : {};
  const dayOrder = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
  const dayLabels: Record<string, string> = {
    monday: "Monday",
    tuesday: "Tuesday",
    wednesday: "Wednesday",
    thursday: "Thursday",
    friday: "Friday",
    saturday: "Saturday",
    sunday: "Sunday",
  };

  // Format time from 24h "HH:MM" to 12h readable
  const fmt = (t: string) => {
    if (!t) return "";
    const [h, m] = t.split(":").map(Number);
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    return m ? `${h12}:${String(m).padStart(2, "0")} ${ampm}` : `${h12} ${ampm}`;
  };

  // Normalize hours: support both { open, close, closed } objects and plain strings
  const formatHours = (val: unknown): string | null => {
    if (!val) return null;
    if (typeof val === "string") return val;
    if (typeof val === "object" && val !== null) {
      const obj = val as { open?: string; close?: string; closed?: boolean };
      if (obj.closed) return "Closed";
      if (obj.open && obj.close) return `${fmt(obj.open)} – ${fmt(obj.close)}`;
    }
    return null;
  };

  // Parse social links
  const socials: Record<string, string> =
    typeof ms.socialLinks === "object" && ms.socialLinks
      ? ms.socialLinks
      : typeof ms.socialLinks === "string"
        ? (() => {
            try {
              return JSON.parse(ms.socialLinks);
            } catch {
              return {};
            }
          })()
        : {};

  // Full address
  const fullAddress = [company.address, company.city, company.state, (company as any).zip]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50/60 to-amber-50/40 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
      {/* Cover Photo — native img, no next/image */}
      <div className="relative h-60 overflow-hidden rounded-t-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 md:h-72">
        {company.coverPhoto && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={company.coverPhoto} alt="Cover" className="h-full w-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/10 to-transparent" />
        {data.isAdmin && (
          <div className="absolute right-4 top-4 flex items-center gap-2">
            <Link
              href="/trades/company/edit"
              className="flex items-center gap-2 rounded-lg bg-white/90 px-3 py-2 text-sm font-medium text-gray-900 shadow-sm backdrop-blur-sm transition hover:bg-white"
            >
              <Edit className="h-4 w-4" />
              Company Settings
            </Link>
          </div>
        )}
      </div>

      <div className="mx-auto max-w-5xl px-4 pb-12">
        {/* Company Header — Enhanced Google Business style */}
        <div className="relative z-10 -mt-12 mb-8 md:-mt-14">
          <div className="flex flex-col gap-4 rounded-2xl border border-slate-200/60 bg-white px-4 pb-5 pt-4 shadow-md dark:border-slate-700 dark:bg-slate-900 sm:flex-row sm:items-center sm:gap-5 sm:px-6 sm:pt-4">
            {/* Logo */}
            <div className="relative mx-auto -mt-6 h-28 w-28 shrink-0 overflow-hidden rounded-xl border-4 border-white bg-white shadow-lg sm:mx-0 sm:-mt-10 sm:h-36 sm:w-36 md:h-44 md:w-44">
              {company.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={company.logo} alt={company.name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <Building2 className="h-16 w-16 text-gray-400" />
                </div>
              )}
            </div>

            {/* Company Name + Quick Info */}
            <div className="min-w-0 flex-1 overflow-visible pb-3 pt-2">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="break-words text-2xl font-extrabold text-gray-900 sm:text-3xl md:text-4xl">
                  {company.name}
                </h1>
                {company.verified && (
                  <Badge className="bg-blue-100 text-blue-700">
                    <Shield className="mr-1 h-3 w-3" />
                    Verified
                  </Badge>
                )}
              </div>
              {ms.tagline && (
                <p className="mt-1 text-lg italic text-slate-500">&ldquo;{ms.tagline}&rdquo;</p>
              )}
              {!ms.tagline && data.isAdmin && (
                <Link
                  href="/trades/company/edit#motto"
                  className="mt-1 inline-flex items-center gap-1 text-sm text-blue-500 transition hover:text-blue-700"
                >
                  <Edit className="h-3 w-3" />
                  Add your Motto / Slogan
                </Link>
              )}
              {company.description && !ms.tagline && !data.isAdmin && (
                <p className="mt-1 max-w-2xl text-gray-600">{company.description}</p>
              )}
              <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-gray-500">
                {(company.city || company.state) && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-4 w-4 text-red-400" />
                    {[company.city, company.state].filter(Boolean).join(", ")}
                  </span>
                )}
                {(company.phone || ms.officePhone) && (
                  <a
                    href={`tel:${company.phone || ms.officePhone}`}
                    className="flex items-center gap-1 transition hover:text-blue-600"
                  >
                    <Phone className="h-4 w-4 text-green-500" />
                    {company.phone || ms.officePhone}
                  </a>
                )}
                {company.email && (
                  <a
                    href={`mailto:${company.email}`}
                    className="flex items-center gap-1 transition hover:text-blue-600"
                  >
                    <Mail className="h-4 w-4 text-blue-400" />
                    {company.email}
                  </a>
                )}
                {company.website && (
                  <a
                    href={company.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 transition hover:text-blue-600"
                  >
                    <Globe className="h-4 w-4 text-purple-400" />
                    Website
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Quick Action Buttons — below header like LinkedIn */}
          {data.isAdmin && (
            <div className="mt-4 flex flex-wrap gap-2 pl-0 md:pl-[196px]">
              <Link href="/trades/company/edit">
                <Button variant="outline" size="sm">
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Company
                </Button>
              </Link>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (seats && seats.availableSeats <= 0) {
                    setShowUpgradeModal(true);
                  } else {
                    setShowInviteModal(true);
                  }
                }}
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Invite Team
              </Button>
              <Link href="/trades/company/employees">
                <Button variant="outline" size="sm">
                  <Users className="mr-2 h-4 w-4" />
                  Manage Team
                </Button>
              </Link>
            </div>
          )}
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* ───────── Main Content Column (2/3) ───────── */}
          <div className="md:col-span-2">
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="mb-6 w-full justify-start">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="details">Details & Contact</TabsTrigger>
                <TabsTrigger value="credentials">Credentials</TabsTrigger>
                <TabsTrigger value="social">Social & More</TabsTrigger>
              </TabsList>

              {/* ── Tab: Overview ── */}
              <TabsContent value="overview" className="space-y-6">
                {/* About Section */}
                {(ms.aboutCompany || company.description) && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <FileText className="h-5 w-5 text-blue-600" />
                        About
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="whitespace-pre-line leading-relaxed text-gray-700">
                        {ms.aboutCompany || company.description}
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* Specialties */}
                {company.specialties && company.specialties.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Award className="h-5 w-5 text-amber-500" />
                        Specialties
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {company.specialties.map((s) => (
                          <Badge
                            key={s}
                            variant="secondary"
                            className="bg-amber-100 text-amber-800"
                          >
                            {s}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Business Details — Enhanced Google Business card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Building2 className="h-5 w-5 text-indigo-600" />
                      Business Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-5 sm:grid-cols-2">
                      {company.yearsInBusiness && (
                        <div className="flex items-start gap-3">
                          <Calendar className="mt-0.5 h-5 w-5 text-slate-400" />
                          <div>
                            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                              Years in Business
                            </p>
                            <p className="font-semibold text-slate-900">
                              {company.yearsInBusiness} years
                            </p>
                          </div>
                        </div>
                      )}
                      {ms.foundedYear && (
                        <div className="flex items-start gap-3">
                          <Calendar className="mt-0.5 h-5 w-5 text-slate-400" />
                          <div>
                            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                              Founded
                            </p>
                            <p className="font-semibold text-slate-900">{ms.foundedYear}</p>
                          </div>
                        </div>
                      )}
                      {ms.teamSize && (
                        <div className="flex items-start gap-3">
                          <Users className="mt-0.5 h-5 w-5 text-slate-400" />
                          <div>
                            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                              Team Size
                            </p>
                            <p className="font-semibold text-slate-900">{ms.teamSize}</p>
                          </div>
                        </div>
                      )}
                      {company.licenseNumber && (
                        <div className="flex items-start gap-3">
                          <ShieldCheck className="mt-0.5 h-5 w-5 text-slate-400" />
                          <div>
                            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                              License Number
                            </p>
                            <p className="font-semibold text-slate-900">{company.licenseNumber}</p>
                          </div>
                        </div>
                      )}
                      {ms.rocNumber && (
                        <div className="flex items-start gap-3">
                          <FileText className="mt-0.5 h-5 w-5 text-slate-400" />
                          <div>
                            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                              ROC Number
                            </p>
                            <p className="font-semibold text-slate-900">{ms.rocNumber}</p>
                          </div>
                        </div>
                      )}
                      {ms.insuranceProvider && (
                        <div className="flex items-start gap-3">
                          <Shield className="mt-0.5 h-5 w-5 text-slate-400" />
                          <div>
                            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                              Insurance
                            </p>
                            <p className="font-semibold text-slate-900">{ms.insuranceProvider}</p>
                          </div>
                        </div>
                      )}
                      {company.website && (
                        <div className="flex items-start gap-3">
                          <Globe className="mt-0.5 h-5 w-5 text-slate-400" />
                          <div>
                            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                              Website
                            </p>
                            <a
                              href={company.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 font-semibold text-blue-600 hover:underline"
                            >
                              {company.website.replace(/^https?:\/\//, "")}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Feature badges row */}
                    <div className="mt-5 flex flex-wrap gap-3">
                      {ms.emergencyAvailable && (
                        <Badge className="bg-red-100 text-red-700">
                          <PhoneCall className="mr-1 h-3 w-3" />
                          24/7 Emergency
                        </Badge>
                      )}
                      {ms.freeEstimates && (
                        <Badge className="bg-green-100 text-green-700">
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                          Free Estimates
                        </Badge>
                      )}
                      {company.verified && (
                        <Badge className="bg-blue-100 text-blue-700">
                          <Shield className="mr-1 h-3 w-3" />
                          Verified Business
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ── Tab: Details & Contact ── */}
              <TabsContent value="details" className="space-y-6">
                {/* Contact Information */}
                {(company.phone ||
                  ms.officePhone ||
                  ms.mobilePhone ||
                  company.email ||
                  fullAddress) && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Phone className="h-5 w-5 text-green-600" />
                        Contact Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {(company.phone || ms.officePhone) && (
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                            <Phone className="h-5 w-5 text-green-600" />
                          </div>
                          <div>
                            <p className="text-xs font-medium text-slate-400">Office Phone</p>
                            <a
                              href={`tel:${company.phone || ms.officePhone}`}
                              className="font-semibold text-slate-900 transition hover:text-blue-600"
                            >
                              {company.phone || ms.officePhone}
                            </a>
                          </div>
                        </div>
                      )}
                      {ms.mobilePhone && (
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                            <Smartphone className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="text-xs font-medium text-slate-400">Mobile</p>
                            <a
                              href={`tel:${ms.mobilePhone}`}
                              className="font-semibold text-slate-900 transition hover:text-blue-600"
                            >
                              {ms.mobilePhone}
                            </a>
                          </div>
                        </div>
                      )}
                      {company.email && (
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100">
                            <Mail className="h-5 w-5 text-purple-600" />
                          </div>
                          <div>
                            <p className="text-xs font-medium text-slate-400">Email</p>
                            <a
                              href={`mailto:${company.email}`}
                              className="font-semibold text-slate-900 transition hover:text-blue-600"
                            >
                              {company.email}
                            </a>
                          </div>
                        </div>
                      )}
                      {fullAddress && (
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                            <MapPin className="h-5 w-5 text-red-500" />
                          </div>
                          <div>
                            <p className="text-xs font-medium text-slate-400">Address</p>
                            <p className="font-semibold text-slate-900">{fullAddress}</p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Hours of Operation */}
                {Object.keys(hours).length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Clock className="h-5 w-5 text-amber-600" />
                        Hours of Operation
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="divide-y divide-slate-100">
                        {dayOrder
                          .filter((d) => hours[d])
                          .map((d) => {
                            const display = formatHours(hours[d]);
                            if (!display) return null;
                            return (
                              <div
                                key={d}
                                className="flex items-center justify-between py-2.5 text-sm"
                              >
                                <span className="font-medium text-slate-700">
                                  {dayLabels[d] || d}
                                </span>
                                <span
                                  className={
                                    display === "Closed"
                                      ? "italic text-slate-400"
                                      : "text-slate-600"
                                  }
                                >
                                  {display}
                                </span>
                              </div>
                            );
                          })}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* ── Tab: Credentials ── */}
              <TabsContent value="credentials" className="space-y-6">
                {/* Warranty Info */}
                {ms.warrantyInfo && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <ShieldCheck className="h-5 w-5 text-green-600" />
                        Warranty Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="whitespace-pre-line text-gray-700 dark:text-gray-300">
                        {ms.warrantyInfo}
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* Credentials Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <ShieldCheck className="h-5 w-5 text-blue-600" />
                      Credentials &amp; Compliance
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 sm:grid-cols-2">
                      {company.licenseNumber && (
                        <div className="flex items-start gap-3 rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                          <ShieldCheck className="mt-0.5 h-5 w-5 text-green-500" />
                          <div>
                            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                              License
                            </p>
                            <p className="font-semibold text-slate-900 dark:text-slate-100">
                              {company.licenseNumber}
                            </p>
                          </div>
                        </div>
                      )}
                      {ms.rocNumber && (
                        <div className="flex items-start gap-3 rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                          <FileText className="mt-0.5 h-5 w-5 text-blue-500" />
                          <div>
                            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                              ROC Number
                            </p>
                            <p className="font-semibold text-slate-900 dark:text-slate-100">
                              {ms.rocNumber}
                            </p>
                          </div>
                        </div>
                      )}
                      {ms.insuranceProvider && (
                        <div className="flex items-start gap-3 rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                          <Shield className="mt-0.5 h-5 w-5 text-indigo-500" />
                          <div>
                            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                              Insurance
                            </p>
                            <p className="font-semibold text-slate-900 dark:text-slate-100">
                              {ms.insuranceProvider}
                            </p>
                          </div>
                        </div>
                      )}
                      {company.verified && (
                        <div className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50/50 p-3 dark:border-green-900 dark:bg-green-950/20">
                          <CheckCircle2 className="mt-0.5 h-5 w-5 text-green-600" />
                          <div>
                            <p className="text-xs font-medium uppercase tracking-wider text-green-600">
                              Verified
                            </p>
                            <p className="font-semibold text-green-700 dark:text-green-400">
                              Business Verified ✓
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                    {!company.licenseNumber &&
                      !ms.rocNumber &&
                      !ms.insuranceProvider &&
                      !company.verified && (
                        <p className="text-sm text-slate-500">
                          No credentials added yet.{" "}
                          {data.isAdmin && (
                            <Link
                              href="/trades/company/edit"
                              className="text-blue-500 hover:underline"
                            >
                              Add credentials →
                            </Link>
                          )}
                        </p>
                      )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ── Tab: Social & More ── */}
              <TabsContent value="social" className="space-y-6">
                {/* Payment Methods & Languages */}
                {((ms.paymentMethods && ms.paymentMethods.length > 0) ||
                  (ms.languages && ms.languages.length > 0)) && (
                  <div className="grid gap-6 sm:grid-cols-2">
                    {ms.paymentMethods && ms.paymentMethods.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2 text-lg">
                            <CreditCard className="h-5 w-5 text-indigo-500" />
                            Payment Methods
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex flex-wrap gap-2">
                            {ms.paymentMethods.map((pm) => (
                              <Badge key={pm} variant="outline">
                                <Banknote className="mr-1 h-3 w-3" />
                                {pm}
                              </Badge>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                    {ms.languages && ms.languages.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2 text-lg">
                            <Globe2 className="h-5 w-5 text-teal-500" />
                            Languages Spoken
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex flex-wrap gap-2">
                            {ms.languages.map((lang) => (
                              <Badge key={lang} variant="secondary">
                                {lang}
                              </Badge>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}

                {/* Social Links */}
                {Object.keys(socials).filter((k) => socials[k]).length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Globe className="h-5 w-5 text-blue-500" />
                        Social Media
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-3">
                        {Object.entries(socials)
                          .filter(([, url]) => url)
                          .map(([platform, url]) => (
                            <a
                              key={platform}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 dark:border-slate-700"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                              {platform.charAt(0).toUpperCase() + platform.slice(1)}
                            </a>
                          ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </div>

          {/* ───────── Sidebar Column (1/3) ───────── */}
          <div className="space-y-6">
            {/* Join Requests Notification */}
            {data.isAdmin && joinRequests.length > 0 && (
              <Card className="border-amber-200 bg-amber-50/50">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <UserPlus className="h-5 w-5 text-amber-600" />
                    Join Requests
                    <Badge variant="destructive" className="ml-auto">
                      {joinRequests.length}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {joinRequests.slice(0, 5).map((req) => (
                    <div key={req.id} className="rounded-lg border border-amber-200 bg-white p-3">
                      <div className="mb-2 flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-sm font-bold text-amber-700">
                          {(req.firstName?.[0] || "") + (req.lastName?.[0] || "")}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-gray-900">
                            {req.firstName} {req.lastName}
                          </p>
                          <p className="truncate text-xs text-gray-500">
                            {req.jobTitle || req.email}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="flex-1 bg-blue-600 hover:bg-blue-700"
                          onClick={() => handleJoinRequest(req.id, "approve")}
                          disabled={processingRequest === req.id}
                        >
                          {processingRequest === req.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <CheckCircle2 className="mr-1 h-3 w-3" />
                          )}
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 text-red-600 hover:bg-red-50"
                          onClick={() => handleJoinRequest(req.id, "reject")}
                          disabled={processingRequest === req.id}
                        >
                          <XCircle className="mr-1 h-3 w-3" />
                          Decline
                        </Button>
                      </div>
                    </div>
                  ))}
                  {joinRequests.length > 5 && (
                    <Link href="/trades/company/invite">
                      <Button variant="ghost" size="sm" className="w-full">
                        View all {joinRequests.length} requests
                      </Button>
                    </Link>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Team Section */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Team</CardTitle>
                {data.isAdmin && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (seats && seats.availableSeats <= 0) {
                        setShowUpgradeModal(true);
                      } else {
                        setShowInviteModal(true);
                      }
                    }}
                  >
                    <Plus className="mr-1 h-4 w-4" />
                    Invite
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {/* Seats Progress */}
                {seats && (
                  <div className="mb-4 rounded-lg bg-gray-50 p-3">
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="text-gray-600">Team Seats</span>
                      <span className="font-medium">
                        {seats.usedSeats} / {seats.totalSeats}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-gray-200">
                      <div
                        className={`h-full transition-all ${
                          seats.availableSeats <= 0
                            ? "bg-red-500"
                            : seats.availableSeats <= 1
                              ? "bg-amber-500"
                              : "bg-green-500"
                        }`}
                        {...{
                          style: {
                            width: `${Math.min((seats.usedSeats / seats.totalSeats) * 100, 100)}%`,
                          },
                        }}
                      />
                    </div>
                    {seats.pendingInvites > 0 && (
                      <p className="mt-2 flex items-center gap-1 text-xs text-amber-600">
                        <Clock className="h-3 w-3" />
                        {seats.pendingInvites} pending invite
                        {seats.pendingInvites !== 1 ? "s" : ""}
                      </p>
                    )}
                  </div>
                )}

                {/* Team Members - Adaptive layout based on team size */}
                {data.members.length <= 3 ? (
                  // Small team (Solo plan): Card layout
                  <div className="space-y-3">
                    {data.members.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700"
                      >
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={member.avatar || undefined} />
                          <AvatarFallback className="bg-blue-100 text-blue-700">
                            {(member.firstName?.[0] || "") + (member.lastName?.[0] || "")}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="font-medium">
                            {member.firstName} {member.lastName}
                          </p>
                          <p className="text-xs capitalize text-gray-500">{member.role}</p>
                        </div>
                        {member.isAdmin && (
                          <Badge variant="secondary" className="text-xs">
                            Admin
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                ) : data.members.length <= 10 ? (
                  // Medium team (Business plan): Compact cards
                  <div className="grid grid-cols-2 gap-2">
                    {data.members.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-2 dark:border-slate-700"
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={member.avatar || undefined} />
                          <AvatarFallback className="bg-blue-100 text-xs text-blue-700">
                            {(member.firstName?.[0] || "") + (member.lastName?.[0] || "")}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {member.firstName} {member.lastName?.charAt(0)}.
                          </p>
                          {member.isAdmin && <p className="text-xs text-blue-600">Admin</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  // Large team (Enterprise): Condensed list
                  <div className="space-y-1">
                    {data.members.slice(0, 15).map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center gap-2 rounded px-2 py-1.5 hover:bg-gray-50"
                      >
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={member.avatar || undefined} />
                          <AvatarFallback className="bg-blue-100 text-xs text-blue-700">
                            {member.firstName?.[0] || ""}
                          </AvatarFallback>
                        </Avatar>
                        <span className="flex-1 truncate text-sm">
                          {member.firstName} {member.lastName?.charAt(0)}.
                        </span>
                        {member.isAdmin && <span className="text-xs text-blue-600">Admin</span>}
                      </div>
                    ))}
                    {data.members.length > 15 && (
                      <p className="py-2 text-center text-xs text-gray-500">
                        +{data.members.length - 15} more team members
                      </p>
                    )}
                  </div>
                )}

                {data.isAdmin && data.members.length > 0 && (
                  <Link href="/trades/company/employees">
                    <Button variant="ghost" className="mt-4 w-full" size="sm">
                      Manage Team
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Upgrade Modal */}
      <UpgradeModal
        open={showUpgradeModal}
        onOpenChange={setShowUpgradeModal}
        reason="seat_limit_reached"
        seatInfo={
          seats
            ? {
                used: seats.usedSeats,
                limit: seats.totalSeats,
                currentPlan: seats.currentPlan,
              }
            : undefined
        }
      />

      {/* Invite Modal */}
      <Dialog open={showInviteModal} onOpenChange={setShowInviteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
            <DialogDescription>
              Send an invite to add a new member to your company.
              {seats && (
                <span className="mt-1 block text-blue-600">
                  {seats.availableSeats} seat{seats.availableSeats !== 1 ? "s" : ""} available
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="teammate@company.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="role">Role</Label>
              <select
                id="role"
                title="Select role for team member"
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="w-full rounded-md border border-gray-300 p-2"
              >
                <option value="member">Team Member</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInviteModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleInvite} disabled={inviting || !inviteEmail.trim()}>
              {inviting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Send Invite
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
