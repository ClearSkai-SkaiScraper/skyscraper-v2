/**
 * PHASE 49: TIMELINE MERGER ENGINE v1.0
 * 
 * Merges event streams from all sources into one unified timeline.
 * Handles deduplication, confidence scoring, and chronological ordering.
 */

import { type TimelineEvent } from "@/lib/claims/reconstructor";
import { logger } from "@/lib/logger";

export interface EventStream {
  source: string;
  events: TimelineEvent[];
  weight: number; // How much to trust this source (0-1)
}

export interface MergedTimelineResult {
  timeline: TimelineEvent[];
  sourceBreakdown: Record<string, number>;
  totalEvents: number;
  duplicatesRemoved: number;
  confidenceAverage: number;
}

/**
 * Merge multiple event streams into one unified timeline
 */
export function mergeEventStreams(streams: EventStream[]): MergedTimelineResult {
  logger.debug(`[TimelineMerger] Merging ${streams.length} event streams...`);

  const allEvents: TimelineEvent[] = [];
  const sourceCount: Record<string, number> = {};

  // Collect all events with source weighting
  streams.forEach((stream) => {
    stream.events.forEach((event) => {
      // Adjust confidence based on source weight
      const adjustedEvent = {
        ...event,
        confidence: Math.round(event.confidence * stream.weight),
      };
      allEvents.push(adjustedEvent);

      // Track source counts
      sourceCount[stream.source] = (sourceCount[stream.source] || 0) + 1;
    });
  });

  logger.debug(`[TimelineMerger] Total events before dedup: ${allEvents.length}`);

  // Sort chronologically
  allEvents.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  // Remove duplicates
  const deduplicated = deduplicateEvents(allEvents);

  logger.debug(`[TimelineMerger] Events after dedup: ${deduplicated.length}`);

  // Calculate statistics
  const confidenceSum = deduplicated.reduce((sum, event) => sum + event.confidence, 0);
  const confidenceAverage = Math.round(confidenceSum / deduplicated.length);

  return {
    timeline: deduplicated,
    sourceBreakdown: sourceCount,
    totalEvents: deduplicated.length,
    duplicatesRemoved: allEvents.length - deduplicated.length,
    confidenceAverage,
  };
}

/**
 * Remove duplicate events
 */
function deduplicateEvents(events: TimelineEvent[]): TimelineEvent[] {
  const seen = new Map<string, TimelineEvent>();

  events.forEach((event) => {
    // Create unique key from title and timestamp (within 1 hour window)
    const hourTimestamp = Math.floor(event.timestamp.getTime() / (60 * 60 * 1000));
    const key = `${event.title}_${hourTimestamp}`;

    const existing = seen.get(key);

    if (!existing || event.confidence > existing.confidence) {
      // Keep the event with higher confidence
      seen.set(key, event);
    }
  });

  return Array.from(seen.values()).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
}

/**
 * Merge photo events into timeline
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createPhotoEventStream(photos: Array<{ timestamp: Date; metadata?: any }>): EventStream {
  return {
    source: "photo",
    weight: 0.8,
    events: photos.map((photo) => ({
      timestamp: photo.timestamp,
      title: "📸 Photos Uploaded",
      description: "Property damage photos added to claim",
      source: "photo",
      confidence: 80,
      metadata: photo.metadata,
      severity: "medium" as const,
    })),
  };
}

/**
 * Merge note events into timeline
 */
export function createNoteEventStream(notes: Array<{ timestamp: Date; author: string; content: string }>): EventStream {
  return {
    source: "note",
    weight: 0.9,
    events: notes.map((note) => ({
      timestamp: note.timestamp,
      title: `💬 Note Added by ${note.author}`,
      description: note.content.substring(0, 100),
      source: "note",
      confidence: 90,
      severity: "low" as const,
    })),
  };
}

/**
 * Merge carrier events into timeline
 */
export function createCarrierEventStream(
  carrierEvents: Array<{ timestamp: Date; eventType: string; content: string }>
): EventStream {
  return {
    source: "carrier",
    weight: 1.0,
    events: carrierEvents.map((event) => ({
      timestamp: event.timestamp,
      title: `📄 Carrier ${event.eventType.toUpperCase()}`,
      description: event.content,
      source: "carrier",
      confidence: 95,
      severity: event.eventType === "denial" ? ("critical" as const) : ("high" as const),
    })),
  };
}

/**
 * Merge storm events into timeline
 */
export function createStormEventStream(storm: { stormDate: Date; hailSize: number; windSpeed: number }): EventStream {
  return {
    source: "storm",
    weight: 0.85,
    events: [
      {
        timestamp: storm.stormDate,
        title: `🌪️ Storm Event (${storm.hailSize}" hail, ${storm.windSpeed}mph wind)`,
        description: `Severe weather event with documented damage potential`,
        source: "storm",
        confidence: 85,
        severity: storm.hailSize >= 2.0 ? ("critical" as const) : ("high" as const),
      },
    ],
  };
}

/**
 * Merge video events into timeline
 */
export function createVideoEventStream(video: { timestamp: Date }): EventStream {
  return {
    source: "video",
    weight: 0.9,
    events: [
      {
        timestamp: video.timestamp,
        title: "🎥 Video Report Generated",
        description: "AI-powered video presentation created",
        source: "video",
        confidence: 90,
        severity: "high" as const,
      },
    ],
  };
}

/**
 * Merge skai events into timeline
 */
export function createSkaiEventStream(dominus: { timestamp: Date; flagCount: number; score: number }): EventStream {
  return {
    source: "skai",
    weight: 0.95,
    events: [
      {
        timestamp: dominus.timestamp,
        title: `🤖 SkaiPDF Analysis (${dominus.flagCount} flags, ${dominus.score}/100)`,
        description: `AI damage detection completed with ${dominus.flagCount} indicators found`,
        source: "skai",
        confidence: 95,
        severity: dominus.flagCount >= 5 ? ("high" as const) : ("medium" as const),
      },
    ],
  };
}

/**
 * Merge task events into timeline
 */
export function createTaskEventStream(
  tasks: Array<{ createdAt: Date; completedAt?: Date; title: string }>
): EventStream {
  const events: TimelineEvent[] = [];

  tasks.forEach((task) => {
    events.push({
      timestamp: task.createdAt,
      title: `📋 Task Created: ${task.title}`,
      description: task.title,
      source: "task",
      confidence: 100,
      severity: "low" as const,
    });

    if (task.completedAt) {
      events.push({
        timestamp: task.completedAt,
        title: `✅ Task Completed: ${task.title}`,
        description: task.title,
        source: "task",
        confidence: 100,
        severity: "low" as const,
      });
    }
  });

  return {
    source: "task",
    weight: 1.0,
    events,
  };
}

/**
 * Merge pipeline events into timeline
 */
export function createPipelineEventStream(
  pipelineEvents: Array<{ timestamp: Date; stageName: string; eventType: string }>
): EventStream {
  return {
    source: "pipeline",
    weight: 1.0,
    events: pipelineEvents.map((event) => ({
      timestamp: event.timestamp,
      title: `⚡ ${event.stageName} - ${event.eventType}`,
      description: `Pipeline stage: ${event.stageName}`,
      source: "pipeline",
      confidence: 100,
      severity: "low" as const,
    })),
  };
}
