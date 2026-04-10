/*
 * PHASE 3: Trades Companies Directory
 */

"use client";

import { Award, Building2, MapPin, Phone, Search, Users } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import { PageSectionCard } from "@/components/layout/PageSectionCard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { logger } from "@/lib/logger";

interface TradesCompany {
  id: string;
  name: string;
  specialty: string;
  licenseNumber: string | null;
  city: string | null;
  state: string | null;
  phone: string | null;
  verified: boolean;
  memberCount: number;
}

export default function TradesCompaniesPage() {
  const [companies, setCompanies] = useState<TradesCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSpecialty, setSelectedSpecialty] = useState<string | null>(null);

  useEffect(() => {
    void fetchCompanies();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSpecialty]);

  const fetchCompanies = async () => {
    try {
      const url = selectedSpecialty
        ? `/api/trades/companies?specialty=${encodeURIComponent(selectedSpecialty)}`
        : "/api/trades/companies";
      const response = await fetch(url);
      const data = await response.json();
      setCompanies(data.companies || []);
    } catch (error) {
      logger.error("Failed to fetch companies:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCompanies = companies.filter((company) =>
    company.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const specialties = ["Roofing", "Solar", "HVAC", "Restoration", "General Contractor"];

  return (
    <PageContainer>
      <PageHero
        title="Network Companies"
        subtitle="Verified roofing, solar, and restoration professionals in the Skai Network"
        section="trades"
      />

      <PageSectionCard title="Companies Directory">
        <div className="mb-6 flex flex-col gap-4 md:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search companies..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border py-2 pl-10 pr-4"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={selectedSpecialty === null ? "default" : "outline"}
              onClick={() => setSelectedSpecialty(null)}
              size="sm"
            >
              All
            </Button>
            {specialties.map((specialty) => (
              <Button
                key={specialty}
                variant={selectedSpecialty === specialty ? "default" : "outline"}
                onClick={() => setSelectedSpecialty(specialty)}
                size="sm"
              >
                {specialty}
              </Button>
            ))}
          </div>
        </div>

        <div className="mb-8 grid gap-4 md:grid-cols-3">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <Building2 className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{companies.length}</p>
                <p className="text-sm text-muted-foreground">Companies</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">
                  {companies.reduce((sum, c) => sum + c.memberCount, 0)}
                </p>
                <p className="text-sm text-muted-foreground">Employees</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <Award className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{companies.filter((c) => c.verified).length}</p>
                <p className="text-sm text-muted-foreground">Verified</p>
              </div>
            </div>
          </Card>
        </div>

        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <p className="text-muted-foreground">Loading...</p>
          </div>
        ) : filteredCompanies.length === 0 ? (
          <div className="flex h-64 items-center justify-center">
            <p className="text-muted-foreground">No companies found</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredCompanies.map((company) => (
              <Card key={company.id} className="p-6">
                <div className="mb-4 flex items-start justify-between">
                  <div>
                    <div className="mb-2 flex items-center gap-2">
                      <h3 className="text-xl font-bold">{company.name}</h3>
                      {company.verified && <Award className="h-5 w-5 text-blue-600" />}
                    </div>
                    <span className="inline-block rounded-full bg-primary/10 px-2 py-1 text-xs font-medium">
                      {(company as any).specialties?.[0] || (company as any).specialty || "General"}
                    </span>
                  </div>
                </div>

                {company.licenseNumber && (
                  <p className="mb-3 text-sm text-muted-foreground">
                    License: {company.licenseNumber}
                  </p>
                )}

                {company.city && (
                  <div className="mb-3 flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4" />
                    <span>
                      {company.city}, {company.state}
                    </span>
                  </div>
                )}

                {company.phone && (
                  <div className="mb-4 flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4" />
                    <a href={`tel:${company.phone}`}>{company.phone}</a>
                  </div>
                )}

                <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>{company.memberCount} employees</span>
                </div>

                <Link href={`/trades/companies/${company.id}`}>
                  <Button className="w-full">View Profile</Button>
                </Link>
              </Card>
            ))}
          </div>
        )}
      </PageSectionCard>
    </PageContainer>
  );
}
