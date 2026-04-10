// eslint-disable-next-line no-restricted-imports
import { currentUser } from "@clerk/nextjs/server";
import { Award, MapPin, Search, Users } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { PageHero } from "@/components/layout/PageHero";
import { fetchContractors } from "@/lib/data/contractors";

export const dynamic = "force-dynamic";

export default async function ContractorsPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const contractors = await fetchContractors();
  const premiumContractors = contractors.filter((c) => c.premium);

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <PageHero
        section="network"
        title="Contractors Network Directory"
        subtitle="Connect with skilled contractors and trade professionals in your area"
        icon={<Users className="h-5 w-5" />}
      />

      {/* Search & Filter */}
      <div className="rounded-xl border border-[color:var(--border)] bg-[var(--surface-1)] p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 transform text-slate-700 dark:text-slate-300" />
              <input
                type="text"
                placeholder="Search contractors..."
                className="w-full rounded-lg border border-[color:var(--border)] py-3 pl-10 pr-4 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
          <select
            className="rounded-lg border border-[color:var(--border)] px-4 py-3 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
            aria-label="Filter by trade"
          >
            <option value="">All Trades</option>
            <option value="roofer">Roofer</option>
            <option value="biohazard">Biohazard Technician</option>
            <option value="restoration">Restoration Specialist</option>
            <option value="inspector">Inspector</option>
          </select>
          <select
            className="rounded-lg border border-[color:var(--border)] px-4 py-3 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
            aria-label="Filter by region"
          >
            <option value="">All Regions</option>
            <option value="arizona">Arizona</option>
            <option value="texas">Texas</option>
            <option value="california">California</option>
          </select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-[color:var(--border)] bg-[var(--surface-1)] p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
              <Users className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[color:var(--text)]">{contractors.length}</p>
              <p className="text-sm text-slate-700 dark:text-slate-300">Total Contractors</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-[color:var(--border)] bg-[var(--surface-1)] p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
              <Award className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[color:var(--text)]">
                {premiumContractors.length}
              </p>
              <p className="text-sm text-slate-700 dark:text-slate-300">Premium Members</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-[color:var(--border)] bg-[var(--surface-1)] p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
              <MapPin className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[color:var(--text)]">15</p>
              <p className="text-sm text-slate-700 dark:text-slate-300">Regions Covered</p>
            </div>
          </div>
        </div>
      </div>

      {/* Premium Contractors Section */}
      {premiumContractors.length > 0 && (
        <div>
          <div className="mb-4 flex items-center gap-2">
            <Award className="h-6 w-6 text-amber-500" />
            <h2 className="text-2xl font-bold text-[color:var(--text)]">Premium Contractors</h2>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {premiumContractors.map((contractor) => (
              <ContractorCard key={contractor.id} contractor={contractor} isPremium />
            ))}
          </div>
        </div>
      )}

      {/* All Contractors */}
      <div>
        <h2 className="mb-4 text-2xl font-bold text-[color:var(--text)]">All Contractors</h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {contractors.length === 0 ? (
            <div className="col-span-full py-12 text-center">
              <Users className="mx-auto mb-4 h-16 w-16 text-gray-300" />
              <h3 className="mb-2 text-xl font-semibold text-[color:var(--text)]">
                No contractors yet
              </h3>
              <p className="text-slate-700 dark:text-slate-300">
                Be the first to join the network!
              </p>
            </div>
          ) : (
            contractors.map((contractor) => (
              <ContractorCard key={contractor.id} contractor={contractor} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function ContractorCard({
  contractor,
  isPremium = false,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  contractor: any;
  isPremium?: boolean;
}) {
  return (
    <Link
      href={`/network/contractors/${contractor.id}`}
      className={`group block rounded-xl border bg-[var(--surface-1)] p-6 shadow-sm transition-all hover:scale-[1.02] hover:shadow-lg ${
        isPremium
          ? "border-amber-300 bg-gradient-to-br from-white to-amber-50"
          : "border-[color:var(--border)]"
      }`}
    >
      {isPremium && (
        <div className="mb-3 flex items-center gap-1 text-sm font-medium text-amber-600">
          <Award className="h-4 w-4" />
          Premium Member
        </div>
      )}
      <div className="flex items-start gap-4">
        <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-emerald-100 to-teal-100">
          {contractor.profilePhotoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={contractor.profilePhotoUrl}
              alt={contractor.companyName || "Contractor"}
              className="h-full w-full object-cover"
            />
          ) : (
            <Users className="h-8 w-8 text-emerald-600" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="mb-1 truncate text-lg font-semibold text-[color:var(--text)] transition group-hover:text-emerald-600">
            {contractor.companyName || "Professional Contractor"}
          </h3>
          <div className="mb-2 flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
            <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium capitalize text-emerald-700">
              {contractor.trade}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {contractor.region}
            </span>
          </div>
          {contractor.description && (
            <p className="line-clamp-2 text-sm text-slate-700 dark:text-slate-300">
              {contractor.description}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
