"use client";

import { useState } from "react";

import { createTrialEndingEmail, createWelcomeEmail } from "@/lib/mail";

const templates = [
  {
    id: "welcome",
    name: "Welcome Email",
    description: "Sent after checkout completion",
  },
  {
    id: "trial-ending",
    name: "Trial Ending",
    description: "Sent 24h before trial expires",
  },
] as const;

export default function EmailPreviewPage() {
  const [selectedTemplate, setSelectedTemplate] = useState<string>("welcome");
  const [emailInput, setEmailInput] = useState("test@example.com");
  const [previewHtml, setPreviewHtml] = useState("");
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<string>("");

  const generatePreview = () => {
    let emailContent;

    if (selectedTemplate === "welcome") {
      emailContent = createWelcomeEmail({
        userName: "Preview User",
      });
    } else {
      emailContent = createTrialEndingEmail({
        userName: "Preview User",
        daysRemaining: 3,
      });
    }

    setPreviewHtml(emailContent.html);
  };

  const sendTestEmail = async () => {
    setSending(true);
    setSendResult("");

    try {
      const response = await fetch("/api/dev/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template: selectedTemplate,
          to: emailInput,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setSendResult(`✅ Email sent successfully! ID: ${result.id}`);
      } else {
        setSendResult(`❌ Failed to send: ${result.error}`);
      }
    } catch (error) {
      setSendResult(`❌ Error: ${error}`);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Email Preview & Testing</h1>
          <p className="mt-2 text-gray-600">
            Preview and test email templates for the SkaiScraper trial system.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Controls */}
          <div className="space-y-6">
            <div className="rounded-lg bg-white p-6 shadow">
              <h2 className="mb-4 text-lg font-semibold">Template Selection</h2>

              <div className="space-y-3">
                {templates.map((template) => (
                  <label key={template.id} className="flex items-center space-x-3">
                    <input
                      type="radio"
                      value={template.id}
                      checked={selectedTemplate === template.id}
                      onChange={(e) => setSelectedTemplate(e.target.value)}
                      className="h-4 w-4 text-blue-600"
                    />
                    <div>
                      <div className="font-medium">{template.name}</div>
                      <div className="text-sm text-gray-500">{template.description}</div>
                    </div>
                  </label>
                ))}
              </div>

              <button
                onClick={generatePreview}
                className="mt-4 w-full rounded-md bg-gray-900 px-4 py-2 text-white hover:bg-gray-800"
              >
                Generate Preview
              </button>
            </div>

            <div className="rounded-lg bg-white p-6 shadow">
              <h2 className="mb-4 text-lg font-semibold">Send Test Email</h2>

              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Recipient Email
                  </label>
                  <input
                    type="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2"
                    placeholder="test@example.com"
                  />
                </div>

                <button
                  onClick={sendTestEmail}
                  disabled={sending || !emailInput}
                  className="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {sending ? "Sending..." : "Send Test Email"}
                </button>

                {sendResult && (
                  <div
                    className={`rounded-md p-3 text-sm ${
                      sendResult.startsWith("✅")
                        ? "bg-green-50 text-green-800"
                        : "bg-red-50 text-red-800"
                    }`}
                  >
                    {sendResult}
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-lg bg-blue-50 p-4">
              <h3 className="mb-2 text-sm font-semibold text-blue-900">Environment Status</h3>
              <div className="space-y-1 text-sm text-blue-800">
                <div>NODE_ENV: {process.env.NODE_ENV || "development"}</div>
                <div>
                  RESEND_API_KEY:{" "}
                  {process.env.NEXT_PUBLIC_RESEND_CONFIGURED ? "✅ Configured" : "❌ Missing"}
                </div>
                <div>App URL: {process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}</div>
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="rounded-lg bg-white shadow">
            <div className="border-b border-gray-200 px-6 py-4">
              <h2 className="text-lg font-semibold">Email Preview</h2>
            </div>
            <div className="p-6">
              {previewHtml ? (
                <div className="min-h-[500px] rounded-md border border-gray-200">
                  <iframe
                    srcDoc={previewHtml}
                    className="h-96 w-full border-0"
                    title="Email Preview"
                  />
                </div>
              ) : (
                <div className="flex h-96 items-center justify-center text-gray-500">
                  Select a template and click &quot;Generate Preview&quot; to see the email
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
