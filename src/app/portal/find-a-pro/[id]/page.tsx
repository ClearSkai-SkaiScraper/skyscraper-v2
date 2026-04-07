"use client";

/**
 * Pro Profile Detail Page
 * Shows detailed view of a contractor's profile
 */

import { useUser } from "@clerk/nextjs";
import {
  Award,
  Briefcase,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  Loader2,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Shield,
  ShieldCheck,
  Star,
  UserPlus,
  Verified,
} from "lucide-react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

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
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { logger } from "@/lib/logger";

interface Pro {
  id: string;
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
  email?: string | null;
  website?: string | null;
  portfolioImages?: string[];
  emergencyAvailable?: boolean;
  freeEstimates?: boolean;
  responseTime?: string | null;
}

export default function ProProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useUser();
  const proId = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const [pro, setPro] = useState<Pro | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<"none" | "pending" | "connected">(
    "none"
  );
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);

  useEffect(() => {
    if (proId) {
      void fetchProProfile();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proId]);

  // Check connection status after pro is loaded
  useEffect(() => {
    if (pro) {
      void checkConnectionStatus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pro]);

  async function fetchProProfile() {
    try {
      const res = await fetch(`/api/portal/find-pro?proId=${proId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.pros && data.pros.length > 0) {
          setPro(data.pros[0]);
        }
      }
    } catch (err) {
      logger.error("Failed to fetch profile:", err);
      toast.error("Failed to load profile");
    } finally {
      setLoading(false);
    }
  }

  async function checkConnectionStatus() {
    try {
      const res = await fetch("/api/portal/connections");
      if (res.ok) {
        const data = await res.json();
        // Check by company ID since connections store company IDs
        // Also check by member ID or pro name as fallback
        const connection = data.connections?.find((c: any) => {
          // c.id is the TradesCompany ID from connections API
          const companyIdMatch = pro?.companyId && c.id === pro.companyId;
          const proIdMatch = c.id === proId;
          const nameMatch = c.name && pro?.companyName && c.name === pro.companyName;
          return companyIdMatch || proIdMatch || nameMatch;
        });
        if (connection) {
          const status = connection.connectionStatus?.toLowerCase();
          if (status === "accepted" || status === "connected") {
            setConnectionStatus("connected");
          } else if (status === "pending") {
            setConnectionStatus("pending");
          }
        }
      }
    } catch (err) {
      logger.error("Failed to check connection status:", err);
    }
  }

  async function handleConnect() {
    if (!pro) return;

    setConnecting(true);
    try {
      const res = await fetch("/api/portal/connect-pro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proId: pro.id }),
      });

      if (!res.ok) throw new Error("Failed to connect");

      setConnectionStatus("pending");
      toast.success("Connection request sent! 🎉");
    } catch (err) {
      toast.error("Failed to send connection request");
    } finally {
      setConnecting(false);
    }
  }

  async function handleSendMessage() {
    if (!pro || !messageText.trim()) {
      toast.error("Please enter a message");
      return;
    }

    setSendingMessage(true);
    try {
      const res = await fetch("/api/portal/messages/create-thread", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contractorId: pro.id,
          subject: `Inquiry about ${pro.tradeType || "services"}`,
          initialMessage: messageText,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send message");

      toast.success("Message sent successfully!");
      setShowMessageModal(false);
      setMessageText("");
      router.push(`/portal/messages/${data.threadId}`);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Failed to send message";
      toast.error(errMsg);
    } finally {
      setSendingMessage(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl space-y-6 p-6">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!pro) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-6">
        <div className="text-center">
          <h2 className="mb-2 text-2xl font-bold">Profile Not Found</h2>
          <p className="mb-6 text-slate-500">
            This contractor profile doesn&apos;t exist or has been removed.
          </p>
          <Button onClick={() => router.push("/portal/find-a-pro")}>Back to Find a Pro</Button>
        </div>
      </div>
    );
  }

  const initials =
    (pro.companyName || pro.name)
      ?.split(" ")
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "PR";

  const location = [pro.city, pro.state].filter(Boolean).join(", ");
  const displayName = pro.name || pro.companyName || "Pro";
  const subtitle = pro.companyName ? `${pro.companyName} • ${pro.tradeType}` : pro.tradeType;

  const yearsInBusiness =
    pro.yearsExperience || (pro.foundedYear ? new Date().getFullYear() - pro.foundedYear : null);

  // Validate cover photo URL
  const coverPhotoUrl =
    pro.coverPhoto &&
    (pro.coverPhoto.startsWith("http") ||
      pro.coverPhoto.startsWith("/") ||
      pro.coverPhoto.includes("supabase"))
      ? pro.coverPhoto
      : null;

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      {/* Back Button */}
      <Button variant="ghost" onClick={() => router.back()} className="mb-4">
        ← Back
      </Button>

      {/* Cover Photo */}
      <Card className="overflow-hidden border-0 shadow-xl">
        <div className="relative h-56 w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-700 sm:h-72">
          {coverPhotoUrl && (
            <Image
              src={coverPhotoUrl}
              alt="Cover"
              fill
              className="object-cover"
              priority
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        </div>

        <CardContent className="relative px-6 pb-8 pt-0">
          {/* Avatar + Header */}
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end">
            {/* Avatar positioned to overlap cover */}
            <div className="-mt-16 sm:-mt-20">
              {pro.avatar &&
              (pro.avatar.startsWith("http") ||
                pro.avatar.startsWith("/") ||
                pro.avatar.includes("supabase")) ? (
                <div className="h-28 w-28 overflow-hidden rounded-full bg-gradient-to-br from-blue-500 to-purple-600 shadow-2xl sm:h-36 sm:w-36">
                  <Image
                    src={pro.avatar}
                    alt={displayName}
                    width={144}
                    height={144}
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                </div>
              ) : (
                <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-blue-500 to-purple-600 shadow-2xl sm:h-36 sm:w-36">
                  <span className="text-2xl font-bold text-white sm:text-3xl">{initials}</span>
                </div>
              )}
            </div>

            <div className="flex-1 pb-2">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">{displayName}</h1>
                {pro.isVerified && <Verified className="h-6 w-6 text-blue-500" />}
              </div>
              <p className="text-base text-slate-600 sm:text-lg">{subtitle}</p>
              {pro.tagline && (
                <p className="mt-2 text-sm italic text-slate-500 sm:text-base">{pro.tagline}</p>
              )}

              {/* Stats */}
              <div className="mt-4 flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-1.5">
                  <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
                  <span className="font-bold">{pro.rating?.toFixed(1) || "5.0"}</span>
                  <span className="text-slate-500">({pro.reviewCount || 0} reviews)</span>
                </div>
                {yearsInBusiness && (
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <Calendar className="h-4 w-4" />
                    {yearsInBusiness} years in business
                  </div>
                )}
                {location && (
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <MapPin className="h-4 w-4" />
                    {location}
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pb-2 sm:flex-col">
              <Button
                size="lg"
                onClick={handleConnect}
                disabled={
                  connecting || connectionStatus === "connected" || connectionStatus === "pending"
                }
                className={
                  connectionStatus === "connected"
                    ? "border-green-500 bg-green-500 text-white hover:bg-green-600"
                    : connectionStatus === "pending"
                      ? "border-amber-500 bg-amber-500 text-white hover:bg-amber-600"
                      : "bg-blue-600 hover:bg-blue-700"
                }
              >
                {connecting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : connectionStatus === "connected" ? (
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                ) : connectionStatus === "pending" ? (
                  <Clock className="mr-2 h-4 w-4" />
                ) : (
                  <UserPlus className="mr-2 h-4 w-4" />
                )}
                {connectionStatus === "connected"
                  ? "Connected"
                  : connectionStatus === "pending"
                    ? "Pending"
                    : "Connect"}
              </Button>
              <Button size="lg" variant="outline" onClick={() => setShowMessageModal(true)}>
                <MessageCircle className="mr-2 h-4 w-4" />
                Message
              </Button>
              <Button size="lg" variant="outline" disabled title="Coming soon">
                <Briefcase className="mr-2 h-4 w-4" />
                Invite to Job
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Main Info */}
        <div className="space-y-6 lg:col-span-2">
          {/* About */}
          {pro.bio && (
            <Card>
              <CardHeader>
                <CardTitle>About</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-slate-600">{pro.bio}</p>
              </CardContent>
            </Card>
          )}

          {/* Portfolio */}
          {pro.portfolioImages && pro.portfolioImages.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Portfolio</CardTitle>
                <CardDescription>Recent work</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                  {pro.portfolioImages.slice(0, 6).map((img, idx) => (
                    <div key={idx} className="relative aspect-square overflow-hidden rounded-lg">
                      <Image src={img} alt={`Portfolio ${idx + 1}`} fill className="object-cover" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Details */}
        <div className="space-y-6">
          {/* Trust Badges */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Credentials</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {pro.isLicensed && (
                <div className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-green-600" />
                  <span className="font-medium">Licensed</span>
                </div>
              )}
              {pro.isBonded && (
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-blue-600" />
                  <span className="font-medium">Bonded</span>
                </div>
              )}
              {pro.isInsured && (
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-purple-600" />
                  <span className="font-medium">Insured</span>
                </div>
              )}
              {pro.rocNumber && <div className="text-sm text-slate-500">ROC #{pro.rocNumber}</div>}
            </CardContent>
          </Card>

          {/* Contact */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contact</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {pro.phone && (
                <a
                  href={`tel:${pro.phone}`}
                  className="flex items-center gap-2 text-blue-600 hover:underline"
                >
                  <Phone className="h-4 w-4" />
                  {pro.phone}
                </a>
              )}
              {pro.email && (
                <a
                  href={`mailto:${pro.email}`}
                  className="flex items-center gap-2 text-blue-600 hover:underline"
                >
                  <Mail className="h-4 w-4" />
                  {pro.email}
                </a>
              )}
              {pro.website && (
                <a
                  href={pro.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-blue-600 hover:underline"
                >
                  <ExternalLink className="h-4 w-4" />
                  Visit Website
                </a>
              )}
            </CardContent>
          </Card>

          {/* Additional Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Additional Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {pro.teamSize && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Team Size</span>
                  <span className="font-medium">{pro.teamSize}</span>
                </div>
              )}
              {pro.responseTime && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Response Time</span>
                  <span className="font-medium">{pro.responseTime}</span>
                </div>
              )}
              {pro.emergencyAvailable && (
                <div className="flex items-center gap-2 text-red-600">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="font-medium">Emergency Service Available</span>
                </div>
              )}
              {pro.freeEstimates && (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="font-medium">Free Estimates</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

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
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            placeholder="Describe your project and what you need help with..."
            rows={5}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMessageModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSendMessage} disabled={sendingMessage || !messageText.trim()}>
              {sendingMessage ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Send Message
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
