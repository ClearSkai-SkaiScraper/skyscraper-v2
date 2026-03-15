-- ============================================================================
-- Claim Simulation + Storm Graph — Foundation Tables
-- Sprint 12: AI Claim Infrastructure
-- Date: 2026-03-14
-- ============================================================================

-- Phase 1.1: Claim Outcomes (historical outcome tracking for prediction training)
CREATE TABLE IF NOT EXISTS claim_outcomes (
  id                          TEXT PRIMARY KEY,
  "claimId"                   TEXT NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  "orgId"                     TEXT NOT NULL REFERENCES "Org"(id),

  outcome                     TEXT NOT NULL DEFAULT 'pending',
  "approvalPercent"           DOUBLE PRECISION,

  "estimatedRCV"              INTEGER,
  "approvedRCV"               INTEGER,
  "deniedAmount"              INTEGER,
  "supplementsWon"            INTEGER NOT NULL DEFAULT 0,
  "supplementsLost"           INTEGER NOT NULL DEFAULT 0,

  carrier                     TEXT,
  adjuster                    TEXT,
  "carrierReason"             TEXT,

  "submittedAt"               TIMESTAMPTZ,
  "firstResponseAt"           TIMESTAMPTZ,
  "resolvedAt"                TIMESTAMPTZ,
  "daysToResolve"             INTEGER,

  "readinessScoreAtSubmission"  INTEGER,
  "evidenceGradeAtSubmission"   TEXT,
  "photoCountAtSubmission"      INTEGER,
  "detectionCountAtSubmission"  INTEGER,
  "weatherScoreAtSubmission"    INTEGER,
  "collateralCountAtSubmission" INTEGER,
  "simulationScoreAtSubmission" INTEGER,

  "createdAt"                 TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"                 TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT claim_outcomes_claimid_unique UNIQUE ("claimId")
);

CREATE INDEX IF NOT EXISTS idx_claim_outcomes_org_outcome ON claim_outcomes("orgId", outcome);
CREATE INDEX IF NOT EXISTS idx_claim_outcomes_carrier_outcome ON claim_outcomes(carrier, outcome);
CREATE INDEX IF NOT EXISTS idx_claim_outcomes_org_carrier ON claim_outcomes("orgId", carrier);
CREATE INDEX IF NOT EXISTS idx_claim_outcomes_resolved ON claim_outcomes("resolvedAt");


-- Phase 1.2: Claim Detections (structured YOLO/GPT-4V detection results)
CREATE TABLE IF NOT EXISTS claim_detections (
  id                TEXT PRIMARY KEY,
  "claimId"         TEXT NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  "orgId"           TEXT NOT NULL REFERENCES "Org"(id),
  "photoId"         TEXT,

  "modelId"         TEXT NOT NULL,
  "modelGroup"      TEXT NOT NULL,
  "className"       TEXT NOT NULL,
  confidence        DOUBLE PRECISION NOT NULL,

  "bboxX"           DOUBLE PRECISION,
  "bboxY"           DOUBLE PRECISION,
  "bboxWidth"       DOUBLE PRECISION,
  "bboxHeight"      DOUBLE PRECISION,

  severity          TEXT,
  "perilType"       TEXT,
  "componentType"   TEXT,

  "isCollateral"    BOOLEAN NOT NULL DEFAULT false,
  "isCodeViolation" BOOLEAN NOT NULL DEFAULT false,
  "isReplacement"   BOOLEAN NOT NULL DEFAULT false,
  "isSoftMetal"     BOOLEAN NOT NULL DEFAULT false,

  "createdAt"       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_claim_detections_claim_group ON claim_detections("claimId", "modelGroup");
CREATE INDEX IF NOT EXISTS idx_claim_detections_org_class ON claim_detections("orgId", "className");
CREATE INDEX IF NOT EXISTS idx_claim_detections_claim_peril ON claim_detections("claimId", "perilType");
CREATE INDEX IF NOT EXISTS idx_claim_detections_claim_collateral ON claim_detections("claimId", "isCollateral");
CREATE INDEX IF NOT EXISTS idx_claim_detections_claim_softmetal ON claim_detections("claimId", "isSoftMetal");
CREATE INDEX IF NOT EXISTS idx_claim_detections_confidence ON claim_detections(confidence);


-- R1: Model Calibration (per-model detection quality)
CREATE TABLE IF NOT EXISTS model_calibration (
  id                    TEXT PRIMARY KEY,
  "modelId"             TEXT NOT NULL UNIQUE,
  "modelGroup"          TEXT NOT NULL,
  "displayName"         TEXT,

  "confidenceThreshold" DOUBLE PRECISION NOT NULL DEFAULT 0.35,
  "falsePositiveRate"   DOUBLE PRECISION,
  "truePositiveRate"    DOUBLE PRECISION,

  "qualityScore"        INTEGER NOT NULL DEFAULT 50,
  "isFineTuned"         BOOLEAN NOT NULL DEFAULT false,
  "trainingDataSize"    INTEGER,
  "lastValidated"       TIMESTAMPTZ,

  "defaultSeverity"     TEXT,
  "defaultPerilType"    TEXT,
  "defaultComponentType" TEXT,
  "evidenceWeight"      DOUBLE PRECISION NOT NULL DEFAULT 1.0,

  "createdAt"           TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_model_calibration_group ON model_calibration("modelGroup");


-- Phase 2: Claim Simulations (cached prediction results)
CREATE TABLE IF NOT EXISTS claim_simulations (
  id                          TEXT PRIMARY KEY,
  "claimId"                   TEXT NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  "orgId"                     TEXT NOT NULL REFERENCES "Org"(id),

  "approvalProbability"       INTEGER NOT NULL,
  "predictedOutcome"          TEXT NOT NULL,
  "confidenceLevel"           TEXT NOT NULL,

  "stormEvidenceScore"        INTEGER NOT NULL DEFAULT 0,
  "damageEvidenceScore"       INTEGER NOT NULL DEFAULT 0,
  "collateralEvidenceScore"   INTEGER NOT NULL DEFAULT 0,
  "repairabilityScore"        INTEGER NOT NULL DEFAULT 0,
  "documentationScore"        INTEGER NOT NULL DEFAULT 0,
  "codeComplianceScore"       INTEGER NOT NULL DEFAULT 0,
  "carrierHistoryScore"       INTEGER NOT NULL DEFAULT 0,

  "stormGraphCorroboration"   INTEGER,
  "nearbyVerifiedClaims"      INTEGER NOT NULL DEFAULT 0,
  "clusterConfidence"         TEXT,

  "positiveFactors"           JSONB NOT NULL DEFAULT '[]',
  "negativeFactors"           JSONB NOT NULL DEFAULT '[]',
  recommendations             JSONB NOT NULL DEFAULT '[]',
  "categoryBreakdown"         JSONB NOT NULL DEFAULT '{}',

  "engineVersion"             TEXT NOT NULL DEFAULT '1.0.0',
  "computedAt"                TIMESTAMPTZ NOT NULL DEFAULT now(),

  "createdAt"                 TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"                 TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_claim_simulations_claim ON claim_simulations("claimId");
CREATE INDEX IF NOT EXISTS idx_claim_simulations_org_prob ON claim_simulations("orgId", "approvalProbability");
CREATE INDEX IF NOT EXISTS idx_claim_simulations_org_outcome ON claim_simulations("orgId", "predictedOutcome");
CREATE INDEX IF NOT EXISTS idx_claim_simulations_computed ON claim_simulations("computedAt");


-- Phase 4.3: Simulation History (score over time)
CREATE TABLE IF NOT EXISTS simulation_history (
  id                          TEXT PRIMARY KEY,
  "claimId"                   TEXT NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  "orgId"                     TEXT NOT NULL REFERENCES "Org"(id),

  "approvalProbability"       INTEGER NOT NULL,
  "triggerEvent"              TEXT NOT NULL,
  "triggerDescription"        TEXT,

  "stormEvidenceScore"        INTEGER NOT NULL DEFAULT 0,
  "damageEvidenceScore"       INTEGER NOT NULL DEFAULT 0,
  "collateralEvidenceScore"   INTEGER NOT NULL DEFAULT 0,
  "documentationScore"        INTEGER NOT NULL DEFAULT 0,

  "createdAt"                 TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_simulation_history_claim ON simulation_history("claimId", "createdAt");
CREATE INDEX IF NOT EXISTS idx_simulation_history_org ON simulation_history("orgId", "claimId");


-- Phase 3: Storm Clusters (cross-claim intelligence)
CREATE TABLE IF NOT EXISTS storm_clusters (
  id                        TEXT PRIMARY KEY,
  "stormEventId"            TEXT NOT NULL REFERENCES storm_events(id) ON DELETE CASCADE,
  "orgId"                   TEXT NOT NULL REFERENCES "Org"(id),

  "centerLat"               DOUBLE PRECISION NOT NULL,
  "centerLng"               DOUBLE PRECISION NOT NULL,
  "radiusMiles"             DOUBLE PRECISION NOT NULL,
  "boundingBox"             JSONB,

  "totalProperties"         INTEGER NOT NULL DEFAULT 0,
  "inspectedProperties"     INTEGER NOT NULL DEFAULT 0,
  "claimsInCluster"         INTEGER NOT NULL DEFAULT 0,
  "verifiedDamage"          INTEGER NOT NULL DEFAULT 0,

  "hailDamageCount"         INTEGER NOT NULL DEFAULT 0,
  "windDamageCount"         INTEGER NOT NULL DEFAULT 0,
  "waterDamageCount"        INTEGER NOT NULL DEFAULT 0,
  "collateralDamageCount"   INTEGER NOT NULL DEFAULT 0,

  "corroborationScore"      INTEGER NOT NULL DEFAULT 0,
  "corroborationLevel"      TEXT NOT NULL DEFAULT 'none',
  "corroborationNarrative"  TEXT,

  "avgHailSize"             DOUBLE PRECISION,
  "avgWindSpeed"            INTEGER,
  "avgDamageEvidence"       INTEGER,
  "avgClaimStrength"        INTEGER,

  "heatmapData"             JSONB NOT NULL DEFAULT '[]',

  "computedAt"              TIMESTAMPTZ NOT NULL DEFAULT now(),
  "createdAt"               TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_storm_clusters_event ON storm_clusters("stormEventId");
CREATE INDEX IF NOT EXISTS idx_storm_clusters_org ON storm_clusters("orgId", "computedAt");
CREATE INDEX IF NOT EXISTS idx_storm_clusters_corr ON storm_clusters("corroborationLevel");


-- R2: Carrier Playbooks
CREATE TABLE IF NOT EXISTS carrier_playbooks (
  id                    TEXT PRIMARY KEY,
  "orgId"               TEXT NOT NULL REFERENCES "Org"(id),
  "carrierName"         TEXT NOT NULL,

  "totalClaims"         INTEGER NOT NULL DEFAULT 0,
  "approvedCount"       INTEGER NOT NULL DEFAULT 0,
  "partialCount"        INTEGER NOT NULL DEFAULT 0,
  "deniedCount"         INTEGER NOT NULL DEFAULT 0,
  "approvalRate"        DOUBLE PRECISION,
  "avgDaysToResolve"    INTEGER,
  "avgSupplementRounds" DOUBLE PRECISION,
  "supplementWinRate"   DOUBLE PRECISION,

  "commonDenialReasons" JSONB NOT NULL DEFAULT '[]',
  "keyEvidenceNeeded"   JSONB NOT NULL DEFAULT '[]',
  "carrierBehaviorNotes" TEXT,
  "preferredStrategy"   TEXT,
  "typicalResponse"     TEXT,

  "computedAt"          TIMESTAMPTZ NOT NULL DEFAULT now(),
  "sampleSize"          INTEGER NOT NULL DEFAULT 0,

  "createdAt"           TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"           TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT carrier_playbooks_org_carrier_unique UNIQUE ("orgId", "carrierName")
);

CREATE INDEX IF NOT EXISTS idx_carrier_playbooks_carrier ON carrier_playbooks("carrierName");


-- ============================================================================
-- DONE — All foundation tables for Claim Simulation + Storm Graph created
-- ============================================================================
