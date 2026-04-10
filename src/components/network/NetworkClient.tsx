"use client";

import {
  Briefcase,
  Building2,
  Filter,
  Home,
  Mail,
  MapPin,
  Phone,
  Plus,
  Search,
  Shield,
  TrendingUp,
  UserCheck,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import ContractorSocialCard from "@/components/contractor/ContractorSocialCard";
import { Badge } from "@/components/ui/badge";

// Contact Type Enum (to be added to schema)
type ContactType =
  | "CONTRACTOR"
  | "SUBCONTRACTOR"
  | "REP"
  | "SALES"
  | "CLIENT_HOMEOWNER"
  | "CLIENT_COMMERCIAL"
  | "REALTOR"
  | "BROKER"
  | "PROPERTY_MANAGER"
  | "INDEPENDENT_ADJUSTER"
  | "PUBLIC_ADJUSTER"
  | "OTHER";

interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  company?: string;
  title?: string;
  city?: string;
  state?: string;
  tags?: string[];
  createdAt: Date;
  contactType?: ContactType; // New field to be added
}

interface NetworkClientProps {
  contacts: Contact[];
  contractors: any[];
  stats: {
    totalContacts: number;
    contractorCount: number;
    clientCount: number;
    adjusterCount: number;
  };
}

// Contact type badge colors and icons
const CONTACT_TYPE_CONFIG: Record<
  ContactType,
  { label: string; color: string; icon: any }
> = {
  CONTRACTOR: {
    label: "Contractor",
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    icon: Building2,
  },
  SUBCONTRACTOR: {
    label: "Subcontractor",
    color: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300",
    icon: Briefcase,
  },
  REP: {
    label: "Rep",
    color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
    icon: UserCheck,
  },
  SALES: {
    label: "Sales",
    color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
    icon: TrendingUp,
  },
  CLIENT_HOMEOWNER: {
    label: "Client (Homeowner)",
    color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
    icon: Home,
  },
  CLIENT_COMMERCIAL: {
    label: "Client (Commercial)",
    color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
    icon: Building2,
  },
  REALTOR: {
    label: "Realtor",
    color: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300",
    icon: Home,
  },
  BROKER: {
    label: "Broker",
    color: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
    icon: Briefcase,
  },
  PROPERTY_MANAGER: {
    label: "Property Manager",
    color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    icon: Building2,
  },
  INDEPENDENT_ADJUSTER: {
    label: "Independent Adjuster",
    color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
    icon: Shield,
  },
  PUBLIC_ADJUSTER: {
    label: "Public Adjuster",
    color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
    icon: Shield,
  },
  OTHER: {
    label: "Other",
    color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    icon: Users,
  },
};

export default function NetworkClient({ contacts, contractors, stats }: NetworkClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTab, setSelectedTab] = useState<ContactType | "all">("all");

  // Filter contacts by type and search
  const getFilteredContacts = (type: ContactType | "all") => {
    return contacts.filter((contact) => {
      const matchesType = type === "all" || contact.contactType === type;
      const matchesSearch =
        !searchQuery ||
        contact.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact.company?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesType && matchesSearch;
    });
  };

  // Count contacts by type
  const getContactCount = (type: ContactType | "all") => {
    if (type === "all") return contacts.length;
    return contacts.filter((c) => c.contactType === type).length;
  };

  const filteredContacts = getFilteredContacts(selectedTab);

  // Group contact types for tabs
  const contactTypeTabs: Array<{ type: ContactType | "all"; label: string; icon: any }> = [
    { type: "all", label: "All Contacts", icon: Users },
    { type: "CONTRACTOR", label: "Contractors", icon: Building2 },
    { type: "SUBCONTRACTOR", label: "Subcontractors", icon: Briefcase },
    { type: "CLIENT_HOMEOWNER", label: "Clients (Home)", icon: Home },
    { type: "CLIENT_COMMERCIAL", label: "Clients (Commercial)", icon: Building2 },
    { type: "REALTOR", label: "Realtors", icon: Home },
    { type: "INDEPENDENT_ADJUSTER", label: "Adjusters (Ind.)", icon: Shield },
    { type: "PUBLIC_ADJUSTER", label: "Adjusters (Public)", icon: Shield },
    { type: "REP", label: "Reps", icon: UserCheck },
    { type: "SALES", label: "Sales", icon: TrendingUp },
    { type: "OTHER", label: "Other", icon: Users },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] bg-clip-text text-3xl font-bold text-transparent">
            <span className="text-2xl">🌐</span> Professional Network
          </h1>
          <p className="mt-2 text-[color:var(--muted)]">
            Manage your professional contacts and contractor relationships
          </p>
        </div>
        <Link
          href="/contacts/new"
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] px-4 py-2.5 font-semibold text-white shadow-[var(--glow)] transition hover:scale-[1.02]"
        >
          <Plus className="h-4 w-4" />
          Add Contact
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
        <div className="rounded-2xl border border-[color:var(--border)] bg-[var(--surface-glass)] p-6 backdrop-blur-xl">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-[color:var(--muted)]">
            <Users className="h-4 w-4 text-[var(--primary)]" />
            Total Contacts
          </div>
          <div className="text-3xl font-bold text-[color:var(--text)]">{stats.totalContacts}</div>
          <p className="mt-1 text-xs text-[color:var(--muted)]">In your network</p>
        </div>

        <div className="rounded-2xl border border-[color:var(--border)] bg-[var(--surface-glass)] p-6 backdrop-blur-xl">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-[color:var(--muted)]">
            <Building2 className="h-4 w-4 text-blue-600" />
            Contractors
          </div>
          <div className="text-3xl font-bold text-[color:var(--text)]">{stats.contractorCount}</div>
          <p className="mt-1 text-xs text-[color:var(--muted)]">Active contractors</p>
        </div>

        <div className="rounded-2xl border border-[color:var(--border)] bg-[var(--surface-glass)] p-6 backdrop-blur-xl">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-[color:var(--muted)]">
            <Home className="h-4 w-4 text-green-600" />
            Clients
          </div>
          <div className="text-3xl font-bold text-[color:var(--text)]">{stats.clientCount}</div>
          <p className="mt-1 text-xs text-[color:var(--muted)]">Total clients</p>
        </div>

        <div className="rounded-2xl border border-[color:var(--border)] bg-[var(--surface-glass)] p-6 backdrop-blur-xl">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-[color:var(--muted)]">
            <Shield className="h-4 w-4 text-orange-600" />
            Adjusters
          </div>
          <div className="text-3xl font-bold text-[color:var(--text)]">{stats.adjusterCount}</div>
          <p className="mt-1 text-xs text-[color:var(--muted)]">Total adjusters</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[color:var(--muted)]" />
        <input
          type="text"
          placeholder="Search contacts by name, email, or company..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="focus:ring-[color:var(--primary)]/20 w-full rounded-xl border border-[color:var(--border)] bg-[var(--surface-1)] py-3 pl-11 pr-4 text-[color:var(--text)] placeholder:text-[color:var(--muted)] focus:border-[color:var(--primary)] focus:outline-none focus:ring-2"
        />
      </div>

      {/* Categorized Tabs */}
      <div className="rounded-2xl border border-[color:var(--border)] bg-[var(--surface-glass)] p-6 backdrop-blur-xl">
        <div className="mb-6 flex items-center gap-2">
          <Filter className="h-5 w-5 text-[color:var(--muted)]" />
          <h2 className="text-lg font-semibold text-[color:var(--text)]">Filter by Type</h2>
        </div>

        {/* Tab Buttons */}
        <div className="mb-6 flex flex-wrap gap-2">
          {contactTypeTabs.map((tab) => {
            const Icon = tab.icon;
            const count = getContactCount(tab.type);
            const isActive = selectedTab === tab.type;

            return (
              <button
                key={tab.type}
                onClick={() => setSelectedTab(tab.type)}
                className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
                  isActive
                    ? "bg-[var(--primary)] text-white shadow-lg"
                    : "bg-[var(--surface-1)] text-[color:var(--text)] hover:bg-[var(--surface-2)]"
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
                <Badge
                  variant="secondary"
                  className={`ml-1 ${
                    isActive
                      ? "bg-white/20 text-white"
                      : "bg-[var(--surface-2)] text-[color:var(--muted)]"
                  }`}
                >
                  {count}
                </Badge>
              </button>
            );
          })}
        </div>

        {/* Contacts Table */}
        <div className="overflow-x-auto">
          {filteredContacts.length === 0 ? (
            <div className="py-12 text-center">
              <Users className="mx-auto mb-4 h-16 w-16 text-[color:var(--muted)]" />
              <p className="mb-4 text-[color:var(--muted)]">
                {searchQuery
                  ? "No contacts match your search."
                  : selectedTab === "all"
                  ? "No contacts yet. Add your first contact to build your network!"
                  : `No ${contactTypeTabs.find((t) => t.type === selectedTab)?.label.toLowerCase()} in your network yet.`}
              </p>
              <Link
                href="/contacts/new"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] px-4 py-2 text-sm font-medium text-white shadow-[var(--glow)] transition hover:scale-[1.02]"
              >
                <Plus className="h-4 w-4" />
                Add Contact
              </Link>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-[color:var(--border)]">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-[color:var(--text)]">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-[color:var(--text)]">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-[color:var(--text)]">
                    Company
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-[color:var(--text)]">
                    Contact Info
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-[color:var(--text)]">
                    Location
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-[color:var(--text)]">
                    Added
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredContacts.map((contact) => {
                  const typeConfig = contact.contactType
                    ? CONTACT_TYPE_CONFIG[contact.contactType]
                    : CONTACT_TYPE_CONFIG.OTHER;
                  const TypeIcon = typeConfig.icon;

                  return (
                    <tr
                      key={contact.id}
                      className="cursor-pointer border-b border-[color:var(--border)] transition hover:bg-[var(--surface-1)]"
                    >
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] text-sm font-bold text-white">
                            {contact.firstName?.charAt(0) || ""}
                            {contact.lastName?.charAt(0) || ""}
                          </div>
                          <div>
                            <div className="font-semibold text-[color:var(--text)]">
                              {contact.firstName} {contact.lastName}
                            </div>
                            {contact.title && (
                              <div className="text-xs text-[color:var(--muted)]">
                                {contact.title}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <Badge className={`inline-flex items-center gap-1 ${typeConfig.color}`}>
                          <TypeIcon className="h-3 w-3" />
                          {typeConfig.label}
                        </Badge>
                      </td>
                      <td className="px-4 py-4 text-[color:var(--text)]">
                        {contact.company || "—"}
                      </td>
                      <td className="px-4 py-4">
                        <div className="space-y-1 text-sm">
                          {contact.email && (
                            <div className="flex items-center gap-2 text-[color:var(--text)]">
                              <Mail className="h-3 w-3 text-[color:var(--muted)]" />
                              {contact.email}
                            </div>
                          )}
                          {contact.phone && (
                            <div className="flex items-center gap-2 text-[color:var(--text)]">
                              <Phone className="h-3 w-3 text-[color:var(--muted)]" />
                              {contact.phone}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        {contact.city && contact.state ? (
                          <div className="flex items-center gap-2 text-sm text-[color:var(--text)]">
                            <MapPin className="h-3 w-3 text-[color:var(--muted)]" />
                            {contact.city}, {contact.state}
                          </div>
                        ) : (
                          <span className="text-[color:var(--muted)]">—</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-sm text-[color:var(--muted)]">
                        {new Date(contact.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Results Summary */}
        {filteredContacts.length > 0 && (
          <div className="mt-4 flex items-center justify-between text-sm text-[color:var(--muted)]">
            <div>
              Showing {filteredContacts.length} of {contacts.length} contacts
            </div>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="text-[color:var(--primary)] hover:underline"
              >
                Clear search
              </button>
            )}
          </div>
        )}
      </div>

      {/* Featured Contractors Section - Social Grid */}
      {contractors.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-2xl font-bold text-[color:var(--text)]">
                <span>🏗️</span> Trades Network Directory
              </h2>
              <p className="mt-1 text-sm text-[color:var(--muted)]">
                Browse verified contractors and build your professional network
              </p>
            </div>
            <Link
              href="/directory"
              className="rounded-xl border border-[color:var(--border)] px-4 py-2 text-sm font-medium text-[color:var(--primary)] transition hover:bg-[var(--surface-2)]"
            >
              View Full Directory →
            </Link>
          </div>
          
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {contractors.map((contractor) => (
              <ContractorSocialCard key={contractor.id} contractor={contractor} />
            ))}
          </div>

          {contractors.length === 0 && (
            <div className="rounded-2xl border-2 border-dashed border-[color:var(--border)] bg-[var(--surface-1)] py-16 text-center">
              <div className="mb-4 text-6xl">🏗️</div>
              <h3 className="mb-2 text-xl font-bold text-[color:var(--text)]">
                No Contractors Yet
              </h3>
              <p className="mx-auto mb-6 max-w-md text-[color:var(--muted)]">
                Start building your trades network by adding contractor profiles
              </p>
              <Link
                href="/network/my-profile"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] px-6 py-3 font-semibold text-white shadow-[var(--glow)] transition hover:scale-[1.02]"
              >
                <Plus className="h-5 w-5" />
                Create Contractor Profile
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
