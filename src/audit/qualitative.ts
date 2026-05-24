import { z } from 'zod';
import { generateObject } from 'ai';
import { getAuditModel } from '../lib/llm';
import { loadAsoAuditRubric } from '../mastra/skills';
import type { AuditInput } from './inputs';
import { RecommendationSchema, type DimensionResult, type Recommendation } from './types';

const QualitativeOutputSchema = z.object({
  qualitativeScores: z.object({
    icon: z
      .object({
        score: z.number().min(0).max(10).nullable(),
        reasoning: z.string(),
      })
      .nullable(),
    previewVideo: z
      .object({
        score: z.number().min(0).max(10).nullable(),
        reasoning: z.string(),
      })
      .nullable(),
  }),
  reviewThemes: z
    .object({
      praise: z.array(z.string()).max(5),
      complaints: z.array(z.string()).max(5),
    })
    .nullable(),
  additionalRecommendations: z.array(RecommendationSchema).max(8),
});

export type QualitativeOutput = z.infer<typeof QualitativeOutputSchema>;

function buildSystemPrompt(): string {
  return `${loadAsoAuditRubric()}

---

You are running the qualitative pass of the rubric above. Deterministic
findings (char counts, presence checks, token overlap, ratings averages) have
already been computed and will be provided in the user message. Your job is:

1. Score the two visual dimensions (\`icon\`, \`previewVideo\`) using the URLs
   and surrounding metadata you have. If you cannot reasonably assess one
   from URLs/metadata alone, set its score to \`null\` and say so in the reasoning.
2. Extract praise and complaint themes from the review sample, if any reviews
   were provided. If the review array is empty, set \`reviewThemes\` to null.
3. Propose up to 8 ADDITIONAL recommendations beyond what the deterministic
   checks already surfaced. Each must reference the input data and propose a
   concrete change. Prefer rewrites with explicit before/after for text fields.

Return JSON matching the schema. Honor the style guarantees in the rubric.`;
}

export async function runQualitativeAudit(
  input: AuditInput,
  deterministic: DimensionResult[]
): Promise<QualitativeOutput> {
  const { model } = getAuditModel();
  const userPrompt = buildPrompt(input, deterministic);
  const { object } = await generateObject({
    model,
    schema: QualitativeOutputSchema,
    system: buildSystemPrompt(),
    prompt: userPrompt,
    temperature: 0.3,
  });
  return object;
}

function buildPrompt(input: AuditInput, deterministic: DimensionResult[]): string {
  const app = input.app;
  const compactDeterministic = deterministic
    .map((d) => `  - ${d.dimension} (${d.score === null ? 'N/A' : `${d.score}/10`}): ${d.evidence.join(' ')}`)
    .join('\n');

  const competitors = input.competitors
    .slice(0, 3)
    .map(
      (c) =>
        `  ${c.rank}. ${c.name} (${c.developer}) — ${c.averageRating?.toFixed(2) ?? 'N/A'} stars · subtitle: ${c.subtitle ?? 'unknown'}`
    )
    .join('\n');

  const reviews = input.app.reviewSample.length
    ? input.app.reviewSample
        .slice(0, 30)
        .map((r) => `  - [${r.rating}★] ${r.title} — ${r.body.slice(0, 200)}`)
        .join('\n')
    : '  (none — Apple deprecated the public Customer Reviews RSS feed)';

  return `App under audit:
  name: ${app.name}
  developer: ${app.developer}
  category: ${app.category}
  storefront: ${app.country}
  subtitle: ${app.subtitle ?? '(not detected)'}
  description (first 400 chars): ${app.description.slice(0, 400)}
  release notes (first 200 chars): ${(app.releaseNotes ?? '').slice(0, 200) || '(none)'}
  rating: ${app.averageRating?.toFixed(2) ?? 'N/A'} stars from ${app.ratingCount?.toLocaleString() ?? 'N/A'} reviews
  icon: ${app.iconUrl ?? '(none)'}
  preview video: ${app.previewVideoUrl ?? '(none)'}
  screenshots: ${app.screenshotUrls.length} iPhone, ${app.ipadScreenshotUrls.length} iPad
  first 2 screenshots: ${app.screenshotUrls.slice(0, 2).join(', ') || '(none)'}

Deterministic findings:
${compactDeterministic}

Top-3 competitors in ${app.category}:
${competitors || '  (none)'}

Recent reviews:
${reviews}

Return JSON matching the schema. Cite specific evidence from above in every recommendation.`;
}

export function mergeQualitative(
  deterministic: DimensionResult[],
  qualitative: QualitativeOutput
): DimensionResult[] {
  return deterministic.map((d) => {
    if (d.dimension === 'icon' && qualitative.qualitativeScores.icon) {
      const q = qualitative.qualitativeScores.icon;
      return {
        ...d,
        score: q.score ?? d.score,
        status: q.score === null ? 'unavailable' : 'assessed',
        evidence: [...d.evidence, `LLM qualitative: ${q.reasoning}`],
      } satisfies DimensionResult;
    }
    if (d.dimension === 'previewVideo' && qualitative.qualitativeScores.previewVideo) {
      const q = qualitative.qualitativeScores.previewVideo;
      return {
        ...d,
        score: q.score ?? d.score,
        status: q.score === null ? 'unavailable' : 'assessed',
        evidence: [...d.evidence, `LLM qualitative: ${q.reasoning}`],
      } satisfies DimensionResult;
    }
    return d;
  });
}

export function attachAdditionalRecommendations(
  dimensions: DimensionResult[],
  extras: Recommendation[]
): DimensionResult[] {
  const byDim = new Map<string, Recommendation[]>();
  for (const r of extras) {
    const list = byDim.get(r.dimension) ?? [];
    list.push(r);
    byDim.set(r.dimension, list);
  }
  return dimensions.map((d) =>
    byDim.has(d.dimension)
      ? { ...d, recommendations: [...d.recommendations, ...byDim.get(d.dimension)!] }
      : d
  );
}
