# ASO Audit Agent

> **▶ Live demo:** <https://aso-audit-agent-ten.vercel.app/>
> **🎥 Walkthrough video:** <https://www.loom.com/share/40007006b5584297add961367cd842a9>

Paste an Apple App Store URL into a chat, confirm the right app, and the agent runs a 10-dimension ASO audit — pulling iTunes metadata, scraping subtitle/promotional fields, comparing against top-charts competitors, scoring everything with deterministic checks plus one vision-aware LLM pass, and returning a tabbed scorecard with before/after rewrites. Built on Mastra (agents, tools, workflows, skills) + Next.js with a custom-designed score card.

```
You:    https://apps.apple.com/us/app/notion-notes-docs-tasks-ai/id1232780281
Agent:  Got it — confirm below.

[ confirmation card ]                          [ Not this one ] [ Run the audit → ]

  ── streaming progress: fetching → scoring → qualitative → assembling ──

[ score card 68 / 100 · all 10 dimensions ]
[ Quick Wins · High Impact · Strategic (tabbed) ]
[ Competitive position: ChatGPT · Claude · Gemini ]
[ Export ▾ ]   [ Compare with… ▾ ]
```

## Features

- **Paste-to-audit chat** — accept any `apps.apple.com/<country>/app/.../id<digits>` URL, country-aware (queries the right storefront).
- **Human-in-the-loop gate** — the workflow suspends after URL resolution and only runs the heavy audit if the user clicks "Run the audit". Implemented via Mastra's `workflow.suspend()`/`resume()`, exposed as a UI button rather than an agent-callable tool (so the LLM physically can't auto-confirm).
- **Vision-aware qualitative pass** — when `OPENAI_API_KEY` resolves a multimodal model (`gpt-4o*`, `gpt-4.1*`, `gpt-4-turbo*`, `chatgpt-4o*`, `o-series`, `gpt-5*`), the icon and first 3 screenshots are sent as image inputs alongside the deterministic findings, so the qualitative scores cite specific visual details (e.g. "only iPad screenshots provided, no iPhone slots filled"). Falls back to text-only gracefully on non-vision models.
- **Real SSE progress streaming** — the resume endpoint is `text/event-stream`; the chat UI reads the actual workflow stage events (`fetching-listing-data` → `fetching-competitors` → `deterministic` → `qualitative-start` → `qualitative-done` → `aggregating`) instead of cycling fake `setTimeout` labels.
- **Visual context in the report** — score card surfaces the app's average rating + rating count next to its category; a horizontal screenshot strip sits under the card so the analyst can see what they're reading about. **iPad screenshots are used as a fallback** when the listing has none for iPhone (Notion-style listings), labelled so it's never mistaken for an iPhone capture.
- **Side-by-side comparison** — every completed audit is cached in `localStorage` (FIFO, capped at 5). The "Compare with…" picker opens `/compare?a=X&b=Y` with two score cards and a per-dimension delta table.
- **Export to Markdown or PDF** — Markdown is a pure, deterministic serializer (`reportToMarkdown`). PDF uses `window.print()` with a print stylesheet that isolates the audit subtree, forces light-theme tokens, and hides the chat chrome.
- **Offline quality bar** — `npm run eval:audit` runs `@mastra/evals` scorers (faithfulness, answer-relevancy, keyword-coverage) over a fixture suite. Not wired to CI; documented as a local pre-release gate.
- **Graceful unavailable-dimensions** — Apple's public reviews RSS feed has been dead since early 2026; the Ratings dimension scores on numeric data and the qualitative pass flags theme analysis as unavailable rather than hallucinating.

## Quickstart

Requires Node 22.13+ (see `package.json#engines`) and an `OPENAI_API_KEY` (recommended, vision-capable) or a free `NVIDIA_API_KEY`.

```bash
cp .env.example .env       # add one API key
npm install
npm run dev                # http://localhost:3000
```

Other commands:

```bash
npm run typecheck          # tsc --noEmit
npm test                   # vitest run (106 tests across 22 files)
npm run audit:smoke        # full audit pipeline against Spotify, prints to stdout
npm run audit:workflow     # exercise the Mastra workflow suspend/resume directly
npm run eval:audit         # offline LLM-evals scoreboard (costs ~$0.20)
npm run mastra:dev         # Mastra Studio at localhost:4111 for trace inspection
```

## Architecture

Four layers, top to bottom. Each layer talks only to the one directly below it — the chat doesn't know about iTunes, the audit engine doesn't know about HTTP, the data layer doesn't know about Mastra. That separation is what makes any one piece replaceable without touching the rest.

```
┌─ Layer 1 · Chat UI                        (app/, components/) ┐
│                                                                │
│  page.tsx            chat UI (useChat from @ai-sdk/react)      │
│  api/chat            streams the Mastra agent (v6 chunks)      │
│  api/audit/resume    SSE — resumes the workflow + streams      │
│                      real stage events to the client           │
│  compare/page.tsx    side-by-side comparison view              │
│                                                                │
└──────────────────────────┬─────────────────────────────────────┘
                           │
┌─ Layer 2 · Mastra primitives                 (src/mastra/) ────┐
│                                                                │
│  Agent: asoAuditAgent                                          │
│    └─ tool: start-audit                                        │
│        creates a workflow run, lets it suspend, returns        │
│        runId + candidate app for UI confirmation               │
│                                                                │
│  Workflow: asoAuditWorkflow                                    │
│    1. identify-candidate     parse URL → iTunes lookup         │
│    2. confirm-and-audit      suspend; on resume run the        │
│                              audit + emit progress events      │
│                                                                │
│  Skill: skills/aso-audit-rubric/SKILL.md                       │
│    The ASO rubric (dimensions, weights, style guarantees).     │
│    Loaded into the qualitative LLM call at runtime —           │
│    single source of truth, no string duplication.              │
│                                                                │
│  Storage: LibSQL (file: ./mastra.db; Turso URL on Vercel)      │
│  Observability: DuckDB (dev only) / disabled on Vercel         │
│                                                                │
└──────────────────────────┬─────────────────────────────────────┘
                           │
┌─ Layer 3 · Audit engine                       (src/audit/) ────┐
│                                                                │
│  runAudit(input)                                               │
│    deterministic/    10 pure functions, one per dimension      │
│    qualitative.ts    ONE generateObject call with images +     │
│                      Zod-validated structured output           │
│    score.ts          weighted aggregator → 0-100               │
│                      (unavailable dims excluded from denom)    │
│                                                                │
└──────────────────────────┬─────────────────────────────────────┘
                           │
┌─ Layer 4 · Data                                 (src/lib/) ────┐
│                                                                │
│  itunes/lookup       iTunes Lookup API (app + competitors)     │
│  itunes/reviews      Reviews RSS (graceful empty)              │
│  itunes/top-charts   Top Charts RSS (genreId)                  │
│  scrape/listing      cheerio scrape of the App Store HTML      │
│                      page for subtitle + promotional + video   │
│  parse-app-url       URL parser (country, app id, slug)        │
│  llm                 NIM/OpenAI provider resolver +            │
│                      vision-capability detection               │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

## Audit flow

```
 user                   chat UI                Mastra Agent          Workflow              audit engine
  │                        │                       │                    │                       │
  │ paste URL              │                       │                    │                       │
  ├───────────────────────►│                       │                    │                       │
  │                        │ POST /api/chat        │                    │                       │
  │                        ├──────────────────────►│                    │                       │
  │                        │                       │ start-audit tool   │                       │
  │                        │                       ├───────────────────►│                       │
  │                        │                       │                    │ step 1: identify      │
  │                        │                       │                    │   iTunes lookup       │
  │                        │                       │                    │ step 2: suspend()     │
  │                        │                       │  runId + candidate │                       │
  │                        │   tool result         │◄───────────────────┤                       │
  │                        │◄──────────────────────┤                    │                       │
  │  confirmation card     │                       │                    │                       │
  │◄───────────────────────┤                       │                    │                       │
  │                        │                       │                    │                       │
  │ click "Run the audit"  │                       │                    │                       │
  ├───────────────────────►│                       │                    │                       │
  │                        │ POST /api/audit/resume (SSE)               │                       │
  │                        ├────────────────────────────────────────────►                       │
  │                        │                                            │ resume()              │
  │                        │  data: {stage:"fetching-listing-data"}     │ Promise.all(          │
  │                        │◄─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ │   scrape, reviews,    │
  │                        │  data: {stage:"fetching-competitors"}      │   top-charts)         │
  │                        │◄─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ │                       │
  │                        │  data: {stage:"deterministic"}             │ runAudit(input) ─────►│
  │                        │◄─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ │  deterministic checks │
  │                        │  data: {stage:"qualitative-start"}         │  LLM call (vision)    │
  │                        │◄─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ │                       │
  │                        │  data: {stage:"qualitative-done"}          │                       │
  │                        │◄─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ │                       │
  │                        │  data: {stage:"aggregating"}               │  weighted aggregate   │
  │                        │◄─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ │                       │
  │                        │  data: {type:"completed", report:{...}}    │                       │
  │                        │◄────────────────────────────────────────────                       │
  │  score card + recs     │                                                                    │
  │◄───────────────────────┤                                                                    │
  │                        │  add report to localStorage                                        │
```

## Audit dimensions

10 dimensions, weighted to a 0–100 overall. Unavailable dimensions are excluded from the denominator rather than counted as zero.

| Dimension          | Weight | What's deterministic                                | What the LLM judges                   |
| ------------------ | -----: | --------------------------------------------------- | ------------------------------------- |
| Title (30 ch)      | 18%    | utilization, brand-only, stuffing                   | brand/keyword balance, naturalness    |
| Subtitle (30 ch)   | 14%    | utilization, dedup vs title                         | benefit framing                       |
| Keyword field      | 14%    | inferred from title+subtitle tokens vs description  | (deterministic only)                  |
| Description        | 10%    | length, first-170-chars hook, CTA + social proof    | hook quality, benefit framing         |
| Screenshots        | 14%    | slot count, iPad presence, preview video presence   | visual cohesion, value-prop on first 2 (vision) |
| Preview video      |  4%    | existence                                           | hook strength (when vision available) |
| Ratings & reviews  | 14%    | avg rating, count, release recency                  | review themes (when RSS available)    |
| Icon               |  4%    | URL presence                                        | distinctiveness, legibility (vision)  |
| Conversion signals |  4%    | promo text, What's New length, recency              | informativeness                       |
| Competitive        |  4%    | keyword overlap with top 3, rating gap              | qualitative positioning               |

Every recommendation cites specific evidence ("Title is 'Spotify' — 7/30 chars, 0 keywords") and includes a before/after for text rewrites where applicable.

## File structure

```
aso-audit-agent/
├── app/                          Next.js App Router
│   ├── page.tsx                  chat page (empty state + Recent audits)
│   ├── compare/page.tsx          /compare?a=…&b=… side-by-side view
│   ├── api/chat/route.ts         Mastra agent streamed via @mastra/ai-sdk
│   ├── api/audit/resume/route.ts SSE — resumes workflow + streams progress
│   ├── layout.tsx · globals.css  Tailwind v4 theme + print stylesheet
│
├── components/
│   ├── chat/                     Composer, Message (tool-part renderer)
│   └── audit/                    ScoreCard, AuditReportView,
│                                 RecommendationList, CompetitorTable,
│                                 AppConfirmationCard (SSE reader),
│                                 ReportActions (Compare + Export menus),
│                                 CompareView, RecentAuditsList
│
├── src/
│   ├── mastra/
│   │   ├── index.ts              Mastra instance (env-conditional storage)
│   │   ├── agents/aso-audit-agent.ts
│   │   ├── workflows/aso-audit-workflow.ts    suspend/resume + emits progress
│   │   ├── tools/audit-control.ts             only `start-audit` is wired
│   │   ├── progress-emitter.ts                module-scoped runId → listener map
│   │   ├── skills.ts                          loads SKILL.md content
│   │
│   ├── audit/
│   │   ├── types.ts              Dimension union, weights, Zod recommendation schema
│   │   ├── dimension-labels.ts   one source of truth for human-readable names
│   │   ├── inputs.ts             builders for AuditInput from upstream sources
│   │   ├── run.ts                runAudit() driver
│   │   ├── score.ts              weighted aggregator + recommendation bucketing
│   │   ├── qualitative.ts        the ONE LLM call (multimodal when supported)
│   │   ├── text.ts               tokenize / keywordTokens / jaccardOverlap
│   │   ├── compare.ts            diffReports() for the /compare view
│   │   ├── export-markdown.ts    deterministic Markdown serializer
│   │   ├── deterministic/        10 pure per-dimension scorers (+ tests)
│   │   ├── eval/scorers.ts       @mastra/evals wrapper used by eval:audit
│   │   ├── __fixtures__/         shared test builders
│   │
│   ├── lib/
│   │   ├── parse-app-url.ts
│   │   ├── llm.ts                provider resolver + vision detection
│   │   ├── recent-audits-storage.ts   pure localStorage layer
│   │   ├── itunes/               lookup, reviews, top-charts
│   │   └── scrape/listing.ts     cheerio scrape of the listing page
│   │
│   └── hooks/use-recent-audits.ts  useSyncExternalStore wrapper
│
├── skills/aso-audit-rubric/SKILL.md      the audit rubric (source of truth)
├── scripts/                              CLI: smoke-audit, smoke-workflow, eval-audit
└── .github/workflows/ci.yml              typecheck · test · build
```

## Design decisions

**Hybrid scoring (deterministic + LLM), not pure LLM.** Char counts, presence checks, token overlap, ratings averages are all in code. The LLM is called exactly once per audit with the deterministic findings as context, and its job is the qualitative layer only: score the three visual dimensions, extract review themes, and propose rewrites with explicit before/after. One LLM call per audit instead of ten; scores stable across runs; deterministic logic unit-testable in isolation; the agent isn't doing arithmetic.

**HITL via workflow suspend/resume, not an agent tool.** Mastra workflows have first-class `suspend()`/`resume()`. The agent's `start-audit` tool creates a run, lets it suspend, and returns the suspended state. The confirmation card POSTs directly to `/api/audit/resume` on click — the agent never sees a `resumeAuditTool`, so it physically can't auto-confirm. An earlier draft had both tools on the agent; the LLM greedily chained `start → resume` in one turn, defeating the gate. Approval-as-UI-gate is the cleaner separation.

**Vision is opt-in via the model id, not a separate code path.** `getAuditModel()` inspects the configured model id and sets a `supportsVision` flag. When true, the single `generateObject` call attaches the icon + first 3 screenshots as image content parts. When false, the system prompt instructs the model to return `null` with `"vision skipped"` as the reasoning, and `mergeQualitative` preserves the deterministic score instead of blanking it.

**Real SSE progress, not a fake `setTimeout` loop.** A module-scoped emitter keyed by `runId` lets the workflow step push events from inside `execute()`; the `/api/audit/resume` route subscribes to that emitter for the lifetime of one request and writes each event as a `data:` SSE frame. The UI's progress bar advances on real stage transitions.

**Skills as the rubric's source of truth.** `skills/aso-audit-rubric/SKILL.md` is loaded at runtime and prepended to the qualitative LLM call's system prompt. The brief specifically called out "agents, tools, workflows, and skills" — this puts the rubric where it belongs idiomatically (instructional knowledge, fixed structure, single edit point).

**iTunes JSON endpoints + one HTML scrape, no Firecrawl.** iTunes Lookup, Reviews RSS, and Top-Charts RSS cover ~80% of the audit data. The remaining 20% (subtitle, promotional text, preview video URL) is a single static fetch of the App Store HTML with cheerio. Firecrawl was on the recommended-tools list but adds a paid dependency, latency, and reviewer signup friction for zero additional data.

**Customer Reviews RSS is dead and we say so.** Verified Q1 2026: `itunes.apple.com/{cc}/rss/customerreviews/...` returns empty across every storefront and URL variant. The Ratings dimension scores on numeric signals only (avg rating + count + release recency) and surfaces this explicitly in its evidence: *"Apple's public Customer Reviews RSS feed returned no entries — review-text theme analysis is unavailable."* Pretending the feed works would be dishonest output.

**Custom Tailwind UI instead of AI Elements / shadcn.** AI Elements' CLI is interactive and pulls in the full Radix/shadcn surface. For this scope a small Tailwind composition (chat bubbles, composer, confirmation card, score card) ships less unused code and lets the score card be designed deliberately.

**Audit run lives in the workflow, not the agent.** The agent is intentionally narrow: one tool, four short instructions. All parallel I/O (scrape + reviews + top-charts + competitor lookups) is `Promise.all` inside the workflow's `confirm-and-audit` step. Mastra's `parallel(...)` workflow combinator was considered but forces shape transformation between branches that costs more code than it earns at this scope.

## Deploy

Vercel-ready. Local dev uses a SQLite file (`./mastra.db`); production uses Turso (hosted libsql).

```bash
npm i -g vercel
vercel deploy
```

Required env vars in the Vercel project:

| Variable               | Required on Vercel | Notes |
| ---------------------- | ------------------ | ----- |
| `OPENAI_API_KEY`       | yes (or NIM key)   | vision-capable by default (`gpt-4o-mini`) |
| `TURSO_DATABASE_URL`   | yes                | create at https://turso.tech (generous free tier) |
| `TURSO_AUTH_TOKEN`     | yes                | from the same Turso dashboard |
| `ASO_AUDIT_MODEL`      | no                 | override the model used by the **qualitative audit pass** (`src/lib/llm.ts`) |
| `ASO_AGENT_MODEL`      | no                 | override the model used by the **chat agent** (`src/mastra/agents/aso-audit-agent.ts`); accepts a `provider/model-id` string e.g. `openai/gpt-4o-mini` |

DuckDB observability is **dynamically imported** only off-Vercel. The static `import { DuckDBStore }` was removed because Vercel resolves external modules at runtime and `libduckdb.so` is not on the Vercel image — a static import would 500 every server route at module-init time even on code paths that never instantiate DuckDB. Now `await import('@mastra/duckdb')` runs only when `process.env.VERCEL` is unset (or `DISABLE_OBSERVABILITY_STORE=1`), so DuckDB stays entirely out of the production runtime graph. Local dev still gets traces in Mastra Studio.

## Quality bar

`npm run eval:audit` exercises the full pipeline on a small fixture suite (Spotify, Notion, Headspace) and scores each generated recommendation with three `@mastra/evals` scorers:

- **faithfulness** (LLM) — is the rec grounded in the deterministic evidence the model was shown?
- **answer-relevancy** (LLM) — does it actually address the dimension it's tagged with?
- **keyword-coverage** (code) — does the rec text mention the same key terms as the evidence?

Output is a per-row table with averages. Hard-fails (exits non-zero) if any rec scores below 0.5 on either LLM judge. Not wired to CI — each run is ~30 extra LLM calls and costs real money; treat it as a local pre-release gate.

## Tests

```bash
npm test                # 106 tests across 22 files (vitest run)
npm run typecheck       # tsc --noEmit
npm run build           # next build (also runs in CI)
```

Coverage emphasis is on the deterministic audit engine (10 dimension scorers + run integration + score aggregator + comparison + markdown export) and pure infra modules (URL parser, listing HTML parser, recent-audits storage, progress emitter, skill loader). React components are not unit-tested — the audit flow is verified via a browser smoke test of the dev server.

## Known limitations

- **Customer reviews:** Apple's public RSS feed returns empty (see Design decisions). The Ratings dimension scores on numeric data only.
- **Vision quality:** judged on the icon + first 3 screenshots. Later screenshots don't affect the score; not a hard limit, just a cost/attention tradeoff.
- **Promotional text + preview video URL:** scraped best-effort from the App Store HTML; both fields fall back to `null` if Apple's React-rendered DOM doesn't expose them, and the audit notes "not detected" instead of failing.
- **No persistent user state:** every chat session is fresh. Recent audits are cached client-side in localStorage (capped at 5) for the Recent picker + comparison view; nothing is shared across browsers.
