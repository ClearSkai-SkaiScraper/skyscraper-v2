"use client";

import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Loader2,
  MapPin,
  Search,
  Shield,
  UserPlus,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { logger } from "@/lib/logger";

interface Company {
  id: string;
  name: string;
  slug?: string;
  logo?: string;
  city?: string;
  state?: string;
  specialties?: string[];
  verified?: boolean;
  description?: string;
}

export default function JoinCompanyPage() {
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [search, setSearch] = useState("");
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [jobTitle, setJobTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [hasCompany, setHasCompany] = useState(false);

  useEffect(() => {
    void loadCompanies();
  }, []);

  const loadCompanies = async () => {
    try {
      // Check if user already has a company
      const profileRes = await fetch("/api/trades/company");
      if (profileRes.ok) {
        const data = await profileRes.json();
        if (data.company) {
          setHasCompany(true);
          setLoading(false);
          return;
        }
      }

      // Fetch available companies
      const res = await fetch("/api/trades/companies/search");
      if (res.ok) {
        const data = await res.json();
        setCompanies(data.companies || []);
      }
    } catch (error) {
      logger.error("Failed to load companies:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitRequest = async () => {
    if (!selectedCompany) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/trades/company/join-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId: selectedCompany.id,
          jobTitle,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit request");
      }

      setSubmitted(true);
      toast.success("Request sent! The company admin will review it.");
    } catch (error) {
      toast.error(error.message || "Failed to submit request");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/40 to-amber-50/30">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (hasCompany) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/40 to-amber-50/30 p-6">
        <Card className="max-w-md text-center">
          <CardContent className="p-8">
            <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-green-500" />
            <h1 className="mb-2 text-xl font-semibold">Already in a Company</h1>
            <p className="mb-4 text-gray-600">
              You are already part of a company. Leave your current company before joining another.
            </p>
            <Link href="/trades/company">
              <Button>View Your Company</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/40 to-amber-50/30 p-6">
        <Card className="max-w-md text-center">
          <CardContent className="p-8">
            <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-green-500" />
            <h1 className="mb-2 text-xl font-semibold">Request Sent! 🎉</h1>
            <p className="mb-2 text-gray-600">
              Your request to join <strong>{selectedCompany?.name}</strong> has been submitted.
            </p>
            <p className="mb-6 text-sm text-gray-500">
              The company admin will review your request. You&apos;ll be added to the team once
              approved.
            </p>
            <Link href="/trades">
              <Button>Back to Trades</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const filteredCompanies = companies.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.city?.toLowerCase().includes(search.toLowerCase()) ||
      c.state?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/40 to-amber-50/30 p-6">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-6 flex items-center gap-4">
          <Link href="/trades">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Join a Company</h1>
            <p className="text-sm text-gray-600">
              Request to join an existing company on the Trades network
            </p>
          </div>
        </div>

        {/* If a company is selected, show the request form */}
        {selectedCompany ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-lg">
                <Building2 className="h-5 w-5 text-blue-600" />
                Request to Join {selectedCompany.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border bg-blue-50 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
                    <Building2 className="h-6 w-6 text-blue-700" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{selectedCompany.name}</p>
                    {(selectedCompany.city || selectedCompany.state) && (
                      <p className="flex items-center gap-1 text-sm text-gray-500">
                        <MapPin className="h-3 w-3" />
                        {[selectedCompany.city, selectedCompany.state].filter(Boolean).join(", ")}
                      </p>
                    )}
                  </div>
                  {selectedCompany.verified && (
                    <Badge className="ml-auto bg-blue-100 text-blue-700">
                      <Shield className="mr-1 h-3 w-3" />
                      Verified
                    </Badge>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="job-title">Your Job Title *</Label>
                <Input
                  id="job-title"
                  placeholder="e.g. Lead Roofer, Project Manager, Electrician..."
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                />
                <p className="text-xs text-gray-500">
                  This is the role you&apos;ll hold at the company
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setSelectedCompany(null)}
                  className="flex-1"
                >
                  Back to Search
                </Button>
                <Button
                  onClick={handleSubmitRequest}
                  disabled={submitting || !jobTitle.trim()}
                  className="flex-1"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <UserPlus className="mr-2 h-4 w-4" />
                      Send Join Request
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Search */}
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search companies by name or location..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Company List */}
            <div className="space-y-3">
              {filteredCompanies.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center">
                    <Building2 className="mx-auto mb-3 h-10 w-10 text-gray-400" />
                    <p className="text-gray-600">
                      {search
                        ? "No companies found matching your search"
                        : "No companies available"}
                    </p>
                    <p className="mt-1 text-sm text-gray-500">
                      Ask your company admin for an invite code instead
                    </p>
                  </CardContent>
                </Card>
              ) : (
                filteredCompanies.map((company) => (
                  <Card
                    key={company.id}
                    className="cursor-pointer transition-all hover:border-blue-300 hover:shadow-md"
                    onClick={() => setSelectedCompany(company)}
                  >
                    <CardContent className="flex items-center gap-4 p-4">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-blue-100">
                        {company.logo ? (
                          <img
                            src={company.logo}
                            alt={company.name}
                            className="h-14 w-14 rounded-lg object-cover"
                          />
                        ) : (
                          <Building2 className="h-7 w-7 text-blue-600" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate font-semibold text-gray-900">{company.name}</p>
                          {company.verified && (
                            <Badge
                              variant="secondary"
                              className="shrink-0 bg-blue-100 text-blue-700"
                            >
                              <Shield className="mr-1 h-3 w-3" />
                              Verified
                            </Badge>
                          )}
                        </div>
                        {(company.city || company.state) && (
                          <p className="flex items-center gap-1 text-sm text-gray-500">
                            <MapPin className="h-3 w-3" />
                            {[company.city, company.state].filter(Boolean).join(", ")}
                          </p>
                        )}
                        {company.specialties && company.specialties.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {company.specialties.slice(0, 3).map((s) => (
                              <Badge key={s} variant="outline" className="text-xs">
                                {s}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <UserPlus className="h-5 w-5 shrink-0 text-blue-600" />
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
