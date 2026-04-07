"use client";

import { formatDistanceToNow } from "date-fns";
import { ArrowLeft, Download, Eye, FileText, Loader2, Send } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { PageHero } from "@/components/layout/PageHero";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  assets: NoticeAsset[];
}

interface NoticeAsset {
  id: string;
  type: string;
  title: string;
  pdfUrl?: string;
}

export default function HoaNoticeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const noticeId = params?.id as string;

  const [notice, setNotice] = useState<NoticePack | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    void fetchNotice();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noticeId]);

  const fetchNotice = async () => {
    try {
      const res = await fetch(`/api/hoa/notices/${noticeId}`);
      if (res.ok) {
        const data = await res.json();
        setNotice(data);
      }
    } catch (error) {
      logger.error("Error fetching notice:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    setSending(true);
    try {
      await fetch(`/api/hoa/notices/${noticeId}/send`, {
        method: "POST",
      });
      void fetchNotice();
    } catch (error) {
      logger.error("Error sending notice:", error);
    } finally {
      setSending(false);
    }
  };

  const handlePreview = () => {
    // Open preview in new tab
    window.open(`/hoa/notices/${noticeId}/preview`, "_blank");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!notice) {
    return (
      <div className="container mx-auto p-6">
        <PageHero
          section="jobs"
          title="Notice Pack Not Found"
          subtitle="The requested notice pack could not be found."
        />
      </div>
    );
  }

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

  return (
    <div className="container mx-auto max-w-4xl space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <PageHero
          section="jobs"
          title={notice.community}
          subtitle={`Created ${formatDistanceToNow(new Date(notice.createdAt), { addSuffix: true })}`}
        />
      </div>

      {/* Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Notice Pack Details</CardTitle>
              <CardDescription>
                {notice.homeCount} homes • Storm date:{" "}
                {new Date(notice.stormDate).toLocaleDateString()}
              </CardDescription>
            </div>
            {getStatusBadge(notice.status)}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Mode</p>
              <p className="font-semibold capitalize">{notice.mode.replace("_", " ")}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Homes</p>
              <p className="font-semibold">{notice.homeCount}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Sent Count</p>
              <p className="font-semibold">{notice.sentCount}</p>
            </div>
          </div>

          {notice.sentAt && (
            <div className="rounded-lg border bg-green-50 p-3 dark:bg-green-950/20">
              <p className="text-sm font-semibold text-green-900 dark:text-green-100">
                Sent {formatDistanceToNow(new Date(notice.sentAt), { addSuffix: true })}
              </p>
            </div>
          )}

          {notice.status === "draft" && (
            <div className="flex gap-2">
              <Button onClick={handlePreview} variant="outline" className="flex-1">
                <Eye className="mr-2 h-4 w-4" />
                Preview
              </Button>
              <Button onClick={handleSend} disabled={sending} className="flex-1">
                {sending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Send to HOA Board
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assets */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="mr-2 h-5 w-5" />
            Notice Assets
          </CardTitle>
          <CardDescription>Letters, postcards, and PDFs included in this pack</CardDescription>
        </CardHeader>

        <CardContent>
          {notice.assets.length === 0 ? (
            <div className="py-8 text-center">
              <FileText className="mx-auto mb-3 h-12 w-12 text-muted-foreground" />
              <h4 className="mb-1 font-semibold">No Assets Generated Yet</h4>
              <p className="text-sm text-muted-foreground">
                Assets will be generated when the notice pack is sent.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {notice.assets.map((asset) => (
                <div
                  key={asset.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{asset.title}</p>
                      <p className="text-sm capitalize text-muted-foreground">{asset.type}</p>
                    </div>
                  </div>
                  {asset.pdfUrl && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={asset.pdfUrl} target="_blank" rel="noopener noreferrer">
                        <Download className="mr-2 h-4 w-4" />
                        Download
                      </a>
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
