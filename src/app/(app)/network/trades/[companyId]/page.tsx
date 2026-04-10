import { auth } from "@clerk/nextjs/server";
import { Building2, Mail, MapPin, Phone, Users } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import prisma from "@/lib/prisma";

interface TradesCompanyDetailPageProps {
  params: Promise<{
    companyId: string;
  }>;
}

export default async function TradesCompanyDetailPage({ params }: TradesCompanyDetailPageProps) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const resolvedParams = await params;
  const { companyId } = resolvedParams;

  // Get user's org
  const user = await prisma.users.findUnique({
    where: { clerkUserId: userId },
    select: { orgId: true },
  });

  if (!user?.orgId) {
    return notFound();
  }

  // Get company with members - tradesCompany has no orgId, so we find by id
  const company = await prisma.tradesCompany.findUnique({
    where: { id: companyId },
    include: {
      members: true,
    },
  });

  if (!company) {
    return notFound();
  }

  // Filter members by status - status is on tradesCompanyMember
  const activeMembers = company.members.filter(
    (m) => m.status === "active" && m.onboardingStep !== "pending_admin"
  );
  const pendingMembers = company.members.filter((m) => m.onboardingStep === "pending_admin");

  // tradesCompany doesn't have projects, so we skip that section
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const projects: any[] = [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-6">
          <Link
            href="/network/trades"
            className="mb-3 inline-block text-sm text-blue-600 hover:text-blue-700"
          >
            ← Back to Trades Network
          </Link>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="flex items-center gap-3 text-3xl font-bold text-gray-900">
                <Building2 className="h-8 w-8 text-blue-600" />
                {company.name}
              </h1>
              <div className="mt-3 flex items-center gap-4 text-sm">
                <span
                  className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                    company.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {company.isActive ? "Active" : "Inactive"}
                </span>
                {company.isVerified && (
                  <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-800">
                    Verified
                  </span>
                )}
                <span className="text-gray-600">
                  {activeMembers.length} Active Member{activeMembers.length !== 1 ? "s" : ""}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Company Info */}
          <div className="space-y-6 lg:col-span-2">
            {/* Details Card */}
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">Company Details</h2>
              <div className="space-y-3">
                {company.address && (
                  <div className="flex items-start gap-3">
                    <MapPin className="mt-0.5 h-5 w-5 text-gray-400" />
                    <div>
                      <div className="text-sm font-medium text-gray-500">Address</div>
                      <div className="text-sm text-gray-900">{company.address}</div>
                    </div>
                  </div>
                )}
                {company.email && (
                  <div className="flex items-start gap-3">
                    <Mail className="mt-0.5 h-5 w-5 text-gray-400" />
                    <div>
                      <div className="text-sm font-medium text-gray-500">Email</div>
                      <div className="text-sm text-gray-900">
                        <a
                          href={`mailto:${company.email}`}
                          className="text-blue-600 hover:text-blue-700"
                        >
                          {company.email}
                        </a>
                      </div>
                    </div>
                  </div>
                )}
                {company.phone && (
                  <div className="flex items-start gap-3">
                    <Phone className="mt-0.5 h-5 w-5 text-gray-400" />
                    <div>
                      <div className="text-sm font-medium text-gray-500">Phone</div>
                      <div className="text-sm text-gray-900">
                        <a
                          href={`tel:${company.phone}`}
                          className="text-blue-600 hover:text-blue-700"
                        >
                          {company.phone}
                        </a>
                      </div>
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-3">
                  <div className="text-sm font-medium text-gray-500">Joined</div>
                  <div className="text-sm text-gray-900">
                    {company.createdAt ? new Date(company.createdAt).toLocaleDateString() : "—"}
                  </div>
                </div>

                {/* Specialties */}
                {company.specialties && company.specialties.length > 0 && (
                  <div className="mt-4">
                    <div className="text-sm font-medium text-gray-500">Specialties</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {company.specialties.map((spec) => (
                        <span
                          key={spec}
                          className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-700"
                        >
                          {spec}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Active Members */}
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
                <Users className="h-5 w-5" />
                Active Members
              </h2>
              {activeMembers.length === 0 ? (
                <p className="text-sm text-gray-600">No active members</p>
              ) : (
                <div className="space-y-3">
                  {activeMembers.map((member) => (
                    <div key={member.id} className="flex items-start gap-3">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {[member.firstName, member.lastName].filter(Boolean).join(" ") ||
                            member.email ||
                            "Unknown"}
                        </p>
                        <p className="text-xs text-gray-600">{member.role}</p>
                        {member.email && <p className="text-xs text-gray-500">{member.email}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pending Members */}
            {pendingMembers.length > 0 && (
              <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-lg font-semibold text-gray-900">Pending Approval</h2>
                <div className="space-y-3">
                  {pendingMembers.map((member) => (
                    <div key={member.id} className="flex items-start gap-3">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {[member.firstName, member.lastName].filter(Boolean).join(" ") ||
                            member.email ||
                            "Unknown"}
                        </p>
                        <p className="text-xs text-gray-600">{member.role}</p>
                        {member.email && <p className="text-xs text-gray-500">{member.email}</p>}
                      </div>
                      <span className="rounded-full bg-yellow-100 px-2 py-1 text-xs text-yellow-800">
                        Pending
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
