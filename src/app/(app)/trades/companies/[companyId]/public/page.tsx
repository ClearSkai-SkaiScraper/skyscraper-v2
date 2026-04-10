/**
 * Public Company Page — Shareable company profile (no auth required)
 * Mirrors the internal company detail page but publicly accessible
 * Route: /trades/companies/[companyId]/public
 */

import {
  Award,
  Briefcase,
  Building2,
  CheckCircle,
  Clock,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  Copy,
  ExternalLink,
  Globe,
  Mail,
  MapPin,
  Phone,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  Share2,
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
import prisma from "@/lib/prisma";

import ShareButton from "./_components/ShareButton";

interface PublicCompanyPageProps {
  params: Promise<{ companyId: string }>;
}

// ──────────────────────────────────────────────
// OG Metadata
// ──────────────────────────────────────────────
export async function generateMetadata({ params }: PublicCompanyPageProps): Promise<Metadata> {
  const { companyId } = await params;

  let company: {
    name: string;
    description: string | null;
    logo: string | null;
    coverimage: string | null;
    city: string | null;
    state: string | null;
    specialties: string[];
  } | null = null;

  try {
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      companyId
    );
    company = isUUID
      ? await prisma.tradesCompany.findUnique({
          where: { id: companyId },
          select: {
            name: true,
            description: true,
            logo: true,
            coverimage: true,
            city: true,
            state: true,
            specialties: true,
          },
        })
      : await prisma.tradesCompany.findFirst({
          where: { slug: companyId },
          select: {
            name: true,
            description: true,
            logo: true,
            coverimage: true,
            city: true,
            state: true,
            specialties: true,
          },
        });
  } catch {
    // fail silently for metadata
  }

  if (!company) {
    return {
      title: "Company | SkaiScraper",
      description: "View this company on SkaiScraper",
    };
  }

  const location = [company.city, company.state].filter(Boolean).join(", ");
  const title = `${company.name} | SkaiScraper`;
  const description =
    company.description?.slice(0, 160) ||
    `${company.name}${location ? ` in ${location}` : ""} — ${company.specialties?.join(", ") || "Trades Professional"}. View on SkaiScraper!`;
  const ogImage = company.coverimage || company.logo || "/brand/og-image.jpg";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      url: `https://skaiscrape.com/trades/companies/${companyId}/public`,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: company.name,
        },
      ],
      siteName: "SkaiScraper",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}

// ──────────────────────────────────────────────
// Page Component
// ──────────────────────────────────────────────
export default async function PublicCompanyPage({ params }: PublicCompanyPageProps) {
  const { companyId } = await params;

  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(companyId);

  // Fetch company with members
  const company = isUUID
    ? await prisma.tradesCompany.findUnique({
        where: { id: companyId },
        include: {
          members: {
            where: { isActive: true },
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatar: true,
              profilePhoto: true,
              tradeType: true,
              role: true,
              isOwner: true,
              title: true,
              jobTitle: true,
              yearsExperience: true,
              certifications: true,
              tagline: true,
              foundedYear: true,
            },
            orderBy: [{ isOwner: "desc" }, { createdAt: "asc" }],
          },
          _count: { select: { members: true } },
        },
      })
    : await prisma.tradesCompany.findFirst({
        where: { slug: companyId },
        include: {
          members: {
            where: { isActive: true },
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatar: true,
              profilePhoto: true,
              tradeType: true,
              role: true,
              isOwner: true,
              title: true,
              jobTitle: true,
              yearsExperience: true,
              certifications: true,
              tagline: true,
              foundedYear: true,
            },
            orderBy: [{ isOwner: "desc" }, { createdAt: "asc" }],
          },
          _count: { select: { members: true } },
        },
      });

  if (!company) notFound();

  const ownerMember = company.members.find((m) => m.isOwner) || company.members[0];

  // Fetch reviews
  let reviews: Array<{
    id: string;
    rating: number;
    title: string | null;
    comment: string | null;
    verified: boolean;
    createdAt: Date;
    Client: { name: string | null; avatarUrl: string | null } | null;
  }> = [];
  try {
    reviews = await prisma.trade_reviews.findMany({
      where: { contractorId: company.id, status: "published" },
      include: { Client: { select: { name: true, avatarUrl: true } } },
      orderBy: { createdAt: "desc" },
      take: 10,
    });
  } catch {
    // Reviews table may not exist
  }

  const avgRating =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : Number(company.rating) || 0;

  const shareUrl = `https://skaiscrape.com/trades/companies/${company.id}/public`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">
      {/* Cover Photo */}
      <div className="relative h-56 overflow-hidden bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 md:h-72">
        {company.coverimage ? (
          <Image
            src={company.coverimage}
            alt={company.name}
            fill
            className="object-cover"
            priority
          />
        ) : (
          <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-20" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

        {/* Verified Badge */}
        {company.isVerified && (
          <div className="absolute right-4 top-4 flex items-center gap-2 rounded-full bg-white/90 px-3 py-1.5 text-sm font-medium text-blue-700 shadow-lg">
            <Shield className="h-4 w-4" />
            Verified Business
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-6xl px-4 pb-16">
        {/* Company Header Card */}
        <Card className="relative z-10 -mt-20 border-0 shadow-xl">
          <CardContent className="p-6 md:p-8">
            <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
              {/* Logo + Name */}
              <div className="flex flex-col items-center gap-4 md:flex-row md:items-start">
                {/* Logo */}
                <div className="relative flex h-28 w-28 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl border-4 border-white bg-white shadow-lg">
                  {company.logo ? (
                    <Image
                      src={company.logo}
                      alt={company.name}
                      width={96}
                      height={96}
                      className="rounded-xl object-cover"
                    />
                  ) : (
                    <Building2 className="h-14 w-14 text-slate-400" />
                  )}
                </div>

                {/* Name & Details */}
                <div className="text-center md:text-left">
                  <div className="flex items-center justify-center gap-2 md:justify-start">
                    <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">{company.name}</h1>
                    {company.isVerified && (
                      <Badge className="gap-1 bg-green-100 text-green-700">
                        <CheckCircle className="h-3 w-3" />
                        Verified
                      </Badge>
                    )}
                  </div>

                  {ownerMember?.tagline && (
                    <p className="mt-1 text-lg text-gray-600">{ownerMember.tagline}</p>
                  )}

                  <div className="mt-3 flex flex-wrap items-center justify-center gap-3 text-sm text-gray-500 md:justify-start">
                    {company.city && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {company.city}, {company.state}
                      </span>
                    )}
                    {ownerMember?.foundedYear && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        Est. {ownerMember.foundedYear}
                      </span>
                    )}
                    {company._count.members > 0 && (
                      <span className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {company._count.members} Team Member
                        {company._count.members > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>

                  {/* Specialties */}
                  {company.specialties && company.specialties.length > 0 && (
                    <div className="mt-3 flex flex-wrap justify-center gap-2 md:justify-start">
                      {company.specialties.map((s) => (
                        <Badge key={s} variant="secondary" className="bg-blue-100 text-blue-700">
                          {s}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Contact + Share Buttons */}
              <div className="flex flex-col gap-2">
                {company.phone && (
                  <Button asChild className="gap-2">
                    <a href={`tel:${company.phone}`}>
                      <Phone className="h-4 w-4" />
                      {company.phone}
                    </a>
                  </Button>
                )}
                {company.email && (
                  <Button variant="outline" asChild className="gap-2">
                    <a href={`mailto:${company.email}`}>
                      <Mail className="h-4 w-4" />
                      Send Email
                    </a>
                  </Button>
                )}
                {company.website && (
                  <Button variant="outline" asChild className="gap-2">
                    <a href={company.website} target="_blank" rel="noopener noreferrer">
                      <Globe className="h-4 w-4" />
                      Website
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </Button>
                )}
                <ShareButton url={shareUrl} title={company.name} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Row */}
        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="flex flex-col items-center justify-center p-4 text-center">
              <Star className="h-6 w-6 text-yellow-500" />
              <p className="mt-2 text-2xl font-bold">
                {avgRating > 0 ? avgRating.toFixed(1) : "N/A"}
              </p>
              <p className="text-xs text-gray-500">Rating</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex flex-col items-center justify-center p-4 text-center">
              <Users className="h-6 w-6 text-blue-500" />
              <p className="mt-2 text-2xl font-bold">{company._count.members}</p>
              <p className="text-xs text-gray-500">Team Size</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex flex-col items-center justify-center p-4 text-center">
              <Award className="h-6 w-6 text-purple-500" />
              <p className="mt-2 text-2xl font-bold">
                {reviews.length || company.reviewCount || 0}
              </p>
              <p className="text-xs text-gray-500">Reviews</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex flex-col items-center justify-center p-4 text-center">
              <Shield className="h-6 w-6 text-green-500" />
              <p className="mt-2 text-2xl font-bold">{company.licenseNumber ? "Licensed" : "—"}</p>
              <p className="text-xs text-gray-500">License</p>
            </CardContent>
          </Card>
        </div>

        {/* Content Grid */}
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          {/* Left Column */}
          <div className="space-y-6 lg:col-span-2">
            {/* About */}
            {company.description && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-blue-500" />
                    About {company.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-line text-gray-600">{company.description}</p>
                </CardContent>
              </Card>
            )}

            {/* Team Members */}
            {company.members.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-indigo-500" />
                    Our Team ({company._count.members})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {company.members.map((member) => (
                      <Link
                        key={member.id}
                        href={`/trades/profiles/${member.id}/public`}
                        className="group flex items-center gap-3 rounded-lg border p-3 transition-all hover:border-blue-300 hover:bg-blue-50/50 hover:shadow-md"
                      >
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 transition-transform group-hover:scale-105">
                          {member.profilePhoto || member.avatar ? (
                            <Image
                              src={member.profilePhoto || member.avatar!}
                              alt={`${member.firstName}`}
                              width={48}
                              height={48}
                              className="rounded-full object-cover"
                            />
                          ) : (
                            <span className="text-lg font-semibold text-slate-500">
                              {(member.firstName?.[0] || "") + (member.lastName?.[0] || "")}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 overflow-hidden">
                          <p className="truncate font-semibold group-hover:text-blue-600">
                            {member.firstName} {member.lastName}
                          </p>
                          <p className="truncate text-sm text-slate-500">
                            {member.title || member.jobTitle || member.role || member.tradeType}
                          </p>
                          {member.yearsExperience && (
                            <p className="text-xs text-slate-400">
                              {member.yearsExperience}+ years
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          {member.isOwner && (
                            <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                              Owner
                            </span>
                          )}
                          <span className="text-xs text-slate-400 opacity-0 transition-opacity group-hover:opacity-100">
                            View Profile →
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Reviews */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-amber-500" />
                  Reviews
                  {reviews.length > 0 && (
                    <span className="text-sm font-normal text-slate-500">
                      ({avgRating.toFixed(1)} avg • {reviews.length} reviews)
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {reviews.length === 0 ? (
                  <p className="text-sm text-slate-500">No reviews yet</p>
                ) : (
                  <div className="space-y-4">
                    {reviews.map((review) => (
                      <div key={review.id} className="rounded-lg border p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {review.Client?.name || "Anonymous"}
                            </span>
                            <div className="flex">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star
                                  key={i}
                                  className={`h-4 w-4 ${
                                    i < review.rating
                                      ? "fill-amber-400 text-amber-400"
                                      : "text-slate-200"
                                  }`}
                                />
                              ))}
                            </div>
                          </div>
                          <span className="text-xs text-slate-400">
                            {new Date(review.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        {review.title && <p className="mt-1 font-medium">{review.title}</p>}
                        <p className="mt-1 text-sm text-slate-600">{review.comment}</p>
                        {review.verified && (
                          <span className="mt-2 inline-flex items-center gap-1 text-xs text-green-600">
                            <Shield className="h-3 w-3" /> Verified Connection
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Quick Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm text-slate-500">
                    <Star className="h-4 w-4 text-amber-500" /> Rating
                  </span>
                  <span className="font-semibold">
                    {avgRating > 0 ? `${avgRating.toFixed(1)} / 5` : "No ratings"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm text-slate-500">
                    <Users className="h-4 w-4" /> Team Size
                  </span>
                  <span className="font-semibold">{company._count.members}</span>
                </div>
                {ownerMember?.foundedYear && (
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-sm text-slate-500">
                      <Clock className="h-4 w-4" /> Founded
                    </span>
                    <span className="font-semibold">{ownerMember.foundedYear}</span>
                  </div>
                )}
                {company.licenseNumber && (
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-sm text-slate-500">
                      <Shield className="h-4 w-4" /> License
                    </span>
                    <span className="font-semibold text-green-600">{company.licenseNumber}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Service Area */}
            {company.serviceArea && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Service Area</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-600">{company.serviceArea}</p>
                </CardContent>
              </Card>
            )}

            {/* Services */}
            {company.specialties && company.specialties.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Briefcase className="h-4 w-4" /> Services
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {company.specialties.map((s) => (
                      <span
                        key={s}
                        className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* CTA */}
            <Card className="bg-gradient-to-br from-blue-50 to-indigo-50">
              <CardContent className="p-6 text-center">
                <h3 className="font-semibold text-gray-900">
                  Interested in working with {company.name}?
                </h3>
                <p className="mt-2 text-sm text-gray-600">
                  Get in touch to discuss your project needs.
                </p>
                {company.phone && (
                  <Button asChild className="mt-4 w-full gap-2">
                    <a href={`tel:${company.phone}`}>
                      <Phone className="h-4 w-4" />
                      Call Now
                    </a>
                  </Button>
                )}
                {company.email && (
                  <Button variant="outline" asChild className="mt-2 w-full gap-2">
                    <a href={`mailto:${company.email}`}>
                      <Mail className="h-4 w-4" />
                      Send Email
                    </a>
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Powered by SkaiScraper */}
            <div className="text-center text-xs text-slate-400">
              <p>
                Powered by{" "}
                <a
                  href="https://skaiscrape.com"
                  className="font-medium text-blue-500 hover:underline"
                >
                  SkaiScraper
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
