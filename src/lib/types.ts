export type RawFinding = {
  id: string;
  ruleId: string;
  message: string;
  file: string;
  line: number | null;
  originalSeverity: string;
};

export type Priority = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export type TriagedFinding = RawFinding & {
  priority: Priority;
  plainEnglish: string;
  realWorldImpact: string;
  remediation: string;
  falsePositiveLikelihood: "LOW" | "MEDIUM" | "HIGH";
};

export type TriageResponse = {
  summary: string;
  overallRisk: Priority;
  triaged: TriagedFinding[];
};
