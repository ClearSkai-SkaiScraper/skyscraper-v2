"use client";

import {
  AlertTriangle,
  ArrowLeft,
  BadgeCheck,
  Ban,
  Briefcase,
  ExternalLink,
  Globe,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Shield,
  ShieldCheck,
  Star,
  Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface ContractorProfile {
  id: string;
  name: string | null;
  companyName: string | null;
  logo: string | null;
  coverPhoto: string | null;
  description: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  address: string | null;
  specialties: string[];
  credentials: {
    license: string | null;
    insurance: string | null;
    bondInfo: string | null;
    verified: boolean;
  };
  stats: {
    yearsExperience: number | null;
    projectsCompleted: number;
    avgRating: number | null;
    totalReviews: number;
  };
  team: Array<{
    id: string;
    name: string;
    role: string;
    avatar: string | null;
  }>;
  reviews: Array<{
    id: string;
    rating: number;
    content: string;
    authorName: string;
    createdAt: string;
  }>;
  portfolio: Array<{
    id: string;
    title: string;
    image: string | null;
    category: string;
  }>;
  connection: {
    isConnected: boolean;
    status: string | null;
    connectedAt: string | null;
  };
}

export default function ContractorProfilePage() {
  const params = useParams();
  const router = useRouter();
  const [profile, setProfile] = useState<ContractorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockLoading, setBlockLoading] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportSent, setReportSent] = useState(false);

  const contractorId = params!.id as string;

  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await fetch(`/api/portal/contractor/${contractorId}`);
        if (!res.ok) {
          if (res.status === 404) {
            setError("Contractor not found");
          } else {
            setError("Failed to load profile");
          }
          return;
        }
        const data = await res.json();
        setProfile(data.contractor);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (_err) {
        setError("Failed to load profile");
      } finally {
        setLoading(false);
      }
    }

    if (contractorId) {
      void loadProfile();
    }
  }, [contractorId]);

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl space-y-6 p-6">
        <Skeleton className="h-48 w-full rounded-lg" />
        <div className="flex gap-4">
          <Skeleton className="h-24 w-24 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <Card>
          <CardContent className="py-16 text-center">
            <p className="mb-4 text-lg text-slate-600">{error || "Profile not available"}</p>
            <Button variant="outline" onClick={() => router.back()}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const displayName = profile.companyName || profile.name || "Contractor";

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      {/* Back Button */}
      <Button variant="ghost" size="sm" onClick={() => router.back()}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back
      </Button>

      {/* Cover Photo & Logo */}
      <div className="relative">
        {profile.coverPhoto ? (
          <Image
            src={profile.coverPhoto}
            alt="Cover"
            width={900}
            height={200}
            className="h-48 w-full rounded-lg object-cover"
          />
        ) : (
          <div className="h-48 w-full rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600" />
        )}

        <div className="absolute -bottom-12 left-6">
          <Avatar className="h-24 w-24 border-4 border-transparent shadow-lg">
            <AvatarImage src={profile.logo || undefined} />
            <AvatarFallback className="bg-blue-100 text-2xl text-blue-600">
              {displayName.charAt(0)}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>

      {/* Company Info */}
      <div className="mt-14 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{displayName}</h1>
            {profile.credentials.verified && (
              <Badge className="bg-green-100 text-green-700">
                <BadgeCheck className="mr-1 h-3 w-3" />
                Verified
              </Badge>
            )}
          </div>
          {profile.specialties.length > 0 && (
            <p className="mt-1 text-slate-600">{profile.specialties.join(" • ")}</p>
          )}
          {profile.address && (
            <p className="mt-1 flex items-center gap-1 text-sm text-slate-500">
              <MapPin className="h-4 w-4" />
              {profile.address}
            </p>
          )}
        </div>

        <div className="flex gap-2">
          {profile.phone && (
            <Button variant="outline" asChild>
              <a href={`tel:${profile.phone}`}>
                <Phone className="mr-2 h-4 w-4" />
                Call
              </a>
            </Button>
          )}
          <Button asChild>
            <Link href={`/portal/messages?contractor=${profile.id}`}>
              <MessageCircle className="mr-2 h-4 w-4" />
              Message
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="py-4 text-center">
            <div className="flex items-center justify-center gap-1 text-2xl font-bold text-yellow-500">
              <Star className="h-5 w-5 fill-current" />
              {profile.stats.avgRating?.toFixed(1) || "N/A"}
            </div>
            <p className="text-sm text-slate-500">{profile.stats.totalReviews} reviews</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <div className="text-2xl font-bold text-blue-600">
              {profile.stats.projectsCompleted}
            </div>
            <p className="text-sm text-slate-500">Projects</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <div className="text-2xl font-bold text-green-600">
              {profile.stats.yearsExperience || "N/A"}
            </div>
            <p className="text-sm text-slate-500">Years Exp.</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <div className="text-2xl font-bold text-indigo-600">{profile.team.length}</div>
            <p className="text-sm text-slate-500">Team Members</p>
          </CardContent>
        </Card>
      </div>

      {/* About & Contact */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>About</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600">{profile.description || "No description available."}</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Contact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {profile.phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-slate-400" />
                <a href={`tel:${profile.phone}`} className="text-blue-600 hover:underline">
                  {profile.phone}
                </a>
              </div>
            )}
            {profile.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-slate-400" />
                <a href={`mailto:${profile.email}`} className="text-blue-600 hover:underline">
                  {profile.email}
                </a>
              </div>
            )}
            {profile.website && (
              <div className="flex items-center gap-2 text-sm">
                <Globe className="h-4 w-4 text-slate-400" />
                <a
                  href={profile.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  {profile.website.replace(/^https?:\/\//, "")}
                  <ExternalLink className="ml-1 inline h-3 w-3" />
                </a>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Credentials */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-green-600" />
            Credentials
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-sm text-slate-500">License</p>
              <p className="font-medium">{profile.credentials.license || "Not provided"}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Insurance</p>
              <p className="font-medium">{profile.credentials.insurance || "Not provided"}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Bonding</p>
              <p className="font-medium">{profile.credentials.bondInfo || "Not provided"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Team */}
      {profile.team.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              Team ({profile.team.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {profile.team.map((member) => (
                <div key={member.id} className="flex items-center gap-3 rounded-lg border p-3">
                  <Avatar>
                    <AvatarImage src={member.avatar || undefined} />
                    <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{member.name}</p>
                    <p className="text-sm text-slate-500">{member.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reviews */}
      {profile.reviews.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500" />
              Reviews ({profile.reviews.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {profile.reviews.slice(0, 5).map((review) => (
              <div key={review.id} className="border-b pb-4 last:border-0">
                <div className="flex items-center gap-2">
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`h-4 w-4 ${
                          i < review.rating ? "fill-yellow-400 text-yellow-400" : "text-slate-200"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-sm font-medium">{review.authorName}</span>
                  <span className="text-sm text-slate-400">
                    {new Date(review.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-600">{review.content}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Portfolio */}
      {profile.portfolio.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-indigo-600" />
              Portfolio ({profile.portfolio.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {profile.portfolio.slice(0, 6).map((item) => (
                <div key={item.id} className="overflow-hidden rounded-lg border">
                  {item.image ? (
                    <Image
                      src={item.image}
                      alt={item.title}
                      width={300}
                      height={200}
                      className="h-32 w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-32 w-full items-center justify-center bg-slate-100">
                      <Briefcase className="h-8 w-8 text-slate-300" />
                    </div>
                  )}
                  <div className="p-2">
                    <p className="font-medium">{item.title}</p>
                    <p className="text-sm text-slate-500">{item.category}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Connection Status */}
      {profile.connection.isConnected && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BadgeCheck className="h-5 w-5 text-green-600" />
                <span className="font-medium text-green-700">Connected</span>
                {profile.connection.connectedAt && (
                  <span className="text-sm text-green-600">
                    since {new Date(profile.connection.connectedAt).toLocaleDateString()}
                  </span>
                )}
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href={`/portal/messages?contractor=${profile.id}`}>
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Send Message
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Block & Report Actions */}
      <div className="flex gap-3 border-t border-slate-200 pt-4 dark:border-slate-700">
        <Button
          variant={isBlocked ? "outline" : "destructive"}
          size="sm"
          className="flex-1 gap-2 text-xs"
          disabled={blockLoading}
          onClick={async () => {
            setBlockLoading(true);
            try {
              await fetch("/api/portal/block", {
                method: isBlocked ? "DELETE" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ proId: profile.id }),
              });
              setIsBlocked(!isBlocked);
            } finally {
              setBlockLoading(false);
            }
          }}
        >
          {isBlocked ? (
            <>
              <ShieldCheck className="h-3.5 w-3.5" />
              {blockLoading ? "Unblocking…" : "Unblock Pro"}
            </>
          ) : (
            <>
              <Ban className="h-3.5 w-3.5" />
              {blockLoading ? "Blocking…" : "Block Pro"}
            </>
          )}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1 gap-2 text-xs text-amber-600 hover:text-amber-700"
          onClick={() => setShowReport(!showReport)}
        >
          <AlertTriangle className="h-3.5 w-3.5" />
          Report
        </Button>
      </div>

      {/* Report Form */}
      {showReport && (
        <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20">
          <CardContent className="space-y-3 p-4">
            {reportSent ? (
              <p className="text-center text-sm font-medium text-green-600">
                ✅ Report submitted. We&#39;ll review it shortly.
              </p>
            ) : (
              <>
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                  Report this contractor
                </p>
                <textarea
                  id="report-reason"
                  rows={3}
                  placeholder="Describe the issue…"
                  className="w-full rounded-md border border-amber-200 bg-white p-2 text-sm dark:border-amber-700 dark:bg-slate-900"
                />
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={reportLoading}
                  onClick={async () => {
                    const textarea = document.getElementById(
                      "report-reason"
                    ) as HTMLTextAreaElement;
                    if (!textarea?.value.trim()) return;
                    setReportLoading(true);
                    try {
                      await fetch("/api/portal/complaints", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          targetProId: profile.id,
                          targetOrgId: profile.id,
                          subject: `Report against ${profile.companyName || profile.name}`,
                          description: textarea.value.trim(),
                        }),
                      });
                      setReportSent(true);
                    } finally {
                      setReportLoading(false);
                    }
                  }}
                >
                  {reportLoading ? "Sending…" : "Submit Report"}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
