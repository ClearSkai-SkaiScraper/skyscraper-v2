import { currentUser } from "@clerk/nextjs/server";
import { ArrowLeft, Award, Briefcase, Globe, Mail, MapPin, Users } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { fetchContractorById } from "@/lib/data/contractors";

export const dynamic = "force-dynamic";

interface ContractorPageProps {
  params: Promise<{ contractorId: string }>;
}

export default async function ContractorDetailPage({ params }: ContractorPageProps) {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const { contractorId } = await params;
  const contractor = await fetchContractorById(contractorId);

  if (!contractor) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      {/* Back Button */}
      <Link
        href="/network/contractors"
        className="inline-flex items-center gap-2 font-medium text-emerald-600 hover:text-emerald-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Network
      </Link>

      {/* Header Card */}
      <div className="overflow-hidden rounded-xl border border-[color:var(--border)] bg-[var(--surface-1)] shadow-lg">
        <div
          className={`h-32 ${contractor.premium ? "bg-gradient-to-r from-amber-500 to-orange-500" : "bg-gradient-to-r from-emerald-600 to-teal-600"}`}
        ></div>
        <div className="-mt-16 p-8">
          <div className="flex items-start gap-6">
            <div
              className={`flex h-32 w-32 items-center justify-center overflow-hidden rounded-xl bg-[var(--surface-1)] shadow-lg ${contractor.premium ? "ring-4 ring-amber-300" : ""}`}
            >
              {contractor.profilePhotoUrl ? (
                <img
                  src={contractor.profilePhotoUrl}
                  alt={contractor.companyName || "Contractor"}
                  className="h-full w-full object-cover"
                />
              ) : (
                <Users className="h-16 w-16 text-emerald-600" />
              )}
            </div>
            <div className="flex-1 pt-12">
              <div className="flex items-start justify-between">
                <div>
                  {contractor.premium && (
                    <div className="mb-2 flex items-center gap-2 font-semibold text-amber-600">
                      <Award className="h-5 w-5" />
                      Premium Member
                    </div>
                  )}
                  <h1 className="mb-2 text-3xl font-bold text-[color:var(--text)]">
                    {contractor.companyName || "Professional Contractor"}
                  </h1>
                  <div className="flex items-center gap-3">
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium capitalize text-emerald-700">
                      {contractor.trade}
                    </span>
                    <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
                      <MapPin className="h-4 w-4" />
                      {contractor.region}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Main Content */}
        <div className="space-y-6 lg:col-span-2">
          {/* About */}
          <div className="rounded-xl border border-[color:var(--border)] bg-[var(--surface-1)] p-6 shadow-sm">
            <h2 className="mb-4 text-2xl font-bold text-[color:var(--text)]">About</h2>
            {contractor.description ? (
              <p className="leading-relaxed text-[color:var(--text)]">{contractor.description}</p>
            ) : (
              <p className="italic text-slate-700 dark:text-slate-300">No description provided</p>
            )}
          </div>

          {/* Specialization */}
          <div className="rounded-xl border border-[color:var(--border)] bg-[var(--surface-1)] p-6 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 text-2xl font-bold text-[color:var(--text)]">
              <Briefcase className="h-6 w-6 text-emerald-600" />
              Trade Specialization
            </h2>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-lg bg-emerald-50 px-4 py-2 font-medium capitalize text-emerald-700">
                {contractor.trade}
              </span>
            </div>
          </div>

          {/* Service Area */}
          <div className="rounded-xl border border-[color:var(--border)] bg-[var(--surface-1)] p-6 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 text-2xl font-bold text-[color:var(--text)]">
              <MapPin className="h-6 w-6 text-emerald-600" />
              Service Area
            </h2>
            <p className="text-lg font-medium text-[color:var(--text)]">{contractor.region}</p>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Contact Information */}
          <div className="rounded-xl border border-[color:var(--border)] bg-[var(--surface-1)] p-6 shadow-sm">
            <h3 className="mb-4 text-xl font-bold text-[color:var(--text)]">Contact Information</h3>
            <div className="space-y-3">
              {contractor.website && (
                <a
                  href={contractor.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 text-emerald-600 transition hover:text-emerald-700"
                >
                  <Globe className="h-5 w-5" />
                  <span className="truncate">{contractor.website.replace(/^https?:\/\//, "")}</span>
                </a>
              )}
              {contractor.contactEmail && (
                <a
                  href={`mailto:${contractor.contactEmail}`}
                  className="flex items-center gap-3 text-[color:var(--text)] transition hover:text-emerald-600"
                >
                  <Mail className="h-5 w-5" />
                  <span className="truncate">{contractor.contactEmail}</span>
                </a>
              )}
            </div>

            {/* Contact Buttons */}
            <div className="mt-6 space-y-3">
              {contractor.website && (
                <a
                  href={contractor.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`block w-full rounded-full px-4 py-3 text-center font-medium text-white shadow-md transition ${
                    contractor.premium
                      ? "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                      : "bg-emerald-600 hover:bg-emerald-700"
                  }`}
                >
                  Visit Website
                </a>
              )}
              {contractor.contactEmail && (
                <a
                  href={`mailto:${contractor.contactEmail}`}
                  className={`block w-full rounded-full border-2 px-4 py-3 text-center font-medium transition ${
                    contractor.premium
                      ? "border-amber-500 text-amber-600 hover:bg-amber-50"
                      : "border-emerald-600 text-emerald-600 hover:bg-emerald-50"
                  }`}
                >
                  Send Email
                </a>
              )}
            </div>
          </div>

          {/* Quick Info */}
          <div
            className={`rounded-xl border p-6 ${
              contractor.premium
                ? "border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50"
                : "border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50"
            }`}
          >
            <h3
              className={`mb-3 text-lg font-bold ${
                contractor.premium ? "text-amber-900" : "text-emerald-900"
              }`}
            >
              Quick Info
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className={contractor.premium ? "text-amber-700" : "text-emerald-700"}>
                  Trade:
                </span>
                <span
                  className={`font-medium capitalize ${contractor.premium ? "text-amber-900" : "text-emerald-900"}`}
                >
                  {contractor.trade}
                </span>
              </div>
              <div className="flex justify-between">
                <span className={contractor.premium ? "text-amber-700" : "text-emerald-700"}>
                  Region:
                </span>
                <span
                  className={`font-medium ${contractor.premium ? "text-amber-900" : "text-emerald-900"}`}
                >
                  {contractor.region}
                </span>
              </div>
              {contractor.premium && (
                <div className="flex justify-between">
                  <span className="text-amber-700">Status:</span>
                  <span className="flex items-center gap-1 font-medium text-amber-900">
                    <Award className="h-4 w-4" />
                    Premium
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
