"use client";

import { useOrganization } from "@clerk/nextjs";
import { Archive, Calendar, Lock, RefreshCw, RotateCcw, Trash2, Unlock } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { logger } from "@/lib/logger";

interface ArchivedItem {
  id: string;
  type: "lead" | "claim" | "project";
  title: string;
  archivedAt: string;
  daysSinceArchive: number;
  isColdStorage: boolean;
}

interface ArchiveResponse {
  items: ArchivedItem[];
  meta: {
    total: number;
    coldStorageCount: number;
    hasColdStorageAccess: boolean;
    coldStoragePrice: number;
  };
}

export default function ArchivePage() {
  const { organization } = useOrganization();
  const [data, setData] = useState<ArchiveResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<"recent" | "cold" | null>("recent");

  useEffect(() => {
    fetchArchivedItems();
  }, [organization]);

  const fetchArchivedItems = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/archive?includeColdStorage=true");
      if (!res.ok) throw new Error("Failed to fetch archive");
      const json = await res.json();
      // Compute daysSinceArchive client-side
      const now = Date.now();
      const items = (json.items || []).map((item: any) => ({
        ...item,
        daysSinceArchive: item.archivedAt
          ? Math.floor((now - new Date(item.archivedAt).getTime()) / (1000 * 60 * 60 * 24))
          : 0,
      }));
      setData({ items, meta: json.meta });
    } catch (err) {
      logger.error("Archive fetch error:", err);
      toast.error("Failed to load archived items");
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (item: ArchivedItem) => {
    if (item.isColdStorage && !data?.meta?.hasColdStorageAccess) {
      toast.error("Cold storage access required. Subscribe to access items older than 30 days.");
      return;
    }

    try {
      setRestoring(item.id);
      const res = await fetch(`/api/archive?itemId=${item.id}&itemType=${item.type}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to restore");
      }
      toast.success(`${item.title} restored successfully!`);
      fetchArchivedItems();
    } catch (err) {
      toast.error(err.message || "Failed to restore item");
    } finally {
      setRestoring(null);
    }
  };

  const enableColdStorage = async () => {
    // This would open a Stripe checkout for cold storage subscription
    toast.info("Cold storage subscription coming soon!");
    // TODO: Implement Stripe checkout for $7.99/mo cold storage
  };

  const recentItems = data?.items.filter((i) => !i.isColdStorage) || [];
  const coldItems = data?.items.filter((i) => i.isColdStorage) || [];

  // Group items by year for year-grouped views
  const itemsByYear = useMemo(() => {
    if (!data?.items) return {};
    const groups: Record<string, ArchivedItem[]> = {};
    for (const item of data.items) {
      const year = item.archivedAt ? new Date(item.archivedAt).getFullYear().toString() : "Unknown";
      if (!groups[year]) groups[year] = [];
      groups[year].push(item);
    }
    // Sort years descending
    return Object.fromEntries(Object.entries(groups).sort(([a], [b]) => Number(b) - Number(a)));
  }, [data?.items]);

  // Group by type within year
  const getTypeLabel = (type: string) => {
    switch (type) {
      case "claim":
        return "Client Claims";
      case "lead":
        return "Retail Jobs";
      case "project":
        return "Projects";
      default:
        return "Other";
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "claim":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case "lead":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "project":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return (
      <PageContainer>
        <PageHero
          section="jobs"
          title="Archive"
          subtitle="Items are never deleted. Restore anything, anytime."
          icon={<Archive className="h-6 w-6" />}
        />
        <div className="flex min-h-[400px] items-center justify-center">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHero
        section="jobs"
        title="Archive"
        subtitle="Items are never deleted. Restore anything, anytime."
        icon={<Archive className="h-6 w-6" />}
        actions={
          <div className="flex gap-2">
            <Badge variant="secondary" className="bg-white/20 text-white">
              {data?.items.length || 0} items
            </Badge>
            {coldItems.length > 0 && (
              <Badge variant="secondary" className="bg-amber-500/20 text-white">
                {coldItems.length} in cold storage
              </Badge>
            )}
          </div>
        }
      />

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-full bg-green-100 p-3 dark:bg-green-900">
              <RotateCcw className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{recentItems.length}</p>
              <p className="text-sm text-muted-foreground">Recently Archived</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-full bg-amber-100 p-3 dark:bg-amber-900">
              <Lock className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{coldItems.length}</p>
              <p className="text-sm text-muted-foreground">Cold Storage</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-full bg-blue-100 p-3 dark:bg-blue-900">
              <Trash2 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{data?.items.length || 0}</p>
              <p className="text-sm text-muted-foreground">Total Archived</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cold Storage Banner */}
      {coldItems.length > 0 && !data?.meta?.hasColdStorageAccess && (
        <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <Lock className="h-5 w-5 text-amber-600" />
              <div>
                <p className="font-medium text-amber-900 dark:text-amber-100">
                  {coldItems.length} items in Cold Storage
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  Items older than 30 days require Cold Storage access ($7.99/mo)
                </p>
              </div>
            </div>
            <Button onClick={enableColdStorage} variant="outline" size="sm">
              <Unlock className="mr-2 h-4 w-4" />
              Enable Access
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Archive Tabs */}
      <Tabs defaultValue="by-year" className="w-full">
        <TabsList className="mb-4 grid w-full grid-cols-4">
          <TabsTrigger value="by-year">By Year</TabsTrigger>
          <TabsTrigger value="recent">Recent ({recentItems.length})</TabsTrigger>
          <TabsTrigger value="cold">Cold Storage ({coldItems.length})</TabsTrigger>
          <TabsTrigger value="all">All ({data?.items.length || 0})</TabsTrigger>
        </TabsList>

        {/* Year-Grouped View (DEFAULT) */}
        <TabsContent value="by-year">
          {Object.keys(itemsByYear).length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <div className="flex flex-col items-center justify-center">
                  <Archive className="mb-4 h-12 w-12 text-muted-foreground/50" />
                  <h3 className="mb-2 text-lg font-medium">Nothing Archived</h3>
                  <p className="max-w-md text-center text-muted-foreground">
                    When you archive claims, leads, or projects, they&apos;ll appear here grouped by
                    year.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {Object.entries(itemsByYear).map(([year, yearItems]) => {
                // Group by type within this year
                const byType: Record<string, ArchivedItem[]> = {};
                for (const item of yearItems) {
                  const label = getTypeLabel(item.type);
                  if (!byType[label]) byType[label] = [];
                  byType[label].push(item);
                }

                return (
                  <div
                    key={year}
                    className="rounded-2xl border border-slate-200 bg-gradient-to-b from-slate-50/60 to-transparent p-6 dark:border-slate-700 dark:from-slate-900/30"
                  >
                    <div className="mb-4 flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 shadow-sm dark:bg-slate-800">
                        <Calendar className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white">{year}</h2>
                        <p className="text-sm text-slate-500">
                          {yearItems.length} archived {yearItems.length === 1 ? "item" : "items"}
                        </p>
                      </div>
                    </div>

                    {Object.entries(byType).map(([typeLabel, typeItems]) => (
                      <div key={typeLabel} className="mb-4 last:mb-0">
                        <h3 className="mb-2 text-sm font-semibold text-slate-600 dark:text-slate-400">
                          Finished {typeLabel} {year} ({typeItems.length})
                        </h3>
                        <div className="space-y-2">
                          {typeItems.map((item) => (
                            <ArchiveItemRow
                              key={`${item.type}-${item.id}`}
                              item={item}
                              onRestore={handleRestore}
                              restoring={restoring}
                              getTypeColor={getTypeColor}
                              locked={item.isColdStorage && !data?.meta?.hasColdStorageAccess}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="recent">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RotateCcw className="h-5 w-5" />
                Recently Archived
              </CardTitle>
              <CardDescription>
                Items archived within the last 30 days - always accessible
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recentItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Archive className="mb-4 h-12 w-12 text-muted-foreground/50" />
                  <p className="text-muted-foreground">No recently archived items</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentItems.map((item) => (
                    <ArchiveItemRow
                      key={`${item.type}-${item.id}`}
                      item={item}
                      onRestore={handleRestore}
                      restoring={restoring}
                      getTypeColor={getTypeColor}
                      locked={false}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cold">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Cold Storage
              </CardTitle>
              <CardDescription>
                Items older than 30 days
                {!data?.meta?.hasColdStorageAccess && " - requires $7.99/mo subscription"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {coldItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Lock className="mb-4 h-12 w-12 text-muted-foreground/50" />
                  <p className="text-muted-foreground">No items in cold storage</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {coldItems.map((item) => (
                    <ArchiveItemRow
                      key={`${item.type}-${item.id}`}
                      item={item}
                      onRestore={handleRestore}
                      restoring={restoring}
                      getTypeColor={getTypeColor}
                      locked={!data?.meta?.hasColdStorageAccess}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="all">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Archive className="h-5 w-5" />
                All Archived Items
              </CardTitle>
              <CardDescription>Complete archive history</CardDescription>
            </CardHeader>
            <CardContent>
              {(data?.items.length || 0) === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Archive className="mb-4 h-12 w-12 text-muted-foreground/50" />
                  <h3 className="mb-2 text-lg font-medium">Nothing Archived</h3>
                  <p className="max-w-md text-center text-muted-foreground">
                    When you archive claims, leads, or projects, they&apos;ll appear here. You can
                    restore them at any time.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {data?.items.map((item) => (
                    <ArchiveItemRow
                      key={`${item.type}-${item.id}`}
                      item={item}
                      onRestore={handleRestore}
                      restoring={restoring}
                      getTypeColor={getTypeColor}
                      locked={item.isColdStorage && !data?.meta?.hasColdStorageAccess}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}

// Extracted component for archive item rows
function ArchiveItemRow({
  item,
  onRestore,
  restoring,
  getTypeColor,
  locked,
}: {
  item: ArchivedItem;
  onRestore: (item: ArchivedItem) => void;
  restoring: string | null;
  getTypeColor: (type: string) => string;
  locked: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between rounded-lg border bg-card p-4 transition-colors ${
        locked ? "bg-muted/50 opacity-75" : "hover:bg-accent/50"
      }`}
    >
      <div className="flex items-center gap-3">
        <Badge className={getTypeColor(item.type)}>{item.type}</Badge>
        <div>
          <p className="font-medium">{item.title}</p>
          <p className="text-sm text-muted-foreground">
            Archived {item.daysSinceArchive} days ago
            {item.isColdStorage && " • Cold Storage"}
          </p>
        </div>
      </div>
      {locked ? (
        <Badge variant="outline" className="text-muted-foreground">
          <Lock className="mr-1 h-3 w-3" />
          Locked
        </Badge>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onRestore(item)}
          disabled={restoring === item.id}
        >
          {restoring === item.id ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Restore
            </>
          )}
        </Button>
      )}
    </div>
  );
}
