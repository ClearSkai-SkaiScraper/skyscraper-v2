"use client";

import { Building2, Loader2, MapPin, Search, Star, User, Users, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useDebouncedCallback } from "use-debounce";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { logger } from "@/lib/logger";

interface SearchResult {
  companies: Array<{
    id: string;
    name: string;
    slug: string;
    logo: string | null;
    city: string | null;
    state: string | null;
    specialties: string[];
    rating: string | null;
    verified: boolean;
  }>;
  members: Array<{
    id: string;
    firstName: string | null;
    lastName: string | null;
    avatar: string | null;
    tradeType: string | null;
    jobTitle: string | null;
    specialties: string[];
    company: {
      id: string;
      name: string;
      logo: string | null;
      verified: boolean;
      city: string | null;
      state: string | null;
    } | null;
  }>;
}

export function TradesSearchBar() {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResult | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const search = useDebouncedCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults(null);
      setIsOpen(false);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/trades/search?q=${encodeURIComponent(searchQuery)}&limit=10`);
      if (res.ok) {
        const data = await res.json();
        setResults(data);
        setIsOpen(true);
      }
    } catch (error) {
      logger.error("Search error:", error);
    } finally {
      setLoading(false);
    }
  }, 300);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    void search(value);
  };

  const clearSearch = () => {
    setQuery("");
    setResults(null);
    setIsOpen(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const hasResults = results && (results.companies.length > 0 || results.members.length > 0);

  return (
    <div ref={containerRef} className="relative w-full md:w-80">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          value={query}
          onChange={handleInputChange}
          onFocus={() => results && setIsOpen(true)}
          placeholder="Search contractors, companies..."
          className="bg-white/80 pl-10 pr-10 dark:bg-slate-800/80"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-blue-500" />
        )}
        {query && !loading && (
          <button
            onClick={clearSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            aria-label="Clear search"
            title="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Search Results Dropdown */}
      {isOpen && query && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-[70vh] overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
          {!hasResults && !loading && (
            <div className="p-6 text-center text-slate-500">
              <Users className="mx-auto mb-2 h-8 w-8 text-slate-300" />
              <p>No results found for &quot;{query}&quot;</p>
              <p className="mt-1 text-sm">Try searching for a company or contractor name</p>
            </div>
          )}

          {/* Companies Section */}
          {results && results.companies.length > 0 && (
            <div className="border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase text-slate-500 dark:bg-slate-800">
                <Building2 className="h-3 w-3" />
                Companies
              </div>
              {results.companies.map((company) => (
                <Link
                  key={company.id}
                  href={`/trades/companies/${company.slug || company.id}`}
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <Avatar className="h-10 w-10 border border-slate-200">
                    <AvatarImage src={company.logo || undefined} />
                    <AvatarFallback className="bg-gradient-to-br from-blue-600 to-indigo-600 text-sm font-bold text-white">
                      {company.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium text-slate-900 dark:text-white">
                        {company.name}
                      </span>
                      {company.verified && (
                        <Badge className="h-5 bg-blue-100 px-1.5 text-xs text-blue-700">
                          ✓ Verified
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      {company.city && company.state && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {company.city}, {company.state}
                        </span>
                      )}
                      {company.rating && (
                        <span className="flex items-center gap-1 text-amber-500">
                          <Star className="h-3 w-3 fill-current" />
                          {parseFloat(company.rating).toFixed(1)}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* Members Section */}
          {results && results.members.length > 0 && (
            <div>
              <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase text-slate-500 dark:bg-slate-800">
                <User className="h-3 w-3" />
                Contractors
              </div>
              {results.members.map((member) => {
                const name =
                  `${member.firstName || ""} ${member.lastName || ""}`.trim() || "Contractor";
                return (
                  <Link
                    key={member.id}
                    href={`/trades/profiles/${member.id}`}
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    <Avatar className="h-10 w-10 border border-slate-200">
                      <AvatarImage src={member.avatar || undefined} />
                      <AvatarFallback className="bg-gradient-to-br from-green-600 to-emerald-600 text-sm font-bold text-white">
                        {name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-medium text-slate-900 dark:text-white">
                          {name}
                        </span>
                        {member.tradeType && (
                          <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                            {member.tradeType}
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-slate-500">
                        {member.jobTitle && <span>{member.jobTitle}</span>}
                        {member.company && (
                          <span>
                            {member.jobTitle && " at "}
                            {member.company.name}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          {/* View All Results Link */}
          {hasResults && (
            <Link
              href={`/trades/directory?q=${encodeURIComponent(query)}`}
              onClick={() => setIsOpen(false)}
              className="block border-t border-slate-100 bg-slate-50 px-4 py-3 text-center text-sm font-medium text-blue-600 transition-colors hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700"
            >
              View all results for &quot;{query}&quot;
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
