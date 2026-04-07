/**
 * Client Portal - Company Page
 * Shows company profile with Contact and Employees tabs.
 * Linked from individual pro profiles via "View Company Page" button.
 */

"use client";

import {
  ArrowLeft,
  Award,
  BadgeCheck,
  Building2,
  Calendar,
  Crown,
  ExternalLink,
  Globe,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Shield,
  ShieldCheck,
  Star,
  Users,
  Verified,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface CompanyData {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logo?: string;
  coverImage?: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  specialties: string[];
  serviceArea: string[];
  yearsInBusiness?: number;
  licenseNumber?: string;
  insuranceVerified: boolean;
  isVerified: boolean;
  rating: number;
  reviewCount: number;
}

interface Employee {
  id: string;
  firstName?: string;
  lastName?: string;
  name: string;
  avatar?: string;
  jobTitle: string;
  tradeType?: string;
  bio?: string;
  isOwner: boolean;
  isAdmin: boolean;
  role: string;
  specialties: string[];
  certifications: string[];
  yearsExperience?: number;
  city?: string;
  state?: string;
}

export default function CompanyPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const slug = params?.slug;

  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState<CompanyData | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    void loadCompany();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  async function loadCompany() {
    try {
      const res = await fetch(`/api/portal/company/${slug}`);
      if (!res.ok) {
        throw new Error("Company not found");
      }
      const data = await res.json();
      setCompany(data.company);
      setEmployees(data.employees || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load company");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          <p className="text-slate-500">Loading company...</p>
        </div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <Building2 className="mx-auto mb-4 h-12 w-12 text-slate-400" />
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Company Not Found</h2>
          <p className="mt-2 text-slate-500">{error || "This company page is unavailable."}</p>
          <Button variant="outline" className="mt-4" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
          </Button>
        </div>
      </div>
    );
  }

  const location = [company.city, company.state].filter(Boolean).join(", ");
  const initials = company.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const currentYear = new Date().getFullYear();
  const yearsInBusiness = company.yearsInBusiness || null;

  return (
    <div className="space-y-6">
      {/* Back Link */}
      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      {/* Company Header */}
      <div className="overflow-hidden rounded-2xl bg-white shadow-xl dark:bg-slate-900">
        {/* Cover Image */}
        <div className="relative h-40 overflow-hidden bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-600 md:h-56">
          {company.coverImage?.startsWith("http") && (
            <Image
              src={company.coverImage}
              alt={`${company.name} cover`}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 1200px"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

          {/* Verification Badge */}
          {company.isVerified && (
            <div className="absolute right-4 top-4">
              <Badge className="bg-blue-500 px-3 py-1 text-white shadow-lg">
                <BadgeCheck className="mr-1 h-4 w-4" />
                Verified Company
              </Badge>
            </div>
          )}
        </div>

        {/* Company Info */}
        <div className="relative px-6 pb-6">
          <div className="-mt-14 flex flex-col items-center gap-4 md:-mt-12 md:flex-row md:items-end">
            {/* Logo */}
            {company.logo?.startsWith("http") ? (
              <div className="h-28 w-28 flex-shrink-0 overflow-hidden rounded-2xl border-4 border-white bg-white shadow-xl dark:border-slate-900 md:h-32 md:w-32">
                <Image
                  src={company.logo}
                  alt={company.name}
                  width={128}
                  height={128}
                  className="h-full w-full object-contain p-2"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                    (e.target as HTMLImageElement).parentElement!.innerHTML =
                      `<div class="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-600 text-3xl font-bold text-white">${initials}</div>`;
                  }}
                />
              </div>
            ) : (
              <div className="flex h-28 w-28 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl border-4 border-white bg-gradient-to-br from-blue-500 to-indigo-600 shadow-xl dark:border-slate-900 md:h-32 md:w-32">
                <span className="text-3xl font-bold text-white">{initials}</span>
              </div>
            )}

            <div className="flex-1 pb-2 pt-2 text-center md:text-left">
              <div className="flex items-center justify-center gap-2 md:justify-start">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white md:text-3xl">
                  {company.name}
                </h1>
                {company.isVerified && <Verified className="h-6 w-6 text-blue-500" />}
              </div>
              {company.description && (
                <p className="mt-1 max-w-2xl text-slate-500 dark:text-slate-400">
                  {company.description}
                </p>
              )}
              {location && (
                <p className="mt-1 flex items-center justify-center gap-1 text-sm text-slate-500 md:justify-start">
                  <MapPin className="h-4 w-4" />
                  {location}
                </p>
              )}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="mt-6 grid grid-cols-2 gap-4 rounded-xl bg-slate-50 p-4 dark:bg-slate-800 md:grid-cols-4">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-xl font-bold text-slate-900 dark:text-white">
                <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
                {company.rating?.toFixed(1) || "5.0"}
              </div>
              <p className="text-sm text-slate-500">{company.reviewCount || 0} reviews</p>
            </div>
            {yearsInBusiness && (
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-xl font-bold text-slate-900 dark:text-white">
                  <Calendar className="h-5 w-5 text-blue-500" />
                  {yearsInBusiness}
                </div>
                <p className="text-sm text-slate-500">Years in Business</p>
              </div>
            )}
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-xl font-bold text-slate-900 dark:text-white">
                <Users className="h-5 w-5 text-purple-500" />
                {employees.length}
              </div>
              <p className="text-sm text-slate-500">Team Members</p>
            </div>
            {company.specialties.length > 0 && (
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-xl font-bold text-slate-900 dark:text-white">
                  <Award className="h-5 w-5 text-green-500" />
                  {company.specialties.length}
                </div>
                <p className="text-sm text-slate-500">Specialties</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabbed Content */}
      <Tabs defaultValue="contact" className="space-y-6">
        <TabsList className="w-full justify-start border-b border-slate-200 dark:border-slate-700">
          <TabsTrigger value="contact" className="gap-2">
            <Phone className="h-4 w-4" />
            Contact
          </TabsTrigger>
          <TabsTrigger value="employees" className="gap-2">
            <Users className="h-4 w-4" />
            Employees
          </TabsTrigger>
        </TabsList>

        {/* Contact Tab */}
        <TabsContent value="contact" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {company.phone && (
                <a
                  href={`tel:${company.phone}`}
                  className="flex items-center gap-3 rounded-xl bg-slate-50 p-4 transition-colors hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
                    <Phone className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Phone</p>
                    <p className="font-semibold text-slate-900 dark:text-white">{company.phone}</p>
                  </div>
                </a>
              )}
              {company.email && (
                <a
                  href={`mailto:${company.email}`}
                  className="flex items-center gap-3 rounded-xl bg-slate-50 p-4 transition-colors hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
                    <Mail className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Email</p>
                    <p className="font-semibold text-slate-900 dark:text-white">{company.email}</p>
                  </div>
                </a>
              )}
              {company.website && (
                <a
                  href={
                    company.website.startsWith("http")
                      ? company.website
                      : `https://${company.website}`
                  }
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
              {(company.address || location) && (
                <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-4 dark:bg-slate-800">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900">
                    <MapPin className="h-6 w-6 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Address</p>
                    <p className="font-semibold text-slate-900 dark:text-white">
                      {company.address || location}
                    </p>
                    {company.address && location && (
                      <p className="text-sm text-slate-500">
                        {location} {company.zip}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Credentials */}
          {(company.licenseNumber || company.insuranceVerified) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-green-600" />
                  Credentials
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  {company.licenseNumber && (
                    <div className="rounded-xl border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
                      <div className="flex items-center gap-3">
                        <Award className="h-8 w-8 text-green-600" />
                        <div>
                          <p className="font-semibold text-green-800 dark:text-green-200">
                            Licensed
                          </p>
                          <p className="text-sm text-green-700 dark:text-green-300">
                            License #{company.licenseNumber}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  {company.insuranceVerified && (
                    <div className="rounded-xl border border-purple-200 bg-purple-50 p-4 dark:border-purple-800 dark:bg-purple-900/20">
                      <div className="flex items-center gap-3">
                        <ShieldCheck className="h-8 w-8 text-purple-600" />
                        <div>
                          <p className="font-semibold text-purple-800 dark:text-purple-200">
                            Insurance Verified
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Specialties */}
          {company.specialties.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Specialties</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {company.specialties.map((s, i) => (
                    <Badge key={i} variant="outline" className="px-3 py-1.5 text-sm">
                      {s}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Service Areas */}
          {company.serviceArea.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-red-500" />
                  Service Areas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {company.serviceArea.map((area, i) => (
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

        {/* Employees Tab */}
        <TabsContent value="employees" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-indigo-600" />
                Team Members
              </CardTitle>
              <CardDescription>
                {employees.length} {employees.length === 1 ? "member" : "members"} on the team
              </CardDescription>
            </CardHeader>
            <CardContent>
              {employees.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {employees.map((emp) => {
                    const empInitials = emp.name
                      .split(" ")
                      .map((w) => w[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase();
                    const empLocation = [emp.city, emp.state].filter(Boolean).join(", ");

                    return (
                      <Link
                        key={emp.id}
                        href={`/portal/profiles/${emp.id}`}
                        className="group block"
                      >
                        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-blue-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-900 dark:hover:border-blue-600">
                          {/* Role Badge */}
                          {(emp.isOwner || emp.isAdmin) && (
                            <div className="mb-3">
                              <Badge
                                className={
                                  emp.isOwner
                                    ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                                    : "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                                }
                              >
                                {emp.isOwner ? (
                                  <>
                                    <Crown className="mr-1 h-3 w-3" /> Owner / Admin
                                  </>
                                ) : (
                                  <>
                                    <ShieldCheck className="mr-1 h-3 w-3" /> Admin
                                  </>
                                )}
                              </Badge>
                            </div>
                          )}

                          {/* Avatar + Info */}
                          <div className="flex items-start gap-4">
                            {emp.avatar?.startsWith("http") ? (
                              <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-full">
                                <Image
                                  src={emp.avatar}
                                  alt={emp.name}
                                  width={56}
                                  height={56}
                                  className="h-full w-full object-cover"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = "none";
                                    (e.target as HTMLImageElement).parentElement!.innerHTML =
                                      `<div class="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600 text-lg font-bold text-white">${empInitials}</div>`;
                                  }}
                                />
                              </div>
                            ) : (
                              <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600">
                                <span className="text-lg font-bold text-white">{empInitials}</span>
                              </div>
                            )}

                            <div className="min-w-0 flex-1">
                              <h3 className="truncate font-semibold text-slate-900 group-hover:text-blue-600 dark:text-white dark:group-hover:text-blue-400">
                                {emp.name}
                              </h3>
                              <p className="text-sm text-slate-500">{emp.jobTitle}</p>
                              {empLocation && (
                                <p className="mt-1 flex items-center gap-1 text-xs text-slate-400">
                                  <MapPin className="h-3 w-3" />
                                  {empLocation}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Bio snippet */}
                          {emp.bio && (
                            <p className="mt-3 line-clamp-2 text-sm text-slate-500">{emp.bio}</p>
                          )}

                          {/* Specialties */}
                          {emp.specialties.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-1">
                              {emp.specialties.slice(0, 3).map((s, i) => (
                                <Badge key={i} variant="secondary" className="text-xs">
                                  {s}
                                </Badge>
                              ))}
                              {emp.specialties.length > 3 && (
                                <Badge variant="secondary" className="text-xs">
                                  +{emp.specialties.length - 3}
                                </Badge>
                              )}
                            </div>
                          )}

                          {/* Years + Certs */}
                          <div className="mt-3 flex items-center gap-3 text-xs text-slate-400">
                            {emp.yearsExperience && (
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {emp.yearsExperience}yr exp
                              </span>
                            )}
                            {emp.certifications.length > 0 && (
                              <span className="flex items-center gap-1">
                                <Award className="h-3 w-3" />
                                {emp.certifications.length} cert
                                {emp.certifications.length !== 1 ? "s" : ""}
                              </span>
                            )}
                          </div>

                          {/* View Profile CTA */}
                          <p className="mt-3 text-center text-xs font-medium text-blue-600 opacity-0 transition-opacity group-hover:opacity-100 dark:text-blue-400">
                            View Profile →
                          </p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Users className="mb-4 h-12 w-12 text-slate-300" />
                  <p className="text-slate-500">No team members listed yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
