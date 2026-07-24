# SentinelTriage

**AI-powered triage for Sentinel-Scanner security findings** — turns a wall of raw scanner output into a short list of what actually matters, explained in plain English, for developers who aren't security specialists.

## a. What it does & the problem it solves

I built and maintain [Sentinel-Scanner](https://github.com/TechwithSaad/Sentinel-Scanner), an open-source Python CLI that scans repos for hardcoded secrets, misconfigurations, and high-entropy strings, and reports them as SARIF 2.1.0. Like most static-analysis tools, it's great at *finding* things and bad at *ranking* them — a scan on a real codebase returns dozens of findings, most of them low-value noise (test fixtures, placeholder tokens, docs), a few genuinely dangerous, and the scanner's built-in severity labels don't reliably tell them apart.

The real problem: a developer who is not a security specialist opens that report, sees 40 "warnings," and has no fast way to know which 3 need fixing today versus which 37 can wait or are false positives — so the report gets ignored.

**SentinelTriage** fixes that. You paste or upload a Sentinel-Scanner SARIF log, and an AI security-engineer persona re-triages every single finding: explains what it actually is in plain language, estimates the real-world blast radius if it's ignored, re-prioritizes it independently of the scanner's own severity label, flags likely false positives, and gives a concrete remediation step. You get an executive summary, a re-ranked list, and an exportable Markdown report.

This is for: developers and small teams using Sentinel-Scanner (or any SARIF-emitting scanner) who need to act on scan output without a dedicated AppSec engineer on staff — which describes most of the teams I work with day to day.

## b. Live URL

**[https://sentinel-triage.vercel.app](https://sentinel-triage.vercel.app)** *(replace with your actual Vercel URL after deploying — see below)*

## c. Features

- Paste a SARIF log directly, or upload a `.sarif`/`.json` file
- "Try sample scan" button — loads a realistic 7-finding sample so anyone can test the app instantly without running the scanner themselves
- AI re-triages **every** finding: plain-English explanation, real-world impact if ignored, concrete remediation step, and a re-ranked priority (Critical / High / Medium / Low) that is independent of the scanner's own severity label
- False-positive likelihood flagging, so obvious noise (test fixtures, doc examples) is called out instead of buried
- Executive summary + overall codebase risk rating
- Filter findings by priority
- One-click export of the full triage as a Markdown report
- Fully responsive, dark "security terminal" UI with keyboard-accessible controls

## d. The AI feature

The AI feature is the core of the app: a Groq-powered triage engine (Llama 3.3 70B) that re-prioritizes and explains scanner output.

**What it does:** takes the raw list of findings parsed from a SARIF log (rule ID, message, file, line, scanner's own severity) and, for each one, returns a plain-English explanation, a real-world-impact statement, a re-ranked priority, a false-positive likelihood estimate, and a remediation step — plus a whole-scan executive summary.

**The system prompt I wrote** (in full, from [`src/app/api/triage/route.ts`](./src/app/api/triage/route.ts)):

```
You are a senior application security engineer who triages raw static-analysis findings for a team of developers who are NOT security specialists. The findings come from Sentinel-Scanner, an open-source DevSecOps CLI that detects hardcoded secrets, misconfigurations, and high-entropy strings, and reports them as SARIF 2.1.0.

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
- Respond with ONLY a single valid JSON object [schema omitted here for brevity — see the source file for the exact shape required]
```

The model is called via Groq's API (free tier, no credit card required, no region restrictions) from a server-side Next.js API route (`/api/triage`), so the API key never reaches the browser.

## e. Tools, services, and AI models used

- **Framework:** Next.js 16 (App Router, TypeScript, Turbopack)
- **Styling:** Tailwind CSS v4
- **AI model:** Llama 3.3 70B via Groq (free tier) — model is configurable via the `GROQ_MODEL` env var
- **Icons:** lucide-react
- **Hosting:** Vercel
- **Built with the help of:** Claude (Anthropic) as a pair-programmer for scaffolding, the SARIF parser, and UI components — the *app itself* calls Groq at runtime for the triage feature

## f. Screenshots

*(Add at least 3 screenshots here after deploying — see checklist below. Suggested shots: the empty input screen, a running/loading state, and the results dashboard with findings expanded.)*

1. `screenshots/01-input-screen.png` — the paste/upload screen with "Try sample scan"
2. `screenshots/02-results-dashboard.png` — triaged findings with priority filters
3. `screenshots/03-finding-detail.png` — a single finding showing plain-English explanation, impact, and remediation

## g. How to run this project

### Run locally

```bash
git clone https://github.com/<your-username>/sentinel-triage.git
cd sentinel-triage
npm install
cp .env.example .env.local
# edit .env.local and set GROQ_API_KEY to a free key from https://console.groq.com/keys
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Click **"Try sample scan"** to test instantly without needing your own SARIF file, or run [Sentinel-Scanner](https://github.com/TechwithSaad/Sentinel-Scanner) on a repo and upload its output.

### Deploy your own copy (Vercel)

1. Push this repo to your own public GitHub account (commands below).
2. Go to [vercel.com/new](https://vercel.com/new), import the repo.
3. In the project's **Environment Variables** settings, add `GROQ_API_KEY` with your free key. Do **not** commit it to the repo.
4. Deploy. Vercel will build and give you a public URL — that's the link for step (b) above.

```bash
git init
git add .
git commit -m "SentinelTriage: AI triage for Sentinel-Scanner findings"
git branch -M main
git remote add origin https://github.com/<your-username>/sentinel-triage.git
git push -u origin main
```

## Project structure

```
src/
  app/
    page.tsx           # main UI: input panel + results dashboard
    layout.tsx
    globals.css
    api/triage/route.ts  # server route: parses SARIF, calls Groq, returns triage JSON
  components/
    PriorityBadge.tsx
    FindingRow.tsx
  lib/
    sarif.ts            # SARIF 2.1.0 parser
    types.ts
public/
  sample-scan.sarif.json # demo data so anyone can try the app without Sentinel-Scanner
```
