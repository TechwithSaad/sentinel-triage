import { TriagedFinding } from "@/lib/types";
import PriorityBadge from "./PriorityBadge";

const RAIL_COLOR: Record<TriagedFinding["priority"], string> = {
  CRITICAL: "bg-red",
  HIGH: "bg-amber",
  MEDIUM: "bg-violet",
  LOW: "bg-teal",
};

export default function FindingRow({ finding }: { finding: TriagedFinding }) {
  return (
    <div className="relative flex gap-4 rounded-lg border border-panel-line bg-panel/60 pl-4 pr-5 py-4">
      <span
        className={`absolute left-0 top-0 h-full w-1 rounded-l-lg ${RAIL_COLOR[finding.priority]}`}
      />
      <div className="flex-1 min-w-0 space-y-2.5">
        <div className="flex flex-wrap items-center gap-2.5">
          <PriorityBadge priority={finding.priority} />
          <code className="text-xs text-muted font-mono-display">
            {finding.file}
            {finding.line ? `:${finding.line}` : ""}
          </code>
          <span className="text-[11px] text-muted font-mono-display">· {finding.ruleId}</span>
          {finding.falsePositiveLikelihood === "HIGH" && (
            <span className="text-[11px] text-muted italic">
              likely false positive
            </span>
          )}
        </div>

        <p className="text-sm text-fog leading-relaxed">{finding.plainEnglish}</p>

        <div className="grid gap-2.5 sm:grid-cols-2">
          <div className="rounded-md bg-ink/60 border border-panel-line px-3 py-2.5">
            <p className="text-[10px] uppercase tracking-wide text-muted font-mono-display mb-1">
              If ignored
            </p>
            <p className="text-xs text-fog/90 leading-relaxed">{finding.realWorldImpact}</p>
          </div>
          <div className="rounded-md bg-ink/60 border border-panel-line px-3 py-2.5">
            <p className="text-[10px] uppercase tracking-wide text-muted font-mono-display mb-1">
              Do this
            </p>
            <p className="text-xs text-fog/90 leading-relaxed">{finding.remediation}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
