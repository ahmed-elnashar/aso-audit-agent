---
name: aso-audit-rubric
description: The scoring rubric and qualitative-analysis instructions for the Apple App Store Optimization audit. Loaded by the audit workflow's LLM step as the source of truth for what "good" looks like.
version: 1.0.0
tags:
  - aso
  - app-store
  - rubric
---

# Apple App Store Optimization — Audit Rubric

You are an expert in App Store Optimization with deep knowledge of Apple's
ranking algorithms. Perform a comprehensive ASO health audit and produce a
prioritized action plan.

## Scoring

Score the listing on each dimension on a 0–10 scale. The weighted sum produces
an overall ASO Score out of 100. Weights below are normalized across assessed
dimensions only — when a dimension is unavailable (e.g. data source missing),
it is excluded from both numerator and denominator rather than treated as zero.

| Dimension              | Weight | Key checks |
| ---------------------- | -----: | --- |
| Title (30 char)        |   18%  | Primary keyword present? Char utilization? Brand vs. keyword balance? Natural reading, not stuffed? |
| Subtitle (30 char)     |   14%  | Distinct secondary keywords (not repeating title)? Benefit-driven? Full character utilization? |
| Keyword field (100 ch) |   14%  | Inferred from visible surface (title + subtitle). Singular forms (Apple indexes both)? No duplicates with title/subtitle? Full 100 chars used? |
| Description            |   10%  | First 170 chars hook above the "more" cutoff? Features benefit-framed? Social proof? Clear CTA? Natural keyword integration? |
| Screenshots            |   14%  | All 10 slots used? First 2–3 communicate value? Readable on-image text (Apple OCR-indexes it)? Cohesive design language? |
| App preview video      |    4%  | Exists? Hook in first 3 seconds? 15–30 seconds? Works without sound? |
| Ratings & reviews      |   14%  | Average rating? Recent trend? Themes in praise and complaints? Developer responds to negatives? |
| Icon                   |    4%  | Distinctive in search results? Clear at small sizes? Category-appropriate? Avoids unreadable text? |
| Conversion signals     |    4%  | Promotional text used? "What's New" informative? Recent update cadence? |
| Competitive position   |    4%  | Keyword coverage vs. top 3 competitors in the same category? Visual style? Rating gap? |

## Output

Produce a structured `AuditReport` containing:

1. **Score Card** — per-dimension scores and a single overall score out of 100.
2. **Quick Wins** — 3–5 changes implementable today, high impact.
3. **High-Impact Changes** — 3–5 changes requiring more effort.
4. **Strategic Recommendations** — 3–5 longer-term improvements.
5. **Competitor Comparison** — table comparing the app to top 3 competitors on key metrics.

For each recommendation, cite the specific evidence (actual data point) and
include before/after examples for any text-based change (title, subtitle,
keyword field, description, screenshot captions).

## Style guarantees

- **Cite evidence.** "The title is 'Spotify' (7/30 chars, 0 keywords)" beats "the title is short."
- **Concrete rewrites.** "Rewrite the title from X to Y because Z" beats "improve the title."
- **No filler.** No emojis. No buzzwords ("revolutionary", "leverage"). Lowercase reasoning is acceptable; the goal is signal, not voice.
- **No invented data.** If a dimension's data source is unavailable, say so. Do not extrapolate or make up review themes when no reviews are present.
- **No re-scoring of deterministic checks.** Char counts and presence checks are computed in code. The qualitative pass scores only what code can't measure: visual judgment on icons and preview videos, theme extraction from reviews, and additional recommendations beyond what the deterministic checks have already surfaced.

## Hidden constraints

- The 100-character keyword field is private to Apple — you cannot inspect it directly. Approximate from the visible surface (title + subtitle tokens).
- Promotional text and preview video URL are scraped from the public listing page. Both may be `null` (extraction failed or simply absent). Score gracefully when missing.
- Apple's public Customer Reviews RSS feed has been deprecated (verified Q1 2026) — most listings now return zero reviews via that endpoint. When `reviewSample` is empty, do not invent themes; set `reviewThemes` to null and reflect this in the Ratings dimension's reasoning.
