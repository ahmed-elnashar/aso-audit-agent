import type { AuditInput } from './inputs';
import { runDeterministicChecks } from './deterministic';
import {
  attachAdditionalRecommendations,
  mergeQualitative,
  runQualitativeAudit,
} from './qualitative';
import { overallScore, bucketRecommendations } from './score';
import type {
  AppSummary,
  AuditReport,
  CompetitorSummary,
  DimensionResult,
} from './types';
import { hasLlmKey } from '../lib/llm';

export interface RunAuditOptions {
  withLlm?: boolean;
  onProgress?: (event: AuditProgressEvent) => void;
}

export type AuditProgressEvent =
  | { stage: 'deterministic' }
  | { stage: 'qualitative-start' }
  | { stage: 'qualitative-done' }
  | { stage: 'qualitative-skipped'; reason: string }
  | { stage: 'aggregating' };

export async function runAudit(
  input: AuditInput,
  options: RunAuditOptions = {}
): Promise<AuditReport> {
  const { withLlm = hasLlmKey(), onProgress } = options;

  onProgress?.({ stage: 'deterministic' });
  let dimensions = runDeterministicChecks(input);

  if (withLlm) {
    onProgress?.({ stage: 'qualitative-start' });
    try {
      const qualitative = await runQualitativeAudit(input, dimensions);
      dimensions = mergeQualitative(dimensions, qualitative);
      dimensions = attachAdditionalRecommendations(dimensions, qualitative.additionalRecommendations);
      onProgress?.({ stage: 'qualitative-done' });
    } catch (err) {
      onProgress?.({
        stage: 'qualitative-skipped',
        reason: err instanceof Error ? err.message : 'unknown error',
      });
    }
  } else {
    onProgress?.({ stage: 'qualitative-skipped', reason: 'no LLM key configured' });
  }

  onProgress?.({ stage: 'aggregating' });
  return assemble(input, dimensions);
}

function assemble(input: AuditInput, dimensions: DimensionResult[]): AuditReport {
  const buckets = bucketRecommendations(dimensions);
  const app: AppSummary = {
    appId: input.app.appId,
    name: input.app.name,
    developer: input.app.developer,
    category: input.app.category,
    country: input.app.country,
    iconUrl: input.app.iconUrl,
    appStoreUrl: input.app.appStoreUrl,
    version: input.app.version,
    currentVersionReleaseDate: input.app.currentVersionReleaseDate,
  };
  const competitors: CompetitorSummary[] = input.competitors.map((c) => ({
    appId: c.appId,
    name: c.name,
    developer: c.developer,
    rank: c.rank,
    averageRating: c.averageRating,
    ratingCount: c.ratingCount,
    subtitle: c.subtitle,
    iconUrl: c.iconUrl,
  }));
  return {
    app,
    overallScore: overallScore(dimensions),
    dimensions,
    competitors,
    quickWins: buckets.quickWins,
    highImpact: buckets.highImpact,
    strategic: buckets.strategic,
    generatedAt: new Date().toISOString(),
  };
}
