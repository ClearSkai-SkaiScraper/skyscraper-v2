"use client";

import { Heart, MessageCircle, Search, Star, Trash2, UserCheck, Users } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import PortalPageHero from "@/components/portal/portal-page-hero";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { logger } from "@/lib/logger";

interface ConnectedPro {
  id: string;
  connectionId: string;
  companyName: string | null;
  tradeType: string;
  baseZip: string | null;
  avgRating: number | null;
  yearsExperience: number | null;
  bio: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  connectedAt: string;
  status: string;
}

interface SavedPro {
  id: string;
  companyName: string | null;
  tradeType: string;
  baseZip: string | null;
  avgRating: number | null;
  yearsExperience: number | null;
  bio: string | null;
  savedAt: string;
}

export default function ContractorsPage() {
  const [loading, setLoading] = useState(true);
  const [connectedPros, setConnectedPros] = useState<ConnectedPro[]>([]);
  const [pendingInvites, setPendingInvites] = useState<ConnectedPro[]>([]);
  const [savedPros, setSavedPros] = useState<SavedPro[]>([]);
  const [removing, setRemoving] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("connected");

  useEffect(() => {
    loadPros();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadPros() {
    try {
      setLoading(true);

      // Load connected pros from network API
      const networkRes = await fetch("/api/portal/network");
      if (networkRes.ok) {
        const networkData = await networkRes.json();
        const connections = networkData.connections || [];

        // Filter by connection status — normalize to lowercase for safety
        setConnectedPros(
          connections
            .filter((c: any) => {
              const s = (c.status || "").toLowerCase();
              return s === "connected" || s === "accepted";
            })
            .map(mapConnectionToPro)
        );
        setPendingInvites(
          connections
            .filter((c: any) => (c.status || "").toLowerCase() === "pending")
            .map(mapConnectionToPro)
        );
      }

      // Load saved pros
      const savedRes = await fetch("/api/portal/save-pro");
      if (savedRes.ok) {
        const savedData = await savedRes.json();
        setSavedPros(savedData.savedPros || []);
      }
    } catch (error) {
      logger.error("Failed to load pros:", error);
    } finally {
      setLoading(false);
    }
  }

  function mapConnectionToPro(connection: any): ConnectedPro {
    const proData = connection.pro || connection.contractor || {};
    return {
      id: proData.id || connection.contractorId,
      connectionId: connection.id,
      companyName: proData.name || proData.companyName,
      tradeType: proData.specialties?.[0] || proData.tradeType || "Contractor",
      baseZip: proData.zip || proData.baseZip || proData.location,
      avgRating: proData.rating || proData.avgRating,
      yearsExperience: proData.yearsExperience,
      bio: proData.bio || proData.description,
      phone: proData.phone,
      email: proData.email,
      address: proData.address || proData.location,
      connectedAt: connection.connectedAt || connection.invitedAt,
      status: connection.status,
    };
  }

  async function handleRemove(proId: string) {
    setRemoving(proId);
    try {
      const res = await fetch("/api/portal/save-pro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proId, action: "unsave" }),
      });

      if (!res.ok) {
        throw new Error("Failed to remove");
      }

      setSavedPros((prev) => prev.filter((p) => p.id !== proId));
      toast.success("Pro removed from your collection");
    } catch (error) {
      toast.error("Failed to remove pro");
    } finally {
      setRemoving(null);
    }
  }

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <PortalPageHero
        title="My Trade Professionals"
        subtitle="Your trusted pros and saved favorites. Build your network of reliable trade professionals for all your project needs."
        icon={Heart}
        badge="Your Network"
        gradient="emerald"
        stats={[
          { label: "Connected", value: connectedPros.length },
          { label: "Pending", value: pendingInvites.length },
          { label: "Saved", value: savedPros.length },
        ]}
        action={
          <Button
            asChild
            size="lg"
            className="w-fit bg-white text-emerald-700 shadow-lg hover:bg-emerald-50 dark:bg-slate-800/50"
          >
            <Link href="/portal/find-a-pro">
              <Search className="mr-2 h-5 w-5" />
              Find More Pros
            </Link>
          </Button>
        }
      />

      {loading ? (
        <Card>
          <CardContent className="p-10 text-center text-sm text-slate-600 dark:text-slate-400">
            Loading your contractors…
          </CardContent>
        </Card>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="connected" className="flex items-center gap-2">
              <UserCheck className="h-4 w-4" />
              Connected ({connectedPros.length})
            </TabsTrigger>
            <TabsTrigger value="pending" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Pending ({pendingInvites.length})
            </TabsTrigger>
            <TabsTrigger value="saved" className="flex items-center gap-2">
              <Star className="h-4 w-4" />
              Saved ({savedPros.length})
            </TabsTrigger>
          </TabsList>

          {/* Connected Pros Tab */}
          <TabsContent value="connected">
            {connectedPros.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center p-10 text-center">
                  <div className="mb-4 text-6xl">🤝</div>
                  <h3 className="mb-2 text-lg font-medium">No Connected Contractors Yet</h3>
                  <p className="mb-6 max-w-md text-sm text-muted-foreground">
                    When a contractor accepts your work request, they will appear here with full
                    contact info.
                  </p>
                  <Button asChild size="lg">
                    <Link href="/portal/find-a-pro">
                      <Search className="mr-2 h-5 w-5" />
                      Find Contractors
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 pt-4 md:grid-cols-2">
                {connectedPros.map((pro) => (
                  <Card
                    key={pro.id}
                    className="relative overflow-hidden border-green-200 bg-green-50/30 dark:border-green-800 dark:bg-green-900/20"
                  >
                    <div className="absolute right-2 top-2">
                      <Badge variant="default" className="bg-green-600">
                        <UserCheck className="mr-1 h-3 w-3" />
                        Connected
                      </Badge>
                    </div>
                    <CardHeader className="pb-3">
                      <div className="flex items-start gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-green-400 to-emerald-600 text-lg font-bold text-white">
                          {(pro.companyName || "?")[0].toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <CardTitle className="text-base">
                            {pro.companyName || "Unnamed Contractor"}
                          </CardTitle>
                          <CardDescription className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs">
                              {pro.tradeType}
                            </Badge>
                            {pro.baseZip && (
                              <span className="text-xs text-slate-500 dark:text-slate-400">
                                📍 {pro.baseZip}
                              </span>
                            )}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {pro.bio && (
                        <p className="line-clamp-2 text-sm text-muted-foreground">{pro.bio}</p>
                      )}
                      <div className="space-y-1 rounded-lg border bg-white/50 p-3 text-sm dark:bg-slate-800/50">
                        {pro.phone && (
                          <div className="flex items-center gap-2">
                            <span className="text-slate-500 dark:text-slate-400">📞</span>
                            <a href={`tel:${pro.phone}`} className="text-blue-600 hover:underline">
                              {pro.phone}
                            </a>
                          </div>
                        )}
                        {pro.email && (
                          <div className="flex items-center gap-2">
                            <span className="text-slate-500 dark:text-slate-400">✉️</span>
                            <a
                              href={`mailto:${pro.email}`}
                              className="text-blue-600 hover:underline"
                            >
                              {pro.email}
                            </a>
                          </div>
                        )}
                        {pro.address && (
                          <div className="flex items-center gap-2">
                            <span className="text-slate-500 dark:text-slate-400">📍</span>
                            <span>{pro.address}</span>
                          </div>
                        )}
                        {!pro.phone && !pro.email && !pro.address && (
                          <span className="text-muted-foreground">No contact info on file</span>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {pro.avgRating && (
                            <div className="flex items-center gap-1 text-sm">
                              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                              <span className="font-medium">{pro.avgRating.toFixed(1)}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/portal/messages?proId=${pro.id}`}>
                              <MessageCircle className="mr-1 h-4 w-4" />
                              Message
                            </Link>
                          </Button>
                          <Button size="sm" asChild>
                            <Link href={`/portal/projects/new?proId=${pro.id}`}>Request Work</Link>
                          </Button>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Connected {new Date(pro.connectedAt).toLocaleDateString()}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Pending Invites Tab */}
          <TabsContent value="pending">
            {pendingInvites.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center p-10 text-center">
                  <div className="mb-4 text-6xl">⏳</div>
                  <h3 className="mb-2 text-lg font-medium">No Pending Invites</h3>
                  <p className="mb-6 max-w-md text-sm text-muted-foreground">
                    When you send a work request to a contractor, it will appear here until they
                    respond.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 pt-4 md:grid-cols-2">
                {pendingInvites.map((pro) => (
                  <Card
                    key={pro.id}
                    className="relative overflow-hidden border-yellow-200 bg-yellow-50/30 dark:border-yellow-800 dark:bg-yellow-900/20"
                  >
                    <div className="absolute right-2 top-2">
                      <Badge
                        variant="outline"
                        className="border-yellow-400 bg-yellow-100 text-yellow-700 dark:border-yellow-600 dark:bg-yellow-900/50 dark:text-yellow-300"
                      >
                        ⏳ Pending
                      </Badge>
                    </div>
                    <CardHeader className="pb-3">
                      <div className="flex items-start gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 text-lg font-bold text-white">
                          {(pro.companyName || "?")[0].toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <CardTitle className="text-base">
                            {pro.companyName || "Unnamed Contractor"}
                          </CardTitle>
                          <CardDescription className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs">
                              {pro.tradeType}
                            </Badge>
                            {pro.baseZip && (
                              <span className="text-xs text-slate-500 dark:text-slate-400">
                                📍 {pro.baseZip}
                              </span>
                            )}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {pro.bio && (
                        <p className="line-clamp-2 text-sm text-muted-foreground">{pro.bio}</p>
                      )}
                      <div className="rounded-lg border border-yellow-300 bg-yellow-100 p-3 text-sm text-yellow-800 dark:border-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-200">
                        Contact info will be shared once they accept your request.
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {pro.avgRating && (
                            <div className="flex items-center gap-1 text-sm">
                              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                              <span className="font-medium">{pro.avgRating.toFixed(1)}</span>
                            </div>
                          )}
                        </div>
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/portal/profiles/${pro.id}`}>View Profile</Link>
                        </Button>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Invited {new Date(pro.connectedAt).toLocaleDateString()}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Saved Pros Tab */}
          <TabsContent value="saved">
            {savedPros.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center p-10 text-center">
                  <div className="mb-4 text-6xl">🔍</div>
                  <h3 className="mb-2 text-lg font-medium">No Contractors Saved Yet</h3>
                  <p className="mb-6 max-w-md text-sm text-muted-foreground">
                    Find contractors in your area and save them here for quick access when you need
                    work done.
                  </p>
                  <Button asChild size="lg">
                    <Link href="/portal/find-a-pro">
                      <Search className="mr-2 h-5 w-5" />
                      Find Contractors
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 pt-4 md:grid-cols-2">
                {savedPros.map((pro) => (
                  <Card key={pro.id} className="relative overflow-hidden">
                    <div className="absolute right-2 top-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-400 hover:bg-red-500/10 hover:text-red-500"
                        onClick={() => handleRemove(pro.id)}
                        disabled={removing === pro.id}
                      >
                        <Trash2
                          className={`h-4 w-4 ${removing === pro.id ? "animate-pulse" : ""}`}
                        />
                      </Button>
                    </div>
                    <CardHeader className="pb-3">
                      <div className="flex items-start gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-blue-600 text-lg font-bold text-white">
                          {(pro.companyName || "?")[0].toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <CardTitle className="text-base">
                            {pro.companyName || "Unnamed Contractor"}
                          </CardTitle>
                          <CardDescription className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs">
                              {pro.tradeType}
                            </Badge>
                            {pro.baseZip && (
                              <span className="text-xs text-slate-500 dark:text-slate-400">
                                📍 {pro.baseZip}
                              </span>
                            )}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {pro.bio && (
                        <p className="line-clamp-2 text-sm text-muted-foreground">{pro.bio}</p>
                      )}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {pro.avgRating && (
                            <div className="flex items-center gap-1 text-sm">
                              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                              <span className="font-medium">{pro.avgRating.toFixed(1)}</span>
                            </div>
                          )}
                          {pro.yearsExperience && (
                            <span className="text-xs text-muted-foreground">
                              {pro.yearsExperience}+ yrs exp
                            </span>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/portal/profiles/${pro.id}`}>View Profile</Link>
                          </Button>
                          <Button size="sm" asChild>
                            <Link href={`/portal/projects/new?proId=${pro.id}`}>Request Work</Link>
                          </Button>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Saved {new Date(pro.savedAt).toLocaleDateString()}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
