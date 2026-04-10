"use client";

import { formatDistanceToNow } from "date-fns";
import { CheckCircle2, Clock,Download, Send, Truck, XCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface MailerBatch {
  id: string;
  template: string;
  quantity: number;
  status: string;
  createdAt: Date;
  jobs: MailerJob[];
}

interface MailerJob {
  id: string;
  status: string;
  mailedAt?: Date;
  deliveredAt?: Date;
  errorMessage?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  toAddress: any;
}

interface MailerStatusCardProps {
  batch: MailerBatch;
  onExportCsv?: () => void;
}

export function MailerStatusCard({ batch, onExportCsv }: MailerStatusCardProps) {
  // Count statuses
  const statusCounts = batch.jobs.reduce(
    (acc, job) => {
      acc[job.status] = (acc[job.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const sent = statusCounts.mailed || 0;
  const inTransit = statusCounts.in_transit || 0;
  const delivered = statusCounts.delivered || 0;
  const failed = statusCounts.failed || 0;
  const queued = statusCounts.queued || 0;

  const total = batch.quantity;
  const deliveryRate = total > 0 ? ((delivered / total) * 100).toFixed(1) : "0.0";
  const failureRate = total > 0 ? ((failed / total) * 100).toFixed(1) : "0.0";

  // Estimate delivery window (3-5 business days from mailed date)
  const firstMailedJob = batch.jobs.find((j) => j.mailedAt);
  const estimatedDeliveryStart = firstMailedJob?.mailedAt
    ? new Date(new Date(firstMailedJob.mailedAt).getTime() + 3 * 24 * 60 * 60 * 1000)
    : null;
  const estimatedDeliveryEnd = firstMailedJob?.mailedAt
    ? new Date(new Date(firstMailedJob.mailedAt).getTime() + 5 * 24 * 60 * 60 * 1000)
    : null;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "delivered":
        return <Badge className="bg-green-600">Delivered</Badge>;
      case "in_transit":
        return <Badge className="bg-blue-600">In Transit</Badge>;
      case "mailed":
        return <Badge className="bg-purple-600">Mailed</Badge>;
      case "failed":
        return <Badge variant="destructive">Failed</Badge>;
      case "queued":
        return <Badge variant="secondary">Queued</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Mailer Campaign
            </CardTitle>
            <CardDescription>
              {batch.template === "postcard" ? "Postcard" : "Letter"} • {total} addresses •{" "}
              {formatDistanceToNow(new Date(batch.createdAt), { addSuffix: true })}
            </CardDescription>
          </div>
          {getStatusBadge(batch.status)}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Delivery Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Delivery Progress</span>
            <span className="font-semibold">{deliveryRate}%</span>
          </div>
          <Progress value={parseFloat(deliveryRate)} className="h-2" />
        </div>

        {/* Status Grid */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
          <div className="flex flex-col items-center rounded-lg border bg-muted/30 p-3">
            <Clock className="mb-1 h-5 w-5 text-muted-foreground" />
            <span className="text-2xl font-bold">{queued}</span>
            <span className="text-xs text-muted-foreground">Queued</span>
          </div>

          <div className="flex flex-col items-center rounded-lg border bg-purple-50 p-3 dark:bg-purple-950/20">
            <Send className="mb-1 h-5 w-5 text-purple-600" />
            <span className="text-2xl font-bold">{sent}</span>
            <span className="text-xs text-muted-foreground">Mailed</span>
          </div>

          <div className="flex flex-col items-center rounded-lg border bg-blue-50 p-3 dark:bg-blue-950/20">
            <Truck className="mb-1 h-5 w-5 text-blue-600" />
            <span className="text-2xl font-bold">{inTransit}</span>
            <span className="text-xs text-muted-foreground">In Transit</span>
          </div>

          <div className="flex flex-col items-center rounded-lg border bg-green-50 p-3 dark:bg-green-950/20">
            <CheckCircle2 className="mb-1 h-5 w-5 text-green-600" />
            <span className="text-2xl font-bold">{delivered}</span>
            <span className="text-xs text-muted-foreground">Delivered</span>
          </div>

          <div className="flex flex-col items-center rounded-lg border bg-red-50 p-3 dark:bg-red-950/20">
            <XCircle className="mb-1 h-5 w-5 text-red-600" />
            <span className="text-2xl font-bold">{failed}</span>
            <span className="text-xs text-muted-foreground">Failed</span>
          </div>
        </div>

        {/* Delivery Window */}
        {estimatedDeliveryStart && estimatedDeliveryEnd && (
          <div className="rounded-lg border bg-blue-50 p-4 dark:bg-blue-950/20">
            <div className="flex items-start gap-3">
              <Truck className="mt-0.5 h-5 w-5 text-blue-600" />
              <div>
                <div className="text-sm font-semibold">Estimated Delivery Window</div>
                <div className="text-sm text-muted-foreground">
                  {estimatedDeliveryStart.toLocaleDateString()} -{" "}
                  {estimatedDeliveryEnd.toLocaleDateString()}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Failure Alert */}
        {failed > 0 && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:bg-red-950/20">
            <div className="flex items-start gap-3">
              <XCircle className="mt-0.5 h-5 w-5 text-red-600" />
              <div className="flex-1">
                <div className="text-sm font-semibold text-red-900 dark:text-red-100">
                  {failed} mailers failed ({failureRate}%)
                </div>
                <div className="text-sm text-red-700 dark:text-red-300">
                  Check individual job details for error messages. You may be able to retry failed addresses.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Export Button */}
        <div className="pt-2">
          <Button variant="outline" size="sm" className="w-full" onClick={onExportCsv}>
            <Download className="mr-2 h-4 w-4" />
            Export Delivery Report (CSV)
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
