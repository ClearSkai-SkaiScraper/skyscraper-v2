"use client";

import { Camera, CloudSun, Code,FileText, Sparkles } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent,CardHeader, CardTitle } from "@/components/ui/card";

interface AIActionsBarProps {
  projectId: string;
  onGenerateReport: () => void;
  onAutoCaptionPhotos: () => void;
  onBuildScope: () => void;
  onFetchWeather: () => void;
}

export function AIActionsBar({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  projectId,
  onGenerateReport,
  onAutoCaptionPhotos,
  onBuildScope,
  onFetchWeather,
}: AIActionsBarProps) {
  const [loading, setLoading] = useState<string | null>(null);

  const handleAction = async (action: string, handler: () => void) => {
    setLoading(action);
    // eslint-disable-next-line @typescript-eslint/await-thenable
    try {
      await handler();
    } finally {
      setLoading(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-500" />
          AI Actions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <Button
          variant="outline"
          className="w-full justify-start"
          onClick={() => handleAction("report", onGenerateReport)}
          disabled={loading !== null}
        >
          <FileText className="mr-2 h-4 w-4" />
          {loading === "report" ? "Generating..." : "Generate Full Report"}
        </Button>

        <Button
          variant="outline"
          className="w-full justify-start"
          onClick={() => handleAction("caption", onAutoCaptionPhotos)}
          disabled={loading !== null}
        >
          <Camera className="mr-2 h-4 w-4" />
          {loading === "caption" ? "Captioning..." : "Auto-Caption Photos"}
        </Button>

        <Button
          variant="outline"
          className="w-full justify-start"
          onClick={() => handleAction("scope", onBuildScope)}
          disabled={loading !== null}
        >
          <Code className="mr-2 h-4 w-4" />
          {loading === "scope" ? "Building..." : "Build Scope from Photos"}
        </Button>

        <Button
          variant="outline"
          className="w-full justify-start"
          onClick={() => handleAction("weather", onFetchWeather)}
          disabled={loading !== null}
        >
          <CloudSun className="mr-2 h-4 w-4" />
          {loading === "weather" ? "Fetching..." : "Fetch Weather Data"}
        </Button>
      </CardContent>
    </Card>
  );
}
