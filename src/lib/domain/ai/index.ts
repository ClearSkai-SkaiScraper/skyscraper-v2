/**
 * AI Domain Service
 *
 * Encapsulates AI-powered business logic for claims processing.
 * All AI operations go through this service layer.
 */

import "server-only";

import { getOpenAI } from "@/lib/ai/client";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

/**
 * Generate a scope of work using AI analysis
 */
export async function generateScope(params: {
  claimId: string;
  orgId: string;
  photos?: string[];
  description?: string;
}) {
  logger.info("[AI_DOMAIN] generateScope", { claimId: params.claimId });

  const openai = getOpenAI();
  const prompt = `Generate a detailed scope of work for a storm damage restoration claim.
Description: ${params.description || "Not provided"}
Number of photos: ${params.photos?.length || 0}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
  });

  return {
    scope: response.choices[0]?.message?.content || "",
    claimId: params.claimId,
  };
}

/**
 * Analyze damage from photos and description using AI
 */
export async function analyzeDamage(params: {
  claimId: string;
  orgId: string;
  photos?: string[];
  description?: string;
}) {
  logger.info("[AI_DOMAIN] analyzeDamage", { claimId: params.claimId });

  const openai = getOpenAI();
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "user",
        content: `Analyze storm damage based on: ${params.description || "photos provided"}`,
      },
    ],
  });

  return {
    analysis: response.choices[0]?.message?.content || "",
    claimId: params.claimId,
  };
}

/**
 * Generate a dispute letter for an insurance claim
 */
export async function generateDispute(params: {
  claimId: string;
  orgId: string;
  reason: string;
  carrierName?: string;
}) {
  logger.info("[AI_DOMAIN] generateDispute", { claimId: params.claimId });

  const openai = getOpenAI();
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "user",
        content: `Generate a professional dispute letter for: ${params.reason}`,
      },
    ],
  });

  return {
    letter: response.choices[0]?.message?.content || "",
    claimId: params.claimId,
  };
}

/**
 * Summarize a claim for quick overview
 */
export async function summarizeClaim(params: { claimId: string; orgId: string }) {
  logger.info("[AI_DOMAIN] summarizeClaim", { claimId: params.claimId });

  const claim = await prisma.claims.findFirst({
    where: { id: params.claimId, orgId: params.orgId },
    select: {
      claimNumber: true,
      status: true,
      carrier: true,
      description: true,
      damageType: true,
    },
  });

  if (!claim) throw new Error("Claim not found");

  const openai = getOpenAI();
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "user",
        content: `Summarize this claim in 2-3 sentences: ${JSON.stringify(claim)}`,
      },
    ],
  });

  return {
    summary: response.choices[0]?.message?.content || "",
    claimId: params.claimId,
  };
}
