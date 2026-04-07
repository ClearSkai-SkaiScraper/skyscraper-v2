"use client";

import { useAuth } from "@clerk/nextjs";
import {
  Briefcase,
  CheckCircle2,
  Clock,
  Heart,
  Mail,
  MapPin,
  Phone,
  Share2,
  Star,
  Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import PortalPageHero from "@/components/portal/portal-page-hero";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { logger } from "@/lib/logger";

interface Pro {
  id: string;
  name: string;
  logo?: string;
  coverPhoto?: string;
  specialties?: string[];
  location?: string;
  rating?: number;
  reviewCount?: number;
  verified?: boolean;
  phoneNumber?: string;
  email?: string;
  connectionStatus?: string;
  savedAt?: string;
  connectedAt?: string;
}

/**
 * My Pros Page - Client Portal
 * Manage saved and connected contractors
 */
export default function MyProsPage() {
  const { userId } = useAuth();
  const [savedPros, setSavedPros] = useState<Pro[]>([]);
  const [connectedPros, setConnectedPros] = useState<Pro[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetchPros();
  }, []);

  const fetchPros = async () => {
    try {
      // Fetch saved pros
      const savedRes = await fetch("/api/portal/saved-pros");
      if (savedRes.ok) {
        const savedData = await savedRes.json();
        setSavedPros(savedData.pros || []);
      }

      // Fetch connected pros
      const connectedRes = await fetch("/api/portal/connections");
      if (connectedRes.ok) {
        const connectedData = await connectedRes.json();
        setConnectedPros(connectedData.connections || []);
      }
    } catch (error) {
      logger.error("Failed to fetch pros:", error);
      toast.error("Failed to load your professionals");
    } finally {
      setLoading(false);
    }
  };

  const handleUnsave = async (proId: string) => {
    try {
      const res = await fetch("/api/portal/save-pro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId: proId, save: false }),
      });

      if (res.ok) {
        setSavedPros(savedPros.filter((p) => p.id !== proId));
        toast.success("Removed from saved");
      }
    } catch (error) {
      logger.error("Failed to unsave pro:", error);
      toast.error("Failed to remove from saved");
    }
  };

  const handleConnect = async (proId: string) => {
    try {
      const res = await fetch("/api/portal/connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId: proId }),
      });

      if (res.ok) {
        toast.success("Connection request sent!");
        void fetchPros(); // Refresh lists
      }
    } catch (error) {
      logger.error("Failed to connect:", error);
      toast.error("Failed to send connection request");
    }
  };

  const handleMessage = async (proId: string) => {
    try {
      const res = await fetch("/api/portal/messages/create-thread", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contractorId: proId }),
      });

      if (res.ok) {
        const data = await res.json();
        window.location.href = `/portal/messages?thread=${data.threadId}`;
      }
    } catch (error) {
      logger.error("Failed to create thread:", error);
      toast.error("Failed to start conversation");
    }
  };

  const handleShare = async (pro: Pro) => {
    const shareUrl = `${window.location.origin}/portal/find-a-pro?proId=${pro.id}`;
    const shareText = `Check out ${pro.name} on SkaiScraper! Great contractor I've worked with.`;

    // Try native share first (mobile)
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Recommend ${pro.name}`,
          text: shareText,
          url: shareUrl,
        });
        toast.success("Shared successfully!");
      } catch (error) {
        // User cancelled or share failed - try clipboard
        await copyToClipboard(shareUrl);
      }
    } else {
      // Desktop fallback - copy link
      await copyToClipboard(shareUrl);
    }
  };

  const copyToClipboard = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Share link copied! Send to friends & family 🎉");
    } catch {
      toast.error("Failed to copy link");
    }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-purple-600 border-t-transparent" />
          <p className="text-slate-500">Loading your professionals...</p>
        </div>
      </div>
    );
  }

  const ProCard = ({ pro, onUnsave, onConnect, onMessage, onShare, isSaved }: any) => (
    <Card className="group overflow-hidden transition-all hover:shadow-xl">
      {/* Cover Photo */}
      <div className="relative h-32 bg-gradient-to-br from-purple-500 to-indigo-600">
        {pro.coverPhoto && (
          <Image src={pro.coverPhoto} alt={`${pro.name} cover`} fill className="object-cover" />
        )}
        {/* Share button on cover */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onShare(pro)}
          className="absolute right-2 top-2 bg-white/20 text-white backdrop-blur-sm hover:bg-white/40"
          title="Share this pro to friends & family"
        >
          <Share2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="relative -mt-12 p-6">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          {pro.logo && (pro.logo.startsWith("http") || pro.logo.startsWith("/")) ? (
            <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 shadow-xl">
              <Image
                src={pro.logo}
                alt={pro.name}
                width={80}
                height={80}
                className="h-full w-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            </div>
          ) : (
            <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 shadow-xl">
              <span className="text-2xl font-bold text-white">{pro.name[0]}</span>
            </div>
          )}

          <div className="flex-1">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">{pro.name}</h3>
                  {pro.verified && <CheckCircle2 className="h-5 w-5 text-blue-500" />}
                </div>
                {pro.specialties && pro.specialties.length > 0 && (
                  <p className="text-sm text-slate-600 dark:text-slate-400">{pro.specialties[0]}</p>
                )}
              </div>

              {isSaved && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onUnsave(pro.id)}
                  className="text-pink-500 hover:bg-pink-50 hover:text-pink-600"
                >
                  <Heart className="h-5 w-5 fill-current" />
                </Button>
              )}
            </div>

            {/* Rating & Location */}
            <div className="mt-2 flex items-center gap-4 text-sm">
              {pro.rating && (
                <div className="flex items-center gap-1 text-amber-500">
                  <Star className="h-4 w-4 fill-current" />
                  <span className="font-medium">{pro.rating}</span>
                  {pro.reviewCount && <span className="text-slate-500">({pro.reviewCount})</span>}
                </div>
              )}
              {pro.location && (
                <div className="flex items-center gap-1 text-slate-600">
                  <MapPin className="h-4 w-4" />
                  <span>{pro.location}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Connection Status */}
        {pro.connectionStatus && (
          <div className="mt-4">
            {pro.connectionStatus === "connected" && (
              <Badge className="bg-green-100 text-green-700">
                <Users className="mr-1 h-3 w-3" />
                Connected
              </Badge>
            )}
            {pro.connectionStatus === "pending" && (
              <Badge variant="outline" className="border-amber-300 text-amber-700">
                <Clock className="mr-1 h-3 w-3" />
                Pending
              </Badge>
            )}
          </div>
        )}

        {/* Contact Info */}
        <div className="mt-4 space-y-2 text-sm">
          {pro.phoneNumber && (
            <div className="flex items-center gap-2 text-slate-600">
              <Phone className="h-4 w-4" />
              <a href={`tel:${pro.phoneNumber}`} className="hover:text-purple-600">
                {pro.phoneNumber}
              </a>
            </div>
          )}
          {pro.email && (
            <div className="flex items-center gap-2 text-slate-600">
              <Mail className="h-4 w-4" />
              <a href={`mailto:${pro.email}`} className="hover:text-purple-600">
                {pro.email}
              </a>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="mt-6 flex gap-2">
          <Button asChild variant="outline" size="sm" className="flex-1">
            <Link href={`/portal/profiles/${pro.slug || pro.id}`}>View Profile</Link>
          </Button>

          {pro.connectionStatus === "connected" ? (
            <Button
              onClick={() => onMessage(pro.id)}
              size="sm"
              className="flex-1 bg-purple-600 hover:bg-purple-700"
            >
              <Mail className="mr-2 h-4 w-4" />
              Message
            </Button>
          ) : (
            <Button
              onClick={() => onConnect(pro.id)}
              size="sm"
              className="flex-1 bg-purple-600 hover:bg-purple-700"
              disabled={pro.connectionStatus === "pending"}
            >
              {pro.connectionStatus === "pending" ? "Request Sent" : "Connect"}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <PortalPageHero
        title="My Pros"
        subtitle="Manage your saved contractors and professional connections. Stay organized and keep track of the trades you trust."
        icon={Briefcase}
        badge="Your Network"
        gradient="purple"
        stats={[
          { label: "Connected", value: connectedPros.length },
          { label: "Saved", value: savedPros.length },
          { label: "Verified", value: connectedPros.filter((p) => p.verified).length },
          { label: "Network", value: "👥" },
        ]}
      />

      {/* Content */}
      <Tabs defaultValue="connected" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="connected">Connected ({connectedPros.length})</TabsTrigger>
          <TabsTrigger value="saved">Saved ({savedPros.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="connected" className="mt-6">
          {connectedPros.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-sm dark:border-slate-700 dark:bg-slate-800/50">
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-purple-100 to-indigo-100 dark:from-purple-900/30 dark:to-indigo-900/30">
                <Users className="h-10 w-10 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="mb-3 text-2xl font-bold text-slate-900 dark:text-white">
                No Connections Yet
              </h3>
              <p className="mb-6 text-slate-600 dark:text-slate-400">
                Start building your professional network by connecting with contractors.
              </p>
              <Button asChild size="lg" className="bg-purple-600 hover:bg-purple-700">
                <Link href="/portal/find-a-pro">Find Contractors</Link>
              </Button>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {connectedPros.map((pro) => (
                <ProCard
                  key={pro.id}
                  pro={pro}
                  onConnect={handleConnect}
                  onMessage={handleMessage}
                  onShare={handleShare}
                  isSaved={false}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="saved" className="mt-6">
          {savedPros.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-sm dark:border-slate-700 dark:bg-slate-800/50">
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-pink-100 to-purple-100 dark:from-pink-900/30 dark:to-purple-900/30">
                <Heart className="h-10 w-10 text-pink-500 dark:text-pink-400" />
              </div>
              <h3 className="mb-3 text-2xl font-bold text-slate-900 dark:text-white">
                No Saved Pros Yet
              </h3>
              <p className="mb-6 text-slate-600 dark:text-slate-400">
                Save contractors you&apos;re interested in to easily find them later.
              </p>
              <Button asChild size="lg" className="bg-purple-600 hover:bg-purple-700">
                <Link href="/portal/find-a-pro">Browse Contractors</Link>
              </Button>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {savedPros.map((pro) => (
                <ProCard
                  key={pro.id}
                  pro={pro}
                  onUnsave={handleUnsave}
                  onConnect={handleConnect}
                  onMessage={handleMessage}
                  onShare={handleShare}
                  isSaved={true}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
