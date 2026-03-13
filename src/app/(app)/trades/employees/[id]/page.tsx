/**
 * Employee Profile Page
 * Shows individual employee details within the Trades Network
 */

import { ArrowLeft, Award, Briefcase, Mail, MapPin, Phone, Star } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

interface EmployeeProfilePageProps {
  params: { id: string };
}

export default async function EmployeeProfilePage({ params }: EmployeeProfilePageProps) {
  const employee = await prisma.tradesCompanyMember.findFirst({
    where: { id: params.id },
    include: {
      company: {
        select: {
          id: true,
          name: true,
          slug: true,
          logo: true,
          isVerified: true,
          city: true,
          state: true,
        },
      },
    },
  });

  if (!employee) {
    notFound();
  }

  const displayName =
    `${employee.firstName || ""} ${employee.lastName || ""}`.trim() || "Team Member";
  const initials = (employee.firstName?.[0] || "") + (employee.lastName?.[0] || "") || "TM";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/40 to-amber-50/30 p-6">
      <div className="mx-auto max-w-3xl">
        {/* Back Button */}
        <div className="mb-6">
          <Link href={employee.company?.slug ? `/t/${employee.company.slug}` : "/trades"}>
            <Button variant="ghost" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to {employee.company?.name || "Network"}
            </Button>
          </Link>
        </div>

        {/* Profile Header */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col items-center gap-6 md:flex-row md:items-start">
              {/* Avatar */}
              <div className="h-32 w-32 flex-shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg">
                {employee.avatar ? (
                  <img
                    src={employee.avatar}
                    alt={displayName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-3xl font-bold text-white">
                    {initials}
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 text-center md:text-left">
                <h1 className="mb-1 text-2xl font-bold text-slate-900">{displayName}</h1>
                {employee.jobTitle && (
                  <p className="mb-2 flex items-center justify-center gap-2 text-lg text-slate-600 md:justify-start">
                    <Briefcase className="h-4 w-4" />
                    {employee.jobTitle}
                  </p>
                )}

                {/* Company Link */}
                {employee.company && (
                  <Link
                    href={`/t/${employee.company.slug}`}
                    className="mb-4 inline-flex items-center gap-2 text-blue-600 hover:underline"
                  >
                    {employee.company.logo ? (
                      <img
                        src={employee.company.logo}
                        alt={employee.company.name}
                        className="h-6 w-6 rounded object-contain"
                      />
                    ) : (
                      <div className="flex h-6 w-6 items-center justify-center rounded bg-slate-200 text-xs font-bold text-slate-600">
                        {employee.company.name?.[0] || "C"}
                      </div>
                    )}
                    {employee.company.name}
                    {employee.company.isVerified && (
                      <Badge className="bg-blue-100 text-blue-700">Verified</Badge>
                    )}
                  </Link>
                )}

                {/* Location */}
                {employee.company?.city && (
                  <p className="flex items-center justify-center gap-2 text-slate-500 md:justify-start">
                    <MapPin className="h-4 w-4" />
                    {employee.company.city}, {employee.company.state}
                  </p>
                )}
              </div>

              {/* Contact Buttons */}
              <div className="flex gap-2">
                {employee.email && (
                  <a href={`mailto:${employee.email}`} title={`Email ${employee.firstName}`}>
                    <Button variant="outline" size="icon">
                      <Mail className="h-4 w-4" />
                    </Button>
                  </a>
                )}
                {employee.phone && (
                  <a href={`tel:${employee.phone}`} title={`Call ${employee.firstName}`}>
                    <Button variant="outline" size="icon">
                      <Phone className="h-4 w-4" />
                    </Button>
                  </a>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-slate-900">{employee.yearsExperience || 0}</p>
              <p className="text-xs text-slate-500">Years Experience</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-slate-900">
                {employee.specialties?.length || 0}
              </p>
              <p className="text-xs text-slate-500">Specialties</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-slate-900">
                {employee.certifications?.length || 0}
              </p>
              <p className="text-xs text-slate-500">Certifications</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-slate-900">{employee.skills?.length || 0}</p>
              <p className="text-xs text-slate-500">Skills</p>
            </CardContent>
          </Card>
        </div>

        {/* Bio */}
        {employee.bio && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">About</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-slate-700">{employee.bio}</p>
            </CardContent>
          </Card>
        )}

        {/* Specialties */}
        {employee.specialties && employee.specialties.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Star className="h-5 w-5 text-amber-500" />
                Specialties
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {employee.specialties.map((specialty) => (
                  <Badge
                    key={specialty}
                    variant="secondary"
                    className="bg-amber-100 text-amber-800"
                  >
                    {specialty}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Certifications */}
        {employee.certifications && employee.certifications.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Award className="h-5 w-5 text-blue-500" />
                Certifications
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {employee.certifications.map((cert) => (
                  <Badge key={cert} variant="secondary" className="bg-blue-100 text-blue-800">
                    {cert}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Skills */}
        {employee.skills && employee.skills.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Skills</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {employee.skills.map((skill) => (
                  <Badge key={skill} variant="outline">
                    {skill}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Trade Type */}
        {employee.tradeType && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Trade</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge className="bg-slate-800 text-white">{employee.tradeType}</Badge>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
