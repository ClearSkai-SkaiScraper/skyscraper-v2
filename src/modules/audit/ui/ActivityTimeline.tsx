'use client';

// ============================================================================
// ACTIVITY TIMELINE - Phase 5 Feature 6: Audit Trail UI
// ============================================================================

import useSWR from 'swr';

interface ActivityTimelineProps {
  jobId: string;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function ActivityTimeline({ jobId }: ActivityTimelineProps) {
  const { data, isLoading } = useSWR(`/api/audit/job/${jobId}`, fetcher, {
    refreshInterval: 10000, // Refresh every 10 seconds
  });

  const events = data?.events || [];

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="text-gray-500">Loading activity...</div>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
        <div className="text-gray-500">No activity yet for this job</div>
      </div>
    );
  }

  return (
    // eslint-disable-next-line react/jsx-no-comment-textnodes
    <div className="space-y-4">
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      {events.map((event: any, index: number) => (
        <div
          key={event.id || index}
          className="rounded-lg border border-gray-200 bg-white p-4 transition hover:border-blue-300"
        >
          <div className="flex items-start gap-3">
            {/* Icon */}
            <div className="flex-shrink-0">
              <ActionIcon action={event.action} />
            </div>

            {/* Content */}
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <ActionChip action={event.action} />
                  <div className="mt-1 text-sm text-gray-900">
                    <ActionMessage event={event} />
                  </div>
                </div>
                <div className="whitespace-nowrap text-xs text-gray-500">
                  {formatTimeAgo(event.createdAt)}
                </div>
              </div>

              {/* User */}
              <div className="mt-1 text-xs text-gray-600">
                by {event.userName || event.userId || 'System'}
              </div>

              {/* Payload highlights */}
              {event.payload && Object.keys(event.payload).length > 0 && (
                <div className="mt-2 inline-block rounded bg-gray-50 px-2 py-1 text-xs text-gray-600">
                  {formatPayload(event.payload)}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function ActionIcon({ action }: { action: string }) {
  const icons: Record<string, string> = {
    AI_RUN: '⚡',
    AI_APPROVE: '✅',
    AI_REJECT: '❌',
    EXPORT_START: '📤',
    EXPORT_COMPLETE: '✅',
    EXPORT_FAILED: '❌',
    DEPRECIATION_FILED: '📋',
    FUNDING_ADD: '💰',
    DOC_INGEST: '📄',
    DOC_PARSE: '🔍',
    DOCUMENT_RE_PARSE: '🔄',
    DOCUMENT_RE_OCR: '🔍',
    LENDER_ENDORSEMENT: '🏦',
    ACH_IMPORT: '📥',
    TEMPLATE_SAVE: '💾',
    TEMPLATE_APPLY: '📋',
    CARRIER_PRESET_APPLY: '🏢',
  };

  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-lg">
      {icons[action] || '📌'}
    </div>
  );
}

function ActionChip({ action }: { action: string }) {
  const labels: Record<string, string> = {
    AI_RUN: 'AI Generated',
    AI_APPROVE: 'AI Approved',
    AI_REJECT: 'AI Rejected',
    EXPORT_START: 'Export Started',
    EXPORT_COMPLETE: 'Export Complete',
    EXPORT_FAILED: 'Export Failed',
    DEPRECIATION_FILED: 'Depreciation Filed',
    FUNDING_ADD: 'Funding Added',
    DOC_INGEST: 'Document Ingested',
    DOC_PARSE: 'Document Parsed',
    DOCUMENT_RE_PARSE: 'Document Re-Parsed',
    DOCUMENT_RE_OCR: 'OCR Re-Run',
    LENDER_ENDORSEMENT: 'Lender Endorsement',
    ACH_IMPORT: 'ACH Import',
    TEMPLATE_SAVE: 'Template Saved',
    TEMPLATE_APPLY: 'Template Applied',
    CARRIER_PRESET_APPLY: 'Carrier Preset',
  };

  const colors: Record<string, string> = {
    AI_RUN: 'bg-purple-100 text-purple-800',
    AI_APPROVE: 'bg-green-100 text-green-800',
    AI_REJECT: 'bg-red-100 text-red-800',
    EXPORT_COMPLETE: 'bg-green-100 text-green-800',
    EXPORT_FAILED: 'bg-red-100 text-red-800',
    EXPORT_START: 'bg-blue-100 text-blue-800',
    FUNDING_ADD: 'bg-green-100 text-green-800',
    ACH_IMPORT: 'bg-green-100 text-green-800',
  };

  return (
    <span
      className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${
        colors[action] || 'bg-gray-100 text-gray-800'
      }`}
    >
      {labels[action] || action}
    </span>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ActionMessage({ event }: { event: any }) {
  const { action, payload } = event;

  switch (action) {
    case 'AI_RUN':
      return `Generated ${payload?.section || 'content'} using AI`;
    case 'AI_APPROVE':
      return `Approved AI-generated ${payload?.section || 'content'}`;
    case 'AI_REJECT':
      return `Rejected AI-generated ${payload?.section || 'content'}`;
    case 'EXPORT_COMPLETE':
      return `Exported report as ${payload?.format || 'PDF'}`;
    case 'EXPORT_FAILED':
      return `Export failed: ${payload?.error || 'Unknown error'}`;
    case 'DEPRECIATION_FILED':
      return `Filed depreciation request with ${payload?.carrier || 'carrier'}`;
    case 'FUNDING_ADD':
      return `Added funding payment of $${Number(payload?.amount || 0).toLocaleString()}`;
    case 'DOC_INGEST':
      return `Uploaded ${payload?.type || 'document'}`;
    case 'DOCUMENT_RE_PARSE':
      return `Re-parsed document (confidence: ${Math.round((payload?.confidence || 0) * 100)}%)`;
    case 'DOCUMENT_RE_OCR':
      return `Re-ran OCR extraction (confidence: ${Math.round((payload?.confidence || 0) * 100)}%)`;
    case 'ACH_IMPORT':
      return `Imported ${payload?.count || 0} payments from ACH file ($${Number(payload?.total || 0).toLocaleString()})`;
    case 'TEMPLATE_SAVE':
      return `Saved template "${payload?.name || 'Untitled'}"`;
    case 'TEMPLATE_APPLY':
      return `Applied template "${payload?.name || 'Untitled'}"`;
    case 'LENDER_ENDORSEMENT':
      return `Requested lender endorsement for ${payload?.lenderName || 'lender'}`;
    default:
      return action.replace(/_/g, ' ').toLowerCase();
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatPayload(payload: any): string {
  const highlights: string[] = [];

  if (payload.section) highlights.push(`Section: ${payload.section}`);
  if (payload.format) highlights.push(`Format: ${payload.format}`);
  if (payload.carrier) highlights.push(`Carrier: ${payload.carrier}`);
  if (payload.amount) highlights.push(`Amount: $${Number(payload.amount).toLocaleString()}`);
  if (payload.count) highlights.push(`Count: ${payload.count}`);
  if (payload.total) highlights.push(`Total: $${Number(payload.total).toLocaleString()}`);
  if (payload.type) highlights.push(`Type: ${payload.type}`);
  if (payload.confidence !== undefined)
    highlights.push(`Confidence: ${Math.round(payload.confidence * 100)}%`);
  if (payload.name) highlights.push(`Name: ${payload.name}`);

  return highlights.join(' • ') || 'No details';
}

function formatTimeAgo(timestamp: string): string {
  const now = new Date();
  const past = new Date(timestamp);
  const diffMs = now.getTime() - past.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return past.toLocaleDateString();
}
