/**
 * /retail/projects/page.tsx
 *
 * List all retail packets for current user
 * Features:
 * - Table view with packet status
 * - Resume/Edit/Export actions
 * - Filter by status (draft/complete)
 * - Sort by updated_at
 */

"use client";

import { useUser } from "@clerk/nextjs";
import { formatDistanceToNow } from "date-fns";
import { AlertCircle, ExternalLink, FileText, Loader2, Plus } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const dynamic = "force-dynamic";

interface RetailPacket {
  id: string;
  current_step: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
  created_at: string;
  updated_at: string;
}

export default function RetailProjectsPage() {
  const { user, isLoaded } = useUser();
  const [packets, setPackets] = useState<RetailPacket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded || !user) return;

    const fetchPackets = async () => {
      try {
        const response = await fetch("/api/retail/list");
        const result = await response.json();

        if (result.ok) {
          setPackets(result.packets || []);
        } else {
          setError(result.error || "Failed to load packets");
        }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (_err) {
        setError("Network error");
      } finally {
        setLoading(false);
      }
    };

    void fetchPackets();
  }, [user, isLoaded]);

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!user) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Please sign in to view your packets</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="container mx-auto max-w-7xl py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Retail Packets</h1>
          <p className="text-muted-foreground">Manage and export your retail proposals</p>
        </div>
        <Link href="/retail/generate">
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Plus className="mr-2 h-4 w-4" />
            New Packet
          </Button>
        </Link>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!loading && !error && packets.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-gray-600 dark:text-gray-400" />
            <p className="mt-4 text-lg font-medium text-gray-900">No packets yet</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Create your first retail packet to get started
            </p>
            <Link href="/retail/generate">
              <Button className="mt-4 bg-blue-600 hover:bg-blue-700">
                <Plus className="mr-2 h-4 w-4" />
                Create Packet
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {!loading && !error && packets.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Packets ({packets.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Property</TableHead>
                  <TableHead>Step</TableHead>
                  <TableHead>Last Updated</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {packets.map((packet) => {
                  const isComplete = packet.current_step === 8;
                  const clientName = packet.data?.insured_name || "Untitled";
                  const propertyAddress = packet.data?.propertyAddress || "N/A";

                  return (
                    <TableRow key={packet.id}>
                      <TableCell className="font-medium">{clientName}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {propertyAddress}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">Step {packet.current_step} / 8</span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(packet.updated_at), {
                          addSuffix: true,
                        })}
                      </TableCell>
                      <TableCell>
                        {isComplete ? (
                          <Badge variant="default" className="bg-green-600">
                            Complete
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Draft</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Link href={`/retail/generate?resume=${packet.id}`}>
                            <Button variant="outline" size="sm">
                              {isComplete ? "View" : "Resume"}
                            </Button>
                          </Link>
                          {isComplete && (
                            <Link href={`/api/export/pdf?mode=retail&id=${packet.id}`}>
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-blue-600 text-blue-600 hover:bg-blue-50"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            </Link>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
