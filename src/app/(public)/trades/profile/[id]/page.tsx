"use client";

import {
  Award,
  Building2,
  Calendar,
  Camera,
  CheckCircle,
  Clock,
  CreditCard,
  ExternalLink,
  Globe,
  Heart,
  Languages,
  LogIn,
  MapPin,
  MessageCircle,
  Phone,
  Shield,
  Smartphone,
  Star,
  UserPlus,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { ReviewList } from "@/components/reviews/ReviewList";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { logger } from "@/lib/logger";

interface HoursOfOperation {
  monday?: { open: string; close: string; closed?: boolean };
  tuesday?: { open: string; close: string; closed?: boolean };
  wednesday?: { open: string; close: string; closed?: boolean };
  thursday?: { open: string; close: string; closed?: boolean };
  friday?: { open: string; close: string; closed?: boolean };
  saturday?: { open: string; close: string; closed?: boolean };
  sunday?: { open: string; close: string; closed?: boolean };
}

interface SocialLinks {
  facebook?: string;
  instagram?: string;
  linkedin?: string;
  twitter?: string;
  youtube?: string;
  tiktok?: string;
}

interface ProfileData {
  // TradesCompanyMember
  firstName: string;
  lastName: string;
  jobTitle: string;
  avatar: string | null;
  bio: string | null;
  yearsExperience: number | null;
  specialties: string[];
  workHistory: Array<{ company: string; role: string; years: string }>;
  lookingFor: string[];

  // ContractorProfile
  businessName: string;
  coverPhotoUrl: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  serviceAreas: string[];

  // TradeProfile
  portfolioUrls: string[];
  averageRating: number;
  totalReviewsCount: number;
  tradeProfileId: string;

  // Enhanced Profile Fields
  officePhone: string | null;
  mobilePhone: string | null;
  hoursOfOperation: HoursOfOperation | null;
  rocNumber: string | null;
  rocExpiration: string | null;
  insuranceProvider: string | null;
  insuranceExpiration: string | null;
  bondAmount: number | null;
  socialLinks: SocialLinks | null;
  paymentMethods: string[];
  languages: string[];
  emergencyAvailable: boolean;
  freeEstimates: boolean;
  warrantyInfo: string | null;
  aboutCompany: string | null;
  tagline: string | null;
  foundedYear: number | null;
  teamSize: number | null;
  portfolioImages: string[];
}

export default function PublicProfilePage({ params }: { params: { id: string } }) {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [posts, setPosts] = useState<any[]>([]);

  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await fetch(`/api/trades/profile/${params.id}/public`);
        if (!res.ok) throw new Error("Profile not found");
        const data = await res.json();
        // API returns { profile: ... }, extract the profile data
        setProfile(data.profile || data);

        // Load posts for this profile
        const postsRes = await fetch(`/api/trades/posts?profileId=${params.id}&limit=5`);
        if (postsRes.ok) {
          const postsData = await postsRes.json();
          setPosts(postsData.posts || postsData || []);
        }
      } catch (error) {
        logger.error("Failed to load profile:", error);
      } finally {
        setLoading(false);
      }
    }
    void loadProfile();
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg text-gray-600">Loading profile...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/40 to-amber-50/30 px-4">
        <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-lg">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
            <Users className="h-8 w-8 text-slate-400" />
          </div>
          <h1 className="mb-2 text-2xl font-bold text-slate-900">Profile Not Found</h1>
          <p className="mb-6 text-sm text-slate-600">
            This profile may have moved or no longer exists. Browse our Trades Network to find
            contractors and vendors.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <a
              href="/trades"
              className="inline-flex items-center justify-center rounded-xl bg-[#117CFF] px-5 py-2.5 text-sm font-semibold text-white shadow transition hover:-translate-y-0.5 hover:shadow-lg"
            >
              Browse Trades Network
            </a>
            <a
              href="/"
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:shadow"
            >
              Go Home
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Cover Photo - dynamic background image via spread operator */}
      <div
        className="relative h-80 overflow-hidden bg-gradient-to-r from-blue-600 to-blue-800"
        {...{
          style: profile.coverPhotoUrl
            ? {
                backgroundImage: `url(${profile.coverPhotoUrl})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }
            : {},
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />

        {/* Auth-gated CTAs — floating over cover photo */}
        <div className="absolute bottom-6 right-6 flex gap-3">
          <Link
            href={`/sign-up?redirect_url=/trades`}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:bg-blue-700"
          >
            <UserPlus className="h-4 w-4" />
            Connect
          </Link>
          <Link
            href={`/sign-in?redirect_url=/trades/messages`}
            className="inline-flex items-center gap-2 rounded-xl bg-white/90 px-5 py-2.5 text-sm font-semibold text-slate-800 shadow-lg backdrop-blur-sm transition hover:bg-white"
          >
            <MessageCircle className="h-4 w-4" />
            Message
          </Link>
        </div>
      </div>

      {/* Profile Content */}
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="-mt-32 grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Left Column - Profile Card */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4 p-6">
              {/* Avatar */}
              <div className="-mt-20 mb-4">
                {profile.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.avatar}
                    alt={`${profile.firstName} ${profile.lastName}`}
                    className="h-32 w-32 overflow-hidden rounded-full object-cover shadow-2xl"
                  />
                ) : (
                  <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-full bg-blue-600 text-4xl font-bold text-white shadow-2xl">
                    {profile.firstName?.[0]}
                    {profile.lastName?.[0]}
                  </div>
                )}
              </div>

              {/* Name & Title */}
              <h1 className="mb-1 text-2xl font-bold text-gray-900">
                {profile.firstName} {profile.lastName}
              </h1>
              <p className="mb-2 text-lg text-gray-600">{profile.jobTitle}</p>
              <p className="mb-4 flex items-center text-sm text-gray-500">
                <Building2 className="mr-2 h-4 w-4" />
                {profile.businessName}
              </p>

              {/* Rating */}
              {profile.averageRating > 0 && (
                <div className="mb-4 flex items-center">
                  <Star className="mr-1 h-5 w-5 fill-yellow-400 text-yellow-400" />
                  <span className="text-lg font-semibold">{profile.averageRating.toFixed(1)}</span>
                  <span className="ml-2 text-sm text-gray-500">
                    ({profile.totalReviewsCount} reviews)
                  </span>
                </div>
              )}

              {/* Specialties */}
              {profile.specialties.length > 0 && (
                <div className="mb-4">
                  <h3 className="mb-2 text-sm font-semibold text-gray-700">Specialties</h3>
                  <div className="flex flex-wrap gap-2">
                    {profile.specialties.map((s) => (
                      <Badge key={s} variant="secondary">
                        {s}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Years Experience */}
              {profile.yearsExperience && (
                <div className="mb-4">
                  <p className="text-sm text-gray-600">
                    <span className="font-semibold">{profile.yearsExperience}</span> years
                    experience
                  </p>
                </div>
              )}

              {/* Contact */}
              <div className="space-y-2">
                {profile.officePhone && (
                  <Button className="w-full" size="lg" asChild>
                    <a href={`tel:${profile.officePhone}`}>
                      <Phone className="mr-2 h-4 w-4" />
                      Office: {profile.officePhone}
                    </a>
                  </Button>
                )}
                {profile.mobilePhone && (
                  <Button variant="outline" className="w-full" asChild>
                    <a href={`tel:${profile.mobilePhone}`}>
                      <Smartphone className="mr-2 h-4 w-4" />
                      Cell: {profile.mobilePhone}
                    </a>
                  </Button>
                )}
                {!profile.officePhone && !profile.mobilePhone && profile.phone && (
                  <Button className="w-full" size="lg" asChild>
                    <a href={`tel:${profile.phone}`}>
                      <Phone className="mr-2 h-4 w-4" />
                      {profile.phone}
                    </a>
                  </Button>
                )}
                {profile.website && (
                  <Button variant="outline" className="w-full" asChild>
                    <a
                      href={
                        profile.website.startsWith("http")
                          ? profile.website
                          : `https://${profile.website}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Globe className="mr-2 h-4 w-4" />
                      Visit Website
                    </a>
                  </Button>
                )}
              </div>

              {/* Quick Badges */}
              <div className="mt-4 flex flex-wrap gap-2">
                {profile.emergencyAvailable && (
                  <Badge variant="destructive" className="text-xs">
                    24/7 Emergency
                  </Badge>
                )}
                {profile.freeEstimates && (
                  <Badge variant="secondary" className="text-xs">
                    Free Estimates
                  </Badge>
                )}
              </div>

              {/* Hours of Operation */}
              {profile.hoursOfOperation && (
                <div className="mt-6 border-t pt-6">
                  <h3 className="mb-3 flex items-center text-sm font-semibold text-gray-700">
                    <Clock className="mr-2 h-4 w-4" />
                    Business Hours
                  </h3>
                  <div className="space-y-1 text-sm">
                    {(
                      [
                        "monday",
                        "tuesday",
                        "wednesday",
                        "thursday",
                        "friday",
                        "saturday",
                        "sunday",
                      ] as const
                    ).map((day) => {
                      const hours = profile.hoursOfOperation?.[day];
                      return (
                        <div key={day} className="flex justify-between">
                          <span className="capitalize text-gray-600">{day.slice(0, 3)}</span>
                          <span className={hours?.closed ? "text-gray-400" : "text-gray-900"}>
                            {hours?.closed
                              ? "Closed"
                              : hours
                                ? `${hours.open} - ${hours.close}`
                                : "-"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Licensing & Insurance */}
              {(profile.rocNumber || profile.insuranceProvider) && (
                <div className="mt-6 border-t pt-6">
                  <h3 className="mb-3 flex items-center text-sm font-semibold text-gray-700">
                    <Shield className="mr-2 h-4 w-4" />
                    Licensed & Insured
                  </h3>
                  <div className="space-y-2 text-sm">
                    {profile.rocNumber && (
                      <div className="flex items-center">
                        <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                        <span>ROC# {profile.rocNumber}</span>
                        {profile.rocExpiration && (
                          <span className="ml-2 text-xs text-gray-500">
                            (Exp: {new Date(profile.rocExpiration).toLocaleDateString()})
                          </span>
                        )}
                      </div>
                    )}
                    {profile.insuranceProvider && (
                      <div className="flex items-center">
                        <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                        <span>Insured by {profile.insuranceProvider}</span>
                      </div>
                    )}
                    {profile.bondAmount && (
                      <div className="flex items-center">
                        <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                        <span>Bonded ${profile.bondAmount.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Service Areas */}
              {profile.serviceAreas.length > 0 && (
                <div className="mt-6 border-t pt-6">
                  <h3 className="mb-2 flex items-center text-sm font-semibold text-gray-700">
                    <MapPin className="mr-2 h-4 w-4" />
                    Service Areas
                  </h3>
                  <p className="text-sm text-gray-600">{profile.serviceAreas.join(", ")}</p>
                </div>
              )}

              {/* Payment Methods */}
              {profile.paymentMethods && profile.paymentMethods.length > 0 && (
                <div className="mt-6 border-t pt-6">
                  <h3 className="mb-2 flex items-center text-sm font-semibold text-gray-700">
                    <CreditCard className="mr-2 h-4 w-4" />
                    Payment Methods
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {profile.paymentMethods.map((method) => (
                      <Badge key={method} variant="outline" className="text-xs">
                        {method}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Languages */}
              {profile.languages && profile.languages.length > 0 && (
                <div className="mt-6 border-t pt-6">
                  <h3 className="mb-2 flex items-center text-sm font-semibold text-gray-700">
                    <Languages className="mr-2 h-4 w-4" />
                    Languages
                  </h3>
                  <p className="text-sm text-gray-600">{profile.languages.join(", ")}</p>
                </div>
              )}

              {/* Looking For */}
              {profile.lookingFor.length > 0 && (
                <div className="mt-6 border-t pt-6">
                  <h3 className="mb-2 flex items-center text-sm font-semibold text-gray-700">
                    <Heart className="mr-2 h-4 w-4" />
                    Looking For
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {profile.lookingFor.map((item) => (
                      <Badge key={item} variant="outline">
                        {item}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Social Links */}
              {profile.socialLinks && Object.values(profile.socialLinks).some(Boolean) && (
                <div className="mt-6 border-t pt-6">
                  <h3 className="mb-2 text-sm font-semibold text-gray-700">Follow Us</h3>
                  <div className="flex gap-3">
                    {profile.socialLinks.facebook && (
                      <a
                        href={profile.socialLinks.facebook}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-500 hover:text-blue-600"
                        title="Follow us on Facebook"
                        aria-label="Follow us on Facebook"
                      >
                        <ExternalLink className="h-5 w-5" />
                      </a>
                    )}
                    {profile.socialLinks.instagram && (
                      <a
                        href={profile.socialLinks.instagram}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-500 hover:text-pink-600"
                        title="Follow us on Instagram"
                        aria-label="Follow us on Instagram"
                      >
                        <ExternalLink className="h-5 w-5" />
                      </a>
                    )}
                    {profile.socialLinks.youtube && (
                      <a
                        href={profile.socialLinks.youtube}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-500 hover:text-red-600"
                        title="Follow us on YouTube"
                        aria-label="Follow us on YouTube"
                      >
                        <ExternalLink className="h-5 w-5" />
                      </a>
                    )}
                  </div>
                </div>
              )}
            </Card>
          </div>

          {/* Right Column - Content */}
          <div className="lg:col-span-2">
            {/* Tagline */}
            {profile.tagline && (
              <Card className="mb-8 bg-gradient-to-r from-blue-600 to-blue-800 p-6 text-white">
                <p className="text-xl font-medium italic">&quot;{profile.tagline}&quot;</p>
              </Card>
            )}

            {/* Company Info Bar */}
            {(profile.foundedYear || profile.teamSize || profile.yearsExperience) && (
              <div className="mb-8 grid grid-cols-3 gap-4">
                {profile.foundedYear && (
                  <Card className="p-4 text-center">
                    <Calendar className="mx-auto mb-2 h-6 w-6 text-blue-600" />
                    <p className="text-2xl font-bold">{profile.foundedYear}</p>
                    <p className="text-xs text-gray-500">Est.</p>
                  </Card>
                )}
                {profile.yearsExperience && (
                  <Card className="p-4 text-center">
                    <Award className="mx-auto mb-2 h-6 w-6 text-blue-600" />
                    <p className="text-2xl font-bold">{profile.yearsExperience}+</p>
                    <p className="text-xs text-gray-500">Years Experience</p>
                  </Card>
                )}
                {profile.teamSize && (
                  <Card className="p-4 text-center">
                    <Users className="mx-auto mb-2 h-6 w-6 text-blue-600" />
                    <p className="text-2xl font-bold">{profile.teamSize}</p>
                    <p className="text-xs text-gray-500">Team Members</p>
                  </Card>
                )}
              </div>
            )}

            {/* About Company */}
            {(profile.aboutCompany || profile.bio) && (
              <Card className="mb-8 p-6">
                <h2 className="mb-4 text-2xl font-bold text-gray-900">
                  About {profile.businessName}
                </h2>
                <p className="whitespace-pre-wrap text-gray-700">
                  {profile.aboutCompany || profile.bio}
                </p>
              </Card>
            )}

            {/* Warranty Info */}
            {profile.warrantyInfo && (
              <Card className="mb-8 border-l-4 border-green-500 p-6">
                <h3 className="mb-2 flex items-center font-semibold text-gray-900">
                  <Shield className="mr-2 h-5 w-5 text-green-500" />
                  Our Warranty
                </h3>
                <p className="text-gray-700">{profile.warrantyInfo}</p>
              </Card>
            )}

            {/* Recent Activity / Posts */}
            {posts.length > 0 ? (
              <Card className="mb-8 p-6">
                <h2 className="mb-4 flex items-center text-2xl font-bold text-gray-900">
                  <MessageCircle className="mr-2 h-6 w-6" />
                  Recent Activity
                </h2>
                // eslint-disable-next-line react/jsx-no-comment-textnodes
                <div className="space-y-6">
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  {posts.map((post: any) => (
                    <div key={post.id} className="border-l-2 border-blue-600 pl-4">
                      <p className="mb-2 text-gray-700">{post.content}</p>
                      {post.images && post.images.length > 0 && (
                        <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                          {post.images.slice(0, 3).map((img: string, i: number) => (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              key={i}
                              src={img}
                              alt={`Post ${i + 1}`}
                              className="h-32 w-full rounded object-cover"
                            />
                          ))}
                        </div>
                      )}
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                        {post.likes > 0 && <span>👍 {post.likes}</span>}
                        {post.comments > 0 && <span>💬 {post.comments}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            ) : (
              <Card className="mb-8 p-6">
                <h2 className="mb-2 flex items-center text-lg font-semibold text-gray-900">
                  <MessageCircle className="mr-2 h-5 w-5" />
                  Activity Feed
                </h2>
                <p className="text-sm text-gray-500">
                  No public posts yet. Check back later for updates from{" "}
                  {profile.businessName || `${profile.firstName} ${profile.lastName}`}.
                </p>
              </Card>
            )}

            {/* Work History */}
            {profile.workHistory && profile.workHistory.length > 0 && (
              <Card className="mb-8 p-6">
                <h2 className="mb-4 text-2xl font-bold text-gray-900">Work History</h2>
                <div className="space-y-4">
                  {profile.workHistory.map((job, i) => (
                    <div key={i} className="border-l-2 border-blue-600 pl-4">
                      <h3 className="font-semibold text-gray-900">{job.role}</h3>
                      <p className="text-sm text-gray-600">{job.company}</p>
                      <p className="text-xs text-gray-500">{job.years}</p>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Portfolio */}
            {(profile.portfolioUrls.length > 0 ||
              (profile.portfolioImages && profile.portfolioImages.length > 0)) && (
              <Card className="mb-8 p-6">
                <h2 className="mb-4 flex items-center text-2xl font-bold text-gray-900">
                  <Camera className="mr-2 h-6 w-6" />
                  Our Work
                </h2>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                  {[...(profile.portfolioImages || []), ...profile.portfolioUrls].map((url, i) => (
                    <div
                      key={i}
                      className="group relative aspect-square overflow-hidden rounded-lg"
                    // eslint-disable-next-line react/jsx-no-comment-textnodes
                    >
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={url}
                        alt={`Project ${i + 1}`}
                        className="h-full w-full object-cover transition-transform group-hover:scale-110"
                      />
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Reviews */}
            <Card className="mb-8 p-6">
              <h2 className="mb-4 text-2xl font-bold text-gray-900">Client Reviews</h2>
              <ReviewList contractorId={profile.tradeProfileId} />
            </Card>

            {/* CTA Banner — Join to Connect */}
            <Card className="bg-gradient-to-r from-blue-600 to-indigo-600 p-8 text-white">
              <h3 className="mb-2 text-xl font-bold">
                Want to work with {profile.firstName || profile.businessName}?
              </h3>
              <p className="mb-4 text-blue-100">
                Join SkaiScraper to send connection requests, messages, and access the full Trades
                Network.
              </p>
              <div className="flex gap-3">
                <Link
                  href="/sign-up"
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-blue-600 shadow transition hover:bg-blue-50"
                >
                  <UserPlus className="h-4 w-4" />
                  Join Free
                </Link>
                <Link
                  href="/sign-in"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/30 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  <LogIn className="h-4 w-4" />
                  Sign In
                </Link>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
