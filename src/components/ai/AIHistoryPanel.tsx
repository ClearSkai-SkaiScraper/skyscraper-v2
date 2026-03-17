"use client";

import { format } from "date-fns";
import { ChevronRight, Clock, Loader2 } from "lucide-react";
import { useEffect,useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { logger } from "@/lib/logger";

interface AIHistoryItem {
  id: string;
  type: string;
  createdAt: string;
  status: string;
  data: any;
}

interface AIHistoryPanelProps {
  type: "weather" | "rebuttal" | "supplement" | "damage" | "mockup";
  onRestore?: (item: AIHistoryItem) => void;
  limit?: number;
}

export function AIHistoryPanel({ type, onRestore, limit = 10 }: AIHistoryPanelProps) {
  const [history, setHistory] = useState<AIHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchHistory();
  }, [type]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/ai/history?type=${type}&limit=${limit}`);
      if (!res.ok) throw new Error("Failed to load history");
      const data = await res.json();
      setHistory(data.history || []);
    } catch (err) {
      logger.error("Failed to fetch AI history:", err);
      setError("Failed to load history");
      setHistory([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Recent {type} History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Recent History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4">
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button onClick={fetchHistory} variant="outline" size="sm" className="mt-2">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (history.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Recent History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-border bg-muted/50 p-8 text-center">
            <Clock className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
            <p className="mt-4 text-sm text-muted-foreground">
              No {type} history yet. Generate your first one to see it here.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Recent {type} History ({history.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {history.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between rounded-lg border border-border bg-card p-3 transition-colors hover:bg-accent"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">
                    {item.data?.address || item.data?.claimId || item.type}
                  </span>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      item.status === "completed"
                        ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                        : item.status === "failed"
                          ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                          : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                    }`}
                  >
                    {item.status}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {format(new Date(item.createdAt), "MMM d, yyyy 'at' h:mm a")}
                </p>
              </div>
              {onRestore && item.status === "completed" && (
                <Button onClick={() => onRestore(item)} variant="ghost" size="sm" className="ml-2">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
