"use client";

// ============================================================================
// REPORT DRAFT HOOK - Phase 3
// ============================================================================
// Load and manage report draft state with resume option

import { useEffect, useState } from "react";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface DraftState {
  selectedSections: string[];
  sectionOrder: string[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: any;
  lastAutosave: string;
}

interface UseDraftOptions {
  reportId: string;
  onResume?: (draft: DraftState) => void;
}

export function useReportDraft({ reportId, onResume }: UseDraftOptions) {
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [draft, setDraft] = useState<DraftState | null>(null);

  const { data, error, mutate } = useSWR<DraftState>(`/api/reports/${reportId}/draft`, fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });

  useEffect(() => {
    if (data && data.lastAutosave) {
      const lastSave = new Date(data.lastAutosave);
      const now = new Date();
      const minutesAgo = (now.getTime() - lastSave.getTime()) / 1000 / 60;

      // Show resume modal if draft exists and was saved within last 24 hours
      if (minutesAgo < 24 * 60) {
        setDraft(data);
        setShowResumeModal(true);
      }
    }
  }, [data]);

  const resumeDraft = () => {
    if (draft && onResume) {
      onResume(draft);
    }
    setShowResumeModal(false);
  };

  const startFresh = async () => {
    // Clear draft from DB
    await fetch(`/api/reports/${reportId}/draft`, {
      method: "DELETE",
    });

    setDraft(null);
    setShowResumeModal(false);
    void mutate(undefined, false);
  };

  const dismissModal = () => {
    setShowResumeModal(false);
  };

  return {
    showResumeModal,
    draft,
    resumeDraft,
    startFresh,
    dismissModal,
    isLoading: !error && !data,
  };
}

interface ResumeModalProps {
  show: boolean;
  draft: DraftState | null;
  onResume: () => void;
  onStartFresh: () => void;
  onDismiss: () => void;
}

export function ResumeModal({ show, draft, onResume, onStartFresh, onDismiss }: ResumeModalProps) {
  if (!show || !draft) return null;

  const lastSave = new Date(draft.lastAutosave);
  const timeAgo = getTimeAgo(lastSave);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="mx-4 w-full max-w-md rounded-lg bg-white shadow-xl">
        <div className="p-6">
          <h3 className="mb-2 text-lg font-semibold text-gray-900">Resume Draft?</h3>
          <p className="mb-4 text-sm text-gray-600">
            A draft version of this report was found. It was last saved <strong>{timeAgo}</strong>.
          </p>

          {draft.selectedSections && (
            <div className="mb-4 rounded bg-gray-50 p-3">
              <p className="mb-1 text-xs text-gray-500">Draft includes:</p>
              <p className="text-sm font-medium text-gray-700">
                {draft.selectedSections.length} section
                {draft.selectedSections.length !== 1 ? "s" : ""} selected
              </p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={onResume}
              className="flex-1 rounded bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
            >
              Resume Draft
            </button>
            <button
              onClick={onStartFresh}
              className="flex-1 rounded border border-gray-300 px-4 py-2 font-medium text-gray-700 hover:bg-gray-50"
            >
              Start Fresh
            </button>
          </div>

          <button
            onClick={onDismiss}
            className="mt-2 w-full text-sm text-gray-500 hover:text-gray-700"
          >
            Decide Later
          </button>
        </div>
      </div>
    </div>
  );
}

function getTimeAgo(date: Date): string {
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  return `${Math.floor(seconds / 86400)} days ago`;
}
