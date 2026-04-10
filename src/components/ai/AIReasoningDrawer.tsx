"use client";

import {
  Brain,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Lightbulb,
  TrendingUp,
} from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { logger } from "@/lib/logger";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface Rule {
  id: string;
  name: string;
  description?: string;
  priority: number;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface SimilarClaim {
  claimId: string;
  score: number;
  outcome?: string;
  carrier?: string;
}

interface AIExplanation {
  reasoning: string;
  rulesUsed: string[];
  similarCases: { claimId: string; score: number }[];
  confidenceScore: number;
  keyFactors?: string[];
}

interface AIReasoningDrawerProps {
  claimId: string;
  explanation?: AIExplanation;
  trigger?: React.ReactNode;
}

export function AIReasoningDrawer({ claimId, explanation, trigger }: AIReasoningDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<AIExplanation | null>(explanation || null);
  const [expandedRules, setExpandedRules] = useState<Set<string>>(new Set());
  const [expandedClaims, setExpandedClaims] = useState<Set<string>>(new Set());

  const fetchExplanation = async () => {
    if (data) return; // Already have data

    try {
      setLoading(true);
      const response = await fetch(`/api/ai/orchestrate/${claimId}?type=full_intelligence`);

      if (!response.ok) {
        throw new Error("Failed to fetch AI explanation");
      }

      const result = await response.json();
      setData(result.explanation);
    } catch (err) {
      logger.error("Failed to fetch AI explanation:", err);
    } finally {
      setLoading(false);
    }
  };

  const toggleRule = (ruleId: string) => {
    setExpandedRules((prev) => {
      const next = new Set(prev);
      if (next.has(ruleId)) {
        next.delete(ruleId);
      } else {
        next.add(ruleId);
      }
      return next;
    });
  };

  const toggleClaim = (claimId: string) => {
    setExpandedClaims((prev) => {
      const next = new Set(prev);
      if (next.has(claimId)) {
        next.delete(claimId);
      } else {
        next.add(claimId);
      }
      return next;
    });
  };

  return (
    <Drawer open={isOpen} onOpenChange={setIsOpen}>
      <DrawerTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" onClick={fetchExplanation}>
            <Brain className="mr-2 h-4 w-4" />
            View AI Reasoning
          </Button>
        )}
      </DrawerTrigger>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader>
          <DrawerTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            AI Intelligence Reasoning
          </DrawerTitle>
          <DrawerDescription>
            Understand how the AI arrived at its recommendations
          </DrawerDescription>
        </DrawerHeader>

        <ScrollArea className="max-h-[60vh] px-6 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
            </div>
          ) : data ? (
            <div className="space-y-6">
              {/* Main Reasoning */}
              <div>
                <h3 className="mb-2 flex items-center gap-2 text-lg font-semibold">
                  <Lightbulb className="h-5 w-5 text-yellow-500" />
                  Reasoning
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{data.reasoning}</p>
                {data.confidenceScore !== undefined && (
                  <div className="mt-3">
                    <Badge variant="secondary" className="text-sm">
                      {Math.round(data.confidenceScore * 100)}% Confidence
                    </Badge>
                  </div>
                )}
              </div>

              <Separator />

              {/* Key Factors */}
              {data.keyFactors && data.keyFactors.length > 0 && (
                <>
                  <div>
                    <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold">
                      <TrendingUp className="h-5 w-5 text-green-500" />
                      Key Factors
                    </h3>
                    <ul className="space-y-2">
                      {data.keyFactors.map((factor, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm">
                          <span className="mt-0.5 text-green-500">✓</span>
                          <span>{factor}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <Separator />
                </>
              )}

              {/* Rules Used */}
              {data.rulesUsed && data.rulesUsed.length > 0 && (
                <>
                  <div>
                    <h3 className="mb-3 text-lg font-semibold">
                      Business Rules Applied ({data.rulesUsed.length})
                    </h3>
                    <div className="space-y-2">
                      {data.rulesUsed.map((ruleId) => {
                        const isExpanded = expandedRules.has(ruleId);
                        return (
                          <div
                            key={ruleId}
                            className="cursor-pointer rounded-lg border p-3 transition-colors hover:bg-muted/50"
                            onClick={() => toggleRule(ruleId)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {isExpanded ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                                <span className="text-sm font-medium">Rule: {ruleId}</span>
                              </div>
                              <Badge variant="outline" className="text-xs">
                                Active
                              </Badge>
                            </div>
                            {isExpanded && (
                              <div className="mt-2 pl-6 text-sm text-muted-foreground">
                                <p>
                                  This rule triggered based on the claim data and context.
                                  <Button
                                    variant="link"
                                    size="sm"
                                    className="ml-1 h-auto p-0"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      // Navigate to rule details
                                    }}
                                  >
                                    View details
                                    <ExternalLink className="ml-1 h-3 w-3" />
                                  </Button>
                                </p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <Separator />
                </>
              )}

              {/* Similar Claims */}
              {data.similarCases && data.similarCases.length > 0 && (
                <div>
                  <h3 className="mb-3 text-lg font-semibold">
                    Similar Claims ({data.similarCases.length})
                  </h3>
                  <div className="space-y-2">
                    {data.similarCases.map((claim) => {
                      const isExpanded = expandedClaims.has(claim.claimId);
                      return (
                        <div
                          key={claim.claimId}
                          className="cursor-pointer rounded-lg border p-3 transition-colors hover:bg-muted/50"
                          onClick={() => toggleClaim(claim.claimId)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                              <span className="text-sm font-medium">{claim.claimId}</span>
                            </div>
                            <Badge variant="secondary" className="text-xs">
                              {Math.round(claim.score * 100)}% match
                            </Badge>
                          </div>
                          {isExpanded && (
                            <div className="mt-2 pl-6 text-sm text-muted-foreground">
                              <p>
                                This claim shares similar characteristics and can provide insights.
                                <Button
                                  variant="link"
                                  size="sm"
                                  className="ml-1 h-auto p-0"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    window.open(`/claims/${claim.claimId}`, "_blank");
                                  }}
                                >
                                  Open claim
                                  <ExternalLink className="ml-1 h-3 w-3" />
                                </Button>
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="py-12 text-center text-muted-foreground">
              <Brain className="mx-auto mb-2 h-12 w-12 opacity-50" />
              <p>No reasoning data available</p>
            </div>
          )}
        </ScrollArea>

        <DrawerFooter>
          <DrawerClose asChild>
            <Button variant="outline">Close</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
