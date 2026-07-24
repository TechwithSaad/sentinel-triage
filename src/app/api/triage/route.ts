import { NextRequest, NextResponse } from "next/server";
import { parseSarif } from "@/lib/sarif";
import { TriageResponse } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

// ---------------------------------------------------------------------------
// This is the system prompt behind the AI feature. It is written to turn a
// pile of raw Sentinel-Scanner findings (secrets, misconfigurations, entropy
// hits) into something a developer who has never done a security review can
// actually act on: what it means, whether it's real, and what to do first.
// ---------------------------------------------------------------------------
const SYSTEM_PROMPT = `You are a senior application security engineer who triages raw static-analysis findings for a team of developers who are NOT security specialists. The findings come from Sentinel-Scanner, an open-source DevSecOps CLI that detects hardcoded secrets, misconfigurations, and high-entropy strings, and reports them as SARIF 2.1.0.

Your job is to re-triage the raw list, because scanners over-report and rank everything roughly the same. For EVERY finding you are given, produce:

1. "plainEnglish": a 1-2 sentence explanation of what the finding actually is, written for someone who has never heard of the specific rule ID. No jargon without explaining it.
2. "realWorldImpact": a 1-2 sentence explanation of what could actually go wrong if this is real and left unfixed (be concrete: what could an attacker do, what would be exposed).
3. "priority": one of CRITICAL, HIGH, MEDIUM, LOW — based on real-world exploitability and blast radius, NOT the scanner's original severity label. A hardcoded live-looking API key is CRITICAL even if the scanner called it "warning". A low-entropy string that's probably a false positive is LOW even if the scanner called it "error".
4. "falsePositiveLikelihood": LOW, MEDIUM, or HIGH — your honest estimate of whether this is likely a false positive (test fixtures, example configs, placeholder values, documentation), based on the file path and message content.
5. "remediation": concrete next step(s) a developer can take right now (e.g. "rotate this key, move it to an environment variable, add the file to .gitignore"). Be specific to the finding, not generic advice.

Also produce:
- "summary": a 2-3 sentence plain-English executive summary of the whole scan for someone who has 30 seconds — what's the overall state, and what needs attention first.
- "overallRisk": CRITICAL, HIGH, MEDIUM, or LOW for the codebase as a whole.

Rules:
- Re-rank independently of the scanner's original severity. Your priority field is the whole point of this tool — don't just copy the input severity across.
- Never invent details that aren't supported by the file path, rule ID, or message text you were given.
- Respond with ONLY a single valid JSON object matching this exact shape, no markdown fences, no commentary before or after:

{
  "summary": string,
  "overallRisk": "CRITICAL" | "HIGH" | "MEDIUM" | "LOW",
  "triaged": [
    {
      "id": string,
      "priority": "CRITICAL" | "HIGH" | "MEDIUM" | "LOW",
      "plainEnglish": string,
      "realWorldImpact": string,
      "remediation": string,
      "falsePositiveLikelihood": "LOW" | "MEDIUM" | "HIGH"
    }
  ]
}

The "id" field for each triaged finding MUST exactly match the "id" given to you in the input so results can be matched back up.`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const sarifText: string | undefined = body?.sarif;

    if (!sarifText || typeof sarifText !== "string") {
      return NextResponse.json(
        { error: "Missing 'sarif' field with the SARIF log text." },
        { status: 400 }
      );
    }

    const findings = parseSarif(sarifText);

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json(
        {
          error:
            "Server is missing GROQ_API_KEY. Get a free key at https://console.groq.com/keys and set it in your hosting provider's environment variables.",
        },
        { status: 500 }
      );
    }

    const model = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

    const userPayload = findings.map((f) => ({
      id: f.id,
      ruleId: f.ruleId,
      message: f.message,
      file: f.file,
      line: f.line,
      originalSeverity: f.originalSeverity,
    }));

    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: `Here are ${userPayload.length} raw findings from a Sentinel-Scanner SARIF run. Triage all of them.\n\n${JSON.stringify(
              userPayload,
              null,
              2
            )}`,
          },
        ],
      }),
    });

    if (!groqRes.ok) {
      const errBody = await groqRes.text();
      throw new Error(`Groq API error (${groqRes.status}): ${errBody.slice(0, 300)}`);
    }

    const groqData = await groqRes.json();
    const text: string | undefined = groqData?.choices?.[0]?.message?.content;

    if (!text) {
      throw new Error("Groq returned no text content.");
    }

    let parsed: { summary: string; overallRisk: string; triaged: Array<Record<string, unknown>> };
    try {
      const cleaned = text.trim().replace(/^```json\s*|```$/g, "");
      parsed = JSON.parse(cleaned);
    } catch {
      throw new Error("Could not parse the model's response as JSON.");
    }

    const triagedById = new Map(parsed.triaged.map((t) => [t.id as string, t]));

    const result: TriageResponse = {
      summary: parsed.summary,
      overallRisk: parsed.overallRisk as TriageResponse["overallRisk"],
      triaged: findings.map((f) => {
        const t = triagedById.get(f.id) ?? {};
        return {
          ...f,
          priority: (t.priority as TriageResponse["overallRisk"]) ?? "MEDIUM",
          plainEnglish: (t.plainEnglish as string) ?? "No explanation returned.",
          realWorldImpact: (t.realWorldImpact as string) ?? "Unknown.",
          remediation: (t.remediation as string) ?? "Review manually.",
          falsePositiveLikelihood:
            (t.falsePositiveLikelihood as "LOW" | "MEDIUM" | "HIGH") ?? "MEDIUM",
        };
      }),
    };

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
