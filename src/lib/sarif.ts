import { RawFinding } from "./types";

// Minimal structural typing for the slice of SARIF 2.1.0 we consume.
// Sentinel-Scanner (and most SARIF-emitting scanners) populate these fields.
type SarifLog = {
  runs?: Array<{
    tool?: { driver?: { name?: string } };
    results?: Array<{
      ruleId?: string;
      message?: { text?: string };
      level?: string;
      properties?: { severity?: string; entropy?: number };
      locations?: Array<{
        physicalLocation?: {
          artifactLocation?: { uri?: string };
          region?: { startLine?: number };
        };
      }>;
    }>;
  }>;
};

const levelToSeverity: Record<string, string> = {
  error: "high",
  warning: "medium",
  note: "low",
  none: "info",
};

export function parseSarif(raw: string): RawFinding[] {
  let log: SarifLog;
  try {
    log = JSON.parse(raw);
  } catch {
    throw new Error(
      "That doesn't look like valid JSON. Sentinel-Scanner's --format sarif output is a .sarif/.json file — paste its full contents."
    );
  }

  if (!log.runs || log.runs.length === 0) {
    throw new Error(
      "No 'runs' array found. This doesn't look like a SARIF 2.1.0 log — check you copied the whole file."
    );
  }

  const findings: RawFinding[] = [];
  let counter = 0;

  for (const run of log.runs) {
    for (const result of run.results ?? []) {
      counter += 1;
      const loc = result.locations?.[0]?.physicalLocation;
      findings.push({
        id: `f-${counter}`,
        ruleId: result.ruleId ?? "unknown-rule",
        message: result.message?.text ?? "(no message provided)",
        file: loc?.artifactLocation?.uri ?? "unknown file",
        line: loc?.region?.startLine ?? null,
        originalSeverity:
          result.properties?.severity ??
          levelToSeverity[result.level ?? "warning"] ??
          "medium",
      });
    }
  }

  if (findings.length === 0) {
    throw new Error(
      "Parsed the SARIF log but found zero results — the scan may have come back clean, or results live under a run we didn't recognize."
    );
  }

  return findings;
}
