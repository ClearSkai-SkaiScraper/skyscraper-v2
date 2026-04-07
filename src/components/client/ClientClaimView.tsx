"use client";

import { format } from "date-fns";
import { Clock, FileText, Image, MessageSquare } from "lucide-react";
import { useEffect, useState } from "react";

import ClaimMessages from "@/components/claims/ClaimMessages";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import { PageSectionCard } from "@/components/layout/PageSectionCard";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ClaimData {
  id: string;
  claimNumber: string;
  propertyAddress: string;
  propertyCity: string;
  propertyState: string;
  propertyZip: string;
  status: string;
  lossDate: string;
  lossType: string;
  createdAt: string;
}

interface Photo {
  id: string;
  photoUrl: string;
  caption: string | null;
  category: string | null;
  createdAt: string;
}

interface TimelineEvent {
  id: string;
  type: string;
  title: string;
  body: string | null;
  createdAt: string;
}

interface ClientClaimViewProps {
  claimId: string;
}

export function ClientClaimView({ claimId }: ClientClaimViewProps) {
  const [claim, setClaim] = useState<ClaimData | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadClaimData();
  }, [claimId]);

  const loadClaimData = async () => {
    try {
      const response = await fetch(`/api/client/claims/${claimId}`);
      if (!response.ok) {
        if (response.status === 403) {
          throw new Error("You don't have access to this claim");
        }
        throw new Error("Failed to load claim data");
      }

      const data = await response.json();
      setClaim(data.claim);
      setPhotos(data.photos || []);
      setTimeline(data.timeline || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load claim");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <PageContainer>
        <Skeleton className="mb-6 h-24 w-full" />
        <Skeleton className="h-96 w-full" />
      </PageContainer>
    );
  }

  if (error || !claim) {
    return (
      <PageContainer>
        <PageSectionCard>
          <div className="py-12 text-center">
            <p className="text-red-600 dark:text-red-400">{error || "Claim not found"}</p>
          </div>
        </PageSectionCard>
      </PageContainer>
    );
  }

  return (
    <PageContainer maxWidth="7xl">
      <PageHero
        section="claims"
        title={`Claim #${claim.claimNumber}`}
        description={`${claim.propertyAddress}, ${claim.propertyCity}, ${claim.propertyState} ${claim.propertyZip}`}
        icon={<FileText className="h-6 w-6" />}
      >
        <Badge variant="outline" className="text-sm">
          {claim.status}
        </Badge>
      </PageHero>

      <div className="space-y-6">
        {/* Claim Details */}
        <PageSectionCard title="Claim Information">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Loss Date</p>
              <p className="font-medium">{format(new Date(claim.lossDate), "MMM d, yyyy")}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Loss Type</p>
              <p className="font-medium">{claim.lossType || "Not specified"}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Claim Status</p>
              <Badge>{claim.status}</Badge>
            </div>
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Filed Date</p>
              <p className="font-medium">{format(new Date(claim.createdAt), "MMM d, yyyy")}</p>
            </div>
          </div>
        </PageSectionCard>

        {/* Tabs for Photos, Timeline, Messages */}
        <Tabs defaultValue="photos" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="photos">
              <Image className="mr-2 h-4 w-4" />
              Photos ({photos.length})
            </TabsTrigger>
            <TabsTrigger value="timeline">
              <Clock className="mr-2 h-4 w-4" />
              Timeline ({timeline.length})
            </TabsTrigger>
            <TabsTrigger value="messages">
              <MessageSquare className="mr-2 h-4 w-4" />
              Messages
            </TabsTrigger>
          </TabsList>

          <TabsContent value="photos">
            <PageSectionCard title="Shared Photos">
              {photos.length === 0 ? (
                <div className="py-12 text-center">
                  <Image className="mx-auto mb-3 h-12 w-12 text-slate-400" />
                  <p className="text-slate-500 dark:text-slate-400">
                    No photos have been shared yet
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                  {photos.map((photo) => (
                    <div
                      key={photo.id}
                      className="group relative aspect-square overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800"
                    >
                      <img
                        src={photo.photoUrl}
                        alt={photo.caption || "Claim photo"}
                        className="h-full w-full object-cover"
                      />
                      {photo.caption && (
                        <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-2 text-xs text-white">
                          {photo.caption}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </PageSectionCard>
          </TabsContent>

          <TabsContent value="timeline">
            <PageSectionCard title="Claim Timeline">
              {timeline.length === 0 ? (
                <div className="py-12 text-center">
                  <Clock className="mx-auto mb-3 h-12 w-12 text-slate-400" />
                  <p className="text-slate-500 dark:text-slate-400">No timeline updates yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {timeline.map((event, index) => (
                    <div key={event.id} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="h-3 w-3 rounded-full bg-blue-600" />
                        {index !== timeline.length - 1 && (
                          <div className="mt-2 w-0.5 flex-1 bg-slate-200 dark:bg-slate-700" />
                        )}
                      </div>
                      <div className="flex-1 pb-6">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-medium text-slate-900 dark:text-slate-100">
                              {event.title}
                            </h4>
                            {event.body && (
                              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                                {event.body}
                              </p>
                            )}
                          </div>
                          <Badge variant="outline" className="ml-4">
                            {event.type}
                          </Badge>
                        </div>
                        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                          {format(new Date(event.createdAt), "MMM d, yyyy h:mm a")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </PageSectionCard>
          </TabsContent>

          <TabsContent value="messages">
            <PageSectionCard title="Messages">
              <ClaimMessages claimId={claimId} />
            </PageSectionCard>
          </TabsContent>
        </Tabs>
      </div>
    </PageContainer>
  );
}
