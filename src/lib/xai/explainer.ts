/**
 * Task 236: Explainable AI (XAI) Engine
 *
 * Implements model interpretability, feature importance, SHAP values,
 * LIME explanations, attention visualization, and counterfactual analysis.
 */

import prisma from "@/lib/prisma";

export type ExplanationMethod = "shap" | "lime" | "attention" | "gradient" | "counterfactual";

export interface ModelExplanation {
  id: string;
  modelId: string;
  method: ExplanationMethod;
  input: any;
  prediction: any;
  explanation: any;
  confidence: number;
  createdAt: Date;
}

export interface FeatureImportance {
  feature: string;
  importance: number;
  direction: "positive" | "negative";
}

export interface SHAPValue {
  feature: string;
  value: number;
  baseValue: number;
  shapValue: number;
}

export interface LIMEExplanation {
  feature: string;
  coefficient: number;
  weight: number;
}

export interface CounterfactualExample {
  original: any;
  counterfactual: any;
  changes: Array<{ feature: string; from: any; to: any }>;
  distance: number;
}

/**
 * Explain prediction
 */
export async function explainPrediction(
  modelId: string,
  input: any,
  method: ExplanationMethod = "shap"
): Promise<ModelExplanation> {
  const prediction = await makePrediction(modelId, input);
  let explanation: any;

  switch (method) {
    case "shap":
      explanation = await calculateSHAP(modelId, input);
      break;
    case "lime":
      explanation = await calculateLIME(modelId, input);
      break;
    case "attention":
      explanation = await extractAttention(modelId, input);
      break;
    case "gradient":
      explanation = await calculateGradients(modelId, input);
      break;
    case "counterfactual":
      explanation = await generateCounterfactual(modelId, input, prediction);
      break;
    default:
      explanation = await calculateSHAP(modelId, input);
  }

  const saved = await prisma.modelExplanation.create({
    data: {
      modelId,
      method,
      input,
      prediction,
      explanation,
      confidence: prediction.confidence || 0.5,
    },
  });

  return saved as ModelExplanation;
}

/**
 * Make prediction
 */
async function makePrediction(_modelId: string, _input: any): Promise<any> {
  // Simulate model prediction
  return {
    class: Math.random() > 0.5 ? "positive" : "negative",
    probability: Math.random(),
    confidence: Math.random(),
  };
}

/**
 * Calculate SHAP values
 */
async function calculateSHAP(modelId: string, input: any): Promise<SHAPValue[]> {
  const features = Object.keys(input);
  const shapValues: SHAPValue[] = [];

  // Calculate base prediction
  const basePrediction = await makePrediction(modelId, {});
  const currentPrediction = await makePrediction(modelId, input);

  for (const feature of features) {
    // Calculate marginal contribution
    const withoutFeature = { ...input };
    delete withoutFeature[feature];

    const predictionWithout = await makePrediction(modelId, withoutFeature);
    const contribution = currentPrediction.probability - predictionWithout.probability;

    shapValues.push({
      feature,
      value: input[feature],
      baseValue: basePrediction.probability,
      shapValue: contribution,
    });
  }

  return shapValues;
}

/**
 * Calculate LIME explanation
 */
async function calculateLIME(modelId: string, input: any): Promise<LIMEExplanation[]> {
  const features = Object.keys(input);
  const explanations: LIMEExplanation[] = [];

  // Generate perturbed samples
  const samples: any[] = [];
  const predictions: number[] = [];
  const distances: number[] = [];

  for (let i = 0; i < 100; i++) {
    const perturbed = perturbInput(input);
    const prediction = await makePrediction(modelId, perturbed);
    const distance = calculateDistance(input, perturbed);

    samples.push(perturbed);
    predictions.push(prediction.probability);
    distances.push(distance);
  }

  // Fit linear model
  for (const feature of features) {
    const coefficient = fitLinearRegression(
      samples.map((s) => s[feature]),
      predictions,
      distances
    );

    explanations.push({
      feature,
      coefficient,
      weight: Math.abs(coefficient),
    });
  }

  return explanations.sort((a, b) => b.weight - a.weight);
}

/**
 * Perturb input
 */
function perturbInput(input: any): any {
  const perturbed: any = {};

  for (const [key, value] of Object.entries(input)) {
    if (typeof value === "number") {
      perturbed[key] = value + (Math.random() - 0.5) * 0.2;
    } else if (typeof value === "string") {
      perturbed[key] = Math.random() > 0.5 ? value : "perturbed";
    } else {
      perturbed[key] = value;
    }
  }

  return perturbed;
}

/**
 * Calculate distance
 */
function calculateDistance(a: any, b: any): number {
  let distance = 0;
  const keys = Object.keys(a);

  for (const key of keys) {
    if (typeof a[key] === "number" && typeof b[key] === "number") {
      distance += Math.pow(a[key] - b[key], 2);
    } else if (a[key] !== b[key]) {
      distance += 1;
    }
  }

  return Math.sqrt(distance);
}

/**
 * Fit linear regression
 */
function fitLinearRegression(features: number[], targets: number[], weights: number[]): number {
  // Weighted least squares
  const n = features.length;
  let sumWX = 0,
    sumWY = 0,
    sumWXY = 0,
    sumWX2 = 0,
    _sumW = 0;

  for (let i = 0; i < n; i++) {
    const w = 1 / (1 + weights[i]);
    _sumW += w;
    sumWX += w * features[i];
    sumWY += w * targets[i];
    sumWXY += w * features[i] * targets[i];
    sumWX2 += w * features[i] * features[i];
  }

  const coefficient = (n * sumWXY - sumWX * sumWY) / (n * sumWX2 - sumWX * sumWX);
  return coefficient || 0;
}

/**
 * Extract attention weights
 */
async function extractAttention(modelId: string, input: any): Promise<any> {
  const features = Object.keys(input);
  const attention: Record<string, number> = {};

  // Simulate attention extraction
  for (const feature of features) {
    attention[feature] = Math.random();
  }

  // Normalize
  const sum = Object.values(attention).reduce((a, b) => a + b, 0);
  for (const feature of features) {
    attention[feature] /= sum;
  }

  return attention;
}

/**
 * Calculate gradients
 */
async function calculateGradients(modelId: string, input: any): Promise<Record<string, number>> {
  const features = Object.keys(input);
  const gradients: Record<string, number> = {};

  const basePrediction = await makePrediction(modelId, input);
  const epsilon = 0.01;

  for (const feature of features) {
    if (typeof input[feature] === "number") {
      const perturbed = { ...input };
      perturbed[feature] += epsilon;

      const perturbedPrediction = await makePrediction(modelId, perturbed);
      const gradient = (perturbedPrediction.probability - basePrediction.probability) / epsilon;

      gradients[feature] = gradient;
    } else {
      gradients[feature] = 0;
    }
  }

  return gradients;
}

/**
 * Generate counterfactual
 */
async function generateCounterfactual(
  modelId: string,
  input: any,
  originalPrediction: any
): Promise<CounterfactualExample> {
  const features = Object.keys(input);
  let counterfactual = { ...input };
  let attempts = 0;
  const maxAttempts = 100;

  // Search for counterfactual
  while (attempts < maxAttempts) {
    const prediction = await makePrediction(modelId, counterfactual);

    if (prediction.class !== originalPrediction.class) {
      break;
    }

    // Modify random feature
    const feature = features[Math.floor(Math.random() * features.length)];
    if (typeof input[feature] === "number") {
      counterfactual[feature] += (Math.random() - 0.5) * 0.5;
    }

    attempts++;
  }

  // Find changes
  const changes: Array<{ feature: string; from: any; to: any }> = [];
  for (const feature of features) {
    if (input[feature] !== counterfactual[feature]) {
      changes.push({
        feature,
        from: input[feature],
        to: counterfactual[feature],
      });
    }
  }

  return {
    original: input,
    counterfactual,
    changes,
    distance: calculateDistance(input, counterfactual),
  };
}

/**
 * Get feature importance
 */
export async function getFeatureImportance(
  modelId: string,
  samples: any[]
): Promise<FeatureImportance[]> {
  if (samples.length === 0) return [];

  const features = Object.keys(samples[0]);
  const importance: FeatureImportance[] = [];

  for (const feature of features) {
    let totalImportance = 0;
    let positiveCount = 0;

    for (const sample of samples) {
      const explanation = await calculateSHAP(modelId, sample);
      const featureShap = explanation.find((e) => e.feature === feature);

      if (featureShap) {
        totalImportance += Math.abs(featureShap.shapValue);
        if (featureShap.shapValue > 0) positiveCount++;
      }
    }

    importance.push({
      feature,
      importance: totalImportance / samples.length,
      direction: positiveCount > samples.length / 2 ? "positive" : "negative",
    });
  }

  return importance.sort((a, b) => b.importance - a.importance);
}

/**
 * Analyze model bias
 */
export async function analyzeBias(
  modelId: string,
  samples: any[],
  protectedAttribute: string
): Promise<{
  overallAccuracy: number;
  groupAccuracies: Record<string, number>;
  disparateImpact: number;
}> {
  const groupPredictions = new Map<string, Array<{ actual: any; predicted: any }>>();

  for (const sample of samples) {
    const group = sample[protectedAttribute];
    const prediction = await makePrediction(modelId, sample);

    if (!groupPredictions.has(group)) {
      groupPredictions.set(group, []);
    }

    groupPredictions.get(group)!.push({
      actual: sample.label,
      predicted: prediction.class,
    });
  }

  const groupAccuracies: Record<string, number> = {};
  for (const [group, predictions] of groupPredictions.entries()) {
    const correct = predictions.filter((p) => p.actual === p.predicted).length;
    groupAccuracies[group] = correct / predictions.length;
  }

  const accuracyValues = Object.values(groupAccuracies);
  const overallAccuracy = accuracyValues.reduce((a, b) => a + b, 0) / accuracyValues.length;
  const disparateImpact = Math.min(...accuracyValues) / Math.max(...accuracyValues);

  return { overallAccuracy, groupAccuracies, disparateImpact };
}

export {
  CounterfactualExample,
  ExplanationMethod,
  FeatureImportance,
  LIMEExplanation,
  ModelExplanation,
  SHAPValue,
};
