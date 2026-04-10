"use client";
import { Book, CheckCircle, Code, Copy, Key, Webhook } from "lucide-react";
import { useState } from "react";

import { PageHero } from "@/components/layout/PageHero";

export default function ApiDocsPage() {
  const [activeTab, setActiveTab] = useState("overview");
  const [apiKey] = useState("sk_live_••••••••••••••••");
  const [copied, setCopied] = useState(false);

  const copyApiKey = () => {
    void navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 p-8">
      <PageHero
        title="API Documentation"
        subtitle="Integrate SkaiScraper into your applications"
        icon={<Code className="h-5 w-5" />}
      />

      {/* API Key Section */}
      <div className="rounded-lg bg-gradient-indigo p-6 text-white transition hover:opacity-95">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="mb-2 flex items-center gap-2 text-xl font-bold">
              <Key className="h-5 w-5" />
              Your API Key
            </h2>
            <div className="rounded bg-white bg-opacity-20 px-4 py-2 font-mono text-sm dark:bg-slate-700">
              {apiKey}
            </div>
          </div>
          <button
            onClick={copyApiKey}
            className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-blue-600 hover:bg-blue-50 dark:bg-slate-700 dark:text-blue-400 dark:hover:bg-slate-600"
          >
            {copied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="rounded-lg bg-white shadow dark:bg-slate-800">
        <div className="flex gap-4 border-b px-6 dark:border-slate-700">
          {["overview", "endpoints", "webhooks", "examples"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`border-b-2 px-4 py-4 transition-colors ${
                activeTab === tab
                  ? "border-blue-600 font-medium text-blue-600"
                  : "border-transparent text-gray-600 hover:text-gray-900"
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        <div className="p-6">
          {activeTab === "overview" && (
            <div className="space-y-4">
              <div>
                <h3 className="mb-2 text-xl font-bold">Getting Started</h3>
                <p className="mb-4 text-gray-600">
                  The SkaiScraper API uses REST architecture and returns JSON responses. All
                  requests must include your API key in the Authorization header.
                </p>
                <div className="rounded-lg bg-gray-900 p-4 font-mono text-sm text-green-400">
                  <div>curl https://api.skaiscrape.com/v1/jobs \</div>
                  <div className="ml-4">-H &quot;Authorization: Bearer {apiKey}&quot;</div>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-lg border p-4">
                  <Book className="mb-2 h-8 w-8 text-blue-600" />
                  <h4 className="mb-1 font-semibold">RESTful API</h4>
                  <p className="text-sm text-gray-600">Standard HTTP methods and JSON responses</p>
                </div>
                <div className="rounded-lg border p-4">
                  <Webhook className="mb-2 h-8 w-8 text-green-600" />
                  <h4 className="mb-1 font-semibold">Webhooks</h4>
                  <p className="text-sm text-gray-600">Real-time event notifications</p>
                </div>
                <div className="rounded-lg border p-4">
                  <Code className="mb-2 h-8 w-8 text-purple-600" />
                  <h4 className="mb-1 font-semibold">SDKs</h4>
                  <p className="text-sm text-gray-600">Client libraries for popular languages</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === "endpoints" && (
            <div className="space-y-4">
              {[
                { method: "GET", path: "/v1/jobs", desc: "List all jobs" },
                { method: "POST", path: "/v1/jobs", desc: "Create a new job" },
                { method: "GET", path: "/v1/jobs/:id", desc: "Get job details" },
                { method: "PATCH", path: "/v1/jobs/:id", desc: "Update a job" },
                { method: "DELETE", path: "/v1/jobs/:id", desc: "Delete a job" },
                { method: "GET", path: "/v1/clients", desc: "List all clients" },
                { method: "POST", path: "/v1/clients", desc: "Create a client" },
              ].map((endpoint, idx) => (
                <div key={idx} className="rounded-lg border p-4 hover:bg-gray-50">
                  <div className="flex items-center gap-4">
                    <span
                      className={`rounded px-3 py-1 font-mono text-sm font-bold ${
                        endpoint.method === "GET"
                          ? "bg-blue-100 text-blue-700"
                          : endpoint.method === "POST"
                            ? "bg-green-100 text-green-700"
                            : endpoint.method === "PATCH"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-red-100 text-red-700"
                      }`}
                    >
                      {endpoint.method}
                    </span>
                    <code className="flex-1 text-sm">{endpoint.path}</code>
                    <span className="text-sm text-gray-600">{endpoint.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === "webhooks" && (
            <div className="space-y-4">
              <p className="text-gray-600">
                Configure webhooks to receive real-time notifications when events occur in your
                account.
              </p>
              <div className="space-y-2">
                {[
                  "job.created",
                  "job.updated",
                  "job.completed",
                  "payment.received",
                  "client.created",
                ].map((event) => (
                  <div key={event} className="flex items-center justify-between rounded border p-3">
                    <code className="text-sm">{event}</code>
                    <button className="text-sm text-blue-600 hover:underline">Configure</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "examples" && (
            <div className="space-y-4">
              <div>
                <h3 className="mb-2 font-semibold">Create a Job (JavaScript)</h3>
                <div className="overflow-x-auto rounded-lg bg-gray-900 p-4 font-mono text-sm text-green-400">
                  <pre>{`const response = await fetch('https://api.skaiscrape.com/v1/jobs', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ${apiKey}',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    clientName: 'John Smith',
    address: '123 Main St',
    jobType: 'Roof Replacement',
    status: 'pending'
  })
});

const job = await response.json();
logger.info(job);`}</pre>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
