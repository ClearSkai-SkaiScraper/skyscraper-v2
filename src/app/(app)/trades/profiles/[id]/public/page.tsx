/**
 * Public Trade Profile Page
 * Full-page public view of a tradesperson's profile
 * Works with member data directly - no separate contractor profile required
 */

import { currentUser } from "@clerk/nextjs/server";
import {
  Award,
  Briefcase,
  Building2,
  CheckCircle,
  Clock,
  ExternalLink,
  Globe,
  Mail,
  MapPin,
  Phone,
  Shield,
  Star,
  Users,
} from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

import ShareButton from "./_components/ShareButton";

interface PublicProfilePageProps {
  params: Promise<{ id: string }>;
}

// Generate dynamic OG metadata for trades pro profiles
export async function generateMetadata({ params }: PublicProfilePageProps): Promise<Metadata> {
  const { id } = await params;

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const isUUID = uuidRegex.test(id);

  let member: {
    firstName: string | null;
    lastName: string | null;
    companyName: string | null;
    tradeType: string | null;
    avatar: string | null;
    profilePhoto: string | null;
    tagline: string | null;
    bio: string | null;
    city: string | null;
    state: string | null;
    company: { name: string; logo: string | null } | null;
  } | null = null;
  try {
    if (isUUID) {
      member = await prisma.tradesCompanyMember.findFirst({
        where: { id },
        select: {
          firstName: true,
          lastName: true,
          companyName: true,
          tradeType: true,
          avatar: true,
          profilePhoto: true,
          tagline: true,
          bio: true,
          city: true,
          state: true,
          company: { select: { name: true, logo: true } },
        },
      });
    }
  } catch {
    // Silently fail for metadata
  }

  if (!member) {
    return {
      title: "Trades Professional | SkaiScraper",
      description: "View this trades professional on SkaiScraper",
    };
  }

  const displayName =
    [member.firstName, member.lastName].filter(Boolean).join(" ") || member.companyName || "Pro";
  const companyName = member.company?.name || member.companyName;
  const location = [member.city, member.state].filter(Boolean).join(", ");
  const avatarUrl = member.profilePhoto || member.avatar || member.company?.logo;

  const title = companyName
    ? `${displayName} at ${companyName} | SkaiScraper`
    : `${displayName} | SkaiScraper`;

  const description =
    member.tagline ||
    member.bio?.slice(0, 150) ||
    `${member.tradeType || "Trades"} professional${location ? ` in ${location}` : ""}. Connect on SkaiScraper!`;

  // Use avatar as OG image, or fall back to default
  const ogImage = avatarUrl || "/brand/og-image.jpg";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "profile",
      url: `https://skaiscrape.com/trades/profiles/${id}/public`,
      images: [
        {
          url: ogImage,
          width: 400,
          height: 400,
          alt: `${displayName} - ${member.tradeType || "Trades Professional"}`,
        },
      ],
      siteName: "SkaiScraper",
    },
    twitter: {
      card: "summary",
      title,
      description,
      images: [ogImage],
    },
  };
}

export default async function PublicTradeProfilePage({ params }: PublicProfilePageProps) {
  const { id } = await params;

  // Validate format - accept UUID or slug
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const isUUID = uuidRegex.test(id);

  // Fetch the member profile with related data
  let member;
  try {
    // 1. Try as member UUID
    if (isUUID) {
      member = await prisma.tradesCompanyMember.findFirst({
        where: { id },
        include: { company: true },
      });
    }

    // 2. Try as company UUID → get admin/first member
    if (!member && isUUID) {
      const company = await prisma.tradesCompany.findUnique({
        where: { id },
        include: {
          members: {
            where: { isActive: true },
            take: 1,
            orderBy: { isAdmin: "desc" },
            include: { company: true },
          },
        },
      });
      if (company?.members?.[0]) {
        member = company.members[0];
      }
    }

    // 3. Try as company slug → get admin/first member
    if (!member && !isUUID) {
      const company = await prisma.tradesCompany.findFirst({
        where: { slug: id },
        include: {
          members: {
            where: { isActive: true },
            take: 1,
            orderBy: { isAdmin: "desc" },
            include: { company: true },
          },
        },
      });
      if (company?.members?.[0]) {
        member = company.members[0];
      }
    }

    logger.info(`[Public Profile] Resolved member: ${member?.id} hasCompany: ${!!member?.company}`);
  } catch (error) {
    logger.error("[Public Profile] Error fetching member:", error);
    throw new Error(
      `Failed to load profile: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }

  if (!member) {
    logger.info("[Public Profile] No member found for id/slug:", id);
    notFound();
  }

  // Get portfolio items if they have a company (with error handling)
  let portfolioItems: any[] = [];
  let reviews: any[] = [];

  if (member.companyId) {
    try {
      const [portfolioData, reviewsData] = await Promise.all([
        prisma.tradesFeaturedWork
          .findMany({
            where: { userId: member.userId },
            orderBy: { createdAt: "desc" },
            take: 6,
          })
          .catch(() => []),
        prisma.trade_reviews
          .findMany({
            where: { contractorId: member.id, status: "published" },
            orderBy: { createdAt: "desc" },
            take: 5,
          })
          .catch(() => []),
      ]);
      portfolioItems = portfolioData;
      reviews = reviewsData;
    } catch (error) {
      logger.error("[Public Profile] Error fetching portfolio/reviews:", error);
      // Continue with empty arrays
    }
  }

  // Use member's direct company info or fallback to linked company
  const displayName =
    member.companyName ||
    member.company?.name ||
    `${member.firstName || ""} ${member.lastName || ""}`.trim() ||
    "Tradesperson";
  const displayEmail = member.companyEmail || member.email || member.company?.email;
  const displayPhone = member.phone || member.company?.phone;
  const displayWebsite = member.companyWebsite || member.company?.website;
  const displayCity = member.city || member.company?.city;
  const displayState = member.state || member.company?.state;
  const displayLicense = member.companyLicense;
  const coverPhoto = member.coverPhoto || member.company?.coverimage;
  const avatarPhoto = member.avatar || member.profilePhoto || member.company?.logo;
  const rating = member.company?.rating ? parseFloat(member.company.rating.toString()) : null;
  const reviewCount = member.company?.reviewCount || 0;
  const isVerified = member.company?.verified || false;
  const specialties = member.specialties?.length
    ? member.specialties
    : member.company?.specialties || [];

  // Get current user to check if viewing own profile
  const user = await currentUser();
  const isOwnProfile = user?.id === member.userId;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">
      {/* Cover Photo */}
      <div className="relative h-64 overflow-hidden bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 md:h-80">
        {coverPhoto ? (
          <Image src={coverPhoto} alt="Cover" fill className="object-cover" priority />
        ) : (
          <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-20" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

        {/* Back button if viewing own profile */}
        {isOwnProfile && (
          <div className="absolute left-6 top-6 flex gap-2">
            <Link href="/trades/profile">
              <Button variant="secondary" size="sm" className="gap-2 shadow-lg">
                ← Back to Profile
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-6xl px-4 pb-16">
        {/* Profile Header Card - overlaps cover */}
        <Card className="relative z-10 -mt-24 border-0 shadow-xl">
          <CardContent className="p-6 md:p-8">
            <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
              {/* Avatar + Info */}
              <div className="flex flex-col items-center gap-4 md:flex-row md:items-start">
                {/* Avatar */}
                <div className="relative h-32 w-32 flex-shrink-0 overflow-hidden rounded-2xl shadow-lg">
                  {avatarPhoto ? (
                    <Image src={avatarPhoto} alt={displayName} fill className="object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-600 text-4xl font-bold text-white">
                      {displayName.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                {/* Name & Details */}
                <div className="text-center md:text-left">
                  <div className="flex items-center justify-center gap-2 md:justify-start">
                    <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">{displayName}</h1>
                    {isVerified && (
                      <Badge className="gap-1 bg-green-100 text-green-700">
                        <CheckCircle className="h-3 w-3" />
                        Verified
                      </Badge>
                    )}
                  </div>

                  {member.jobTitle && (
                    <p className="mt-1 text-lg text-gray-600">{member.jobTitle}</p>
                  )}

                  <div className="mt-3 flex flex-wrap items-center justify-center gap-3 text-sm text-gray-500 md:justify-start">
                    {member.tradeType && (
                      <Badge variant="secondary" className="gap-1">
                        <Briefcase className="h-3 w-3" />
                        {member.tradeType}
                      </Badge>
                    )}
                    {(displayCity || displayState) && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {[displayCity, displayState].filter(Boolean).join(", ")}
                      </span>
                    )}
                    {member.yearsExperience && (
                      <span className="flex items-center gap-1">
                        <Award className="h-4 w-4" />
                        {member.yearsExperience}+ years experience
                      </span>
                    )}
                  </div>

                  {displayLicense && (
                    <div className="mt-2 flex items-center justify-center gap-1 text-sm text-green-600 md:justify-start">
                      <Shield className="h-4 w-4" />
                      License #{displayLicense}
                    </div>
                  )}
                </div>
              </div>

              {/* Contact Buttons */}
              <div className="flex flex-col gap-2">
                {displayPhone && (
                  <Button asChild className="gap-2">
                    <a href={`tel:${displayPhone}`}>
                      <Phone className="h-4 w-4" />
                      {displayPhone}
                    </a>
                  </Button>
                )}
                {displayEmail && (
                  <Button variant="outline" asChild className="gap-2">
                    <a href={`mailto:${displayEmail}`}>
                      <Mail className="h-4 w-4" />
                      Send Email
                    </a>
                  </Button>
                )}
                {displayWebsite && (
                  <Button variant="outline" asChild className="gap-2">
                    <a href={displayWebsite} target="_blank" rel="noopener noreferrer">
                      <Globe className="h-4 w-4" />
                      Website
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </Button>
                )}
                <ShareButton
                  url={`https://skaiscrape.com/trades/profiles/${member.id}/public`}
                  title={displayName}
                />
                {isOwnProfile && (
                  <Link href={`/trades/companies/${member.companyId}/public`}>
                    <Button variant="outline" className="w-full gap-2">
                      <Building2 className="h-4 w-4" />
                      View Company Page
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Row */}
        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="flex flex-col items-center justify-center p-4 text-center">
              <Star className="h-6 w-6 text-yellow-500" />
              <p className="mt-2 text-2xl font-bold">{rating?.toFixed(1) || "N/A"}</p>
              <p className="text-xs text-gray-500">Rating</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex flex-col items-center justify-center p-4 text-center">
              <Users className="h-6 w-6 text-blue-500" />
              <p className="mt-2 text-2xl font-bold">{reviewCount}</p>
              <p className="text-xs text-gray-500">Reviews</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex flex-col items-center justify-center p-4 text-center">
              <Award className="h-6 w-6 text-purple-500" />
              <p className="mt-2 text-2xl font-bold">{member.yearsExperience || "N/A"}</p>
              <p className="text-xs text-gray-500">Years Exp.</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex flex-col items-center justify-center p-4 text-center">
              <Clock className="h-6 w-6 text-green-500" />
              <p className="mt-2 text-2xl font-bold">24h</p>
              <p className="text-xs text-gray-500">Response Time</p>
            </CardContent>
          </Card>
        </div>

        {/* Content Grid */}
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          {/* Main Column */}
          <div className="space-y-6 lg:col-span-2">
            {/* About */}
            {member.bio && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-blue-500" />
                    About
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap text-gray-600">{member.bio}</p>
                </CardContent>
              </Card>
            )}

            {/* Specialties */}
            {specialties.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Briefcase className="h-5 w-5 text-indigo-500" />
                    Specialties
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {specialties.map((specialty: string, idx: number) => (
                      <Badge key={idx} variant="secondary" className="px-3 py-1">
                        {specialty}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Portfolio */}
            {portfolioItems.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5 text-purple-500" />
                    Portfolio
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                    {portfolioItems.map((item) =>
                      item.imageUrls?.map((url: string, idx: number) => (
                        <div
                          key={`${item.id}-${idx}`}
                          className="aspect-square overflow-hidden rounded-lg"
                        >
                          <Image
                            src={url}
                            alt={item.title || "Portfolio"}
                            width={300}
                            height={300}
                            className="h-full w-full object-cover transition-transform hover:scale-105"
                          />
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Skills */}
            {member.skills && member.skills.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Skills</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {member.skills.map((skill: string, idx: number) => (
                      <Badge key={idx} variant="outline">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Certifications */}
            {member.certifications && member.certifications.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Certifications</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {member.certifications.map((cert: string, idx: number) => (
                      <li key={idx} className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        {cert}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Reviews Preview */}
            {reviews.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Star className="h-5 w-5 text-yellow-500" />
                    Recent Reviews
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {reviews.slice(0, 3).map((review) => (
                    <div key={review.id} className="border-b pb-3 last:border-0 last:pb-0">
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`h-3 w-3 ${
                              i < review.rating
                                ? "fill-yellow-500 text-yellow-500"
                                : "text-gray-200"
                            }`}
                          />
                        ))}
                      </div>
                      {review.content && (
                        <p className="mt-1 line-clamp-2 text-sm text-gray-600">{review.content}</p>
                      )}
                      <p className="mt-1 text-xs text-gray-400">
                        — {review.authorName || "Anonymous"}
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Company Page Widget */}
            {member.company && (
              <Card className="overflow-hidden border-blue-200 bg-gradient-to-br from-white to-blue-50/50">
                <CardContent className="p-4">
                  <Link
                    href={`/trades/companies/${member.companyId}/public`}
                    className="group flex items-center gap-3"
                  >
                    <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl border bg-white shadow-sm">
                      {member.company.logo ? (
                        <Image
                          src={member.company.logo}
                          alt={member.company.name}
                          width={48}
                          height={48}
                          className="rounded-lg object-cover"
                        />
                      ) : (
                        <Building2 className="h-7 w-7 text-slate-400" />
                      )}
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <p className="text-xs font-medium uppercase tracking-wide text-blue-600">
                        Company
                      </p>
                      <p className="truncate font-semibold text-gray-900 group-hover:text-blue-600">
                        {member.company.name}
                      </p>
                      <p className="truncate text-xs text-gray-500">
                        {[member.company.city, member.company.state].filter(Boolean).join(", ") ||
                          "View company page →"}
                      </p>
                    </div>
                    <ExternalLink className="h-4 w-4 flex-shrink-0 text-slate-400 transition-colors group-hover:text-blue-500" />
                  </Link>
                </CardContent>
              </Card>
            )}

            {/* Contact Card */}
            <Card className="bg-gradient-to-br from-blue-50 to-indigo-50">
              <CardContent className="p-6 text-center">
                <h3 className="font-semibold text-gray-900">Interested in working together?</h3>
                <p className="mt-2 text-sm text-gray-600">
                  Get in touch to discuss your project needs.
                </p>
                {displayPhone && (
                  <Button asChild className="mt-4 w-full gap-2">
                    <a href={`tel:${displayPhone}`}>
                      <Phone className="h-4 w-4" />
                      Call Now
                    </a>
                  </Button>
                )}
                {displayEmail && (
                  <Button variant="outline" asChild className="mt-2 w-full gap-2">
                    <a href={`mailto:${displayEmail}`}>
                      <Mail className="h-4 w-4" />
                      Send Email
                    </a>
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
