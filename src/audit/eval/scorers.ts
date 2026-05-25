import {
  createFaithfulnessScorer,
  createAnswerRelevancyScorer,
  createKeywordCoverageScorer,
} from '@mastra/evals/scorers/prebuilt';
import { getAuditModel } from '../../lib/llm';
import type { AuditInput } from '../inputs';
import type { DimensionResult, Recommendation } from '../types';
import { DIMENSION_LABELS } from '../dimension-labels';

export interface RecommendationScores {
  faithfulness: number;
  relevancy: number;
  keywordCoverage: number;
}

/**
 * Scores a single recommendation against its source dimension's deterministic
 * evidence. The three scorers are complementary:
 *  - faithfulness: does the recommendation make claims grounded in the input data?
 *  - relevancy:    does it actually answer "what should this dimension change?"
 *  - keywordCoverage: deterministic — does the rec mention the same key terms
 *                    as the evidence (catches "generic LLM advice" recs).
 */
export async function scoreRecommendation(
  rec: Recommendation,
  dimension: DimensionResult,
  input: AuditInput
): Promise<RecommendationScores> {
  const context = buildContext(dimension, input);
  const question = `What should change for the ${DIMENSION_LABELS[rec.dimension]} of this App Store listing, and why?`;
  const answer = formatRecommendation(rec);
  const { model } = getAuditModel();

  // Faithfulness takes its grounding context via the constructor; scope it to
  // the dimension under audit so the scorer judges against the relevant evidence
  // rather than the whole app summary.
  const faithfulness = createFaithfulnessScorer({ model, options: { context } });
  const relevancy = createAnswerRelevancyScorer({ model });
  const keywordCoverage = createKeywordCoverageScorer();

  const [faithfulnessResult, relevancyResult, keywordResult] = await Promise.all([
    faithfulness.run({ input: question, output: answer }),
    relevancy.run({ input: question, output: answer }),
    keywordCoverage.run({
      input: toAgentInput(context.join('\n')),
      output: toAgentOutput(answer),
    }),
  ]);

  return {
    faithfulness: faithfulnessResult.score ?? 0,
    relevancy: relevancyResult.score ?? 0,
    keywordCoverage: keywordResult.score ?? 0,
  };
}

function buildContext(dimension: DimensionResult, input: AuditInput): string[] {
  return [
    `App: ${input.app.name} (${input.app.developer}) in ${input.app.category}.`,
    `Title: ${input.app.name}. Subtitle: ${input.app.subtitle ?? '(not detected)'}.`,
    `Description (first 600 chars): ${input.app.description.slice(0, 600)}`,
    `Rating: ${input.app.averageRating?.toFixed(2) ?? 'N/A'} from ${input.app.ratingCount?.toLocaleString() ?? 'N/A'} reviews.`,
    `Dimension under audit: ${DIMENSION_LABELS[dimension.dimension]} (weight ${dimension.weight}%).`,
    `Deterministic evidence: ${dimension.evidence.join(' | ')}`,
  ];
}

function formatRecommendation(rec: Recommendation): string {
  const parts = [`Evidence: ${rec.evidence}`, `Reasoning: ${rec.reasoning}`];
  if (rec.before !== null && rec.after !== null) {
    parts.push(`Proposed change — from "${rec.before}" → to "${rec.after}".`);
  }
  return parts.join(' ');
}

/**
 * The code-based scorers (keyword-coverage, content-similarity) expect
 * `ScorerRunInputForAgent` / `ScorerRunOutputForAgent` — arrays of
 * MastraDBMessage objects, not plain strings. These helpers wrap text in the
 * minimal shape that satisfies the scorer's text-extraction helper.
 */
function toAgentInput(text: string) {
  return {
    inputMessages: [makeMessage('user', text)],
    rememberedMessages: [],
    systemMessages: [],
    taggedSystemMessages: {},
  };
}

function toAgentOutput(text: string) {
  return [makeMessage('assistant', text)];
}

function makeMessage(role: 'user' | 'assistant', text: string) {
  return {
    id: `eval-${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role,
    createdAt: new Date(),
    content: { format: 2 as const, parts: [{ type: 'text' as const, text }] },
  };
}
