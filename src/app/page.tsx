"use client";

import { useMemo, useState } from "react";
import { ShieldAlert, UploadCloud, FileJson, Download, Loader2 } from "lucide-react";
import { Priority, TriageResponse } from "@/lib/types";
import PriorityBadge from "@/components/PriorityBadge";
import FindingRow from "@/components/FindingRow";

const PRIORITY_ORDER: Priority[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];

export default function Home() {
  const [sarifText, setSarifText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TriageResponse | null>(null);
  const [filter, setFilter] = useState<Priority | "ALL">("ALL");

  async function handleFile(file: File) {
    const text = await file.text();
    setSarifText(text);
    setFileName(file.name);
    setError(null);
  }

  async function loadSample() {
    const res = await fetch("/sample-scan.sarif.json");
    const text = await res.text();
    setSarifText(text);
    setFileName("sample-scan.sarif.json");
    setError(null);
  }

  async function runTriage() {
    if (!sarifText.trim()) {
      setError("Paste or upload a Sentinel-Scanner SARIF log first.");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sarif: sarifText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Triage failed.");
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    if (!result) return [];
    if (filter === "ALL") return result.triaged;
    return result.triaged.filter((f) => f.priority === filter);
  }, [result, filter]);

  const counts = useMemo(() => {
    const c: Record<Priority, number> = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
    result?.triaged.forEach((f) => (c[f.priority] += 1));
    return c;
  }, [result]);

  function exportMarkdown() {
    if (!result) return;
    const lines = [
      `# Sentinel-Scanner triage report`,
      ``,
      `**Overall risk:** ${result.overallRisk}`,
      ``,
      result.summary,
      ``,
      `---`,
      ``,
      ...PRIORITY_ORDER.flatMap((p) => {
        const items = result.triaged.filter((f) => f.priority === p);
        if (items.length === 0) return [];
        return [
          `## ${p}`,
          ``,
          ...items.map(
            (f) =>
              `### ${f.file}${f.line ? `:${f.line}` : ""} — \`${f.ruleId}\`\n\n` +
              `${f.plainEnglish}\n\n**If ignored:** ${f.realWorldImpact}\n\n**Do this:** ${f.remediation}\n`
          ),
        ];
      }),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "triage-report.md";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="min-h-screen scan-grid">
      <div className="mx-auto max-w-5xl px-6 py-14">
        <header className="mb-10 flex items-start justify-between gap-6">
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <ShieldAlert className="h-5 w-5 text-amber" />
              <span className="font-mono-display text-xs tracking-[0.2em] text-muted uppercase">
                SentinelTriage
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-mono-display font-medium leading-tight">
              Your scanner found 40 things.
              <br />
              <span className="text-muted">Which 3 actually matter?</span>
            </h1>
            <p className="mt-4 max-w-xl text-sm text-muted leading-relaxed">
              Paste a{" "}
              <a
                href="https://github.com/TechwithSaad/Sentinel-Scanner"
                target="_blank"
                className="text-teal underline underline-offset-2"
              >
                Sentinel-Scanner
              </a>{" "}
              SARIF log. AI re-triages every finding for real-world risk,
              explains it in plain English, and tells you what to actually do
              &mdash; because scanner severity labels aren&apos;t risk.
            </p>
          </div>
        </header>

        <section className="rounded-xl border border-panel-line bg-panel/70 p-5">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-panel-line bg-ink/60 px-3.5 py-2 text-sm hover:border-muted transition-colors">
              <UploadCloud className="h-4 w-4" />
              Upload .sarif / .json
              <input
                type="file"
                accept=".json,.sarif,application/json"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
            </label>
            <button
              onClick={loadSample}
              className="inline-flex items-center gap-2 rounded-md border border-panel-line px-3.5 py-2 text-sm text-muted hover:text-fog hover:border-muted transition-colors"
            >
              <FileJson className="h-4 w-4" />
              Try sample scan
            </button>
            {fileName && (
              <span className="text-xs text-muted font-mono-display">loaded: {fileName}</span>
            )}
          </div>

          <textarea
            value={sarifText}
            onChange={(e) => {
              setSarifText(e.target.value);
              setFileName(null);
            }}
            placeholder="...or paste the contents of your SARIF log here"
            rows={7}
            className="w-full resize-y rounded-md border border-panel-line bg-ink/70 px-3.5 py-3 font-mono-display text-xs text-fog/90 placeholder:text-muted focus:outline-none focus:border-teal"
          />

          <div className="mt-4 flex items-center gap-4">
            <button
              onClick={runTriage}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-md bg-amber px-5 py-2.5 text-sm font-medium text-ink hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Triaging findings…
                </>
              ) : (
                "Run AI triage"
              )}
            </button>
            {error && <span className="text-sm text-red">{error}</span>}
          </div>
        </section>

        {result && (
          <section className="mt-10 space-y-6">
            <div className="rounded-xl border border-panel-line bg-panel/70 p-6">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                  <span className="font-mono-display text-xs uppercase tracking-wide text-muted">
                    Overall risk
                  </span>
                  <PriorityBadge priority={result.overallRisk} />
                </div>
                <button
                  onClick={exportMarkdown}
                  className="inline-flex items-center gap-2 rounded-md border border-panel-line px-3 py-1.5 text-xs text-muted hover:text-fog hover:border-muted transition-colors"
                >
                  <Download className="h-3.5 w-3.5" />
                  Export report
                </button>
              </div>
              <p className="text-sm text-fog/90 leading-relaxed">{result.summary}</p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setFilter("ALL")}
                className={`rounded-full px-3.5 py-1.5 text-xs font-mono-display transition-colors ${
                  filter === "ALL" ? "bg-fog text-ink" : "bg-panel text-muted border border-panel-line"
                }`}
              >
                All ({result.triaged.length})
              </button>
              {PRIORITY_ORDER.map((p) => (
                <button
                  key={p}
                  onClick={() => setFilter(p)}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-mono-display transition-colors ${
                    filter === p ? "bg-fog text-ink" : "bg-panel text-muted border border-panel-line"
                  }`}
                >
                  {p} ({counts[p]})
                </button>
              ))}
            </div>

            <div className="space-y-3">
              {filtered.map((f) => (
                <FindingRow key={f.id} finding={f} />
              ))}
            </div>
          </section>
        )}

        <footer className="mt-16 text-xs text-muted font-mono-display">
          Built by Hafiz Saad Tanvir · Sentinel-Scanner + Groq (Llama 3.3)
        </footer>
      </div>
    </main>
  );
}
