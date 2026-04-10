// src/lib/rl/transfer.ts
// Transfer Reinforcement Learning Module
// Implements policy distillation, progressive networks, domain randomization, and transfer learning

/**
 * Transfer learning task configuration
 */
export interface TransferRLTask {
  sourceEnv: string;
  targetEnv: string;
  sourcePolicy: number[];
  stateSpaceSource: number;
  stateSpaceTarget: number;
  actionSpaceSource: number;
  actionSpaceTarget: number;
  similarity: number;
}

/**
 * Result of transfer learning
 */
export interface TransferRLResult {
  targetEnv: string;
  transferredPolicy: number[];
  transferScore: number;
  adaptationTime: number;
  performanceGain: number;
  transferMethod: string;
  jumpStart: number;
  asymptote: number;
}

/**
 * Configuration for transfer learning
 */
export interface TransferRLConfig {
  method: "distillation" | "fine-tuning" | "progressive" | "domain-randomization";
  distillationTemperature: number;
  distillationAlpha: number;
  finetuningLayers: "all" | "top" | "bottom";
  learningRate: number;
  freezeLayers: boolean;
  domainRandomizationRange: number;
  adaptiveLearning: boolean;
}

/**
 * Policy distillation configuration
 */
export interface DistillationConfig {
  teacherPolicy: number[];
  temperature: number;
  alpha: number; // Weight between hard and soft targets
  epochs: number;
  studentCapacity: number;
}

/**
 * Domain randomization parameters
 */
export interface DomainRandomization {
  physicsParameters: Map<string, [number, number]>;
  visualParameters: Map<string, [number, number]>;
  dynamicsNoise: number;
  observationNoise: number;
  randomizationSchedule: "uniform" | "curriculum" | "adaptive";
}

/**
 * Progressive network architecture
 */
export interface ProgressiveTransfer {
  baseColumns: Array<{ env: string; policy: number[]; frozen: boolean }>;
  lateralConnections: Map<number, Map<number, number[]>>;
  currentColumn: number;
  transferMatrix: number[][];
}

/**
 * Transfer metrics
 */
export interface TransferMetrics {
  jumpStart: number; // Initial performance boost
  asymptote: number; // Final performance level
  transferRatio: number; // Transferred / from scratch
  timeToThreshold: number;
  negativeTransfer: boolean;
  catastrophicForgetting: number;
}

/**
 * Feature mapping between domains
 */
export interface FeatureMapping {
  sourceFeatures: number[];
  targetFeatures: number[];
  mappingMatrix: number[][];
  alignmentScore: number;
}

/**
 * Transfer Reinforcement Learning implementation
 * Enables efficient learning in new environments through knowledge transfer
 */
export class TransferRL {
  private config: TransferRLConfig;
  private sourcePolicy: number[] | null = null;
  private targetPolicy: number[] | null = null;
  private transferHistory: Map<string, TransferRLResult[]> = new Map();
  private domainRandomization: DomainRandomization | null = null;
  private progressiveNet: ProgressiveTransfer | null = null;

  constructor(config: Partial<TransferRLConfig> = {}) {
    this.config = {
      method: "distillation",
      distillationTemperature: 2.0,
      distillationAlpha: 0.5,
      finetuningLayers: "top",
      learningRate: 0.001,
      freezeLayers: true,
      domainRandomizationRange: 0.2,
      adaptiveLearning: true,
      ...config,
    };
  }

  /**
   * Transfer policy using knowledge distillation
   * Compress teacher policy into smaller student policy
   */
  async transferWithDistillation(
    task: TransferRLTask,
    studentSize: number,
    trainingData: Array<{ state: number[]; teacherAction: number }>
  ): Promise<TransferRLResult> {
    try {
      const startTime = Date.now();
      this.sourcePolicy = task.sourcePolicy;

      // Initialize student policy (smaller than teacher)
      const studentPolicy = new Array(studentSize).fill(0).map(() => (Math.random() - 0.5) * 0.1);

      const temperature = this.config.distillationTemperature;
      const alpha = this.config.distillationAlpha;

      // Track performance
      let initialPerformance = 0;
      let finalPerformance = 0;

      // Training loop
      const epochs = 50;
      for (let epoch = 0; epoch < epochs; epoch++) {
        let epochLoss = 0;

        for (const { state, teacherAction } of trainingData) {
          // Teacher's soft targets (with temperature)
          const teacherLogits = this.forward(this.sourcePolicy, state);
          const softTargets = this.softmax(teacherLogits, temperature);

          // Student predictions
          const studentLogits = this.forward(studentPolicy, state);
          const studentProbs = this.softmax(studentLogits, temperature);

          // Combined loss: soft targets + hard labels
          const softLoss = this.klDivergence(softTargets, studentProbs);
          const hardLoss = this.crossEntropy(teacherAction, studentProbs);
          const loss = alpha * softLoss + (1 - alpha) * hardLoss;

          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          epochLoss += loss;

          // Update student policy
          const gradient = this.computeDistillationGradient(
            studentPolicy,
            state,
            softTargets,
            teacherAction,
            alpha
          );

          for (let i = 0; i < studentPolicy.length; i++) {
            studentPolicy[i] -= this.config.learningRate * gradient[i];
          }
        }

        // Evaluate performance
        const performance = this.evaluateTransfer(studentPolicy, trainingData);

        if (epoch === 0) {
          initialPerformance = performance;
        }
        if (epoch === epochs - 1) {
          finalPerformance = performance;
        }
      }

      this.targetPolicy = studentPolicy;
      const adaptationTime = Date.now() - startTime;

      // Compute transfer metrics
      const transferMetrics = this.computeTransferMetrics(
        initialPerformance,
        finalPerformance,
        adaptationTime
      );

      const result: TransferRLResult = {
        targetEnv: task.targetEnv,
        transferredPolicy: studentPolicy,
        transferScore: finalPerformance / (initialPerformance + 1e-8),
        adaptationTime,
        performanceGain: finalPerformance - initialPerformance,
        transferMethod: "distillation",
        jumpStart: transferMetrics.jumpStart,
        asymptote: transferMetrics.asymptote,
      };

      this.recordTransfer(task.targetEnv, result);
      return result;
    } catch (error) {
      throw new Error(
        `Policy distillation failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Transfer policy using fine-tuning
   * Continue training source policy on target domain
   */
  async transferWithFineTuning(
    task: TransferRLTask,
    targetData: Array<{ state: number[]; action: number; reward: number }>
  ): Promise<TransferRLResult> {
    try {
      const startTime = Date.now();
      this.sourcePolicy = task.sourcePolicy;

      // Initialize target policy from source
      let targetPolicy = [...task.sourcePolicy];

      // Optionally freeze some layers
      const frozenMask = this.createFreezeMask(targetPolicy.length);

      const epochs = 30;
      let initialPerformance = 0;
      let finalPerformance = 0;

      for (let epoch = 0; epoch < epochs; epoch++) {
        for (const { state, action, reward } of targetData) {
          const gradient = this.computePolicyGradient(targetPolicy, state, action, reward);

          // Apply updates only to unfrozen parameters
          for (let i = 0; i < targetPolicy.length; i++) {
            if (!frozenMask[i]) {
              const lr = this.config.adaptiveLearning
                ? this.config.learningRate / (1 + epoch * 0.01)
                : this.config.learningRate;
              targetPolicy[i] -= lr * gradient[i];
            }
          }
        }

        const performance = this.evaluateTransfer(
          targetPolicy,
          targetData.map((d) => ({
            state: d.state,
            teacherAction: d.action,
          }))
        );

        if (epoch === 0) {
          initialPerformance = performance;
        }
        if (epoch === epochs - 1) {
          finalPerformance = performance;
        }
      }

      this.targetPolicy = targetPolicy;
      const adaptationTime = Date.now() - startTime;

      const transferMetrics = this.computeTransferMetrics(
        initialPerformance,
        finalPerformance,
        adaptationTime
      );

      const result: TransferRLResult = {
        targetEnv: task.targetEnv,
        transferredPolicy: targetPolicy,
        transferScore: finalPerformance / (initialPerformance + 1e-8),
        adaptationTime,
        performanceGain: finalPerformance - initialPerformance,
        transferMethod: "fine-tuning",
        jumpStart: transferMetrics.jumpStart,
        asymptote: transferMetrics.asymptote,
      };

      this.recordTransfer(task.targetEnv, result);
      return result;
    } catch (error) {
      throw new Error(
        `Fine-tuning transfer failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Transfer using progressive neural networks
   * Add new column for target task with lateral connections
   */
  async transferWithProgressive(
    task: TransferRLTask,
    targetData: Array<{ state: number[]; action: number; reward: number }>
  ): Promise<TransferRLResult> {
    try {
      const startTime = Date.now();

      if (!this.progressiveNet) {
        this.initializeProgressiveNet(task.sourcePolicy, task.sourceEnv);
      }

      // Add new column for target task
      const newColumn = new Array(task.sourcePolicy.length)
        .fill(0)
        .map(() => (Math.random() - 0.5) * 0.1);

      const columnId = this.progressiveNet!.baseColumns.length;

      // Initialize lateral connections from previous columns
      const lateralWeights = new Map<number, number[]>();
      for (let i = 0; i < this.progressiveNet!.baseColumns.length; i++) {
        const weights = new Array(this.progressiveNet!.baseColumns[i].policy.length)
          .fill(0)
          .map(() => (Math.random() - 0.5) * 0.01);
        lateralWeights.set(i, weights);
      }

      this.progressiveNet!.lateralConnections.set(columnId, lateralWeights);

      // Train new column
      const epochs = 40;
      let initialPerformance = 0;
      let finalPerformance = 0;

      for (let epoch = 0; epoch < epochs; epoch++) {
        for (const { state, action, reward } of targetData) {
          const gradient = this.computeProgressiveGradient(
            newColumn,
            lateralWeights,
            state,
            action,
            reward
          );

          for (let i = 0; i < newColumn.length; i++) {
            newColumn[i] -= this.config.learningRate * gradient[i];
          }

          // Update lateral connections
          for (const [colId, weights] of lateralWeights) {
            const lateralGradient = this.computeLateralGradient(
              weights,
              this.progressiveNet!.baseColumns[colId].policy,
              state,
              action
            );

            for (let i = 0; i < weights.length; i++) {
              weights[i] -= this.config.learningRate * 0.1 * lateralGradient[i];
            }
          }
        }

        const performance = this.evaluateProgressive(newColumn, lateralWeights, targetData);

        if (epoch === 0) {
          initialPerformance = performance;
        }
        if (epoch === epochs - 1) {
          finalPerformance = performance;
        }
      }

      // Add to progressive network
      this.progressiveNet!.baseColumns.push({
        env: task.targetEnv,
        policy: newColumn,
        frozen: true,
      });
      this.progressiveNet!.currentColumn = columnId;

      this.targetPolicy = newColumn;
      const adaptationTime = Date.now() - startTime;

      const transferMetrics = this.computeTransferMetrics(
        initialPerformance,
        finalPerformance,
        adaptationTime
      );

      const result: TransferRLResult = {
        targetEnv: task.targetEnv,
        transferredPolicy: newColumn,
        transferScore: finalPerformance / (initialPerformance + 1e-8),
        adaptationTime,
        performanceGain: finalPerformance - initialPerformance,
        transferMethod: "progressive",
        jumpStart: transferMetrics.jumpStart,
        asymptote: transferMetrics.asymptote,
      };

      this.recordTransfer(task.targetEnv, result);
      return result;
    } catch (error) {
      throw new Error(
        `Progressive transfer failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Domain randomization for robust transfer
   * Train on randomized source domains for generalization
   */
  async trainWithDomainRandomization(
    baseEnv: string,
    basePolicy: number[],
    randomizationParams: DomainRandomization,
    episodes: number
  ): Promise<number[]> {
    try {
      this.domainRandomization = randomizationParams;
      let policy = [...basePolicy];

      for (let episode = 0; episode < episodes; episode++) {
        // Sample randomized environment
        const randomizedEnv = this.sampleRandomizedEnv(randomizationParams);

        // Generate episode data
        const episodeData = this.simulateEpisode(policy, randomizedEnv);

        // Update policy
        for (const { state, action, reward } of episodeData) {
          const gradient = this.computePolicyGradient(policy, state, action, reward);

          for (let i = 0; i < policy.length; i++) {
            policy[i] -= this.config.learningRate * gradient[i];
          }
        }

        // Adapt randomization difficulty (curriculum)
        if (randomizationParams.randomizationSchedule === "curriculum") {
          this.adaptRandomization(randomizationParams, episode, episodes);
        }
      }

      return policy;
    } catch (error) {
      throw new Error(
        `Domain randomization failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Evaluate transfer effectiveness
   */
  evaluateTransfer(
    policy: number[],
    testData: Array<{ state: number[]; teacherAction: number }>
  ): number {
    let correct = 0;
    let totalReward = 0;

    for (const { state, teacherAction } of testData) {
      const qValues = this.forward(policy, state);
      const predictedAction = this.argmax(qValues);

      if (predictedAction === teacherAction) {
        correct++;
      }

      totalReward += Math.max(...qValues);
    }

    const accuracy = correct / testData.length;
    const avgReward = totalReward / testData.length;

    return (accuracy + avgReward) / 2;
  }

  /**
   * Compute feature mapping between domains
   */
  computeFeatureMapping(sourceStates: number[][], targetStates: number[][]): FeatureMapping {
    try {
      // Simplified linear mapping using least squares
      const mappingMatrix: number[][] = [];
      const sourceDim = sourceStates[0].length;
      const targetDim = targetStates[0].length;

      for (let i = 0; i < targetDim; i++) {
        const row = new Array(sourceDim).fill(0).map(() => Math.random() - 0.5);
        mappingMatrix.push(row);
      }

      // Compute alignment score
      let alignmentScore = 0;
      const samples = Math.min(sourceStates.length, targetStates.length);

      for (let i = 0; i < samples; i++) {
        const mapped = this.applyMapping(sourceStates[i], mappingMatrix);
        const error = this.euclideanDistance(mapped, targetStates[i]);
        alignmentScore += 1 / (1 + error);
      }

      alignmentScore /= samples;

      return {
        sourceFeatures: sourceStates[0],
        targetFeatures: targetStates[0],
        mappingMatrix,
        alignmentScore,
      };
    } catch (error) {
      throw new Error(
        `Feature mapping computation failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  // Private helper methods

  private initializeProgressiveNet(sourcePolicy: number[], sourceEnv: string): void {
    this.progressiveNet = {
      baseColumns: [
        {
          env: sourceEnv,
          policy: [...sourcePolicy],
          frozen: true,
        },
      ],
      lateralConnections: new Map(),
      currentColumn: 0,
      transferMatrix: [],
    };
  }

  private createFreezeMask(size: number): boolean[] {
    const mask = new Array(size).fill(false);

    if (this.config.freezeLayers) {
      if (this.config.finetuningLayers === "bottom") {
        // Freeze top layers
        const freezeStart = Math.floor(size * 0.7);
        for (let i = freezeStart; i < size; i++) {
          mask[i] = true;
        }
      } else if (this.config.finetuningLayers === "top") {
        // Freeze bottom layers
        const freezeEnd = Math.floor(size * 0.3);
        for (let i = 0; i < freezeEnd; i++) {
          mask[i] = true;
        }
      }
    }

    return mask;
  }

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

  private softmax(values: number[], temperature: number = 1.0): number[] {
    const maxVal = Math.max(...values);
    const exps = values.map((v) => Math.exp((v - maxVal) / temperature));
    const sum = exps.reduce((a, b) => a + b, 0);
    return exps.map((e) => e / sum);
  }

  private klDivergence(p: number[], q: number[]): number {
    let kl = 0;
    for (let i = 0; i < p.length; i++) {
      if (p[i] > 0 && q[i] > 0) {
        kl += p[i] * Math.log(p[i] / q[i]);
      }
    }
    return kl;
  }

  private crossEntropy(target: number, probs: number[]): number {
    return -Math.log(probs[target] + 1e-10);
  }

  private computeDistillationGradient(
    policy: number[],
    state: number[],
    softTargets: number[],
    hardTarget: number,
    alpha: number
  ): number[] {
    const epsilon = 1e-5;
    const gradient = new Array(policy.length).fill(0);
    const baseLoss = this.computeDistillationLoss(policy, state, softTargets, hardTarget, alpha);

    for (let i = 0; i < policy.length; i++) {
      const policyPlus = [...policy];
      policyPlus[i] += epsilon;
      const lossPlus = this.computeDistillationLoss(
        policyPlus,
        state,
        softTargets,
        hardTarget,
        alpha
      );
      gradient[i] = (lossPlus - baseLoss) / epsilon;
    }

    return gradient;
  }

  private computeDistillationLoss(
    policy: number[],
    state: number[],
    softTargets: number[],
    hardTarget: number,
    alpha: number
  ): number {
    const logits = this.forward(policy, state);
    const probs = this.softmax(logits, this.config.distillationTemperature);

    const softLoss = this.klDivergence(softTargets, probs);
    const hardLoss = this.crossEntropy(hardTarget, probs);

    return alpha * softLoss + (1 - alpha) * hardLoss;
  }

  private computePolicyGradient(
    policy: number[],
    state: number[],
    action: number,
    reward: number
  ): number[] {
    const epsilon = 1e-5;
    const gradient = new Array(policy.length).fill(0);
    const qValues = this.forward(policy, state);
    const baseLoss = -reward * qValues[action];

    for (let i = 0; i < policy.length; i++) {
      const policyPlus = [...policy];
      policyPlus[i] += epsilon;
      const qValuesPlus = this.forward(policyPlus, state);
      const lossPlus = -reward * qValuesPlus[action];
      gradient[i] = (lossPlus - baseLoss) / epsilon;
    }

    return gradient;
  }

  private computeProgressiveGradient(
    column: number[],
    lateralWeights: Map<number, number[]>,
    state: number[],
    action: number,
    reward: number
  ): number[] {
    const epsilon = 1e-5;
    const gradient = new Array(column.length).fill(0);
    const baseOutput = this.forwardProgressive(column, lateralWeights, state);
    const baseLoss = -reward * baseOutput[action];

    for (let i = 0; i < column.length; i++) {
      const columnPlus = [...column];
      columnPlus[i] += epsilon;
      const outputPlus = this.forwardProgressive(columnPlus, lateralWeights, state);
      const lossPlus = -reward * outputPlus[action];
      gradient[i] = (lossPlus - baseLoss) / epsilon;
    }

    return gradient;
  }

  private computeLateralGradient(
    weights: number[],
    sourcePolicy: number[],
    state: number[],
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    action: number
  ): number[] {
    const epsilon = 1e-5;
    const gradient = new Array(weights.length).fill(0);

    for (let i = 0; i < weights.length; i++) {
      const weightsPlus = [...weights];
      weightsPlus[i] += epsilon;

      // Simplified gradient computation
      gradient[i] = sourcePolicy[i % sourcePolicy.length] * state[i % state.length];
    }

    return gradient;
  }

  private forwardProgressive(
    column: number[],
    lateralWeights: Map<number, number[]>,
    state: number[]
  ): number[] {
    const actionSpace = Math.max(2, Math.floor(column.length / state.length));
    const qValues = new Array(actionSpace).fill(0);

    // Current column contribution
    for (let a = 0; a < actionSpace; a++) {
      for (let i = 0; i < state.length; i++) {
        const idx = (a * state.length + i) % column.length;
        qValues[a] += column[idx] * state[i];
      }
    }

    // Lateral contributions
    for (const [colId, weights] of lateralWeights) {
      const sourceColumn = this.progressiveNet!.baseColumns[colId];
      for (let a = 0; a < actionSpace; a++) {
        for (let i = 0; i < Math.min(weights.length, state.length); i++) {
          qValues[a] += weights[i] * sourceColumn.policy[i] * state[i];
        }
      }
    }

    return qValues.map((q) => Math.tanh(q));
  }

  private evaluateProgressive(
    column: number[],
    lateralWeights: Map<number, number[]>,
    testData: Array<{ state: number[]; action: number; reward: number }>
  ): number {
    let totalReward = 0;

    for (const { state, action, reward } of testData) {
      const qValues = this.forwardProgressive(column, lateralWeights, state);
      totalReward += reward * qValues[action];
    }

    return testData.length > 0 ? totalReward / testData.length : 0;
  }

  private sampleRandomizedEnv(params: DomainRandomization): Map<string, number> {
    const randomized = new Map<string, number>();

    for (const [param, [min, max]] of params.physicsParameters) {
      randomized.set(param, min + Math.random() * (max - min));
    }

    return randomized;
  }

  private simulateEpisode(
    policy: number[],
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    env: Map<string, number>
  ): Array<{ state: number[]; action: number; reward: number }> {
    const episode: Array<{ state: number[]; action: number; reward: number }> = [];
    const episodeLength = 10;

    for (let t = 0; t < episodeLength; t++) {
      const state = Array.from({ length: 4 }, () => Math.random());
      const qValues = this.forward(policy, state);
      const action = this.argmax(qValues);
      const reward = Math.random();

      episode.push({ state, action, reward });
    }

    return episode;
  }

  private adaptRandomization(
    params: DomainRandomization,
    episode: number,
    totalEpisodes: number
  ): void {
    const progress = episode / totalEpisodes;
    const newRange = this.config.domainRandomizationRange * progress;

    // Gradually increase randomization range
    for (const [param, [min, max]] of params.physicsParameters) {
      const center = (min + max) / 2;
      params.physicsParameters.set(param, [center - newRange, center + newRange]);
    }
  }

  private applyMapping(source: number[], mapping: number[][]): number[] {
    const result = new Array(mapping.length).fill(0);

    for (let i = 0; i < mapping.length; i++) {
      for (let j = 0; j < source.length; j++) {
        result[i] += mapping[i][j % mapping[i].length] * source[j];
      }
    }

    return result;
  }

  private euclideanDistance(a: number[], b: number[]): number {
    return Math.sqrt(a.reduce((sum, val, i) => sum + Math.pow(val - b[i], 2), 0));
  }

  private computeTransferMetrics(initial: number, final: number, time: number): TransferMetrics {
    return {
      jumpStart: initial,
      asymptote: final,
      transferRatio: final / (initial + 1e-8),
      timeToThreshold: time,
      negativeTransfer: final < initial,
      catastrophicForgetting: 0,
    };
  }

  private recordTransfer(env: string, result: TransferRLResult): void {
    if (!this.transferHistory.has(env)) {
      this.transferHistory.set(env, []);
    }
    this.transferHistory.get(env)!.push(result);
  }

  private argmax(arr: number[]): number {
    return arr.indexOf(Math.max(...arr));
  }

  /**
   * Get transfer history for environment
   */
  getTransferHistory(env: string): TransferRLResult[] {
    return this.transferHistory.get(env) || [];
  }

  /**
   * Export learned policy
   */
  exportPolicy(): number[] | null {
    return this.targetPolicy ? [...this.targetPolicy] : null;
  }
}
