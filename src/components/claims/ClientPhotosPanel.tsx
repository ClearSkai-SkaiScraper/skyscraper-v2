import { format } from "date-fns";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import prisma from "@/lib/prisma";
import { cn } from "@/lib/utils";

interface ClientPhotosPanelProps {
  claimId: string;
}

export async function ClientPhotosPanel({ claimId }: ClientPhotosPanelProps) {
  // Fetch only photos uploaded by CLIENTs for this claim
  // Note: documents model doesn't have claimId, using FileAsset instead
  const photos = await prisma.file_assets.findMany({
    where: {
      claimId,
      source: "client", // Use source field instead of uploadedByRole
      mimeType: { startsWith: "image/" },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
            Client Uploaded
          </span>
          Homeowner Photos
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!photos.length ? (
          <p className="text-sm text-muted-foreground">
            No client photos have been uploaded for this claim yet.
          </p>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              {photos.length} photo{photos.length !== 1 ? "s" : ""} uploaded by the homeowner
            </p>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
              {photos.map((photo) => (
                <a
                  key={photo.id}
                  href={photo.publicUrl}
                  target="_blank"
                  rel="noreferrer"
                  className={cn(
                    "group relative overflow-hidden rounded-lg border bg-muted/40",
                    "transition hover:border-primary/60 hover:bg-muted"
                  )}
                >
                  {/* Image preview */}
                  {photo.mimeType?.startsWith("image/") ? (
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.publicUrl}
                      alt={photo.filename}
                      className="h-32 w-full object-cover transition-transform group-hover:scale-[1.03]"
                    />
                  ) : (
                    <div className="flex h-32 items-center justify-center px-2 text-center text-xs text-muted-foreground">
                      {photo.filename}
                    </div>
                  )}

                  {/* Overlay info */}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                    <p className="truncate text-xs font-medium text-white">{photo.filename}</p>
                    <p className="mt-0.5 text-[10px] text-white/80">
                      {format(new Date(photo.createdAt), "MMM d, h:mma")}
                    </p>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
