// src/lib/rl/active.ts
// Active Reinforcement Learning Module
// Implements query strategies, uncertainty estimation, active exploration, and sample efficiency

/**
 * Active learning task configuration
 */
export interface ActiveRLTask {
  taskId: string;
  environment: string;
  policy: number[];
  stateSpace: number;
  actionSpace: number;
  labelingBudget: number;
  explorationHorizon: number;
}

/**
 * Result of active exploration
 */
export interface ActiveRLResult {
  taskId: string;
  updatedPolicy: number[];
  explorationScore: number;
  queriesMade: number;
  uncertaintyReduction: number;
  sampleEfficiency: number;
  informationGain: number;
}

/**
 * Configuration for active learning
 */
export interface ActiveRLConfig {
  queryStrategy: "uncertainty" | "diversity" | "expected-improvement" | "thompson" | "ucb";
  uncertaintyMethod: "entropy" | "variance" | "disagreement" | "qbc";
  batchSize: number;
  acquisitionFunction: "greedy" | "epsilon-greedy" | "softmax";
  explorationCoefficient: number;
  diversityWeight: number;
}

/**
 * Query selection result
 */
export interface QuerySelection {
  stateIndex: number;
  state: number[];
  uncertainty: number;
  informationGain: number;
  diversity: number;
  priority: number;
}

/**
 * Uncertainty estimate for a state-action pair
 */
export interface UncertaintyEstimate {
  state: number[];
  action: number;
  mean: number;
  variance: number;
  entropy: number;
  confidence: number;
}

/**
 * Ensemble of policies for uncertainty estimation
 */
export interface PolicyEnsemble {
  policies: number[][];
  ensembleSize: number;
  diversityMetric: number;
  consensusThreshold: number;
}

/**
 * Information gain metrics
 */
export interface InformationGain {
  mutualInformation: number;
  klDivergence: number;
  expectedReduction: number;
  valueOfInformation: number;
}

/**
 * Sample efficiency metrics
 */
export interface SampleEfficiency {
  totalSamples: number;
  effectiveSamples: number;
  redundancyRate: number;
  coverageMetric: number;
  learningCurveSlope: number;
}

/**
 * Active exploration strategy
 */
export interface ExplorationStrategy {
  name: string;
  exploration_rate: number;
  exploitation_rate: number;
  balanceMetric: number;
}

/**
 * Active Reinforcement Learning implementation
 * Maximizes sample efficiency through intelligent query selection
 */
export class ActiveRL {
  private config: ActiveRLConfig;
  private policy: number[];
  private ensemble: PolicyEnsemble | null = null;
  private queriedStates: Set<string> = new Set();
  private uncertaintyCache: Map<string, UncertaintyEstimate> = new Map();
  private informationGainHistory: InformationGain[] = [];
  private explorationHistory: Array<{ state: number[]; action: number; reward: number }> = [];

  constructor(initialPolicy: number[], config: Partial<ActiveRLConfig> = {}) {
    this.config = {
      queryStrategy: "uncertainty",
      uncertaintyMethod: "entropy",
      batchSize: 10,
      acquisitionFunction: "epsilon-greedy",
      explorationCoefficient: 2.0,
      diversityWeight: 0.3,
      ...config,
    };
    this.policy = [...initialPolicy];
  }

  /**
   * Initialize policy ensemble for uncertainty estimation
   */
  initializeEnsemble(ensembleSize: number = 5): void {
    try {
      const policies: number[][] = [];

      for (let i = 0; i < ensembleSize; i++) {
        const noise = this.policy.map(() => (Math.random() - 0.5) * 0.1);
        const perturbedPolicy = this.policy.map((p, idx) => p + noise[idx]);
        policies.push(perturbedPolicy);
      }

      const diversityMetric = this.computeEnsembleDiversity(policies);

      this.ensemble = {
        policies,
        ensembleSize,
        diversityMetric,
        consensusThreshold: 0.7,
      };
    } catch (error) {
      throw new Error(
        `Failed to initialize ensemble: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Active exploration using uncertainty-based query selection
   */
  async explore(
    task: ActiveRLTask,
    candidateStates: number[][],
    labelOracle: (state: number[], action: number) => number
  ): Promise<ActiveRLResult> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const startMetrics = this.computeSampleEfficiency();
      let queriesMade = 0;
      let totalUncertaintyBefore = 0;
      let totalUncertaintyAfter = 0;

      // Query selection loop
      while (queriesMade < task.labelingBudget) {
        // Select batch of queries
        const queries = this.selectQueryBatch(candidateStates, this.config.batchSize);

        for (const query of queries) {
          if (queriesMade >= task.labelingBudget) break;

          // Measure uncertainty before querying
          const uncertaintyBefore = this.estimateUncertainty(query.state);
          totalUncertaintyBefore += uncertaintyBefore.entropy;

          // Query oracle for label
          const action = this.selectAction(query.state);
          const reward = labelOracle(query.state, action);

          // Update policy with new information
          this.updatePolicyWithQuery(query.state, action, reward);

          // Measure uncertainty after update
          const uncertaintyAfter = this.estimateUncertainty(query.state);
          totalUncertaintyAfter += uncertaintyAfter.entropy;

          // Track exploration
          this.explorationHistory.push({ state: query.state, action, reward });
          this.queriedStates.add(this.stateToString(query.state));

          queriesMade++;
        }

        // Update ensemble periodically
        if (queriesMade % 10 === 0 && this.ensemble) {
          this.updateEnsemble();
        }
      }

      const endMetrics = this.computeSampleEfficiency();
      const uncertaintyReduction =
        (totalUncertaintyBefore - totalUncertaintyAfter) / totalUncertaintyBefore;
      const informationGain = this.computeTotalInformationGain();

      return {
        taskId: task.taskId,
        updatedPolicy: [...this.policy],
        explorationScore: this.computeExplorationScore(),
        queriesMade,
        uncertaintyReduction,
        sampleEfficiency: endMetrics.effectiveSamples / endMetrics.totalSamples,
        informationGain: informationGain.mutualInformation,
      };
    } catch (error) {
      throw new Error(
        `Active exploration failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Select batch of queries using configured strategy
   */
  selectQueryBatch(candidateStates: number[][], batchSize: number): QuerySelection[] {
    try {
      const queries: QuerySelection[] = [];
      const scored: Array<{ state: number[]; score: number; idx: number }> = [];

      // Score all candidate states
      for (let i = 0; i < candidateStates.length; i++) {
        const state = candidateStates[i];
        const stateKey = this.stateToString(state);

        // Skip already queried states
        if (this.queriedStates.has(stateKey)) continue;

        const score = this.computeAcquisitionScore(state, queries);
        scored.push({ state, score, idx: i });
      }

      // Sort by score (descending)
      scored.sort((a, b) => b.score - a.score);

      // Select top-k diverse queries
      for (let i = 0; i < Math.min(batchSize, scored.length); i++) {
        const candidate = scored[i];
        const uncertainty = this.estimateUncertainty(candidate.state);
        const informationGain = this.estimateInformationGain(candidate.state);
        const diversity = this.computeDiversityScore(
          candidate.state,
          queries.map((q) => q.state)
        );

        queries.push({
          stateIndex: candidate.idx,
          state: candidate.state,
          uncertainty: uncertainty.entropy,
          informationGain: informationGain.mutualInformation,
          diversity,
          priority: candidate.score,
        });
      }

      return queries;
    } catch (error) {
      throw new Error(
        `Query batch selection failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Estimate uncertainty using configured method
   */
  estimateUncertainty(state: number[]): UncertaintyEstimate {
    try {
      const stateKey = this.stateToString(state);

      // Check cache
      if (this.uncertaintyCache.has(stateKey)) {
        return this.uncertaintyCache.get(stateKey)!;
      }

      let uncertainty: UncertaintyEstimate;

      if (this.config.uncertaintyMethod === "entropy") {
        uncertainty = this.computeEntropyUncertainty(state);
      } else if (this.config.uncertaintyMethod === "variance") {
        uncertainty = this.computeVarianceUncertainty(state);
      } else if (this.config.uncertaintyMethod === "disagreement") {
        uncertainty = this.computeDisagreementUncertainty(state);
      } else {
        uncertainty = this.computeQBCUncertainty(state);
      }

      // Cache result
      this.uncertaintyCache.set(stateKey, uncertainty);

      return uncertainty;
    } catch (error) {
      throw new Error(
        `Uncertainty estimation failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Compute entropy-based uncertainty
   */
  private computeEntropyUncertainty(state: number[]): UncertaintyEstimate {
    const qValues = this.forward(this.policy, state);
    const probs = this.softmax(qValues);

    let entropy = 0;
    for (const p of probs) {
      if (p > 0) {
        entropy -= p * Math.log2(p);
      }
    }

    const maxAction = this.argmax(qValues);
    const mean = qValues[maxAction];
    const variance = this.computeVariance(qValues);

    return {
      state,
      action: maxAction,
      mean,
      variance,
      entropy,
      confidence: 1.0 - entropy / Math.log2(qValues.length),
    };
  }

  /**
   * Compute variance-based uncertainty using ensemble
   */
  private computeVarianceUncertainty(state: number[]): UncertaintyEstimate {
    if (!this.ensemble) {
      throw new Error("Ensemble not initialized");
    }

    const predictions: number[][] = [];
    for (const policy of this.ensemble.policies) {
      predictions.push(this.forward(policy, state));
    }

    // Compute mean and variance across ensemble
    const ensembleMean = new Array(predictions[0].length).fill(0);
    for (const pred of predictions) {
      for (let i = 0; i < pred.length; i++) {
        ensembleMean[i] += pred[i] / predictions.length;
      }
    }

    const variance = new Array(predictions[0].length).fill(0);
    for (const pred of predictions) {
      for (let i = 0; i < pred.length; i++) {
        variance[i] += Math.pow(pred[i] - ensembleMean[i], 2) / predictions.length;
      }
    }

    const maxVarianceAction = this.argmax(variance);
    const entropy = variance.reduce((sum, v) => sum + v, 0);

    return {
      state,
      action: maxVarianceAction,
      mean: ensembleMean[maxVarianceAction],
      variance: variance[maxVarianceAction],
      entropy,
      confidence: 1.0 / (1.0 + variance[maxVarianceAction]),
    };
  }

  /**
   * Compute disagreement-based uncertainty (Query-by-Committee)
   */
  private computeDisagreementUncertainty(state: number[]): UncertaintyEstimate {
    if (!this.ensemble) {
      throw new Error("Ensemble not initialized");
    }

    const votes = new Map<number, number>();
    for (const policy of this.ensemble.policies) {
      const qValues = this.forward(policy, state);
      const action = this.argmax(qValues);
      votes.set(action, (votes.get(action) || 0) + 1);
    }

    const totalVotes = this.ensemble.ensembleSize;
    const maxVotes = Math.max(...votes.values());
    const disagreement = 1.0 - maxVotes / totalVotes;

    const qValues = this.forward(this.policy, state);
    const maxAction = this.argmax(qValues);

    return {
      state,
      action: maxAction,
      mean: qValues[maxAction],
      variance: disagreement,
      entropy: disagreement,
      confidence: maxVotes / totalVotes,
    };
  }

  /**
   * Query-by-Committee uncertainty
   */
  private computeQBCUncertainty(state: number[]): UncertaintyEstimate {
    if (!this.ensemble) {
      throw new Error("Ensemble not initialized");
    }

    const predictions: number[][] = [];
    for (const policy of this.ensemble.policies) {
      predictions.push(this.forward(policy, state));
    }

    // Compute vote entropy
    const actionCounts = new Map<number, number>();
    for (const pred of predictions) {
      const action = this.argmax(pred);
      actionCounts.set(action, (actionCounts.get(action) || 0) + 1);
    }

    let entropy = 0;
    for (const count of actionCounts.values()) {
      const prob = count / predictions.length;
      entropy -= prob * Math.log2(prob);
    }

    const qValues = this.forward(this.policy, state);
    const maxAction = this.argmax(qValues);

    return {
      state,
      action: maxAction,
      mean: qValues[maxAction],
      variance: entropy,
      entropy,
      confidence: 1.0 - entropy / Math.log2(predictions[0].length),
    };
  }

  /**
   * Estimate information gain from querying a state
   */
  private estimateInformationGain(state: number[]): InformationGain {
    const uncertainty = this.estimateUncertainty(state);

    // Expected information gain (simplified)
    const mutualInformation = uncertainty.entropy;
    const klDivergence = uncertainty.variance;
    const expectedReduction = uncertainty.entropy * 0.5; // Heuristic
    const valueOfInformation = mutualInformation * this.config.explorationCoefficient;

    return {
      mutualInformation,
      klDivergence,
      expectedReduction,
      valueOfInformation,
    };
  }

  /**
   * Compute acquisition score for query selection
   */
  private computeAcquisitionScore(state: number[], selectedQueries: QuerySelection[]): number {
    const uncertainty = this.estimateUncertainty(state);
    const informationGain = this.estimateInformationGain(state);
    const diversity = this.computeDiversityScore(
      state,
      selectedQueries.map((q) => q.state)
    );

    // Weighted combination
    const uncertaintyWeight = 1.0 - this.config.diversityWeight;
    const score =
      uncertaintyWeight * uncertainty.entropy +
      this.config.diversityWeight * diversity +
      0.1 * informationGain.valueOfInformation;

    return score;
  }

  /**
   * Compute diversity score relative to already selected queries
   */
  private computeDiversityScore(state: number[], selectedStates: number[][]): number {
    if (selectedStates.length === 0) return 1.0;

    let minDistance = Infinity;
    for (const selected of selectedStates) {
      const distance = this.euclideanDistance(state, selected);
      minDistance = Math.min(minDistance, distance);
    }

    // Normalize distance to [0, 1]
    return Math.tanh(minDistance);
  }

  /**
   * Update policy with query result
   */
  private updatePolicyWithQuery(state: number[], action: number, reward: number): void {
    const learningRate = 0.01;
    const qValues = this.forward(this.policy, state);
    const target = reward;
    const error = target - qValues[action];

    // Gradient descent update (simplified)
    for (let i = 0; i < this.policy.length; i++) {
      const gradient = error * state[i % state.length];
      this.policy[i] += learningRate * gradient;
    }

    // Invalidate uncertainty cache for this state
    this.uncertaintyCache.delete(this.stateToString(state));
  }

  /**
   * Update ensemble policies
   */
  private updateEnsemble(): void {
    if (!this.ensemble) return;

    for (let i = 0; i < this.ensemble.policies.length; i++) {
      // Add noise to maintain diversity
      this.ensemble.policies[i] = this.ensemble.policies[i].map(
        (p, idx) => 0.9 * p + 0.1 * this.policy[idx] + (Math.random() - 0.5) * 0.01
      );
    }

    this.ensemble.diversityMetric = this.computeEnsembleDiversity(this.ensemble.policies);
  }

  /**
   * Compute sample efficiency metrics
   */
  private computeSampleEfficiency(): SampleEfficiency {
    const totalSamples = this.explorationHistory.length;
    const uniqueStates = this.queriedStates.size;
    const effectiveSamples = uniqueStates;
    const redundancyRate = totalSamples > 0 ? 1.0 - effectiveSamples / totalSamples : 0;

    // Coverage metric (simplified)
    const coverageMetric = uniqueStates / (uniqueStates + 100); // Normalize

    // Learning curve slope
    const recentRewards = this.explorationHistory.slice(-10).map((h) => h.reward);
    const learningCurveSlope =
      recentRewards.length > 1
        ? (recentRewards[recentRewards.length - 1] - recentRewards[0]) / recentRewards.length
        : 0;

    return {
      totalSamples,
      effectiveSamples,
      redundancyRate,
      coverageMetric,
      learningCurveSlope,
    };
  }

  /**
   * Compute exploration score
   */
  private computeExplorationScore(): number {
    const efficiency = this.computeSampleEfficiency();
    const avgUncertaintyReduction =
      this.informationGainHistory.length > 0
        ? this.informationGainHistory.reduce((sum, ig) => sum + ig.expectedReduction, 0) /
          this.informationGainHistory.length
        : 0;

    return efficiency.coverageMetric * 0.5 + avgUncertaintyReduction * 0.5;
  }

  /**
   * Compute total information gain
   */
  private computeTotalInformationGain(): InformationGain {
    if (this.informationGainHistory.length === 0) {
      return {
        mutualInformation: 0,
        klDivergence: 0,
        expectedReduction: 0,
        valueOfInformation: 0,
      };
    }

    const total = this.informationGainHistory.reduce((acc, ig) => ({
      mutualInformation: acc.mutualInformation + ig.mutualInformation,
      klDivergence: acc.klDivergence + ig.klDivergence,
      expectedReduction: acc.expectedReduction + ig.expectedReduction,
      valueOfInformation: acc.valueOfInformation + ig.valueOfInformation,
    }));

    const n = this.informationGainHistory.length;
    return {
      mutualInformation: total.mutualInformation / n,
      klDivergence: total.klDivergence / n,
      expectedReduction: total.expectedReduction / n,
      valueOfInformation: total.valueOfInformation / n,
    };
  }

  // Utility methods

  private forward(policy: number[], state: number[]): number[] {
    const actionSpace = Math.max(2, Math.floor(policy.length / state.length));
    const qValues = new Array(actionSpace).fill(0);

    for (let a = 0; a < actionSpace; a++) {
      for (let i = 0; i < state.length; i++) {
        const idx = (a * state.length + i) % policy.length;
        qValues[a] += policy[idx] * state[i];
      }
      qValues[a] = Math.tanh(qValues[a]);
    }

    return qValues;
  }

  private selectAction(state: number[]): number {
    const qValues = this.forward(this.policy, state);

    if (this.config.acquisitionFunction === "greedy") {
      return this.argmax(qValues);
    } else if (this.config.acquisitionFunction === "epsilon-greedy") {
      if (Math.random() < 0.1) {
        return Math.floor(Math.random() * qValues.length);
      }
      return this.argmax(qValues);
    } else {
      // Softmax
      const probs = this.softmax(qValues);
      return this.sampleFromDistribution(probs);
    }
  }

  private softmax(values: number[]): number[] {
    const max = Math.max(...values);
    const exps = values.map((v) => Math.exp(v - max));
    const sum = exps.reduce((a, b) => a + b, 0);
    return exps.map((e) => e / sum);
  }

  private argmax(arr: number[]): number {
    return arr.indexOf(Math.max(...arr));
  }

  private computeVariance(arr: number[]): number {
    const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
    return arr.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / arr.length;
  }

  private euclideanDistance(a: number[], b: number[]): number {
    return Math.sqrt(a.reduce((sum, val, i) => sum + Math.pow(val - b[i], 2), 0));
  }

  private stateToString(state: number[]): string {
    return state.map((s) => s.toFixed(4)).join(",");
  }

  private computeEnsembleDiversity(policies: number[][]): number {
    let totalDistance = 0;
    let comparisons = 0;

    for (let i = 0; i < policies.length; i++) {
      for (let j = i + 1; j < policies.length; j++) {
        totalDistance += this.euclideanDistance(policies[i], policies[j]);
        comparisons++;
      }
    }

    return comparisons > 0 ? totalDistance / comparisons : 0;
  }

  private sampleFromDistribution(probs: number[]): number {
    const rand = Math.random();
    let cumulative = 0;

    for (let i = 0; i < probs.length; i++) {
      cumulative += probs[i];
      if (rand <= cumulative) {
        return i;
      }
    }

    return probs.length - 1;
  }

  /**
   * Get current policy
   */
  getPolicy(): number[] {
    return [...this.policy];
  }

  /**
   * Get exploration history
   */
  getExplorationHistory(): Array<{ state: number[]; action: number; reward: number }> {
    return [...this.explorationHistory];
  }
}
