/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";
import { AIModels, callOpenAI } from "@/lib/ai/client";
import { requireAuth } from "@/lib/auth/requireAuth";
import { safeServerAction, verifyClaimAccess } from "@/lib/security/serverSecurity";

export type ClaimNarratives = {
  overview: string;
  adjusterTalkingPoints: string[];
  codeSummary: string[];
};

export async function generateClaimNarratives(input: {
  claimId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  analysis: any; // ClaimAnalysisView
  weather?: { hail?: string; wind?: string; eventDate?: string; severity?: string } | null;
}): Promise<ClaimNarratives> {
  const result = await safeServerAction(async () => {
    const { claimId, analysis, weather } = input;

    // Validate required fields
    if (!claimId) {
      throw new Error("claimId required");
    }
    if (!analysis) {
      throw new Error("analysis data required");
    }

    // Authenticate and authorize
    const authResult = await requireAuth();
    const { userId, orgId } = authResult as {
      userId: string;
      orgId: string;
      role: string;
      membershipId: string;
    };
    if (!orgId) {
      throw new Error("Organization access required");
    }

    // Verify user has access to this claim
    const hasAccess = await verifyClaimAccess(claimId, userId, orgId);
    if (!hasAccess) {
      throw new Error("Access denied: You do not have permission to access this claim");
    }

    const system =
      "You are an expert insurance claims AI producing concise professional narratives.";
    const userPrompt = `Produce three outputs for claim ${claimId}:
1. Overview (2-3 paragraphs) summarizing overall roof/exterior condition using slopes, elevations, trades, risk notes.
2. Adjuster Talking Points as 6-10 concise bullet statements (no numbering) focusing on justification for full or partial replacement referencing any weather.
3. Code Summary as 6-10 bullet items referencing manufacturer or code items implied by damage (starter, drip edge, I&W barrier, ventilation, flashing, pipe boots, valley metal).

DATA:
// eslint-disable-next-line @typescript-eslint/no-explicit-any
Slopes: ${analysis.slopes?.map((s: any) => `${s.label}: ${s.damageTypes?.map((d: any) => d.type + "(" + d.count + ")").join(", ")}`).join(" | ") || "No slopes"}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
Trades: ${analysis.trades?.map((t: any) => `${t.trade}(${t.severity})`).join(", ") || "No trades"}
Risk: ${analysis.riskNotes?.join("; ") || "None"}
CodeFlags: ${analysis.codeFlags?.join(", ") || "None"}
Weather: ${weather ? `Hail ${weather.hail || "N/A"} | Wind ${weather.wind || "N/A"} | Severity ${weather.severity}` : "No weather"}

Return JSON {overview: string, adjusterTalkingPoints: string[], codeSummary: string[]}`;

    const res = await callOpenAI<ClaimNarratives>({
      tag: "claim_narratives",
      model: AIModels.STANDARD,
      system,
      messages: [{ role: "user", content: userPrompt }],
      parseJson: true,
      maxTokens: 1200,
      context: { claimId },
    });

    if (res.success && res.data) {
      return res.data;
    }

    // Fallback simple heuristic
    return {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      overview: `Claim ${claimId} exhibits damage across slopes: ${analysis.slopes?.length || 0}. Trades impacted: ${analysis.trades?.map((t: any) => t.trade).join(", ") || "None"}.`,
      adjusterTalkingPoints:
        analysis.trades?.map(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (t: any) =>
            `${t.trade} shows ${t.severity?.toLowerCase() || "unknown"} impact requiring evaluation.`
        ) || [],
      codeSummary: analysis.codeFlags?.length ? analysis.codeFlags : ["No code flags detected"],
    };
  });

  // Handle server action result
  if (!result.success || !result.data) {
    throw new Error(result.error || "Failed to generate claim narratives");
  }

  return result.data;
}
