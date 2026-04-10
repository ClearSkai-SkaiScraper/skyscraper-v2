/*
 * Trades Network - Public Company Page
 * /t/[slug]
 *
 * Features:
 * - Public company profile (no auth required)
 * - Company info, members, services
 * - "Connect" button to request connection
 */

import {
  Building2,
  Globe,
  LogIn,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  UserPlus,
  Users,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

interface CompanyPageProps {
  params: { slug: string };
}

export default async function PublicCompanyPage({ params }: CompanyPageProps) {
  const company = await prisma.tradesCompany.findUnique({
    where: { slug: params.slug },
    include: {
      members: true,
    },
  });

  if (!company || !company.isActive) {
    notFound();
  }

  const serviceAreas = company.serviceArea || [];

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Header */}
      <div className="border-b border-slate-200 bg-gradient-to-r from-slate-50 to-blue-50">
        <div className="mx-auto max-w-5xl px-4 py-8">
          <div className="flex items-start gap-6">
            <div className="flex h-24 w-24 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg">
              {company.logo ? (
                <img
                  src={company.logo}
                  alt={company.name}
                  className="h-full w-full rounded-xl object-cover"
                />
              ) : (
                <Building2 className="h-12 w-12 text-white" />
              )}
            </div>
            <div className="flex-1">
              <h1 className="mb-2 text-3xl font-bold text-slate-900">{company.name}</h1>
              <p className="text-slate-500">Trade Company • SkaiScraper Network</p>
            </div>
            <div className="hidden flex-col gap-2 sm:flex">
              <Link
                href="/sign-up?redirect_url=/trades"
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-blue-700"
              >
                <UserPlus className="h-4 w-4" />
                Connect
              </Link>
              <Link
                href="/sign-in?redirect_url=/trades/messages"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                <MessageCircle className="h-4 w-4" />
                Message
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* About */}
            {company.description && (
              <div className="mb-6 rounded-xl border border-slate-200 bg-white p-6">
                <h2 className="mb-3 text-xl font-semibold text-slate-900">About</h2>
                <p className="leading-relaxed text-slate-600">{company.description}</p>
              </div>
            )}

            {/* Team Members */}
            {company.members.length > 0 && (
              <div className="mb-6 rounded-xl border border-slate-200 bg-white p-6">
                <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold text-slate-900">
                  <Users className="h-5 w-5" />
                  Team
                </h2>
                <div className="space-y-3">
                  {company.members.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50 p-4"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-sm font-bold text-white">
                        {(member.firstName?.[0] || "") + (member.lastName?.[0] || "") || "E"}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900">
                          {member.firstName
                            ? `${member.firstName} ${member.lastName || ""}`.trim()
                            : "Team Member"}
                        </div>
                        <div className="text-sm text-slate-500">
                          {member.jobTitle || member.role}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div>
            {/* Contact Info */}
            <div className="mb-6 rounded-xl border border-slate-200 bg-white p-6">
              <h2 className="mb-4 text-lg font-semibold text-slate-900">Contact</h2>
              <div className="space-y-3">
                {company.phone && (
                  <div className="flex items-center gap-3 text-sm">
                    <Phone className="h-4 w-4 text-slate-400" />
                    <a href={`tel:${company.phone}`} className="hover:text-blue-600">
                      {company.phone}
                    </a>
                  </div>
                )}
                {company.email && (
                  <div className="flex items-center gap-3 text-sm">
                    <Mail className="h-4 w-4 text-slate-400" />
                    <a href={`mailto:${company.email}`} className="hover:text-blue-600">
                      {company.email}
                    </a>
                  </div>
                )}
                {company.website && (
                  <div className="flex items-center gap-3 text-sm">
                    <Globe className="h-4 w-4 text-slate-400" />
                    <a
                      href={company.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-blue-600"
                    >
                      {company.website.replace(/^https?:\/\//, "")}
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Service Areas */}
            {serviceAreas.length > 0 && (
              <div className="mb-6 rounded-xl border border-slate-200 bg-white p-6">
                <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900">
                  <MapPin className="h-4 w-4" />
                  Service Areas
                </h2>
                <div className="flex flex-wrap gap-2">
                  {serviceAreas.map((area, idx) => (
                    <span
                      key={idx}
                      className="rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700"
                    >
                      {area}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* CTA Card */}
            <div className="rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 p-6 text-white">
              <h3 className="mb-2 text-lg font-bold">Join the Network</h3>
              <p className="mb-4 text-sm text-blue-100">
                Connect with {company.name} and thousands of trade professionals.
              </p>
              <div className="flex flex-col gap-2">
                <Link
                  href="/sign-up"
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-bold text-blue-600 transition hover:bg-blue-50"
                >
                  <UserPlus className="h-4 w-4" />
                  Join Free
                </Link>
                <Link
                  href="/sign-in"
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/30 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  <LogIn className="h-4 w-4" />
                  Sign In
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
