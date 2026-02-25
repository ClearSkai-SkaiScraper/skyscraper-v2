"use client";

import { useUser } from "@clerk/nextjs";
import { Calendar, Copy, Edit, Mail, Send, Trash2, TrendingUp, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

interface Campaign {
  id: string;
  name: string;
  subject: string;
  status: "draft" | "scheduled" | "sent";
  recipients: number;
  opens: number;
  clicks: number;
  scheduledFor?: string;
  sentAt?: string;
}

export default function EmailCampaignsPage() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useUser();

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/sign-in");
    }
  }, [isLoaded, isSignedIn, router]);

  const [campaigns] = useState<Campaign[]>([
    {
      id: "1",
      name: "Spring Promotion 2024",
      subject: "Save 20% on Roofing Services This Spring!",
      status: "sent",
      recipients: 1250,
      opens: 687,
      clicks: 143,
      sentAt: "2024-03-15T10:00:00Z",
    },
    {
      id: "2",
      name: "Summer Maintenance Reminder",
      subject: "Time for Your Annual Roof Inspection",
      status: "scheduled",
      recipients: 890,
      opens: 0,
      clicks: 0,
      scheduledFor: "2024-06-01T09:00:00Z",
    },
    {
      id: "3",
      name: "Customer Appreciation",
      subject: "Thank You for Being a Valued Customer",
      status: "draft",
      recipients: 0,
      opens: 0,
      clicks: 0,
    },
  ]);

  const [showCreateModal, setShowCreateModal] = useState(false);

  if (!isLoaded || !isSignedIn) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  const getStatusBadge = (status: Campaign["status"]) => {
    const styles = {
      draft: "bg-gray-100 text-gray-700",
      scheduled: "bg-blue-100 text-blue-700",
      sent: "bg-green-100 text-green-700",
    };
    return styles[status];
  };

  const calculateOpenRate = (opens: number, recipients: number) => {
    if (recipients === 0) return "0";
    return ((opens / recipients) * 100).toFixed(1);
  };

  const calculateClickRate = (clicks: number, recipients: number) => {
    if (recipients === 0) return "0";
    return ((clicks / recipients) * 100).toFixed(1);
  };

  return (
    <div className="space-y-6 p-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="mb-2 text-3xl font-bold text-[color:var(--text)]">Email Campaigns</h1>
          <p className="text-gray-600">Create and manage email marketing campaigns</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} className="gap-2">
          <Mail className="h-5 w-5" />
          Create Campaign
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="mb-2 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
              <Send className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">24</div>
              <div className="text-sm text-gray-600">Total Campaigns</div>
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <div className="mb-2 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
              <Users className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">12,450</div>
              <div className="text-sm text-gray-600">Total Recipients</div>
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <div className="mb-2 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
              <Mail className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">42.3%</div>
              <div className="text-sm text-gray-600">Avg Open Rate</div>
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <div className="mb-2 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100">
              <TrendingUp className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">8.7%</div>
              <div className="text-sm text-gray-600">Avg Click Rate</div>
            </div>
          </div>
        </div>
      </div>

      {/* Campaigns List */}
      <div className="rounded-lg bg-white shadow">
        <div className="border-b p-6">
          <h2 className="text-xl font-bold">Recent Campaigns</h2>
        </div>
        <div className="divide-y">
          {campaigns.map((campaign) => (
            <div key={campaign.id} className="p-6 transition-colors hover:bg-gray-50">
              <div className="mb-3 flex items-start justify-between">
                <div className="flex-1">
                  <div className="mb-2 flex items-center gap-3">
                    <h3 className="text-lg font-semibold">{campaign.name}</h3>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusBadge(campaign.status)}`}
                    >
                      {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                    </span>
                  </div>
                  <p className="mb-2 text-gray-600">{campaign.subject}</p>
                  {campaign.scheduledFor && (
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Calendar className="h-4 w-4" />
                      Scheduled for {new Date(campaign.scheduledFor).toLocaleString()}
                    </div>
                  )}
                  {campaign.sentAt && (
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Send className="h-4 w-4" />
                      Sent on {new Date(campaign.sentAt).toLocaleString()}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <button className="rounded-lg p-2 hover:bg-gray-100" title="Duplicate">
                    <Copy className="h-4 w-4 text-gray-600" />
                  </button>
                  <button className="rounded-lg p-2 hover:bg-gray-100" title="Edit">
                    <Edit className="h-4 w-4 text-gray-600" />
                  </button>
                  <button className="rounded-lg p-2 hover:bg-gray-100" title="Delete">
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </button>
                </div>
              </div>

              {campaign.status === "sent" && (
                <div className="mt-4 grid grid-cols-3 gap-4 border-t pt-4">
                  <div>
                    <div className="text-sm text-gray-600">Recipients</div>
                    <div className="text-xl font-bold">{campaign.recipients.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Opens</div>
                    <div className="text-xl font-bold">
                      {campaign.opens.toLocaleString()}
                      <span className="ml-2 text-sm text-green-600">
                        {calculateOpenRate(campaign.opens, campaign.recipients)}%
                      </span>
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Clicks</div>
                    <div className="text-xl font-bold">
                      {campaign.clicks.toLocaleString()}
                      <span className="ml-2 text-sm text-blue-600">
                        {calculateClickRate(campaign.clicks, campaign.recipients)}%
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Create Campaign Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-8">
            <h2 className="mb-6 text-2xl font-bold">Create New Campaign</h2>
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium">Campaign Name</label>
                <input
                  type="text"
                  className="w-full rounded-lg border px-4 py-2"
                  placeholder="Summer Sale 2024"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">Subject Line</label>
                <input
                  type="text"
                  className="w-full rounded-lg border px-4 py-2"
                  placeholder="Don't miss out!"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">Recipients</label>
                <select
                  className="w-full rounded-lg border px-4 py-2"
                  aria-label="Campaign recipients"
                >
                  <option>All Contacts</option>
                  <option>Active Clients</option>
                  <option>Leads Only</option>
                  <option>Past Customers</option>
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">Schedule</label>
                <div className="flex gap-4">
                  <input
                    type="date"
                    className="flex-1 rounded-lg border px-4 py-2"
                    aria-label="Campaign date"
                  />
                  <input
                    type="time"
                    className="flex-1 rounded-lg border px-4 py-2"
                    aria-label="Campaign time"
                  />
                </div>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">Email Template</label>
                <select className="w-full rounded-lg border px-4 py-2" aria-label="Email template">
                  <option>Promotional Template</option>
                  <option>Newsletter Template</option>
                  <option>Announcement Template</option>
                  <option>Custom Template</option>
                </select>
              </div>
              <div className="mt-6 flex gap-3">
                <Button className="flex-1">Save as Draft</Button>
                <Button className="flex-1 bg-green-600 hover:bg-green-700">
                  Schedule Campaign
                </Button>
                <Button onClick={() => setShowCreateModal(false)} variant="outline">
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
