"use client";

import { formatDistanceToNow } from "date-fns";
import { Building2, FileText, Loader2, Plus, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { logger } from "@/lib/logger";

interface NoticePack {
  id: string;
  community: string;
  stormDate: Date;
  mode: string;
  status: string;
  homeCount: number;
  sentCount: number;
  sentAt?: Date;
  createdAt: Date;
}

export default function HoaNoticesPage() {
  const router = useRouter();
  const [notices, setNotices] = useState<NoticePack[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    void fetchNotices();
  }, []);

  const fetchNotices = async () => {
    try {
      const res = await fetch("/api/hoa/notices");
      if (res.ok) {
        const data = await res.json();
        setNotices(data.notices || []);
      }
    } catch (error) {
      logger.error("Error fetching notices:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredNotices = notices.filter(
    (notice) => !searchQuery || notice.community.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "sent":
        return <Badge className="bg-green-600">Sent</Badge>;
      case "draft":
        return <Badge variant="secondary">Draft</Badge>;
      case "archived":
        return <Badge variant="outline">Archived</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getModeBadge = (mode: string) => {
    return mode === "contractor_assisted" ? (
      <Badge className="bg-blue-600">Contractor Assisted</Badge>
    ) : (
      <Badge variant="outline">Neutral</Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <PageContainer maxWidth="7xl">
      <PageHero
        section="jobs"
        title="HOA Notice Packs"
        subtitle="Community-level storm intelligence packages"
        icon={<Building2 className="h-6 w-6" />}
      >
        <Button
          onClick={() => router.push("/hoa/notices/new")}
          className="bg-white text-blue-600 hover:bg-blue-50"
        >
          <Plus className="mr-2 h-4 w-4" />
          Create Notice Pack
        </Button>
      </PageHero>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Notice Packs</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{notices.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Sent This Month</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {notices.filter((n) => n.status === "sent").length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Homes Reached</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {notices.reduce((sum, n) => sum + n.sentCount, 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Notices Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center">
                <FileText className="mr-2 h-5 w-5" />
                Notice Packs
              </CardTitle>
              <CardDescription>{notices.length} total packs created</CardDescription>
            </div>

            <div className="w-64">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search community..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {filteredNotices.length === 0 ? (
            <div className="py-12 text-center">
              <Building2 className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="mb-2 text-lg font-semibold">No Notice Packs Yet</h3>
              <p className="mb-4 text-muted-foreground">
                Create your first HOA notice pack to communicate storm impact information.
              </p>
              <Button onClick={() => router.push("/hoa/notices/new")}>
                <Plus className="mr-2 h-4 w-4" />
                Create Notice Pack
              </Button>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Community</TableHead>
                    <TableHead>Storm Date</TableHead>
                    <TableHead>Mode</TableHead>
                    <TableHead>Homes</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredNotices.map((notice) => (
                    <TableRow
                      key={notice.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => router.push(`/hoa/notices/${notice.id}`)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{notice.community}</span>
                        </div>
                      </TableCell>
                      <TableCell>{new Date(notice.stormDate).toLocaleDateString()}</TableCell>
                      <TableCell>{getModeBadge(notice.mode)}</TableCell>
                      <TableCell>
                        <span className="font-medium">{notice.homeCount}</span>
                        {notice.sentCount > 0 && (
                          <span className="ml-1 text-xs text-muted-foreground">
                            ({notice.sentCount} sent)
                          </span>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(notice.status)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(notice.createdAt), { addSuffix: true })}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/hoa/notices/${notice.id}`);
                          }}
                        >
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </PageContainer>
  );
}
