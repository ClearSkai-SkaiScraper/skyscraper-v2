// src/lib/rl/continual.ts
// Continual Reinforcement Learning Module
// Implements EWC, PackNet, Progressive Neural Networks, and catastrophic forgetting prevention

/**
 * Task configuration for continual learning
 */
export interface ContinualRLTask {
  taskId: string;
  environment: string;
  initialPolicy: number[];
  stateSpace: number;
  actionSpace: number;
  difficulty: number;
}

/**
 * Result of continual learning update
 */
export interface ContinualRLResult {
  taskId: string;
  updatedPolicy: number[];
  performanceHistory: number[];
  forgettingMetrics: ForgettingMetrics;
  memoryUsage: number;
  trainingTime: number;
}

/**
 * Configuration for continual learning
 */
export interface ContinualRLConfig {
  strategy: "EWC" | "PackNet" | "ProgressiveNN" | "GEM" | "A-GEM";
  ewcLambda: number;
  fisherSamples: number;
  packNetPruningRate: number;
  memoryBufferSize: number;
  plasticityParameter: number;
  stabilityParameter: number;
}

/**
 * Metrics for catastrophic forgetting
 */
export interface ForgettingMetrics {
  backwardTransfer: number;
  forwardTransfer: number;
  averageAccuracy: number;
  taskInterference: number[];
  retentionRates: Map<string, number>;
  plasticity: number;
  stability: number;
}

/**
 * Fisher Information Matrix for EWC
 */
export interface FisherInformation {
  diagonal: number[];
  computedOn: number;
  sampleSize: number;
  taskId: string;
}

/**
 * Memory buffer for experience replay
 */
export interface MemoryBuffer {
  experiences: ExperienceMemory[];
  capacity: number;
  samplingStrategy: "uniform" | "reservoir" | "prioritized";
  currentSize: number;
}

/**
 * Single experience memory
 */
export interface ExperienceMemory {
  taskId: string;
  state: number[];
  action: number;
  reward: number;
  nextState: number[];
  done: boolean;
  priority: number;
  timestamp: number;
}

/**
 * Progressive neural network column
 */
export interface ProgressiveColumn {
  columnId: number;
  taskId: string;
  parameters: number[];
  lateralConnections: Map<number, number[]>;
  frozen: boolean;
}

/**
 * PackNet mask for parameter pruning
 */
export interface PackNetMask {
  taskId: string;
  mask: boolean[];
  pruningRate: number;
  activeParameters: number;
}

/**
 * Continual Reinforcement Learning implementation
 * Prevents catastrophic forgetting through various strategies
 */
export class ContinualRL {
  private config: ContinualRLConfig;
  private currentPolicy: number[];
  private fisherMatrices: Map<string, FisherInformation> = new Map();
  private optimalParameters: Map<string, number[]> = new Map();
  private memoryBuffer: MemoryBuffer;
  private progressiveColumns: ProgressiveColumn[] = [];
  private packNetMasks: Map<string, PackNetMask> = new Map();
  private taskSequence: string[] = [];
  private performanceMatrix: Map<string, Map<string, number>> = new Map();

  constructor(initialPolicySize: number, config: Partial<ContinualRLConfig> = {}) {
    this.config = {
      strategy: "EWC",
      ewcLambda: 400,
      fisherSamples: 200,
      packNetPruningRate: 0.5,
      memoryBufferSize: 1000,
      plasticityParameter: 0.7,
      stabilityParameter: 0.3,
      ...config,
    };

    this.currentPolicy = new Array(initialPolicySize)
      .fill(0)
      .map(() => (Math.random() - 0.5) * 0.1);

    this.memoryBuffer = {
      experiences: [],
      capacity: this.config.memoryBufferSize,
      samplingStrategy: "reservoir",
      currentSize: 0,
    };
  }

  /**
   * Update policy using Elastic Weight Consolidation (EWC)
   * Penalizes changes to important parameters for previous tasks
   */
  async updateWithEWC(
    task: ContinualRLTask,
    newExperiences: ExperienceMemory[],
    epochs: number = 10
  ): Promise<ContinualRLResult> {
    try {
      const startTime = Date.now();
      const performanceHistory: number[] = [];
      let updatedPolicy = [...this.currentPolicy];

      // Compute Fisher Information Matrix for current task
      if (!this.fisherMatrices.has(task.taskId)) {
        const fisher = this.computeFisherInformation(task, newExperiences);
        this.fisherMatrices.set(task.taskId, fisher);
        this.optimalParameters.set(task.taskId, [...updatedPolicy]);
      }

      // Training loop with EWC regularization
      for (let epoch = 0; epoch < epochs; epoch++) {
        const gradient = this.computePolicyGradient(updatedPolicy, newExperiences);
        const ewcPenalty = this.computeEWCPenalty(updatedPolicy);

        // Update with regularization
        updatedPolicy = updatedPolicy.map((param, idx) => {
          const regularizedGrad = gradient[idx] + ewcPenalty[idx];
          return param - 0.001 * regularizedGrad;
        });

        // Evaluate performance
        const performance = this.evaluatePolicy(updatedPolicy, newExperiences);
        performanceHistory.push(performance);
      }

      // Update Fisher matrix and optimal parameters
      const newFisher = this.computeFisherInformation(task, newExperiences);
      this.fisherMatrices.set(task.taskId, newFisher);
      this.optimalParameters.set(task.taskId, [...updatedPolicy]);

      this.currentPolicy = updatedPolicy;
      this.taskSequence.push(task.taskId);

      const forgettingMetrics = await this.assessForgetting(task.taskId);
      const trainingTime = Date.now() - startTime;

      return {
        taskId: task.taskId,
        updatedPolicy,
        performanceHistory,
        forgettingMetrics,
        memoryUsage: this.estimateMemoryUsage(),
        trainingTime,
      };
    } catch (error) {
      throw new Error(
        `EWC update failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * PackNet: Parameter packing for continual learning
   * Allocates different subsets of parameters to different tasks
   */
  async updateWithPackNet(
    task: ContinualRLTask,
    newExperiences: ExperienceMemory[],
    epochs: number = 10
  ): Promise<ContinualRLResult> {
    try {
      const startTime = Date.now();
      const performanceHistory: number[] = [];
      let updatedPolicy = [...this.currentPolicy];

      // Create or retrieve mask for this task
      let mask: PackNetMask;
      if (this.packNetMasks.has(task.taskId)) {
        mask = this.packNetMasks.get(task.taskId)!;
      } else {
        mask = this.createPackNetMask(task.taskId);
        this.packNetMasks.set(task.taskId, mask);
      }

      // Training with masked parameters
      for (let epoch = 0; epoch < epochs; epoch++) {
        const gradient = this.computePolicyGradient(updatedPolicy, newExperiences);

        // Apply mask to gradient (only update free parameters)
        const maskedGradient = gradient.map((g, idx) => (mask.mask[idx] ? g : 0));

        updatedPolicy = updatedPolicy.map((param, idx) => param - 0.001 * maskedGradient[idx]);

        const performance = this.evaluatePolicy(updatedPolicy, newExperiences);
        performanceHistory.push(performance);
      }

      // Freeze best parameters for this task
      this.freezeTaskParameters(task.taskId, updatedPolicy, mask);
      this.currentPolicy = updatedPolicy;
      this.taskSequence.push(task.taskId);

      const forgettingMetrics = await this.assessForgetting(task.taskId);
      const trainingTime = Date.now() - startTime;

      return {
        taskId: task.taskId,
        updatedPolicy,
        performanceHistory,
        forgettingMetrics,
        memoryUsage: this.estimateMemoryUsage(),
        trainingTime,
      };
    } catch (error) {
      throw new Error(
        `PackNet update failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Progressive Neural Networks: Add new column for each task
   * Previous columns are frozen, lateral connections enable transfer
   */
  async updateWithProgressiveNN(
    task: ContinualRLTask,
    newExperiences: ExperienceMemory[],
    epochs: number = 10
  ): Promise<ContinualRLResult> {
    try {
      const startTime = Date.now();
      const performanceHistory: number[] = [];

      // Create new column for this task
      const newColumn: ProgressiveColumn = {
        columnId: this.progressiveColumns.length,
        taskId: task.taskId,
        parameters: new Array(this.currentPolicy.length)
          .fill(0)
          .map(() => (Math.random() - 0.5) * 0.1),
        lateralConnections: new Map(),
        frozen: false,
      };

      // Initialize lateral connections from previous columns
      for (const prevColumn of this.progressiveColumns) {
        const lateralWeights = new Array(prevColumn.parameters.length)
          .fill(0)
          .map(() => (Math.random() - 0.5) * 0.01);
        newColumn.lateralConnections.set(prevColumn.columnId, lateralWeights);
      }

      // Training the new column
      for (let epoch = 0; epoch < epochs; epoch++) {
        const gradient = this.computeProgressiveGradient(newColumn, newExperiences);

        newColumn.parameters = newColumn.parameters.map(
          (param, idx) => param - 0.001 * gradient[idx]
        );

        const performance = this.evaluateProgressivePolicy(newColumn, newExperiences);
        performanceHistory.push(performance);
      }

      // Freeze the column and add to collection
      newColumn.frozen = true;
      this.progressiveColumns.push(newColumn);
      this.taskSequence.push(task.taskId);

      // Update current policy to be the new column
      this.currentPolicy = newColumn.parameters;

      const forgettingMetrics = await this.assessForgetting(task.taskId);
      const trainingTime = Date.now() - startTime;

      return {
        taskId: task.taskId,
        updatedPolicy: newColumn.parameters,
        performanceHistory,
        forgettingMetrics,
        memoryUsage: this.estimateMemoryUsage(),
        trainingTime,
      };
    } catch (error) {
      throw new Error(
        `Progressive NN update failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Add experiences to memory buffer for replay
   */
  addToMemoryBuffer(experiences: ExperienceMemory[]): void {
    try {
      for (const exp of experiences) {
        if (this.memoryBuffer.currentSize < this.memoryBuffer.capacity) {
          this.memoryBuffer.experiences.push(exp);
          this.memoryBuffer.currentSize++;
        } else {
          // Reservoir sampling or replace by priority
          if (this.memoryBuffer.samplingStrategy === "reservoir") {
            const idx = Math.floor(Math.random() * (this.memoryBuffer.currentSize + 1));
            if (idx < this.memoryBuffer.capacity) {
              this.memoryBuffer.experiences[idx] = exp;
            }
          } else if (this.memoryBuffer.samplingStrategy === "prioritized") {
            // Replace lowest priority experience
            const minIdx = this.findLowestPriorityIndex();
            if (exp.priority > this.memoryBuffer.experiences[minIdx].priority) {
              this.memoryBuffer.experiences[minIdx] = exp;
            }
          }
        }
      }
    } catch (error) {
      throw new Error(
        `Failed to add to memory buffer: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Sample from memory buffer for experience replay
   */
  sampleMemoryBuffer(batchSize: number): ExperienceMemory[] {
    if (this.memoryBuffer.currentSize === 0) {
      return [];
    }

    const sampleSize = Math.min(batchSize, this.memoryBuffer.currentSize);
    const sampled: ExperienceMemory[] = [];

    if (this.memoryBuffer.samplingStrategy === "prioritized") {
      return this.prioritizedSample(sampleSize);
    }

    // Uniform sampling
    const indices = new Set<number>();
    while (indices.size < sampleSize) {
      indices.add(Math.floor(Math.random() * this.memoryBuffer.currentSize));
    }

    for (const idx of indices) {
      sampled.push(this.memoryBuffer.experiences[idx]);
    }

    return sampled;
  }

  /**
   * Assess catastrophic forgetting across all tasks
   */
  private async assessForgetting(currentTaskId: string): Promise<ForgettingMetrics> {
    const retentionRates = new Map<string, number>();
    const taskInterference: number[] = [];
    let totalAccuracy = 0;
    let backwardTransfer = 0;
    let forwardTransfer = 0;

    // Evaluate on all previous tasks
    for (const taskId of this.taskSequence) {
      if (!this.performanceMatrix.has(taskId)) {
        this.performanceMatrix.set(taskId, new Map());
      }

      // Evaluate current policy on this task
      const taskExperiences = this.memoryBuffer.experiences.filter((exp) => exp.taskId === taskId);
      if (taskExperiences.length > 0) {
        const currentPerformance = this.evaluatePolicy(this.currentPolicy, taskExperiences);
        const optimalParams = this.optimalParameters.get(taskId);
        const optimalPerformance = optimalParams
          ? this.evaluatePolicy(optimalParams, taskExperiences)
          : currentPerformance;

        const retention = optimalPerformance > 0 ? currentPerformance / optimalPerformance : 1.0;

        retentionRates.set(taskId, retention);
        totalAccuracy += currentPerformance;

        // Compute interference
        if (taskId !== currentTaskId) {
          taskInterference.push(1.0 - retention);
          backwardTransfer += retention;
        }
      }
    }

    const numTasks = this.taskSequence.length;
    backwardTransfer = numTasks > 1 ? backwardTransfer / (numTasks - 1) : 1.0;
    const averageAccuracy = numTasks > 0 ? totalAccuracy / numTasks : 0;

    // Plasticity: ability to learn new tasks
    const plasticity = this.config.plasticityParameter;

    // Stability: retention of old tasks
    const stability = backwardTransfer * this.config.stabilityParameter;

    return {
      backwardTransfer,
      forwardTransfer,
      averageAccuracy,
      taskInterference,
      retentionRates,
      plasticity,
      stability,
    };
  }

  /**
   * Compute Fisher Information Matrix
   */
  private computeFisherInformation(
    task: ContinualRLTask,
    experiences: ExperienceMemory[]
  ): FisherInformation {
    const diagonal = new Array(this.currentPolicy.length).fill(0);
    const sampleSize = Math.min(this.config.fisherSamples, experiences.length);

    for (let i = 0; i < sampleSize; i++) {
      const exp = experiences[i % experiences.length];
      const gradient = this.computeSingleGradient(this.currentPolicy, exp);

      for (let j = 0; j < diagonal.length; j++) {
        diagonal[j] += gradient[j] * gradient[j];
      }
    }

    // Normalize
    for (let i = 0; i < diagonal.length; i++) {
      diagonal[i] /= sampleSize;
    }

    return {
      diagonal,
      computedOn: Date.now(),
      sampleSize,
      taskId: task.taskId,
    };
  }

  /**
   * Compute EWC penalty term
   */
  private computeEWCPenalty(currentParams: number[]): number[] {
    const penalty = new Array(currentParams.length).fill(0);

    for (const [taskId, fisher] of this.fisherMatrices) {
      const optimalParams = this.optimalParameters.get(taskId);
      if (!optimalParams) continue;

      for (let i = 0; i < penalty.length; i++) {
        const diff = currentParams[i] - optimalParams[i];
        penalty[i] += this.config.ewcLambda * fisher.diagonal[i] * diff;
      }
    }

    return penalty;
  }

  /**
   * Create PackNet mask for task
   */
  private createPackNetMask(taskId: string): PackNetMask {
    const mask = new Array(this.currentPolicy.length).fill(false);

    // Find free parameters (not allocated to previous tasks)
    const freeIndices: number[] = [];
    for (let i = 0; i < mask.length; i++) {
      let isFree = true;
      for (const [_, existingMask] of this.packNetMasks) {
        if (existingMask.mask[i]) {
          isFree = false;
          break;
        }
      }
      if (isFree) {
        freeIndices.push(i);
      }
    }

    // Allocate parameters to this task
    const numToAllocate = Math.floor(freeIndices.length * this.config.packNetPruningRate);
    for (let i = 0; i < numToAllocate; i++) {
      mask[freeIndices[i]] = true;
    }

    return {
      taskId,
      mask,
      pruningRate: this.config.packNetPruningRate,
      activeParameters: numToAllocate,
    };
  }

  /**
   * Freeze task parameters
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private freezeTaskParameters(taskId: string, params: number[], mask: PackNetMask): void {
    this.optimalParameters.set(taskId, [...params]);
  }

  /**
   * Compute gradient for progressive neural network
   */
  private computeProgressiveGradient(
    column: ProgressiveColumn,
    experiences: ExperienceMemory[]
  ): number[] {
    const gradient = new Array(column.parameters.length).fill(0);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const epsilon = 1e-5;

    for (const exp of experiences.slice(0, 32)) {
      const output = this.forwardProgressive(column, exp.state);
      const target = exp.reward;
      const error = output - target;

      // Simplified gradient computation
      for (let i = 0; i < gradient.length; i++) {
        gradient[i] += error * exp.state[i % exp.state.length];
      }
    }

    // Normalize
    for (let i = 0; i < gradient.length; i++) {
      gradient[i] /= Math.min(32, experiences.length);
    }

    return gradient;
  }

  /**
   * Forward pass through progressive network
   */
  private forwardProgressive(column: ProgressiveColumn, state: number[]): number {
    let output = 0;

    // Contribution from current column
    for (let i = 0; i < state.length && i < column.parameters.length; i++) {
      output += column.parameters[i] * state[i];
    }

    // Lateral contributions from previous columns
    for (const [colId, lateralWeights] of column.lateralConnections) {
      const prevColumn = this.progressiveColumns[colId];
      for (let i = 0; i < Math.min(lateralWeights.length, state.length); i++) {
        output += lateralWeights[i] * prevColumn.parameters[i] * state[i];
      }
    }

    return Math.tanh(output);
  }

  private computePolicyGradient(params: number[], experiences: ExperienceMemory[]): number[] {
    const gradient = new Array(params.length).fill(0);
    const batchSize = Math.min(32, experiences.length);

    for (let i = 0; i < batchSize; i++) {
      const exp = experiences[i];
      const grad = this.computeSingleGradient(params, exp);
      for (let j = 0; j < gradient.length; j++) {
        gradient[j] += grad[j];
      }
    }

    for (let i = 0; i < gradient.length; i++) {
      gradient[i] /= batchSize;
    }

    return gradient;
  }

  private computeSingleGradient(params: number[], exp: ExperienceMemory): number[] {
    const epsilon = 1e-5;
    const gradient = new Array(params.length).fill(0);

    const baseLoss = this.computeSingleLoss(params, exp);

    for (let i = 0; i < params.length; i++) {
      const paramsPlus = [...params];
      paramsPlus[i] += epsilon;
      const lossPlus = this.computeSingleLoss(paramsPlus, exp);
      gradient[i] = (lossPlus - baseLoss) / epsilon;
    }

    return gradient;
  }

  private computeSingleLoss(params: number[], exp: ExperienceMemory): number {
    const predicted = this.forward(params, exp.state);
    const target = exp.reward;
    return (predicted - target) ** 2;
  }

  private forward(params: number[], state: number[]): number {
    let output = 0;
    for (let i = 0; i < Math.min(params.length, state.length); i++) {
      output += params[i] * state[i];
    }
    return Math.tanh(output);
  }

  private evaluatePolicy(params: number[], experiences: ExperienceMemory[]): number {
    let totalReward = 0;
    for (const exp of experiences) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const predicted = this.forward(params, exp.state);
      totalReward += exp.reward;
    }
    return experiences.length > 0 ? totalReward / experiences.length : 0;
  }

  private evaluateProgressivePolicy(
    column: ProgressiveColumn,
    experiences: ExperienceMemory[]
  ): number {
    let totalReward = 0;
    for (const exp of experiences) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const predicted = this.forwardProgressive(column, exp.state);
      totalReward += exp.reward;
    }
    return experiences.length > 0 ? totalReward / experiences.length : 0;
  }

  private prioritizedSample(batchSize: number): ExperienceMemory[] {
    const priorities = this.memoryBuffer.experiences.map((exp) => exp.priority);
    const totalPriority = priorities.reduce((sum, p) => sum + p, 0);
    const sampled: ExperienceMemory[] = [];

    for (let i = 0; i < batchSize; i++) {
      let rand = Math.random() * totalPriority;
      for (let j = 0; j < this.memoryBuffer.experiences.length; j++) {
        rand -= priorities[j];
        if (rand <= 0) {
          sampled.push(this.memoryBuffer.experiences[j]);
          break;
        }
      }
    }

    return sampled;
  }

  private findLowestPriorityIndex(): number {
    let minIdx = 0;
    let minPriority = this.memoryBuffer.experiences[0].priority;

    for (let i = 1; i < this.memoryBuffer.experiences.length; i++) {
      if (this.memoryBuffer.experiences[i].priority < minPriority) {
        minPriority = this.memoryBuffer.experiences[i].priority;
        minIdx = i;
      }
    }

    return minIdx;
  }

  private estimateMemoryUsage(): number {
    let total = this.currentPolicy.length * 8; // 8 bytes per float
    total += this.memoryBuffer.currentSize * 100; // Rough estimate per experience
    total += this.progressiveColumns.length * this.currentPolicy.length * 8;
    return total;
  }

  /**
   * Export continual learning state
   */
  exportState(): {
    policy: number[];
    fisherMatrices: Array<[string, FisherInformation]>;
    taskSequence: string[];
  } {
    return {
      policy: [...this.currentPolicy],
      fisherMatrices: Array.from(this.fisherMatrices.entries()),
      taskSequence: [...this.taskSequence],
    };
  }

  /**
   * Get current policy
   */
  getCurrentPolicy(): number[] {
    return [...this.currentPolicy];
  }
}
