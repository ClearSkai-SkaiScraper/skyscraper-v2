"use client";
import { CheckCircle, Clock, Plus, RefreshCw, Webhook, XCircle } from "lucide-react";
import { useState } from "react";

import { PageHero } from "@/components/layout/PageHero";
import { Button } from "@/components/ui/button";

interface WebhookConfig {
  id: string;
  url: string;
  events: string[];
  status: "active" | "inactive" | "failed";
  lastTriggered: string;
  successRate: number;
}

export default function WebhooksPage() {
  const [webhooks] = useState<WebhookConfig[]>([
    {
      id: "1",
      url: "https://api.example.com/webhooks/jobs",
      events: ["job.created", "job.updated", "job.completed"],
      status: "active",
      lastTriggered: "2024-12-06T14:32:00Z",
      successRate: 98.5,
    },
    {
      id: "2",
      url: "https://crm.company.com/webhooks/clients",
      events: ["client.created", "client.updated"],
      status: "active",
      lastTriggered: "2024-12-06T12:15:00Z",
      successRate: 100,
    },
    {
      id: "3",
      url: "https://billing.app.com/webhooks/payments",
      events: ["payment.received", "invoice.sent"],
      status: "failed",
      lastTriggered: "2024-12-05T09:22:00Z",
      successRate: 67.3,
    },
  ]);

  const availableEvents = [
    "job.created",
    "job.updated",
    "job.completed",
    "job.deleted",
    "client.created",
    "client.updated",
    "claim.submitted",
    "claim.approved",
    "payment.received",
    "invoice.sent",
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "green";
      case "inactive":
        return "gray";
      case "failed":
        return "red";
      default:
        return "gray";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <CheckCircle className="h-5 w-5" />;
      case "inactive":
        return <Clock className="h-5 w-5" />;
      case "failed":
        return <XCircle className="h-5 w-5" />;
      default:
        return <Webhook className="h-5 w-5" />;
    }
  };

  return (
    <div className="space-y-6 p-8">
      <PageHero
        section="settings"
        title="Webhooks & Event System"
        subtitle="Real-time webhooks and event subscriptions"
        icon={<Webhook className="h-5 w-5" />}
      >
        <Button className="gap-2">
          <Plus className="h-5 w-5" />
          Add Webhook
        </Button>
      </PageHero>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-lg bg-white p-6 shadow dark:bg-slate-800">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-slate-300">Active Webhooks</span>
            <Webhook className="h-5 w-5 text-blue-600" />
          </div>
          <div className="text-3xl font-bold">
            {webhooks.filter((w) => w.status === "active").length}
          </div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm text-gray-600">Events Delivered</span>
            <CheckCircle className="h-5 w-5 text-green-600" />
          </div>
          <div className="text-3xl font-bold">1,247</div>
          <div className="mt-1 text-sm text-gray-600">Last 24 hours</div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow dark:bg-slate-800">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-slate-300">Failed Today</span>
            <XCircle className="h-5 w-5 text-red-600" />
          </div>
          <div className="text-3xl font-bold">23</div>
          <div className="mt-1 text-sm text-gray-600">Pending retry</div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow dark:bg-slate-800">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-slate-400">Success Rate</span>
            <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
          </div>
          <div className="text-3xl font-bold dark:text-slate-100">98.2%</div>
          <div className="mt-1 text-sm text-gray-600 dark:text-slate-400">Overall</div>
        </div>
      </div>

      {/* Webhooks Table */}
      <div className="overflow-hidden rounded-lg bg-white shadow dark:bg-slate-800">
        <div className="border-b p-6 dark:border-slate-700">
          <h2 className="text-xl font-bold dark:text-slate-100">Configured Webhooks</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-slate-900">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700 dark:text-slate-300">
                  Endpoint URL
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Events</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                  Last Triggered
                </th>
                <th className="px-6 py-3 text-right text-sm font-medium text-gray-700">
                  Success Rate
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Status</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {webhooks.map((webhook) => {
                const statusColor = getStatusColor(webhook.status);
                return (
                  <tr key={webhook.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Webhook className="h-5 w-5 text-gray-400" />
                        <div>
                          <div className="font-mono text-sm">{webhook.url}</div>
                          <div className="text-xs text-gray-500">ID: {webhook.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {webhook.events.slice(0, 2).map((event) => (
                          <span
                            key={event}
                            className="rounded bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700"
                          >
                            {event}
                          </span>
                        ))}
                        {webhook.events.length > 2 && (
                          <span className="rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
                            +{webhook.events.length - 2} more
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(webhook.lastTriggered).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="h-2 w-24 overflow-hidden rounded-full bg-gray-200">
                          <div
                            className={`h-full ${
                              webhook.successRate >= 95
                                ? "bg-green-500"
                                : webhook.successRate >= 80
                                  ? "bg-yellow-500"
                                  : "bg-red-500"
                            }`}
                            style={{ width: `${webhook.successRate}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium">{webhook.successRate}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`bg- px-3 py-1${statusColor}-100 text-${statusColor}-700 flex w-fit items-center gap-1 rounded-full text-xs font-medium capitalize`}
                      >
                        {getStatusIcon(webhook.status)}
                        {webhook.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          className="rounded border border-blue-600 p-2 text-blue-600 hover:bg-blue-50"
                          aria-label="Retry webhook"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </button>
                        <button className="rounded border p-2 text-gray-600 hover:bg-gray-50">
                          Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Available Events */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h2 className="mb-4 text-xl font-bold">Available Events</h2>
        <p className="mb-4 text-gray-600">
          Subscribe to these events to receive real-time notifications when actions occur in your
          system
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
          {availableEvents.map((event) => (
            <div key={event} className="rounded-lg border p-3">
              <div className="font-mono text-sm font-medium">{event}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Example Payload */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h2 className="mb-4 text-xl font-bold">Example Webhook Payload</h2>
        <pre className="overflow-x-auto rounded-lg bg-gray-900 p-4 text-sm text-gray-100">
          {JSON.stringify(
            {
              event: "job.created",
              timestamp: "2024-12-06T14:32:00Z",
              data: {
                id: "job_123456",
                type: "Roof Replacement",
                client: {
                  id: "client_789",
                  name: "John Smith",
                },
                status: "scheduled",
                amount: 15000,
              },
            },
            null,
            2
          )}
        </pre>
      </div>
    </div>
  );
}
