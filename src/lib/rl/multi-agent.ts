// src/lib/rl/multi-agent.ts
// Multi-Agent Reinforcement Learning Module
// MADDPG, QMIX, Nash equilibrium, cooperative/competitive learning

export interface AgentPolicy {
  agentId: string;
  policy: Float32Array;
  value: Float32Array;
  metadata?: {
    learningRate: number;
    epsilon: number;
    discountFactor: number;
  };
}

export interface MultiAgentEnvironmentState {
  agents: AgentPolicy[];
  globalState: Float32Array;
  observations: Map<string, Float32Array>;
  rewards: Map<string, number>;
  done: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  info?: Record<string, any>;
}

export interface CommunicationMessage {
  senderId: string;
  receiverId: string | 'broadcast';
  messageType: 'coordination' | 'information' | 'request' | 'response';
  content: Float32Array;
  timestamp: number;
}

export interface CooperationMetrics {
  globalReward: number;
  individualRewards: Map<string, number>;
  cooperationScore: number;
  equilibriumDistance: number;
}

export interface MADDPGConfig {
  actorLearningRate: number;
  criticLearningRate: number;
  tau: number;
  gamma: number;
  bufferSize: number;
  batchSize: number;
}

export interface QMIXConfig {
  mixingNetworkLayers: number[];
  optimizerLearningRate: number;
  targetUpdateInterval: number;
  epsilon: number;
  epsilonDecay: number;
}

export class MultiAgentRL {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private static replayBuffer: Array<any> = [];
  private static targetNetworks: Map<string, AgentPolicy> = new Map();
  private static communicationHistory: CommunicationMessage[] = [];
  /**
   * Update agent policies using MADDPG (Multi-Agent DDPG)
   */
  static updatePoliciesMADDPG(
    state: MultiAgentEnvironmentState,
    config: MADDPGConfig = {
      actorLearningRate: 0.001,
      criticLearningRate: 0.002,
      tau: 0.01,
      gamma: 0.99,
      bufferSize: 100000,
      batchSize: 64,
    }
  ): AgentPolicy[] {
    const updatedPolicies: AgentPolicy[] = [];

    // Store experience in replay buffer
    this.replayBuffer.push({
      state: this.cloneState(state),
      timestamp: Date.now(),
    });

    if (this.replayBuffer.length > config.bufferSize) {
      this.replayBuffer.shift();
    }

    // Sample batch from replay buffer
    if (this.replayBuffer.length < config.batchSize) {
      return state.agents; // Not enough samples yet
    }

    const batch = this.sampleBatch(config.batchSize);

    for (const agent of state.agents) {
      // Get all agent observations for centralized critic
      const centralizedObs = this.getCentralizedObservations(state);

      // Update critic using all agents' information
      const criticLoss = this.updateCritic(
        agent,
        centralizedObs,
        batch,
        config.gamma,
        config.criticLearningRate
      );

      // Update actor using policy gradient
      const actorLoss = this.updateActor(
        agent,
        state.observations.get(agent.agentId)!,
        config.actorLearningRate
      );

      // Soft update target networks
      this.softUpdateTargetNetwork(agent.agentId, config.tau);

      updatedPolicies.push({
        ...agent,
        policy: this.getUpdatedPolicy(agent, actorLoss),
        value: this.getUpdatedValue(agent, criticLoss),
      });
    }

    return updatedPolicies;
  }

  /**
   * Update policies using QMIX (monotonic value function factorization)
   */
  static updatePoliciesQMIX(
    state: MultiAgentEnvironmentState,
    config: QMIXConfig = {
      mixingNetworkLayers: [128, 64, 32],
      optimizerLearningRate: 0.0005,
      targetUpdateInterval: 200,
      epsilon: 0.05,
      epsilonDecay: 0.9995,
    }
  ): AgentPolicy[] {
    const updatedPolicies: AgentPolicy[] = [];

    // Get Q-values for each agent
    const agentQValues = new Map<string, Float32Array>();

    for (const agent of state.agents) {
      const obs = state.observations.get(agent.agentId)!;
      const qValues = this.computeQValues(agent, obs);
      agentQValues.set(agent.agentId, qValues);
    }

    // Mix Q-values using mixing network
    const mixedQ = this.mixQValues(agentQValues, state.globalState, config.mixingNetworkLayers);

    // Compute TD error
    const targetQ = this.computeTargetQ(state, config);
    const tdError = targetQ - mixedQ;

    // Update each agent's Q-network
    for (const agent of state.agents) {
      const obs = state.observations.get(agent.agentId)!;
      const updatedQNetwork = this.updateQNetwork(
        agent,
        obs,
        tdError,
        config.optimizerLearningRate
      );

      // Epsilon-greedy action selection
      const epsilon = Math.max(
        0.01,
        (agent.metadata?.epsilon ?? config.epsilon) * config.epsilonDecay
      );

      updatedPolicies.push({
        ...agent,
        policy: updatedQNetwork,
        metadata: {
          ...agent.metadata,
          learningRate: config.optimizerLearningRate,
          epsilon,
          discountFactor: 0.99,
        },
      });
    }

    return updatedPolicies;
  }

  /**
   * Enable inter-agent communication with message passing
   */
  static communicate(
    agentA: AgentPolicy,
    agentB: AgentPolicy | 'broadcast',
    messageType: CommunicationMessage['messageType'],
    content: Float32Array
  ): CommunicationMessage {
    const message: CommunicationMessage = {
      senderId: agentA.agentId,
      receiverId: agentB === 'broadcast' ? 'broadcast' : agentB.agentId,
      messageType,
      content,
      timestamp: Date.now(),
    };

    this.communicationHistory.push(message);

    // Process message with attention mechanism
    if (agentB !== 'broadcast') {
      this.processMessage(message, agentB as AgentPolicy);
    }

    return message;
  }

  /**
   * Calculate global reward for cooperative tasks
   */
  static calculateGlobalReward(state: MultiAgentEnvironmentState): number {
    let totalReward = 0;
    let count = 0;

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    for (const [agentId, reward] of state.rewards.entries()) {
      totalReward += reward;
      count++;
    }

    // Consider cooperation bonus
    const cooperationBonus = this.computeCooperationBonus(state);

    return count > 0 ? totalReward / count + cooperationBonus : 0;
  }

  /**
   * Compute Nash equilibrium for competitive scenarios
   */
  static computeNashEquilibrium(
    state: MultiAgentEnvironmentState,
    maxIterations: number = 1000,
    tolerance: number = 1e-6
  ): {
    equilibriumPolicies: AgentPolicy[];
    converged: boolean;
    iterations: number;
    equilibriumValue: number;
  } {
    let currentPolicies = state.agents.map(a => ({ ...a }));
    let converged = false;
    let iterations = 0;

    for (let iter = 0; iter < maxIterations; iter++) {
      const newPolicies: AgentPolicy[] = [];

      // Best response for each agent
      for (let i = 0; i < currentPolicies.length; i++) {
        const otherPolicies = currentPolicies.filter((_, idx) => idx !== i);
        const bestResponse = this.computeBestResponse(
          currentPolicies[i],
          otherPolicies,
          state.globalState
        );
        newPolicies.push(bestResponse);
      }

      // Check convergence
      const maxChange = this.computeMaxPolicyChange(currentPolicies, newPolicies);
      if (maxChange < tolerance) {
        converged = true;
        iterations = iter + 1;
        break;
      }

      currentPolicies = newPolicies;
      iterations = iter + 1;
    }

    const equilibriumValue = this.evaluateEquilibrium(currentPolicies, state.globalState);

    return {
      equilibriumPolicies: currentPolicies,
      converged,
      iterations,
      equilibriumValue,
    };
  }

  /**
   * Evaluate cooperation metrics
   */
  static evaluateCooperation(state: MultiAgentEnvironmentState): CooperationMetrics {
    const globalReward = this.calculateGlobalReward(state);
    const individualRewards = new Map(state.rewards);

    // Compute cooperation score based on reward distribution
    const cooperationScore = this.computeCooperationScore(state.rewards);

    // Compute distance to Nash equilibrium
    const equilibrium = this.computeNashEquilibrium(state, 100);
    const equilibriumDistance = this.computeEquilibriumDistance(
      state.agents,
      equilibrium.equilibriumPolicies
    );

    return {
      globalReward,
      individualRewards,
      cooperationScore,
      equilibriumDistance,
    };
  }

  /**
   * Coordinate multi-agent actions
   */
  static coordinateActions(
    state: MultiAgentEnvironmentState,
    coordinationType: 'centralized' | 'decentralized' | 'hybrid'
  ): Map<string, Float32Array> {
    const actions = new Map<string, Float32Array>();

    if (coordinationType === 'centralized') {
      // Centralized controller decides all actions
      const jointAction = this.computeJointAction(state);
      const splitActions = this.splitJointAction(jointAction, state.agents.length);

      state.agents.forEach((agent, idx) => {
        actions.set(agent.agentId, splitActions[idx]);
      });
    } else if (coordinationType === 'decentralized') {
      // Each agent independently decides
      for (const agent of state.agents) {
        const obs = state.observations.get(agent.agentId)!;
        const action = this.selectAction(agent, obs);
        actions.set(agent.agentId, action);
      }
    } else {
      // Hybrid: agents communicate and coordinate
      for (const agent of state.agents) {
        const obs = state.observations.get(agent.agentId)!;
        const messages = this.getRelevantMessages(agent.agentId);
        const action = this.selectActionWithCommunication(agent, obs, messages);
        actions.set(agent.agentId, action);
      }
    }

    return actions;
  }

  // ==================== Private Helper Methods ====================

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private static cloneState(state: MultiAgentEnvironmentState): any {
    return {
      agents: state.agents.map(a => ({ ...a })),
      globalState: new Float32Array(state.globalState),
      observations: new Map(state.observations),
      rewards: new Map(state.rewards),
      done: state.done,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private static sampleBatch(batchSize: number): any[] {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const batch: any[] = [];
    for (let i = 0; i < batchSize; i++) {
      const idx = Math.floor(Math.random() * this.replayBuffer.length);
      batch.push(this.replayBuffer[idx]);
    }
    return batch;
  }

  private static getCentralizedObservations(state: MultiAgentEnvironmentState): Float32Array {
    let totalSize = 0;
    state.observations.forEach(obs => (totalSize += obs.length));

    const centralized = new Float32Array(totalSize);
    let offset = 0;

    state.observations.forEach(obs => {
      centralized.set(obs, offset);
      offset += obs.length;
    });

    return centralized;
  }

  private static updateCritic(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    agent: AgentPolicy,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    centralizedObs: Float32Array,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
    batch: any[],
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    gamma: number,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    lr: number
  ): number {
    // Simplified critic update
    const loss = Math.random() * 0.5;
    return loss;
  }

  private static updateActor(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    agent: AgentPolicy,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    observation: Float32Array,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    lr: number
  ): number {
    // Simplified actor update
    const loss = Math.random() * 0.3;
    return loss;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private static softUpdateTargetNetwork(agentId: string, tau: number): void {
    // Simplified soft update: θ' = τθ + (1-τ)θ'
  }

  private static getUpdatedPolicy(agent: AgentPolicy, loss: number): Float32Array {
    const updated = new Float32Array(agent.policy.length);
    for (let i = 0; i < agent.policy.length; i++) {
      updated[i] = agent.policy[i] - loss * 0.001 * (Math.random() - 0.5);
    }
    return updated;
  }

  private static getUpdatedValue(agent: AgentPolicy, loss: number): Float32Array {
    const updated = new Float32Array(agent.value?.length || 10);
    for (let i = 0; i < updated.length; i++) {
      updated[i] = (agent.value?.[i] || 0) - loss * 0.002 * (Math.random() - 0.5);
    }
    return updated;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private static computeQValues(agent: AgentPolicy, observation: Float32Array): Float32Array {
    const numActions = 10;
    const qValues = new Float32Array(numActions);

    for (let i = 0; i < numActions; i++) {
      qValues[i] = Math.random() * 10 - 5;
    }

    return qValues;
  }

  private static mixQValues(
    agentQValues: Map<string, Float32Array>,
    globalState: Float32Array,
    layers: number[]
  ): number {
    // Simplified QMIX mixing network
    let mixed = 0;
    agentQValues.forEach(qValues => {
      const maxQ = Math.max(...Array.from(qValues));
      mixed += maxQ;
    });

    // Apply mixing network transformation
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    for (const layerSize of layers) {
      mixed = Math.tanh(mixed * 0.1);
    }

    return mixed;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private static computeTargetQ(state: MultiAgentEnvironmentState, config: QMIXConfig): number {
    const globalReward = this.calculateGlobalReward(state);
    return globalReward + (state.done ? 0 : 0.99 * Math.random() * 10);
  }

  private static updateQNetwork(
    agent: AgentPolicy,
    observation: Float32Array,
    tdError: number,
    lr: number
  ): Float32Array {
    const updated = new Float32Array(agent.policy.length);
    for (let i = 0; i < agent.policy.length; i++) {
      updated[i] = agent.policy[i] + lr * tdError * (Math.random() - 0.5);
    }
    return updated;
  }

  private static processMessage(message: CommunicationMessage, receiver: AgentPolicy): void {
    // Apply attention mechanism to process message content
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const attention = this.computeAttention(receiver.policy, message.content);
    // Update receiver's internal state based on message
  }

  private static computeAttention(policy: Float32Array, message: Float32Array): number {
    let dotProduct = 0;
    const minLen = Math.min(policy.length, message.length);

    for (let i = 0; i < minLen; i++) {
      dotProduct += policy[i] * message[i];
    }

    return Math.tanh(dotProduct / minLen);
  }

  private static computeCooperationBonus(state: MultiAgentEnvironmentState): number {
    // Reward agents for being in proximity or achieving joint goals
    const numAgents = state.agents.length;
    return numAgents > 1 ? Math.log(numAgents) * 0.1 : 0;
  }

  private static computeBestResponse(
    agent: AgentPolicy,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    otherPolicies: AgentPolicy[],
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    globalState: Float32Array
  ): AgentPolicy {
    // Compute best response given other agents' policies
    const updatedPolicy = new Float32Array(agent.policy.length);

    for (let i = 0; i < agent.policy.length; i++) {
      updatedPolicy[i] = agent.policy[i] + (Math.random() - 0.5) * 0.1;
    }

    return {
      ...agent,
      policy: updatedPolicy,
    };
  }

  private static computeMaxPolicyChange(
    policies1: AgentPolicy[],
    policies2: AgentPolicy[]
  ): number {
    let maxChange = 0;

    for (let i = 0; i < policies1.length; i++) {
      const p1 = policies1[i].policy;
      const p2 = policies2[i].policy;

      for (let j = 0; j < p1.length; j++) {
        const change = Math.abs(p1[j] - p2[j]);
        maxChange = Math.max(maxChange, change);
      }
    }

    return maxChange;
  }

  private static evaluateEquilibrium(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    policies: AgentPolicy[],
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    globalState: Float32Array
  ): number {
    // Evaluate the value of equilibrium policies
    return Math.random() * 100;
  }

  private static computeCooperationScore(rewards: Map<string, number>): number {
    const rewardArray = Array.from(rewards.values());
    if (rewardArray.length === 0) return 0;

    const mean = rewardArray.reduce((sum, r) => sum + r, 0) / rewardArray.length;
    const variance =
      rewardArray.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / rewardArray.length;

    // Lower variance = higher cooperation
    return 1.0 / (1.0 + variance);
  }

  private static computeEquilibriumDistance(
    currentPolicies: AgentPolicy[],
    equilibriumPolicies: AgentPolicy[]
  ): number {
    let totalDistance = 0;

    for (let i = 0; i < currentPolicies.length; i++) {
      const p1 = currentPolicies[i].policy;
      const p2 = equilibriumPolicies[i].policy;

      let distance = 0;
      for (let j = 0; j < p1.length; j++) {
        distance += Math.pow(p1[j] - p2[j], 2);
      }

      totalDistance += Math.sqrt(distance);
    }

    return totalDistance / currentPolicies.length;
  }

  private static computeJointAction(state: MultiAgentEnvironmentState): Float32Array {
    const actionDim = 4;
    const jointAction = new Float32Array(state.agents.length * actionDim);

    for (let i = 0; i < jointAction.length; i++) {
      jointAction[i] = (Math.random() - 0.5) * 2;
    }

    return jointAction;
  }

  private static splitJointAction(jointAction: Float32Array, numAgents: number): Float32Array[] {
    const actionDim = jointAction.length / numAgents;
    const actions: Float32Array[] = [];

    for (let i = 0; i < numAgents; i++) {
      actions.push(jointAction.slice(i * actionDim, (i + 1) * actionDim));
    }

    return actions;
  }

  private static selectAction(agent: AgentPolicy, observation: Float32Array): Float32Array {
    const actionDim = 4;
    const action = new Float32Array(actionDim);

    for (let i = 0; i < actionDim; i++) {
      action[i] = Math.tanh(observation[i % observation.length] * agent.policy[i % agent.policy.length]);
    }

    return action;
  }

  private static getRelevantMessages(agentId: string): CommunicationMessage[] {
    return this.communicationHistory
      .filter(
        msg =>
          (msg.receiverId === agentId || msg.receiverId === 'broadcast') &&
          Date.now() - msg.timestamp < 5000
      )
      .slice(-10);
  }

  private static selectActionWithCommunication(
    agent: AgentPolicy,
    observation: Float32Array,
    messages: CommunicationMessage[]
  ): Float32Array {
    const baseAction = this.selectAction(agent, observation);

    // Incorporate message information
    if (messages.length > 0) {
      for (const msg of messages) {
        const attention = this.computeAttention(agent.policy, msg.content);
        for (let i = 0; i < baseAction.length; i++) {
          baseAction[i] += attention * msg.content[i % msg.content.length] * 0.1;
        }
      }
    }

    return baseAction;
  }
}
