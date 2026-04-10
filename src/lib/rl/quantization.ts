// src/lib/rl/quantization.ts
// RL Model Quantization & Compression Module
// Implements quantization-aware training, pruning, and knowledge distillation for efficient deployment

/**
 * Result of model quantization
 */
export interface RLQuantizationResult {
  originalSize: number;
  quantizedSize: number;
  compressionRatio: number;
  performanceDrop: number;
  inferenceSpeedup: number;
  memoryReduction: number;
  method: string;
}

/**
 * Configuration for quantization
 */
export interface QuantizationConfig {
  method: "post-training" | "quantization-aware" | "dynamic";
  bitWidth: 8 | 16 | 32;
  symmetric: boolean;
  perChannel: boolean;
  calibrationSamples: number;
  quantizeWeights: boolean;
  quantizeActivations: boolean;
}

/**
 * Configuration for pruning
 */
export interface PruningConfig {
  method: "magnitude" | "structured" | "lottery-ticket" | "gradual";
  sparsity: number;
  schedule: "constant" | "polynomial" | "exponential";
  structureType: "weight" | "filter" | "channel";
  finetuneEpochs: number;
}

/**
 * Configuration for knowledge distillation
 */
export interface DistillationConfig {
  temperature: number;
  alpha: number;
  teacherPolicy: number[];
  studentCapacity: number;
  distillationType: "response" | "feature" | "relation";
}

/**
 * Quantization parameters
 */
export interface QuantizationParams {
  scale: number[];
  zeroPoint: number[];
  min: number[];
  max: number[];
  bitWidth: number;
}

/**
 * Pruning mask
 */
export interface PruningMask {
  mask: boolean[];
  sparsity: number;
  prunedIndices: number[];
  remainingParameters: number;
}

/**
 * Compression statistics
 */
export interface CompressionStats {
  originalParameters: number;
  compressedParameters: number;
  compressionRatio: number;
  flopReduction: number;
  latencyReduction: number;
  accuracyRetention: number;
}

/**
 * Quantized policy representation
 */
export interface QuantizedPolicy {
  quantizedWeights: Int8Array | Int16Array;
  quantizationParams: QuantizationParams;
  originalShape: number[];
  bitWidth: number;
}

/**
 * Pruned policy representation
 */
export interface PrunedPolicy {
  weights: number[];
  mask: PruningMask;
  sparseIndices: number[];
  sparseValues: number[];
}

/**
 * RL Model Quantization & Compression
 * Reduces model size and accelerates inference for deployment
 */
export class RLQuantization {
  private config: QuantizationConfig;
  private pruningConfig: PruningConfig | null = null;
  private distillationConfig: DistillationConfig | null = null;
  private quantizationParams: QuantizationParams | null = null;
  private pruningMask: PruningMask | null = null;

  constructor(config: Partial<QuantizationConfig> = {}) {
    this.config = {
      method: "post-training",
      bitWidth: 8,
      symmetric: true,
      perChannel: false,
      calibrationSamples: 100,
      quantizeWeights: true,
      quantizeActivations: true,
      ...config,
    };
  }

  /**
   * Post-training quantization
   * Quantize trained model without retraining
   */
  quantizeModelPostTraining(policy: number[], calibrationData: number[][]): RLQuantizationResult {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const startTime = Date.now();
      const originalSize = policy.length * 4; // 32-bit floats

      // Compute quantization parameters from calibration data
      this.quantizationParams = this.computeQuantizationParams(policy, calibrationData);

      // Quantize weights
      const quantizedWeights = this.quantizeWeights(policy, this.quantizationParams);

      // Dequantize for evaluation
      const dequantized = this.dequantizeWeights(quantizedWeights, this.quantizationParams);

      // Compute metrics
      const quantizedSize = this.computeQuantizedSize(quantizedWeights);
      const performanceDrop = this.evaluatePerformanceDrop(policy, dequantized, calibrationData);
      const inferenceSpeedup = this.estimateSpeedup(this.config.bitWidth);
      const memoryReduction = 1 - quantizedSize / originalSize;

      return {
        originalSize,
        quantizedSize,
        compressionRatio: originalSize / quantizedSize,
        performanceDrop,
        inferenceSpeedup,
        memoryReduction,
        method: "post-training",
      };
    } catch (error) {
      throw new Error(
        `Post-training quantization failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Quantization-aware training
   * Train with quantization in the loop
   */
  async quantizeModelAwareTraining(
    policy: number[],
    trainingData: Array<{ state: number[]; action: number; reward: number }>,
    epochs: number = 20
  ): Promise<RLQuantizationResult> {
    try {
      const originalSize = policy.length * 4;
      let quantizedPolicy = [...policy];

      // Initialize quantization parameters
      const calibrationStates = trainingData
        .slice(0, this.config.calibrationSamples)
        .map((d) => d.state);
      this.quantizationParams = this.computeQuantizationParams(quantizedPolicy, calibrationStates);

      // Training loop with quantization
      for (let epoch = 0; epoch < epochs; epoch++) {
        for (const { state, action, reward } of trainingData) {
          // Forward pass with quantization
          const quantized = this.quantizeWeights(quantizedPolicy, this.quantizationParams);
          const dequantized = this.dequantizeWeights(quantized, this.quantizationParams);

          // Compute gradient (straight-through estimator)
          const gradient = this.computeGradient(dequantized, state, action, reward);

          // Update weights
          const learningRate = 0.001 / (1 + epoch * 0.01);
          for (let i = 0; i < quantizedPolicy.length; i++) {
            quantizedPolicy[i] -= learningRate * gradient[i];
          }
        }

        // Update quantization parameters periodically
        if (epoch % 5 === 0) {
          const states = trainingData.slice(0, this.config.calibrationSamples).map((d) => d.state);
          this.quantizationParams = this.computeQuantizationParams(quantizedPolicy, states);
        }
      }

      // Final quantization
      const finalQuantized = this.quantizeWeights(quantizedPolicy, this.quantizationParams);
      const quantizedSize = this.computeQuantizedSize(finalQuantized);

      const dequantized = this.dequantizeWeights(finalQuantized, this.quantizationParams);
      const performanceDrop = this.evaluatePerformanceDrop(
        policy,
        dequantized,
        trainingData.map((d) => d.state)
      );

      const inferenceSpeedup = this.estimateSpeedup(this.config.bitWidth);
      const memoryReduction = 1 - quantizedSize / originalSize;

      return {
        originalSize,
        quantizedSize,
        compressionRatio: originalSize / quantizedSize,
        performanceDrop,
        inferenceSpeedup,
        memoryReduction,
        method: "quantization-aware",
      };
    } catch (error) {
      throw new Error(
        `Quantization-aware training failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Magnitude-based pruning
   * Remove weights with smallest absolute values
   */
  pruneModelMagnitude(
    policy: number[],
    sparsity: number,
    finetuneData?: Array<{ state: number[]; action: number; reward: number }>
  ): RLQuantizationResult {
    try {
      const originalSize = policy.length * 4;

      // Compute magnitude of each weight
      const magnitudes = policy.map((w) => Math.abs(w));
      const threshold = this.computePruningThreshold(magnitudes, sparsity);

      // Create pruning mask
      const mask = magnitudes.map((m) => m >= threshold);
      const prunedIndices = mask.map((keep, i) => (keep ? -1 : i)).filter((i) => i >= 0);

      this.pruningMask = {
        mask,
        sparsity,
        prunedIndices,
        remainingParameters: mask.filter((m) => m).length,
      };

      // Apply mask
      const prunedPolicy = policy.map((w, i) => (mask[i] ? w : 0));

      // Fine-tune if data provided
      let finalPolicy = prunedPolicy;
      if (finetuneData && finetuneData.length > 0) {
        finalPolicy = this.finetuneAfterPruning(prunedPolicy, mask, finetuneData, 10);
      }

      // Convert to sparse representation
      const sparseSize = this.computeSparseSize(finalPolicy, mask);
      const performanceDrop = finetuneData
        ? this.evaluatePerformanceDrop(
            policy,
            finalPolicy,
            finetuneData.map((d) => d.state)
          )
        : 0;

      const inferenceSpeedup = this.estimateSparsitySpeedup(sparsity);
      const memoryReduction = 1 - sparseSize / originalSize;

      return {
        originalSize,
        quantizedSize: sparseSize,
        compressionRatio: originalSize / sparseSize,
        performanceDrop,
        inferenceSpeedup,
        memoryReduction,
        method: "magnitude-pruning",
      };
    } catch (error) {
      throw new Error(
        `Magnitude pruning failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Gradual magnitude pruning
   * Progressively increase sparsity during training
   */
  async pruneModelGradual(
    policy: number[],
    targetSparsity: number,
    trainingData: Array<{ state: number[]; action: number; reward: number }>,
    epochs: number = 30
  ): Promise<RLQuantizationResult> {
    try {
      const originalSize = policy.length * 4;
      let currentPolicy = [...policy];
      let currentSparsity = 0;

      for (let epoch = 0; epoch < epochs; epoch++) {
        // Gradually increase sparsity
        currentSparsity = this.computeGradualSparsity(epoch, epochs, targetSparsity);

        // Prune based on current sparsity
        const magnitudes = currentPolicy.map((w) => Math.abs(w));
        const threshold = this.computePruningThreshold(magnitudes, currentSparsity);
        const mask = magnitudes.map((m) => m >= threshold);

        // Train with mask
        for (const { state, action, reward } of trainingData) {
          const gradient = this.computeGradient(currentPolicy, state, action, reward);

          // Update only non-pruned weights
          const learningRate = 0.001 / (1 + epoch * 0.01);
          for (let i = 0; i < currentPolicy.length; i++) {
            if (mask[i]) {
              currentPolicy[i] -= learningRate * gradient[i];
            } else {
              currentPolicy[i] = 0;
            }
          }
        }
      }

      // Final mask
      const finalMagnitudes = currentPolicy.map((w) => Math.abs(w));
      const finalThreshold = this.computePruningThreshold(finalMagnitudes, targetSparsity);
      const finalMask = finalMagnitudes.map((m) => m >= finalThreshold);

      this.pruningMask = {
        mask: finalMask,
        sparsity: targetSparsity,
        prunedIndices: finalMask.map((keep, i) => (keep ? -1 : i)).filter((i) => i >= 0),
        remainingParameters: finalMask.filter((m) => m).length,
      };

      const sparseSize = this.computeSparseSize(currentPolicy, finalMask);
      const performanceDrop = this.evaluatePerformanceDrop(
        policy,
        currentPolicy,
        trainingData.map((d) => d.state)
      );

      const inferenceSpeedup = this.estimateSparsitySpeedup(targetSparsity);
      const memoryReduction = 1 - sparseSize / originalSize;

      return {
        originalSize,
        quantizedSize: sparseSize,
        compressionRatio: originalSize / sparseSize,
        performanceDrop,
        inferenceSpeedup,
        memoryReduction,
        method: "gradual-pruning",
      };
    } catch (error) {
      throw new Error(
        `Gradual pruning failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Knowledge distillation for model compression
   * Train smaller student model to mimic teacher
   */
  async distillModel(
    teacherPolicy: number[],
    studentSize: number,
    trainingData: Array<{ state: number[] }>,
    temperature: number = 2.0,
    alpha: number = 0.5
  ): Promise<RLQuantizationResult> {
    try {
      const originalSize = teacherPolicy.length * 4;
      const studentPolicy = new Array(studentSize).fill(0).map(() => (Math.random() - 0.5) * 0.1);

      this.distillationConfig = {
        temperature,
        alpha,
        teacherPolicy,
        studentCapacity: studentSize,
        distillationType: "response",
      };

      // Training loop
      const epochs = 40;
      for (let epoch = 0; epoch < epochs; epoch++) {
        for (const { state } of trainingData) {
          // Get teacher's soft predictions
          const teacherLogits = this.forward(teacherPolicy, state);
          const softTargets = this.softmax(teacherLogits, temperature);

          // Get student predictions
          const studentLogits = this.forward(studentPolicy, state);
          const studentProbs = this.softmax(studentLogits, temperature);

          // Compute distillation loss
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const loss = this.klDivergence(softTargets, studentProbs);

          // Update student
          const gradient = this.computeDistillationGradient(
            studentPolicy,
            state,
            softTargets,
            temperature
          );

          const learningRate = 0.001 / (1 + epoch * 0.01);
          for (let i = 0; i < studentPolicy.length; i++) {
            studentPolicy[i] -= learningRate * gradient[i];
          }
        }
      }

      const studentSize_bytes = studentSize * 4;
      const performanceDrop = this.evaluatePerformanceDrop(
        teacherPolicy,
        studentPolicy,
        trainingData.map((d) => d.state)
      );

      const inferenceSpeedup = originalSize / studentSize_bytes;
      const memoryReduction = 1 - studentSize_bytes / originalSize;

      return {
        originalSize,
        quantizedSize: studentSize_bytes,
        compressionRatio: originalSize / studentSize_bytes,
        performanceDrop,
        inferenceSpeedup,
        memoryReduction,
        method: "knowledge-distillation",
      };
    } catch (error) {
      throw new Error(
        `Knowledge distillation failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Combined quantization and pruning
   */
  async compressModelCombined(
    policy: number[],
    sparsity: number,
    bitWidth: 8 | 16,
    trainingData: Array<{ state: number[]; action: number; reward: number }>
  ): Promise<RLQuantizationResult> {
    try {
      const originalSize = policy.length * 4;

      // Step 1: Prune
      const pruningResult = await this.pruneModelGradual(policy, sparsity, trainingData, 20);

      // Step 2: Quantize pruned model
      const prunedPolicy = policy.map((w, i) => (this.pruningMask!.mask[i] ? w : 0));

      this.config.bitWidth = bitWidth;
      const quantResult = this.quantizeModelPostTraining(
        prunedPolicy,
        trainingData.slice(0, 100).map((d) => d.state)
      );

      // Combined metrics
      const combinedSize = quantResult.quantizedSize * (1 - sparsity);
      const combinedSpeedup = pruningResult.inferenceSpeedup * quantResult.inferenceSpeedup;
      const combinedPerformanceDrop = Math.max(
        pruningResult.performanceDrop,
        quantResult.performanceDrop
      );

      return {
        originalSize,
        quantizedSize: combinedSize,
        compressionRatio: originalSize / combinedSize,
        performanceDrop: combinedPerformanceDrop,
        inferenceSpeedup: combinedSpeedup,
        memoryReduction: 1 - combinedSize / originalSize,
        method: "combined-pruning-quantization",
      };
    } catch (error) {
      throw new Error(
        `Combined compression failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  // Private helper methods

  private computeQuantizationParams(
    weights: number[],
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    calibrationData: number[][]
  ): QuantizationParams {
    const min = Math.min(...weights);
    const max = Math.max(...weights);
    const numLevels = Math.pow(2, this.config.bitWidth);

    let scale: number;
    let zeroPoint: number;

    if (this.config.symmetric) {
      const absMax = Math.max(Math.abs(min), Math.abs(max));
      scale = (2 * absMax) / numLevels;
      zeroPoint = this.config.bitWidth === 8 ? 128 : 0;
    } else {
      scale = (max - min) / numLevels;
      zeroPoint = Math.round(-min / scale);
    }

    return {
      scale: [scale],
      zeroPoint: [zeroPoint],
      min: [min],
      max: [max],
      bitWidth: this.config.bitWidth,
    };
  }

  private quantizeWeights(weights: number[], params: QuantizationParams): Int8Array | Int16Array {
    const scale = params.scale[0];
    const zeroPoint = params.zeroPoint[0];

    const ArrayType = this.config.bitWidth === 8 ? Int8Array : Int16Array;
    const quantized = new ArrayType(weights.length);

    for (let i = 0; i < weights.length; i++) {
      const scaled = Math.round(weights[i] / scale + zeroPoint);
      const maxVal = this.config.bitWidth === 8 ? 127 : 32767;
      const minVal = this.config.bitWidth === 8 ? -128 : -32768;
      quantized[i] = Math.max(minVal, Math.min(maxVal, scaled));
    }

    return quantized;
  }

  private dequantizeWeights(
    quantized: Int8Array | Int16Array,
    params: QuantizationParams
  ): number[] {
    const scale = params.scale[0];
    const zeroPoint = params.zeroPoint[0];
    const dequantized: number[] = [];

    for (let i = 0; i < quantized.length; i++) {
      dequantized.push((quantized[i] - zeroPoint) * scale);
    }

    return dequantized;
  }

  private computeQuantizedSize(quantized: Int8Array | Int16Array): number {
    return quantized.length * (this.config.bitWidth / 8);
  }

  private computePruningThreshold(magnitudes: number[], sparsity: number): number {
    const sorted = [...magnitudes].sort((a, b) => a - b);
    const index = Math.floor(sparsity * sorted.length);
    return sorted[index];
  }

  private computeSparseSize(policy: number[], mask: boolean[]): number {
    const numNonZero = mask.filter((m) => m).length;
    // Sparse format: indices + values
    return numNonZero * 4 + numNonZero * 4;
  }

  private computeGradualSparsity(
    currentEpoch: number,
    totalEpochs: number,
    targetSparsity: number
  ): number {
    const progress = currentEpoch / totalEpochs;
    // Polynomial schedule
    return targetSparsity * Math.pow(progress, 3);
  }

  private finetuneAfterPruning(
    policy: number[],
    mask: boolean[],
    data: Array<{ state: number[]; action: number; reward: number }>,
    epochs: number
  ): number[] {
    const finetuned = [...policy];

    for (let epoch = 0; epoch < epochs; epoch++) {
      for (const { state, action, reward } of data) {
        const gradient = this.computeGradient(finetuned, state, action, reward);

        const learningRate = 0.001;
        for (let i = 0; i < finetuned.length; i++) {
          if (mask[i]) {
            finetuned[i] -= learningRate * gradient[i];
          }
        }
      }
    }

    return finetuned;
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

  private computeGradient(
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

  private computeDistillationGradient(
    policy: number[],
    state: number[],
    targets: number[],
    temperature: number
  ): number[] {
    const epsilon = 1e-5;
    const gradient = new Array(policy.length).fill(0);

    const logits = this.forward(policy, state);
    const probs = this.softmax(logits, temperature);
    const baseLoss = this.klDivergence(targets, probs);

    for (let i = 0; i < policy.length; i++) {
      const policyPlus = [...policy];
      policyPlus[i] += epsilon;
      const logitsPlus = this.forward(policyPlus, state);
      const probsPlus = this.softmax(logitsPlus, temperature);
      const lossPlus = this.klDivergence(targets, probsPlus);
      gradient[i] = (lossPlus - baseLoss) / epsilon;
    }

    return gradient;
  }

  private evaluatePerformanceDrop(
    original: number[],
    compressed: number[],
    testStates: number[][]
  ): number {
    let totalDrop = 0;

    for (const state of testStates) {
      const originalOutput = this.forward(original, state);
      const compressedOutput = this.forward(compressed, state);

      const originalAction = this.argmax(originalOutput);
      const compressedAction = this.argmax(compressedOutput);

      if (originalAction !== compressedAction) {
        totalDrop += 1;
      }

      // Also measure value difference
      const valueDiff = Math.abs(Math.max(...originalOutput) - Math.max(...compressedOutput));
      totalDrop += valueDiff * 0.1;
    }

    return totalDrop / testStates.length;
  }

  private estimateSpeedup(bitWidth: number): number {
    // Rough estimate: speedup from reduced precision
    return 32 / bitWidth;
  }

  private estimateSparsitySpeedup(sparsity: number): number {
    // Rough estimate: speedup from skipping zero weights
    return 1 / (1 - sparsity + 0.1); // Add overhead
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

  private argmax(arr: number[]): number {
    return arr.indexOf(Math.max(...arr));
  }

  /**
   * Export quantized model
   */
  exportQuantized(policy: number[]): QuantizedPolicy | null {
    if (!this.quantizationParams) return null;

    const quantized = this.quantizeWeights(policy, this.quantizationParams);

    return {
      quantizedWeights: quantized,
      quantizationParams: this.quantizationParams,
      originalShape: [policy.length],
      bitWidth: this.config.bitWidth,
    };
  }

  /**
   * Export pruned model
   */
  exportPruned(policy: number[]): PrunedPolicy | null {
    if (!this.pruningMask) return null;

    const sparseIndices: number[] = [];
    const sparseValues: number[] = [];

    for (let i = 0; i < policy.length; i++) {
      if (this.pruningMask.mask[i] && policy[i] !== 0) {
        sparseIndices.push(i);
        sparseValues.push(policy[i]);
      }
    }

    return {
      weights: policy,
      mask: this.pruningMask,
      sparseIndices,
      sparseValues,
    };
  }

  /**
   * Get compression statistics
   */
  getCompressionStats(result: RLQuantizationResult): CompressionStats {
    return {
      originalParameters: Math.floor(result.originalSize / 4),
      compressedParameters: Math.floor(result.quantizedSize / 4),
      compressionRatio: result.compressionRatio,
      flopReduction: result.inferenceSpeedup,
      latencyReduction: result.inferenceSpeedup,
      accuracyRetention: 1 - result.performanceDrop,
    };
  }
}
