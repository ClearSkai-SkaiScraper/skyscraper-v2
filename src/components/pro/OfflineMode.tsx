"use client";

import { Cloud, CloudOff, RefreshCw, Wifi, WifiOff } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";

interface OfflineState {
  isOnline: boolean;
  pendingActions: number;
  lastSync: Date | null;
}

interface OfflineIndicatorProps {
  className?: string;
}

// Offline store for pending actions
const OFFLINE_STORE_KEY = "skaiscraper_offline_queue";

interface PendingAction {
  id: string;
  type: "claim_update" | "photo_upload" | "note_create" | "status_change";
  data: Record<string, unknown>;
  timestamp: number;
}

function getOfflineQueue(): PendingAction[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(OFFLINE_STORE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveOfflineQueue(queue: PendingAction[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(OFFLINE_STORE_KEY, JSON.stringify(queue));
}

export function addToOfflineQueue(action: Omit<PendingAction, "id" | "timestamp">) {
  const queue = getOfflineQueue();
  queue.push({
    ...action,
    id: crypto.randomUUID(),
    timestamp: Date.now(),
  });
  saveOfflineQueue(queue);
}

export function useOfflineStatus() {
  const [state, setState] = useState<OfflineState>({
    isOnline: true,
    pendingActions: 0,
    lastSync: null,
  });
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    // Initial state
    setState((prev) => ({
      ...prev,
      isOnline: navigator.onLine,
      pendingActions: getOfflineQueue().length,
    }));

    const handleOnline = () => {
      setState((prev) => ({ ...prev, isOnline: true }));
      toast.success("Back online! Syncing pending changes...");
      void syncOfflineQueue();
    };

    const handleOffline = () => {
      setState((prev) => ({ ...prev, isOnline: false }));
      toast.warning("You're offline. Changes will sync when reconnected.");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const syncOfflineQueue = async () => {
    const queue = getOfflineQueue();
    if (queue.length === 0) return;

    setIsSyncing(true);
    const successful: string[] = [];

    for (const action of queue) {
      try {
        // Route to appropriate API based on action type
        const endpoint = {
          claim_update: "/api/claims/batch-update",
          photo_upload: "/api/photos/batch-upload",
          note_create: "/api/notes",
          status_change: "/api/claims/status",
        }[action.type];

        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(action.data),
        });

        if (res.ok) {
          successful.push(action.id);
        }
      } catch {
        // Keep failed actions in queue
      }
    }

    // Remove successful actions from queue
    const remaining = queue.filter((a) => !successful.includes(a.id));
    saveOfflineQueue(remaining);

    setState((prev) => ({
      ...prev,
      pendingActions: remaining.length,
      lastSync: new Date(),
    }));

    setIsSyncing(false);

    if (successful.length > 0) {
      toast.success(`Synced ${successful.length} offline changes`);
    }
    if (remaining.length > 0) {
      toast.warning(`${remaining.length} changes couldn't sync. Will retry.`);
    }
  };

  return { ...state, isSyncing, syncOfflineQueue };
}

export function OfflineIndicator({ className }: OfflineIndicatorProps) {
  const { isOnline, pendingActions, isSyncing, syncOfflineQueue } = useOfflineStatus();

  if (isOnline && pendingActions === 0) return null;

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium",
        isOnline
          ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200"
          : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200",
        className
      )}
    >
      {isOnline ? (
        <>
          <Cloud className="h-4 w-4" />
          <span>{pendingActions} pending</span>
          <button
            onClick={syncOfflineQueue}
            disabled={isSyncing}
            className="ml-1 rounded-full p-1 transition-colors hover:bg-amber-200/50"
          >
            <RefreshCw className={cn("h-3 w-3", isSyncing && "animate-spin")} />
          </button>
        </>
      ) : (
        <>
          <CloudOff className="h-4 w-4" />
          <span>Offline Mode</span>
        </>
      )}
    </div>
  );
}

// Full offline banner component
export function OfflineBanner() {
  const { isOnline, pendingActions, isSyncing, syncOfflineQueue } = useOfflineStatus();

  if (isOnline && pendingActions === 0) return null;

  return (
    <div
      className={cn(
        "fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-80",
        "rounded-xl border p-4 shadow-lg",
        isOnline
          ? "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20"
          : "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20"
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
            isOnline
              ? "bg-amber-100 text-amber-600 dark:bg-amber-900 dark:text-amber-400"
              : "bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400"
          )}
        >
          {isOnline ? <Wifi className="h-5 w-5" /> : <WifiOff className="h-5 w-5" />}
        </div>
        <div className="flex-1">
          <p className="font-semibold">{isOnline ? "Changes Pending" : "You're Offline"}</p>
          <p className="text-sm text-muted-foreground">
            {isOnline
              ? `${pendingActions} changes waiting to sync`
              : "Your work is saved locally and will sync when you reconnect"}
          </p>
          {isOnline && pendingActions > 0 && (
            <button
              onClick={syncOfflineQueue}
              disabled={isSyncing}
              className="mt-2 flex items-center gap-1 text-sm font-medium text-[#117CFF] hover:underline"
            >
              <RefreshCw className={cn("h-3 w-3", isSyncing && "animate-spin")} />
              {isSyncing ? "Syncing..." : "Sync Now"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
