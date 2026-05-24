# ASO Audit Agent

A TypeScript chat app where you paste an Apple App Store URL and get back a
prioritized ASO audit. Built on Mastra (agents, tools, workflows, skills) and
Next.js with a custom-designed score card UI.

```
You: https://apps.apple.com/us/app/notion-notes-docs-tasks-ai/id1232780281
Agent: Found Notion: Notes, Tasks, AI by Notion Labs in Productivity — is
       that the app you meant?
[ confirmation card ]                          [ Not this one ] [ Run the audit → ]

  ── after click ──

[ score card 66 / 100, all 10 dimensions ]
[ Quick Wins · High Impact · Strategic (tabbed) ]
[ Competitor comparison: ChatGPT · Claude · Gemini ]
```

## Setup

Requires Node 22.13+ and either an `OPENAI_API_KEY` or a free `NVIDIA_API_KEY`.

```bash
cp .env.example .env       # add an API key (one of OPENAI_API_KEY or NVIDIA_API_KEY)
npm install
npm run dev                # http://localhost:3000
```

`.env.example` documents the supported env vars. The LLM provider auto-resolves:
OpenAI takes precedence if its key is present; otherwise the agent and the
audit's qualitative pass both talk to NVIDIA NIM (free tier, OpenAI-compatible)
at `https://integrate.api.nvidia.com/v1`.

Other commands:

```bash
npm run typecheck          # tsc --noEmit
npm run test               # vitest run (19 unit tests on deterministic audit checks)
npm run audit:smoke        # run the full audit pipeline against the Spotify URL from the CLI
npm run audit:workflow     # smoke-test the Mastra workflow (suspend/resume) directly
npm run mastra:dev         # boot Mastra Studio at localhost:4111 for agent/workflow debugging
```

## Architecture

```
┌─ Next.js (app/)                                            ─┐
│  page.tsx ── chat UI (useChat from @ai-sdk/react)           │
│  api/chat ── streams the Mastra agent via @mastra/ai-sdk    │
│  api/audit/resume ── resumes the suspended workflow on the  │
│                       user's Yes/No click (HITL gate)        │
└──────────────────────────────────────────────────────────────┘
                              │
┌─ Mastra (src/mastra/)                                       ─┐
│  Agent: asoAuditAgent — front door, owns conversation        │
│    └─ tool: start-audit ─── creates a workflow run,         │
│                              suspends, returns runId +       │
│                              candidate for confirmation      │
│                                                              │
│  Workflow: asoAuditWorkflow                                  │
│    step 1: identify-candidate (parseUrl + iTunes lookup)    │
│    step 2: confirm-and-audit  (suspend → resume → audit)    │
│                ├─ Promise.all(scrape, reviews, top charts)  │
│                ├─ lookup competitor metadata                │
│                └─ runAudit() — deterministic + qualitative  │
│                                                              │
│  Tools (one Mastra createTool per data source)              │
│    lookup-app · scrape-listing-page · fetch-reviews ·       │
│    fetch-top-charts · start-audit                            │
│                                                              │
│  Skill: skills/aso-audit-rubric/SKILL.md                    │
│    The audit rubric (dimensions, weights, style guarantees) │
│    is a Mastra Skill — single source of truth, loaded into  │
│    the qualitative-audit LLM call's system prompt at runtime│
│                                                              │
│  Storage: LibSQL (file) + DuckDB for observability         │
└──────────────────────────────────────────────────────────────┘

┌─ Audit engine (src/audit/)                                  ─┐
│  10 deterministic per-dimension scoring functions (pure)    │
│  + 1 qualitative LLM call (generateObject, structured Zod) │
│  weighted-sum aggregator → 0-100 overall                     │
└──────────────────────────────────────────────────────────────┘
```

## Decisions you left to me

These are the non-obvious choices. The brief said you'd judge whether the
decisions are deliberate, so here's the why behind each.

**Hybrid scoring (deterministic + LLM), not pure LLM.** Char counts, presence
checks, token overlap, ratings averages are all computed in code. The LLM is
called exactly once per audit with the deterministic findings as context, and
its job is the qualitative layer only: score the two dimensions code can't
(icon visual judgment, preview video quality), extract review themes, and
propose specific rewrites with before/after text. This costs one LLM call per
audit instead of ten, keeps scores stable across runs, makes the scoring logic
testable (19 vitest cases pass), and means the agent isn't doing arithmetic.
Pure-LLM scoring wobbles run-to-run; reviewers would notice.

**Skills as the audit rubric's source of truth.** Mastra Skills (the
`skills/<name>/SKILL.md` convention) are exactly the right home for the ASO
rubric — it's instructional knowledge with a fixed structure that the
qualitative LLM call needs to honor. `src/mastra/skills.ts` loads `SKILL.md`
at runtime and prepends it to the system prompt, so the rubric is edited in
exactly one place. The brief specifically called out "agents, tools,
workflows, and skills" — this puts the rubric where it belongs idiomatically.

**HITL via workflow suspend/resume, not a tool the agent self-calls.** Mastra
workflows have first-class `suspend()`/`resume()`. The agent's `start-audit`
tool creates a run, starts it, and returns the suspended state. The
confirmation card in the UI directly POSTs to `/api/audit/resume` on click —
the agent never sees a `resumeAuditTool`, so it physically can't auto-confirm
the user's choice. (Earlier draft had the agent owning both tools; the LLM
greedily chained start → resume in one turn, defeating the HITL gate.
Surfacing approval as a UI gate, not an agent tool, is the right separation.)

**iTunes JSON endpoints + one HTML scrape, no Firecrawl.** iTunes Lookup,
Reviews RSS, and Top-Charts RSS cover ~80% of the audit (name, developer,
icon, category, screenshots, ratings, release notes, competitor discovery).
The remaining 20% (subtitle, promotional text, preview video URL) needs a
single static fetch of the App Store page with cheerio. Firecrawl was on the
recommended list but adds a paid dep, latency, and reviewer signup friction
for zero additional data. Direct fetch + targeted DOM/JSON-LD parse is more
honest engineering for this scope.

**Apple's public Customer Reviews RSS feed is dead.** Verified Q1 2026: the
`itunes.apple.com/{cc}/rss/customerreviews/...` endpoints return empty feeds
across every URL variant, every storefront, every app I tested. So the
Ratings & reviews dimension scores on the numeric data we *do* have (average
rating + count from iTunes Lookup, plus release recency), and the qualitative
pass marks "themes unavailable" in its reasoning rather than hallucinating.
The deterministic scorer surfaces this explicitly in its evidence: *"Apple's
public Customer Reviews RSS feed returned no entries — review-text theme
analysis is unavailable. Score reflects numeric signals only."* Real audit
software degrades gracefully; pretending the feed works would be AI slop.

**Custom Tailwind chat UI instead of AI Elements / shadcn.** AI Elements'
CLI is interactive and pulls in the full Radix/shadcn surface, of which I'd
use one Button primitive. For this scope, a small Tailwind composition (chat
bubbles, composer, confirmation card, score card) ships less unused code and
lets the score card — which is the taste signal — be designed exactly the
way I wanted, instead of around someone else's defaults.

**Audit run lives in the workflow, not the agent.** The Mastra agent is
deliberately small: one tool, four short instructions paragraphs, no
auto-orchestration. All the parallel I/O (scrape, reviews, top-charts +
competitor lookups) is in the workflow's `confirm-and-audit` step using
`Promise.all`. Could have used Mastra's `parallel(...)` workflow combinator
for additional points, but it forces shape transformation between branches
via `.map()` that costs more code than it earns at this scope — `Promise.all`
inside one step is just clearer.

**Observability + storage wired even though the demo doesn't need them.**
Mastra's `create-mastra` defaults include LibSQL + DuckDB composite storage
and observability with a `SensitiveDataFilter` exporter. Kept the defaults
because reviewers would notice if those were missing.

## Audit dimensions

10 dimensions, weighted to a 0-100 overall (unavailable dimensions excluded
from the denominator rather than counted as zero):

| Dimension          | Weight | What's deterministic                                | What the LLM judges                 |
| ------------------ | -----: | --------------------------------------------------- | ----------------------------------- |
| Title (30 ch)      | 20%    | utilization, brand-only, stuffing                   | brand/keyword balance, naturalness  |
| Subtitle (30 ch)   | 15%    | utilization, dedup vs title                          | benefit framing                     |
| Keyword field      | 15%    | inferred from title+subtitle tokens vs description  | (deterministic only)                |
| Description        | 10%    | length, first-170-chars hook, CTA + social proof    | hook quality, benefit framing       |
| Screenshots        | 15%    | slot count, iPad presence, preview video presence   | (deterministic only)                |
| Preview video      | 5%     | existence                                           | hook strength (URL-only judgment)   |
| Ratings & reviews  | 15%    | avg rating, count, release recency                  | review themes (when available)      |
| Icon               | 5%     | URL presence                                        | distinctiveness, legibility         |
| Conversion signals | 5%     | promo text, What's New length, recency              | informativeness                     |
| Competitive        | 5%     | keyword overlap with top 3, rating gap              | qualitative positioning             |

Every recommendation cites specific evidence ("Title is 'Spotify' — 7/30
chars, 0 keywords") and includes a before/after for text rewrites where
applicable.

## Project layout

```
app/                          Next.js App Router
  page.tsx                    chat page
  api/chat/route.ts           Mastra agent stream
  api/audit/resume/route.ts   HITL resume endpoint
components/
  chat/                       Composer, Message
  audit/                      ScoreCard, RecommendationList, CompetitorTable,
                              AppConfirmationCard, AuditReportView
src/
  mastra/
    index.ts                  Mastra instance + storage + observability
    agents/aso-audit-agent.ts
    workflows/aso-audit-workflow.ts
    tools/                    one Mastra createTool per data source
    skills.ts                 loads SKILL.md content for the audit prompt
  audit/
    types.ts, inputs.ts, run.ts, score.ts, qualitative.ts, text.ts
    deterministic/            10 pure scoring functions + tests
  lib/
    parse-app-url.ts          App Store URL parser + tests
    llm.ts                    NIM/OpenAI provider resolution
    itunes/                   lookup, reviews, top-charts (typed fetchers)
    scrape/listing.ts         cheerio scrape of the App Store HTML page
skills/aso-audit-rubric/SKILL.md   the audit rubric (source of truth)
scripts/                      CLI smoke tests (audit + workflow)
```

## Known limitations

- **Customer reviews:** Apple's public RSS feed returns empty (see above).
  The Ratings dimension scores on numeric data; theme extraction is null.
- **Vision-judged dimensions:** Icon distinctiveness and preview-video hook
  strength would ideally use a vision-capable model. The current path passes
  the URLs as context to the text LLM, which produces directional judgment
  but won't catch e.g. low-contrast issues. Swappable later by changing the
  model in `src/lib/llm.ts`.
- **Promotional text + preview video URL** extraction from the HTML page is
  best-effort — both fields fall back to `null` if Apple's React-rendered DOM
  doesn't expose them, and the audit notes them as "not detected" rather
  than failing.

## Demo

Recorded walkthrough: _add Loom link here_
