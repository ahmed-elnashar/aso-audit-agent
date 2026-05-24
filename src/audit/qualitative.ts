import { z } from 'zod';
import { generateObject, type ImagePart, type TextPart, type UserModelMessage } from 'ai';
import { getAuditModel } from '../lib/llm';
import { loadAsoAuditRubric } from '../mastra/skills';
import type { AuditInput } from './inputs';
import { RecommendationSchema, type DimensionResult, type Recommendation } from './types';

const QualitativeScoreSchema = z
  .object({
    score: z.number().min(0).max(10).nullable(),
    reasoning: z.string(),
  })
  .nullable();

const QualitativeOutputSchema = z.object({
  qualitativeScores: z.object({
    icon: QualitativeScoreSchema,
    screenshots: QualitativeScoreSchema,
    previewVideo: QualitativeScoreSchema,
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

const VISION_SKIPPED_REASON = 'vision skipped: model does not support image input';

const SCREENSHOTS_SENT_TO_VISION = 3;

function buildSystemPrompt(supportsVision: boolean): string {
  const visionClause = supportsVision
    ? `1. Score the three visual dimensions (\`icon\`, \`screenshots\`, \`previewVideo\`) using the
   images attached to the user message and the surrounding metadata. If you genuinely cannot assess
   one (e.g. no preview video URL exists), set its score to \`null\` and explain why in the reasoning.`
    : `1. Score \`icon\`, \`screenshots\`, and \`previewVideo\` to \`null\` — this model is text-only and
   was not given the images. Set the reasoning for each to: "${VISION_SKIPPED_REASON}".`;

  return `${loadAsoAuditRubric()}

---

You are running the qualitative pass of the rubric above. Deterministic
findings (char counts, presence checks, token overlap, ratings averages) have
already been computed and will be provided in the user message. Your job is:

${visionClause}
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
  const { model, config } = getAuditModel();
  const messages = buildMessages(input, deterministic, config.supportsVision);
  const { object } = await generateObject({
    model,
    schema: QualitativeOutputSchema,
    system: buildSystemPrompt(config.supportsVision),
    messages,
    temperature: 0.3,
  });
  return object;
}

/**
 * Builds the user message. When the model supports vision, the icon and the
 * first N screenshots are attached as image parts so the model can actually see
 * them; otherwise we send text-only and the system prompt instructs the model
 * to leave visual scores null.
 */
export function buildMessages(
  input: AuditInput,
  deterministic: DimensionResult[],
  supportsVision: boolean
): UserModelMessage[] {
  const textPart: TextPart = { type: 'text', text: buildPromptText(input, deterministic) };
  const content: Array<TextPart | ImagePart> = [textPart];

  if (supportsVision) {
    if (input.app.iconUrl) {
      content.push({ type: 'image', image: input.app.iconUrl });
    }
    for (const url of input.app.screenshotUrls.slice(0, SCREENSHOTS_SENT_TO_VISION)) {
      content.push({ type: 'image', image: url });
    }
  }

  return [{ role: 'user', content }];
}

function buildPromptText(input: AuditInput, deterministic: DimensionResult[]): string {
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
    if (d.dimension === 'icon') {
      return applyQualitative(d, qualitative.qualitativeScores.icon);
    }
    if (d.dimension === 'screenshots') {
      return applyQualitative(d, qualitative.qualitativeScores.screenshots);
    }
    if (d.dimension === 'previewVideo') {
      return applyQualitative(d, qualitative.qualitativeScores.previewVideo);
    }
    return d;
  });
}

function applyQualitative(
  d: DimensionResult,
  q: { score: number | null; reasoning: string } | null
): DimensionResult {
  if (!q) return d;
  // Vision was skipped: don't replace a usable deterministic score with null,
  // and tag the evidence so the UI is honest about why visual judgment is absent.
  if (q.reasoning === VISION_SKIPPED_REASON) {
    return { ...d, evidence: [...d.evidence, `LLM qualitative: ${q.reasoning}`] };
  }
  return {
    ...d,
    score: q.score ?? d.score,
    status: q.score === null ? 'unavailable' : 'assessed',
    evidence: [...d.evidence, `LLM qualitative: ${q.reasoning}`],
  };
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
