// src/lib/rl/meta.ts
// Meta-Reinforcement Learning Module
// Implements MAML, Reptile, and task distribution for fast adaptation

/**
 * Represents a single meta-learning task with environment parameters
 */
export interface MetaRLTask {
  taskId: string;
  environment: string;
  parameters: number[];
  stateSpace: number;
  actionSpace: number;
  episodeLength: number;
  rewardScale: number;
}

/**
 * Result of meta-learning adaptation
 */
export interface MetaRLResult {
  taskId: string;
  adaptedPolicy: number[];
  adaptationScore: number;
  adaptationSteps: number;
  preAdaptationReward: number;
  postAdaptationReward: number;
  convergenceMetrics: ConvergenceMetrics;
}

/**
 * Configuration for meta-learning algorithms
 */
export interface MetaRLConfig {
  algorithm: "MAML" | "Reptile" | "ProtoNet";
  innerLearningRate: number;
  outerLearningRate: number;
  adaptationSteps: number;
  metaBatchSize: number;
  taskSamplesPerBatch: number;
  firstOrderApproximation: boolean;
  maxGradientNorm: number;
}

/**
 * Task distribution for meta-learning
 */
export interface TaskDistribution {
  taskFamily: string;
  tasks: MetaRLTask[];
  samplingStrategy: "uniform" | "prioritized" | "curriculum";
  difficultyRange: [number, number];
  diversityMetric: number;
}

/**
 * Convergence metrics for adaptation
 */
export interface ConvergenceMetrics {
  lossHistory: number[];
  rewardHistory: number[];
  gradientNorms: number[];
  parameterChangeMagnitude: number;
  converged: boolean;
  convergenceStep: number;
}

/**
 * Meta-gradient computation result
 */
export interface MetaGradient {
  policyGradient: number[];
  valueGradient: number[];
  metaLoss: number;
  innerLoopLosses: number[];
  outerLoopLoss: number;
}

/**
 * Fast adaptation context
 */
export interface AdaptationContext {
  supportSet: ExperienceBatch;
  querySet: ExperienceBatch;
  baselinePerformance: number;
  targetPerformance: number;
  adaptationBudget: number;
}

/**
 * Experience batch for meta-learning
 */
export interface ExperienceBatch {
  states: number[][];
  actions: number[];
  rewards: number[];
  nextStates: number[][];
  dones: boolean[];
  advantages?: number[];
}

/**
 * Meta-Reinforcement Learning implementation
 * Supports MAML (Model-Agnostic Meta-Learning), Reptile, and fast adaptation
 */
export class MetaRL {
  private config: MetaRLConfig;
  private metaParameters: number[];
  private taskDistribution: TaskDistribution | null = null;
  private adaptationHistory: Map<string, MetaRLResult[]> = new Map();

  constructor(config: Partial<MetaRLConfig> = {}) {
    this.config = {
      algorithm: "MAML",
      innerLearningRate: 0.01,
      outerLearningRate: 0.001,
      adaptationSteps: 5,
      metaBatchSize: 8,
      taskSamplesPerBatch: 10,
      firstOrderApproximation: false,
      maxGradientNorm: 10.0,
      ...config,
    };
    this.metaParameters = [];
  }

  /**
   * Initialize meta-parameters with given dimensions
   */
  initializeMetaParameters(
    dimensions: number,
    initMethod: "xavier" | "he" | "uniform" = "xavier"
  ): void {
    try {
      const variance =
        initMethod === "xavier"
          ? 2.0 / dimensions
          : initMethod === "he"
            ? 2.0 / Math.sqrt(dimensions)
            : 0.1;

      this.metaParameters = Array.from(
        { length: dimensions },
        () => (Math.random() - 0.5) * Math.sqrt(variance)
      );
    } catch (error) {
      throw new Error(
        `Failed to initialize meta-parameters: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * MAML: Model-Agnostic Meta-Learning
   * Adapts policy to new task using gradient-based meta-learning
   */
  async adaptToTaskMAML(task: MetaRLTask, context: AdaptationContext): Promise<MetaRLResult> {
    try {
      if (this.metaParameters.length === 0) {
        throw new Error("Meta-parameters not initialized");
      }

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const startTime = Date.now();
      let adaptedParams = [...this.metaParameters];
      const convergenceMetrics: ConvergenceMetrics = {
        lossHistory: [],
        rewardHistory: [],
        gradientNorms: [],
        parameterChangeMagnitude: 0,
        converged: false,
        convergenceStep: -1,
      };

      // Inner loop: Task-specific adaptation
      for (let step = 0; step < this.config.adaptationSteps; step++) {
        const gradient = this.computeInnerGradient(adaptedParams, context.supportSet);
        const gradNorm = this.vectorNorm(gradient);

        convergenceMetrics.gradientNorms.push(gradNorm);

        // Gradient descent step
        adaptedParams = adaptedParams.map(
          (param, idx) => param - this.config.innerLearningRate * gradient[idx]
        );

        // Evaluate on query set
        const queryPerformance = this.evaluatePolicy(adaptedParams, context.querySet);
        convergenceMetrics.rewardHistory.push(queryPerformance);

        const loss = this.computeLoss(adaptedParams, context.querySet);
        convergenceMetrics.lossHistory.push(loss);

        // Check convergence
        if (
          gradNorm < 1e-4 ||
          (step > 0 &&
            Math.abs(
              convergenceMetrics.lossHistory[step] - convergenceMetrics.lossHistory[step - 1]
            ) < 1e-5)
        ) {
          convergenceMetrics.converged = true;
          convergenceMetrics.convergenceStep = step;
          break;
        }
      }

      const preAdaptationReward = this.evaluatePolicy(this.metaParameters, context.supportSet);
      const postAdaptationReward = this.evaluatePolicy(adaptedParams, context.querySet);

      convergenceMetrics.parameterChangeMagnitude = this.vectorDistance(
        this.metaParameters,
        adaptedParams
      );

      const result: MetaRLResult = {
        taskId: task.taskId,
        adaptedPolicy: adaptedParams,
        adaptationScore:
          (postAdaptationReward - preAdaptationReward) / (Math.abs(preAdaptationReward) + 1e-8),
        adaptationSteps: convergenceMetrics.converged
          ? convergenceMetrics.convergenceStep + 1
          : this.config.adaptationSteps,
        preAdaptationReward,
        postAdaptationReward,
        convergenceMetrics,
      };

      // Store adaptation history
      if (!this.adaptationHistory.has(task.taskId)) {
        this.adaptationHistory.set(task.taskId, []);
      }
      this.adaptationHistory.get(task.taskId)!.push(result);

      return result;
    } catch (error) {
      throw new Error(
        `MAML adaptation failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Reptile: First-order meta-learning algorithm
   * Simpler alternative to MAML with similar performance
   */
  async adaptToTaskReptile(task: MetaRLTask, context: AdaptationContext): Promise<MetaRLResult> {
    try {
      if (this.metaParameters.length === 0) {
        throw new Error("Meta-parameters not initialized");
      }

      let adaptedParams = [...this.metaParameters];
      const convergenceMetrics: ConvergenceMetrics = {
        lossHistory: [],
        rewardHistory: [],
        gradientNorms: [],
        parameterChangeMagnitude: 0,
        converged: false,
        convergenceStep: -1,
      };

      // SGD on task for multiple steps
      for (let step = 0; step < this.config.adaptationSteps; step++) {
        const gradient = this.computeInnerGradient(adaptedParams, context.supportSet);
        const gradNorm = this.vectorNorm(gradient);

        convergenceMetrics.gradientNorms.push(gradNorm);

        adaptedParams = adaptedParams.map(
          (param, idx) => param - this.config.innerLearningRate * gradient[idx]
        );

        const performance = this.evaluatePolicy(adaptedParams, context.querySet);
        convergenceMetrics.rewardHistory.push(performance);

        const loss = this.computeLoss(adaptedParams, context.querySet);
        convergenceMetrics.lossHistory.push(loss);
      }

      // Reptile meta-update: move meta-parameters toward adapted parameters
      const metaGradient = adaptedParams.map((param, idx) => this.metaParameters[idx] - param);

      this.metaParameters = this.metaParameters.map(
        (param, idx) => param - this.config.outerLearningRate * metaGradient[idx]
      );

      const preAdaptationReward = this.evaluatePolicy(this.metaParameters, context.supportSet);
      const postAdaptationReward = this.evaluatePolicy(adaptedParams, context.querySet);

      convergenceMetrics.parameterChangeMagnitude = this.vectorDistance(
        this.metaParameters,
        adaptedParams
      );

      return {
        taskId: task.taskId,
        adaptedPolicy: adaptedParams,
        adaptationScore:
          (postAdaptationReward - preAdaptationReward) / (Math.abs(preAdaptationReward) + 1e-8),
        adaptationSteps: this.config.adaptationSteps,
        preAdaptationReward,
        postAdaptationReward,
        convergenceMetrics,
      };
    } catch (error) {
      throw new Error(
        `Reptile adaptation failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Compute meta-gradients for meta-parameter update
   */
  computeMetaGradients(taskBatch: MetaRLTask[], contexts: AdaptationContext[]): MetaGradient {
    try {
      const innerLoopLosses: number[] = [];
      let outerLoopLoss = 0;
      const policyGradient = new Array(this.metaParameters.length).fill(0);
      const valueGradient = new Array(this.metaParameters.length).fill(0);

      for (let i = 0; i < taskBatch.length; i++) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const task = taskBatch[i];
        const context = contexts[i];

        // Inner loop: adapt to task
        let adaptedParams = [...this.metaParameters];
        for (let step = 0; step < this.config.adaptationSteps; step++) {
          const gradient = this.computeInnerGradient(adaptedParams, context.supportSet);
          adaptedParams = adaptedParams.map(
            (param, idx) => param - this.config.innerLearningRate * gradient[idx]
          );
        }

        // Compute inner loop loss
        const innerLoss = this.computeLoss(adaptedParams, context.supportSet);
        innerLoopLosses.push(innerLoss);

        // Outer loop: meta-loss on query set
        const queryLoss = this.computeLoss(adaptedParams, context.querySet);
        outerLoopLoss += queryLoss;

        // Compute meta-gradient (second-order if not first-order approximation)
        const metaGrad = this.config.firstOrderApproximation
          ? this.computeInnerGradient(adaptedParams, context.querySet)
          : this.computeSecondOrderGradient(adaptedParams, context.supportSet, context.querySet);

        for (let j = 0; j < policyGradient.length; j++) {
          policyGradient[j] += metaGrad[j] / taskBatch.length;
        }
      }

      outerLoopLoss /= taskBatch.length;

      // Gradient clipping
      const gradNorm = this.vectorNorm(policyGradient);
      if (gradNorm > this.config.maxGradientNorm) {
        const scale = this.config.maxGradientNorm / gradNorm;
        for (let i = 0; i < policyGradient.length; i++) {
          policyGradient[i] *= scale;
        }
      }

      return {
        policyGradient,
        valueGradient,
        metaLoss: outerLoopLoss,
        innerLoopLosses,
        outerLoopLoss,
      };
    } catch (error) {
      throw new Error(
        `Meta-gradient computation failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Fast adaptation using cached meta-knowledge
   */
  fastAdaptation(
    task: MetaRLTask,
    fewShotExperiences: ExperienceBatch,
    maxSteps: number = 3
  ): number[] {
    try {
      let adaptedParams = [...this.metaParameters];

      for (let step = 0; step < maxSteps; step++) {
        const gradient = this.computeInnerGradient(adaptedParams, fewShotExperiences);
        adaptedParams = adaptedParams.map(
          (param, idx) => param - this.config.innerLearningRate * gradient[idx]
        );
      }

      return adaptedParams;
    } catch (error) {
      throw new Error(
        `Fast adaptation failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Set up task distribution for meta-training
   */
  setupTaskDistribution(distribution: TaskDistribution): void {
    try {
      if (distribution.tasks.length === 0) {
        throw new Error("Task distribution must contain at least one task");
      }

      this.taskDistribution = distribution;
    } catch (error) {
      throw new Error(
        `Failed to setup task distribution: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Sample batch of tasks from distribution
   */
  sampleTaskBatch(): MetaRLTask[] {
    if (!this.taskDistribution) {
      throw new Error("Task distribution not initialized");
    }

    const { tasks, samplingStrategy } = this.taskDistribution;
    const batchSize = Math.min(this.config.metaBatchSize, tasks.length);

    if (samplingStrategy === "uniform") {
      return this.uniformSample(tasks, batchSize);
    } else if (samplingStrategy === "prioritized") {
      return this.prioritizedSample(tasks, batchSize);
    } else {
      return this.curriculumSample(tasks, batchSize);
    }
  }

  // Private helper methods

  private computeInnerGradient(params: number[], batch: ExperienceBatch): number[] {
    const epsilon = 1e-5;
    const gradient = new Array(params.length).fill(0);

    for (let i = 0; i < params.length; i++) {
      const paramsPlus = [...params];
      paramsPlus[i] += epsilon;
      const lossPlus = this.computeLoss(paramsPlus, batch);

      const paramsMinus = [...params];
      paramsMinus[i] -= epsilon;
      const lossMinus = this.computeLoss(paramsMinus, batch);

      gradient[i] = (lossPlus - lossMinus) / (2 * epsilon);
    }

    return gradient;
  }

  private computeSecondOrderGradient(
    adaptedParams: number[],
    supportSet: ExperienceBatch,
    querySet: ExperienceBatch
  ): number[] {
    // Simplified second-order gradient computation
    const queryGradient = this.computeInnerGradient(adaptedParams, querySet);
    const supportGradient = this.computeInnerGradient(adaptedParams, supportSet);

    return queryGradient.map(
      (qg, idx) => qg - this.config.innerLearningRate * supportGradient[idx]
    );
  }

  private computeLoss(params: number[], batch: ExperienceBatch): number {
    let totalLoss = 0;
    const batchSize = batch.states.length;

    for (let i = 0; i < batchSize; i++) {
      const predicted = this.forward(params, batch.states[i]);
      const target = batch.rewards[i] + (batch.dones[i] ? 0 : 0.99 * Math.max(...predicted));
      const error = predicted[batch.actions[i]] - target;
      totalLoss += error * error;
    }

    return totalLoss / batchSize;
  }

  private forward(params: number[], state: number[]): number[] {
    // Simple forward pass (placeholder - would be more complex in production)
    const outputSize = Math.max(1, Math.floor(params.length / state.length));
    const output = new Array(outputSize).fill(0);

    for (let i = 0; i < outputSize; i++) {
      let sum = 0;
      for (let j = 0; j < state.length; j++) {
        const idx = (i * state.length + j) % params.length;
        sum += params[idx] * state[j];
      }
      output[i] = Math.tanh(sum);
    }

    return output;
  }

  private evaluatePolicy(params: number[], batch: ExperienceBatch): number {
    let totalReward = 0;
    for (let i = 0; i < batch.states.length; i++) {
      const qValues = this.forward(params, batch.states[i]);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const action = this.argmax(qValues);
      totalReward += batch.rewards[i];
    }
    return totalReward / batch.states.length;
  }

  private uniformSample(tasks: MetaRLTask[], batchSize: number): MetaRLTask[] {
    const shuffled = [...tasks].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, batchSize);
  }

  private prioritizedSample(tasks: MetaRLTask[], batchSize: number): MetaRLTask[] {
    // Priority based on adaptation history
    const priorities = tasks.map((task) => {
      const history = this.adaptationHistory.get(task.taskId);
      if (!history || history.length === 0) return 1.0;
      const lastResult = history[history.length - 1];
      return 1.0 - lastResult.adaptationScore; // Higher priority for tasks with lower adaptation
    });

    return this.sampleWithPriorities(tasks, priorities, batchSize);
  }

  private curriculumSample(tasks: MetaRLTask[], batchSize: number): MetaRLTask[] {
    // Sample easier tasks more frequently early on
    const sorted = [...tasks].sort((a, b) => a.episodeLength - b.episodeLength);
    return sorted.slice(0, batchSize);
  }

  private sampleWithPriorities(
    tasks: MetaRLTask[],
    priorities: number[],
    batchSize: number
  ): MetaRLTask[] {
    const totalPriority = priorities.reduce((sum, p) => sum + p, 0);
    const sampled: MetaRLTask[] = [];

    for (let i = 0; i < batchSize; i++) {
      let rand = Math.random() * totalPriority;
      for (let j = 0; j < tasks.length; j++) {
        rand -= priorities[j];
        if (rand <= 0) {
          sampled.push(tasks[j]);
          break;
        }
      }
    }

    return sampled;
  }

  private vectorNorm(vec: number[]): number {
    return Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0));
  }

  private vectorDistance(vec1: number[], vec2: number[]): number {
    return Math.sqrt(vec1.reduce((sum, v, i) => sum + (v - vec2[i]) ** 2, 0));
  }

  private argmax(arr: number[]): number {
    return arr.indexOf(Math.max(...arr));
  }

  /**
   * Get adaptation history for a specific task
   */
  getAdaptationHistory(taskId: string): MetaRLResult[] {
    return this.adaptationHistory.get(taskId) || [];
  }

  /**
   * Export meta-parameters for persistence
   */
  exportMetaParameters(): number[] {
    return [...this.metaParameters];
  }

  /**
   * Import meta-parameters from saved state
   */
  importMetaParameters(params: number[]): void {
    this.metaParameters = [...params];
  }
}
