"use client";

import {
  Briefcase,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  DollarSign,
  Filter,
  Plus,
  Search,
  Wrench,
  X,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const JOBS_PER_PAGE = 25;

interface RetailJob {
  id: string;
  title: string;
  jobCategory: string;
  stage: string;
  value: number | null;
  createdAt: Date;
  contacts: {
    firstName: string | null;
    lastName: string | null;
    street: string | null;
    city: string | null;
    state: string | null;
  } | null;
}

const JOB_CATEGORIES = [
  { id: "out_of_pocket", label: "Out of Pocket", icon: DollarSign, color: "bg-amber-500" },
  { id: "financed", label: "Financed", icon: CreditCard, color: "bg-green-500" },
  { id: "repair", label: "Repair", icon: Wrench, color: "bg-slate-500" },
];

const STAGES = [
  { id: "new", label: "New" },
  { id: "qualified", label: "Qualified" },
  { id: "proposal", label: "Proposal" },
  { id: "negotiation", label: "Negotiation" },
  { id: "won", label: "Won" },
  { id: "lost", label: "Lost" },
];

interface RetailJobsClientProps {
  jobs: RetailJob[];
  totalValue: number;
  jobsByCategory: {
    out_of_pocket: RetailJob[];
    financed: RetailJob[];
    repair: RetailJob[];
  };
}

export default function RetailJobsClient({
  jobs,
  totalValue,
  jobsByCategory,
}: RetailJobsClientProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedStages, setSelectedStages] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);

  // Filter jobs based on search and filters
  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      // Search filter
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        !searchTerm ||
        job.title?.toLowerCase().includes(searchLower) ||
        job.contacts?.firstName?.toLowerCase().includes(searchLower) ||
        job.contacts?.lastName?.toLowerCase().includes(searchLower) ||
        job.contacts?.city?.toLowerCase().includes(searchLower) ||
        job.contacts?.street?.toLowerCase().includes(searchLower);

      // Category filter
      const matchesCategory =
        selectedCategories.length === 0 || selectedCategories.includes(job.jobCategory);

      // Stage filter
      const matchesStage = selectedStages.length === 0 || selectedStages.includes(job.stage);

      return matchesSearch && matchesCategory && matchesStage;
    });
  }, [jobs, searchTerm, selectedCategories, selectedStages]);

  // Pagination
  const totalPages = Math.ceil(filteredJobs.length / JOBS_PER_PAGE);
  const paginatedJobs = useMemo(() => {
    const startIndex = (currentPage - 1) * JOBS_PER_PAGE;
    return filteredJobs.slice(startIndex, startIndex + JOBS_PER_PAGE);
  }, [filteredJobs, currentPage]);

  // Reset to page 1 when filters change
  const resetToFirstPage = () => setCurrentPage(1);

  const hasActiveFilters = selectedCategories.length > 0 || selectedStages.length > 0;

  const clearFilters = () => {
    setSelectedCategories([]);
    setSelectedStages([]);
    setSearchTerm("");
    resetToFirstPage();
  };

  const toggleCategory = (categoryId: string) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryId) ? prev.filter((c) => c !== categoryId) : [...prev, categoryId]
    );
    resetToFirstPage();
  };

  const toggleStage = (stageId: string) => {
    setSelectedStages((prev) =>
      prev.includes(stageId) ? prev.filter((s) => s !== stageId) : [...prev, stageId]
    );
    resetToFirstPage();
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    resetToFirstPage();
  };

  return (
    <>
      {/* Stats Row */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
        {/* Total Value */}
        <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 dark:border-amber-800 dark:from-amber-900/30 dark:to-orange-900/30">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-amber-800 dark:text-amber-200">
              <DollarSign className="h-4 w-4" />
              Total Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">
              ${(totalValue / 100).toLocaleString()}
            </p>
            <p className="text-xs text-amber-600">{jobs.length} jobs</p>
          </CardContent>
        </Card>

        {/* Category Cards */}
        {JOB_CATEGORIES.map((cat) => {
          const catJobs = jobsByCategory[cat.id as keyof typeof jobsByCategory] || [];
          const catValue = catJobs.reduce((sum, j) => sum + (j.value || 0), 0);
          const Icon = cat.icon;

          return (
            <Card key={cat.id}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                  <div className={`rounded-full ${cat.color} p-1.5`}>
                    <Icon className="h-3 w-3 text-white" />
                  </div>
                  {cat.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{catJobs.length}</p>
                <p className="text-xs text-slate-500">${(catValue / 100).toLocaleString()}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Search & Filter */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name, address, or city..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full rounded-lg border bg-white py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className={hasActiveFilters ? "border-amber-500" : ""}>
                  <Filter className="mr-2 h-4 w-4" />
                  Filter
                  {hasActiveFilters && (
                    <Badge variant="secondary" className="ml-2 h-5 min-w-5 px-1">
                      {selectedCategories.length + selectedStages.length}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Category</DropdownMenuLabel>
                {JOB_CATEGORIES.map((cat) => (
                  <DropdownMenuCheckboxItem
                    key={cat.id}
                    checked={selectedCategories.includes(cat.id)}
                    onCheckedChange={() => toggleCategory(cat.id)}
                  >
                    {cat.label}
                  </DropdownMenuCheckboxItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Stage</DropdownMenuLabel>
                {STAGES.map((stage) => (
                  <DropdownMenuCheckboxItem
                    key={stage.id}
                    checked={selectedStages.includes(stage.id)}
                    onCheckedChange={() => toggleStage(stage.id)}
                  >
                    {stage.label}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="mr-1 h-4 w-4" />
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Results count */}
      {(searchTerm || hasActiveFilters || filteredJobs.length > JOBS_PER_PAGE) && (
        <p className="mb-4 text-sm text-slate-500">
          Showing {Math.min((currentPage - 1) * JOBS_PER_PAGE + 1, filteredJobs.length)}-
          {Math.min(currentPage * JOBS_PER_PAGE, filteredJobs.length)} of {filteredJobs.length} jobs
          {filteredJobs.length !== jobs.length && ` (filtered from ${jobs.length})`}
        </p>
      )}

      {/* Jobs List */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Recent Jobs</h2>

        {filteredJobs.length === 0 ? (
          <Card className="p-12 text-center">
            <Briefcase className="mx-auto h-12 w-12 text-slate-300" />
            <h3 className="mt-4 text-lg font-semibold">
              {jobs.length === 0 ? "No retail jobs yet" : "No jobs match your filters"}
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              {jobs.length === 0
                ? "Route a lead from the pipeline or create a new job"
                : "Try adjusting your search or filters"}
            </p>
            {jobs.length === 0 ? (
              <Button asChild className="mt-4 bg-amber-600 hover:bg-amber-700">
                <Link href="/jobs/retail/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Create New Job
                </Link>
              </Button>
            ) : (
              <Button variant="outline" className="mt-4" onClick={clearFilters}>
                Clear Filters
              </Button>
            )}
          </Card>
        ) : (
          <div className="grid gap-3">
            {paginatedJobs.map((job) => {
              return (
                <Link key={job.id} href={`/jobs/retail/${job.id}`}>
                  <Card className="group overflow-hidden border-slate-200/60 transition-all hover:border-amber-300 hover:shadow-md dark:border-slate-800 dark:hover:border-amber-700">
                    <CardContent className="flex items-center gap-4 p-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                            {job.title}
                          </h3>
                          <Badge
                            variant="outline"
                            className={
                              job.stage === "new"
                                ? "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                                : job.stage === "qualified"
                                  ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"
                                  : "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
                            }
                          >
                            {job.stage}
                          </Badge>
                          <Badge
                            variant="outline"
                            className="border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                          >
                            {JOB_CATEGORIES.find((c) => c.id === job.jobCategory)?.label ||
                              job.jobCategory}
                          </Badge>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-500 dark:text-slate-400">
                          {job.contacts && (
                            <span>
                              {job.contacts.firstName} {job.contacts.lastName}
                            </span>
                          )}
                          {job.contacts?.city && (
                            <span>
                              {job.contacts.city}, {job.contacts.state}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="shrink-0">
                        <span className="text-sm font-semibold text-slate-900 dark:text-white">
                          ${((job.value || 0) / 100).toLocaleString()}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>

            <div className="flex items-center gap-1">
              {/* First page */}
              <Button
                variant={currentPage === 1 ? "default" : "outline"}
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setCurrentPage(1)}
              >
                1
              </Button>

              {/* Ellipsis if needed */}
              {currentPage > 3 && <span className="px-2 text-slate-400">...</span>}

              {/* Pages around current */}
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((page) => {
                  if (page === 1 || page === totalPages) return false;
                  return Math.abs(page - currentPage) <= 1;
                })
                .map((page) => (
                  <Button
                    key={page}
                    variant={currentPage === page ? "default" : "outline"}
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </Button>
                ))}

              {/* Ellipsis if needed */}
              {currentPage < totalPages - 2 && <span className="px-2 text-slate-400">...</span>}

              {/* Last page */}
              {totalPages > 1 && (
                <Button
                  variant={currentPage === totalPages ? "default" : "outline"}
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setCurrentPage(totalPages)}
                >
                  {totalPages}
                </Button>
              )}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
