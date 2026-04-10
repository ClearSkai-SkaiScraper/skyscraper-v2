import { logger } from "@/lib/logger";

/**
 * PHASE 49: EVENT BUS v1.0
 * 
 * Real-time event system for claim reconstruction.
 * Every action triggers the claim brain to update.
 * 
 * This is the nervous system of SkaiScraper.
 */

type EventCallback = (payload: any) => void | Promise<void>;

interface EventSubscription {
  id: string;
  eventName: string;
  callback: EventCallback;
}

class EventBus {
  private subscriptions: Map<string, EventSubscription[]> = new Map();
  private eventHistory: Array<{ eventName: string; payload: any; timestamp: Date }> = [];
  private maxHistorySize = 1000;

  /**
   * Emit an event to all subscribers
   */
  emit(eventName: string, payload: any): void {
    logger.debug(`[EventBus] 📡 Emitting: ${eventName}`, payload);

    // Store in history
    this.eventHistory.push({ eventName, payload, timestamp: new Date() });
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }

    // Get all subscribers for this event
    const subscribers = this.subscriptions.get(eventName) || [];

    // Call each subscriber
    subscribers.forEach((sub) => {
      try {
        const result = sub.callback(payload);
        // Handle async callbacks
        if (result instanceof Promise) {
          result.catch((error) => {
            logger.error(`[EventBus] ❌ Error in async callback for ${eventName}:`, error);
          });
        }
      } catch (error) {
        logger.error(`[EventBus] ❌ Error in callback for ${eventName}:`, error);
      }
    });

    logger.debug(`[EventBus] ✅ ${eventName} delivered to ${subscribers.length} subscribers`);
  }

  /**
   * Subscribe to an event
   */
  subscribe(eventName: string, callback: EventCallback): string {
    const subscriptionId = `${eventName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const subscription: EventSubscription = {
      id: subscriptionId,
      eventName,
      callback,
    };

    if (!this.subscriptions.has(eventName)) {
      this.subscriptions.set(eventName, []);
    }

    this.subscriptions.get(eventName)!.push(subscription);

    logger.debug(`[EventBus] ➕ Subscribed: ${eventName} (${subscriptionId})`);

    return subscriptionId;
  }

  /**
   * Unsubscribe from an event
   */
  unsubscribe(subscriptionId: string): boolean {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    for (const [eventName, subs] of this.subscriptions.entries()) {
      const index = subs.findIndex((s) => s.id === subscriptionId);
      if (index !== -1) {
        subs.splice(index, 1);
        logger.debug(`[EventBus] ➖ Unsubscribed: ${subscriptionId}`);
        return true;
      }
    }
    return false;
  }

  /**
   * Unsubscribe all listeners for an event
   */
  unsubscribeAll(eventName: string): void {
    this.subscriptions.delete(eventName);
    logger.debug(`[EventBus] 🗑️ Cleared all subscriptions for: ${eventName}`);
  }

  /**
   * Get event history
   */
  getHistory(eventName?: string, limit = 50): Array<{ eventName: string; payload: any; timestamp: Date }> {
    let history = this.eventHistory;
    if (eventName) {
      history = history.filter((e) => e.eventName === eventName);
    }
    return history.slice(-limit);
  }

  /**
   * Get subscriber count for an event
   */
  getSubscriberCount(eventName: string): number {
    return this.subscriptions.get(eventName)?.length || 0;
  }

  /**
   * Get all active event names
   */
  getActiveEvents(): string[] {
    return Array.from(this.subscriptions.keys());
  }
}

// Singleton instance
export const eventBus = new EventBus();

// ==========================================
// EVENT TYPES
// ==========================================

export const ClaimEvents = {
  // Photo events
  PHOTO_UPLOADED: "claim.photo.uploaded",
  PHOTOS_BATCH_UPLOADED: "claim.photos.batch_uploaded",

  // Video events
  VIDEO_GENERATED: "claim.video.generated",
  VIDEO_COMPLETED: "claim.video.completed",

  // Storm events
  STORM_DATA_CREATED: "claim.storm.created",
  STORM_DATA_UPDATED: "claim.storm.updated",

  // Carrier events
  CARRIER_LETTER_UPLOADED: "claim.carrier.letter_uploaded",
  DENIAL_RESPONSE_UPLOADED: "claim.denial.uploaded",
  APPROVAL_RECEIVED: "claim.approval.received",

  // SkaiPDF events
  SKAI_ANALYSIS_STARTED: "claim.skai.started",
  SKAI_ANALYSIS_COMPLETED: "claim.skai.completed",

  // Status changes
  STATUS_CHANGED: "claim.status.changed",
  STAGE_CHANGED: "claim.stage.changed",

  // Task events
  TASK_CREATED: "claim.task.created",
  TASK_COMPLETED: "claim.task.completed",

  // Pipeline events
  PIPELINE_MOVED: "claim.pipeline.moved",

  // Packet events
  PACKET_GENERATED: "claim.packet.generated",
  PACKET_VIEWED: "claim.packet.viewed",

  // Prediction events
  PREDICTION_GENERATED: "claim.prediction.generated",
  PREDICTION_UPDATED: "claim.prediction.updated",

  // Reconstruction events
  RECONSTRUCTION_TRIGGERED: "claim.reconstruction.triggered",
  RECONSTRUCTION_COMPLETED: "claim.reconstruction.completed",

  // Brain events
  BRAIN_UPDATED: "claim.brain.updated",
  BRAIN_STATE_CHANGED: "claim.brain.state_changed",
  BRAIN_ATTENTION_REQUIRED: "claim.brain.attention_required",
};

// ==========================================
// HELPER FUNCTIONS
// ==========================================

/**
 * Emit a photo uploaded event
 */
export function emitPhotoUploaded(claimId: string, orgId: string, photoId: string, metadata?: any) {
  eventBus.emit(ClaimEvents.PHOTO_UPLOADED, { claimId, orgId, photoId, metadata, timestamp: new Date() });
}

/**
 * Emit a video generated event
 */
export function emitVideoGenerated(claimId: string, orgId: string, videoId: string) {
  eventBus.emit(ClaimEvents.VIDEO_GENERATED, { claimId, orgId, videoId, timestamp: new Date() });
}

/**
 * Emit storm data created event
 */
export function emitStormDataCreated(claimId: string, orgId: string, stormData: any) {
  eventBus.emit(ClaimEvents.STORM_DATA_CREATED, { claimId, orgId, stormData, timestamp: new Date() });
}

/**
 * Emit carrier letter uploaded event
 */
export function emitCarrierLetterUploaded(claimId: string, orgId: string, letterId: string, letterType: string) {
  eventBus.emit(ClaimEvents.CARRIER_LETTER_UPLOADED, { claimId, orgId, letterId, letterType, timestamp: new Date() });
}

/**
 * Emit skai analysis completed event
 */
export function emitSkaiCompleted(claimId: string, orgId: string, analysisId: string, results: any) {
  eventBus.emit(ClaimEvents.SKAI_ANALYSIS_COMPLETED, { claimId, orgId, analysisId, results, timestamp: new Date() });
}

/**
 * Emit status changed event
 */
export function emitStatusChanged(claimId: string, orgId: string, oldStatus: string, newStatus: string) {
  eventBus.emit(ClaimEvents.STATUS_CHANGED, { claimId, orgId, oldStatus, newStatus, timestamp: new Date() });
}

/**
 * Emit task completed event
 */
export function emitTaskCompleted(claimId: string, orgId: string, taskId: string, taskTitle: string) {
  eventBus.emit(ClaimEvents.TASK_COMPLETED, { claimId, orgId, taskId, taskTitle, timestamp: new Date() });
}

/**
 * Emit reconstruction completed event
 */
export function emitReconstructionCompleted(claimId: string, orgId: string, reconstructionId: string, quality: number) {
  eventBus.emit(ClaimEvents.RECONSTRUCTION_COMPLETED, {
    claimId,
    orgId,
    reconstructionId,
    quality,
    timestamp: new Date(),
  });
}

/**
 * Emit brain state changed event
 */
export function emitBrainStateChanged(claimId: string, orgId: string, oldState: string, newState: string, confidence: number) {
  eventBus.emit(ClaimEvents.BRAIN_STATE_CHANGED, { claimId, orgId, oldState, newState, confidence, timestamp: new Date() });
}
