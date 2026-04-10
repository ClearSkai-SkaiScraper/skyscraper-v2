/* eslint-disable no-restricted-syntax */
/**
 * Company Detail Page
 * View a trades company profile, members, reviews, and featured work
 */

// eslint-disable-next-line no-restricted-imports
import { currentUser } from "@clerk/nextjs/server";
import {
  Award,
  Briefcase,
  Building2,
  Clock,
  Eye,
  Globe,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Shield,
  Star,
  Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import prisma from "@/lib/prisma";

import CompanyShareButton from "./_components/CompanyShareButton";

export const dynamic = "force-dynamic";

export default async function CompanyDetailPage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const { companyId } = await params;

  // Fetch company with members and stats
  const company = await prisma.tradesCompany.findUnique({
    where: { id: companyId },
    include: {
      members: {
        where: { isActive: true },
        select: {
          id: true,
          userId: true,
          firstName: true,
          lastName: true,
          avatar: true,
          tradeType: true,
          role: true,
          isOwner: true,
          title: true,
          yearsExperience: true,
          certifications: true,
          tagline: true,
          foundedYear: true,
        },
        orderBy: [{ isOwner: "desc" }, { createdAt: "asc" }],
      },
      _count: {
        select: { members: true },
      },
    },
  });

  if (!company) notFound();

  // Get tagline and foundedYear from owner/first member
  const ownerMember = company.members.find((m) => m.isOwner) || company.members[0];

  // Fetch reviews for this company
  const reviews = await prisma.trade_reviews
    .findMany({
      where: {
        contractorId: companyId,
        status: "published",
      },
      include: {
        Client: {
          select: { name: true, avatarUrl: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    })
    .catch(() => []);

  const avgRating =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : Number(company.rating) || 0;

  // Check if current user is a member
  const currentMember = company.members.find((m) => m.userId === user.id);
  const isOwner = currentMember?.isOwner;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-amber-50/20 p-4 lg:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Company Header */}
        <Card className="overflow-hidden">
          {/* Cover Image */}
          <div className="relative h-48 overflow-hidden rounded-t-xl bg-gradient-to-r from-blue-600 to-indigo-700">
            {company.coverimage && (
              <Image src={company.coverimage} alt={company.name} fill className="object-cover" />
            )}
            {company.isVerified && (
              <div className="absolute right-4 top-4 flex items-center gap-2 rounded-full bg-white/90 px-3 py-1 text-sm font-medium text-blue-700">
                <Shield className="h-4 w-4" />
                Verified
              </div>
            )}
          </div>

          <div className="relative z-10 p-6">
            <div className="flex items-start gap-6">
              {/* Logo */}
              <div className="-mt-16 flex h-24 w-24 items-center justify-center rounded-2xl border-4 border-white bg-white shadow-lg">
                {company.logo ? (
                  <Image
                    src={company.logo}
                    alt={company.name}
                    width={80}
                    height={80}
                    className="rounded-xl object-cover"
                  />
                ) : (
                  <Building2 className="h-12 w-12 text-slate-400" />
                )}
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl font-bold">{company.name}</h1>
                  {company.isVerified && <Award className="h-6 w-6 text-blue-600" />}
                </div>
                {ownerMember?.tagline && (
                  <p className="mt-1 text-lg text-slate-600">{ownerMember.tagline}</p>
                )}

                <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-500">
                  {company.city && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {company.city}, {company.state}
                    </span>
                  )}
                  {company.phone && (
                    <a
                      href={`tel:${company.phone}`}
                      className="flex items-center gap-1 hover:text-blue-600"
                    >
                      <Phone className="h-4 w-4" />
                      {company.phone}
                    </a>
                  )}
                  {company.email && (
                    <a
                      href={`mailto:${company.email}`}
                      className="flex items-center gap-1 hover:text-blue-600"
                    >
                      <Mail className="h-4 w-4" />
                      {company.email}
                    </a>
                  )}
                  {company.website && (
                    <a
                      href={company.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 hover:text-blue-600"
                    >
                      <Globe className="h-4 w-4" />
                      Website
                    </a>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                {isOwner && (
                  <>
                    <Link href={`/trades/companies/${companyId}/public`}>
                      <Button variant="outline" className="gap-2">
                        <Eye className="h-4 w-4" />
                        Client View
                      </Button>
                    </Link>
                    <Link href="/trades/profile">
                      <Button variant="outline">Edit Company</Button>
                    </Link>
                  </>
                )}
                <CompanyShareButton
                  url={`${process.env.NEXT_PUBLIC_BASE_URL || "https://www.skaiscrape.com"}/trades/companies/${companyId}/public`}
                  title={company.name}
                />
                <Link href={`/trades/messages?company=${companyId}`}>
                  <Button>
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Message
                  </Button>
                </Link>
              </div>
            </div>

            {/* Specialties */}
            {company.specialties && company.specialties.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {company.specialties.map((s) => (
                  <span
                    key={s}
                    className="rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                  >
                    {s}
                  </span>
                ))}
              </div>
            )}
          </div>
        </Card>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column */}
          <div className="space-y-6 lg:col-span-2">
            {/* About */}
            {company.description && (
              <Card>
                <CardHeader>
                  <CardTitle>About</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-line text-slate-600 dark:text-slate-300">
                    {company.description}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Team Members - Employees of the Company */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Our Team ({company._count.members})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2">
                  {company.members.map((member) => (
                    <Link
                      key={member.id}
                      href={`/trades/profiles/${member.id}/public`}
                      className="group flex items-center gap-3 rounded-lg border p-3 transition-all hover:border-blue-300 hover:bg-blue-50/50 hover:shadow-md dark:hover:border-blue-700 dark:hover:bg-blue-950/20"
                    >
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 transition-transform group-hover:scale-105">
                        {member.avatar ? (
                          <Image
                            src={member.avatar}
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
                          {member.title || member.role || member.tradeType}
                        </p>
                        {member.yearsExperience && (
                          <p className="text-xs text-slate-400">
                            {member.yearsExperience}+ years experience
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

          {/* Right Column - Stats */}
          <div className="space-y-6">
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
          </div>
        </div>
      </div>
    </div>
  );
}
