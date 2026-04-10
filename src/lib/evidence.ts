import { arrayUnion,doc, setDoc } from "firebase/firestore";

import { db } from "@/lib/firebase";
import { logger } from "@/lib/logger";

export interface EvidencePair {
  originalUrl: string;
  annotatedUrl: string;
  counts?: Record<string, number>;
  caption?: string;
  selected?: boolean;
  createdAt?: number;
  detectionMethod?: string;
}

export async function saveEvidencePair(
  uid: string,
  projectId: string,
  originalUrl: string,
  annotatedUrl: string,
  counts: Record<string, number> = {},
  detectionMethod: string = "manual"
): Promise<void> {
  try {
    const ref = doc(db, "users", uid, "projects", projectId);

    const evidencePair: EvidencePair = {
      originalUrl,
      annotatedUrl,
      counts,
      caption: "",
      selected: true,
      createdAt: Date.now(),
      detectionMethod,
    };

    await setDoc(
      ref,
      {
        evidence: arrayUnion(evidencePair),
      },
      { merge: true }
    );

    logger.debug("Evidence pair saved successfully");
  } catch (error) {
    logger.error("Failed to save evidence pair:", error);
    throw new Error("Failed to save evidence to project");
  }
}

export function toPhotoGrid(evidence: EvidencePair[]): Array<{ url: string; caption: string }> {
  return (evidence || [])
    .filter((pair: EvidencePair) => pair.selected)
    .map((pair: EvidencePair) => ({
      url: pair.annotatedUrl || pair.originalUrl,
      caption: pair.caption || "",
    }));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function generateDamageCounts(detections: any[]): Record<string, number> {
  const counts: Record<string, number> = {};

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  detections.forEach((detection: any) => {
    const damageType = detection.type || detection.label || "unknown";
    counts[damageType] = (counts[damageType] || 0) + 1;
  });

  return counts;
}
