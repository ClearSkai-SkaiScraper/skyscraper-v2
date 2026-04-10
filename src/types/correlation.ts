// types/correlation.ts

export interface CorrelatedDamageFinding {
  damageType: string;
  weatherCause: string;
  likelihood: number;
  evidence: string[];
  explanation: string;
}

export interface CorrelationAnalysis {
  summary: string;
  hailCorrelation: {
    likelihood: number;
    explanation: string;
    evidence: string[];
  };
  windCorrelation: {
    likelihood: number;
    explanation: string;
    evidence: string[];
  };
  rainLeakCorrelation: {
    likelihood: number;
    explanation: string;
    evidence: string[];
  };
  freezeThawCorrelation: {
    likelihood: number;
    explanation: string;
    evidence: string[];
  };
  timelineMatch: {
    score: number;
    explanation: string;
  };
  finalCausationConclusion: string;
  recommendations: string[];
}

export interface CorrelationRequest {
  claimId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  weather?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  damage?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  specs?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  codes?: any;
}

export interface CorrelationReport {
  id: string;
  claimId: string;
  orgId: string;
  createdById: string;
  payload: CorrelationAnalysis;
  createdAt: Date;
  updatedAt: Date;
}
