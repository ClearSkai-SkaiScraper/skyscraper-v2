"use client";

/**
 * AI Output Card Component
 *
 * Per AI advisor: "Add guardrails for AI output - timestamps showing when generated,
 * clear regenerate buttons, and confidence indicators where possible."
 *
 * Wraps AI-generated content with:
 * - Generation timestamp
 * - Model/source indicator
 * - Regenerate button
 * - Confidence badge (optional)
 * - Loading/error states
 */

import { useState } from "react";

import { formatDistanceToNow } from "date-fns";
import { AlertCircle, Bot, Clock, RefreshCw, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface AIOutputCardProps {
  title: string;
  children: React.ReactNode;
  generatedAt?: Date | string | null;
  model?: string;
  tokensUsed?: number;
  confidence?: "high" | "medium" | "low";
  isLoading?: boolean;
  error?: string | null;
  onRegenerate?: () => Promise<void>;
  regenerateLabel?: string;
  className?: string;
  variant?: "default" | "compact" | "inline";
}

export function AIOutputCard({
  title,
  children,
  generatedAt,
  model = "GPT-4",
  tokensUsed,
  confidence,
  isLoading = false,
  error = null,
  onRegenerate,
  regenerateLabel = "Regenerate",
  className,
  variant = "default",
}: AIOutputCardProps) {
  const [isRegenerating, setIsRegenerating] = useState(false);

  const handleRegenerate = async () => {
    if (!onRegenerate) return;
    setIsRegenerating(true);
    try {
      await onRegenerate();
    } finally {
      setIsRegenerating(false);
    }
  };

  const parsedDate = generatedAt
    ? typeof generatedAt === "string"
      ? new Date(generatedAt)
      : generatedAt
    : null;

  const getConfidenceBadge = () => {
    if (!confidence) return null;
    const variants = {
      high: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
      medium: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
      low: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
    };
    return (
      <Badge variant="outline" className={cn("text-xs", variants[confidence])}>
        {confidence.charAt(0).toUpperCase() + confidence.slice(1)} confidence
      </Badge>
    );
  };

  // Inline variant for simple text outputs
  if (variant === "inline") {
    return (
      <div className={cn("relative", className)}>
        {isLoading ? (
          <Skeleton className="h-4 w-full" />
        ) : error ? (
          <span className="text-sm text-red-500">{error}</span>
        ) : (
          <div className="flex items-start gap-2">
            <Bot className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />
            <div className="flex-1">{children}</div>
            {onRegenerate && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={handleRegenerate}
                disabled={isRegenerating}
              >
                <RefreshCw className={cn("h-3 w-3", isRegenerating && "animate-spin")} />
              </Button>
            )}
          </div>
        )}
      </div>
    );
  }

  // Compact variant for smaller sections
  if (variant === "compact") {
    return (
      <div className={cn("rounded-lg border bg-muted/30 p-3", className)}>
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">{title}</span>
            {getConfidenceBadge()}
          </div>
          {onRegenerate && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRegenerate}
              disabled={isRegenerating || isLoading}
              className="h-7 px-2"
            >
              <RefreshCw className={cn("mr-1 h-3 w-3", isRegenerating && "animate-spin")} />
              {regenerateLabel}
            </Button>
          )}
        </div>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 text-sm text-red-500">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        ) : (
          children
        )}
        {parsedDate && (
          <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            Generated {formatDistanceToNow(parsedDate, { addSuffix: true })}
          </div>
        )}
      </div>
    );
  }

  // Default full card variant
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <CardTitle className="text-lg">{title}</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {getConfidenceBadge()}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="secondary" className="text-xs">
                    <Bot className="mr-1 h-3 w-3" />
                    {model}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Generated by {model}</p>
                  {tokensUsed && (
                    <p className="text-xs text-muted-foreground">{tokensUsed} tokens used</p>
                  )}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/6" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <AlertCircle className="mb-3 h-10 w-10 text-red-400" />
            <p className="font-medium text-red-500">Generation Failed</p>
            <p className="mt-1 text-sm text-muted-foreground">{error}</p>
            {onRegenerate && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRegenerate}
                disabled={isRegenerating}
                className="mt-4"
              >
                <RefreshCw className={cn("mr-2 h-4 w-4", isRegenerating && "animate-spin")} />
                Try Again
              </Button>
            )}
          </div>
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none">{children}</div>
        )}
      </CardContent>

      <CardFooter className="flex items-center justify-between border-t bg-muted/20 px-4 py-2">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          {parsedDate ? (
            <span>Generated {formatDistanceToNow(parsedDate, { addSuffix: true })}</span>
          ) : (
            <span>Generation time unknown</span>
          )}
        </div>
        {onRegenerate && !error && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRegenerate}
            disabled={isRegenerating || isLoading}
            className="h-7"
          >
            <RefreshCw className={cn("mr-1 h-3 w-3", isRegenerating && "animate-spin")} />
            {regenerateLabel}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

/**
 * AI Disclaimer text to show at bottom of AI-generated sections
 */
export function AIDisclaimer({ className }: { className?: string }) {
  return (
    <p className={cn("text-xs italic text-muted-foreground", className)}>
      This content was generated by AI and should be reviewed for accuracy before use. AI-generated
      content may contain errors or omissions.
    </p>
  );
}

/**
 * AI Generated Badge - small indicator for inline AI content
 */
export function AIGeneratedBadge({
  generatedAt,
  className,
}: {
  generatedAt?: Date | string | null;
  className?: string;
}) {
  const parsedDate = generatedAt
    ? typeof generatedAt === "string"
      ? new Date(generatedAt)
      : generatedAt
    : null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="secondary" className={cn("cursor-help text-xs", className)}>
            <Sparkles className="mr-1 h-3 w-3" />
            AI
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>AI-generated content</p>
          {parsedDate && (
            <p className="text-xs text-muted-foreground">
              Generated {formatDistanceToNow(parsedDate, { addSuffix: true })}
            </p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
