import type { DimensionResult, Recommendation } from './types';

/**
 * Weighted score across assessed dimensions, normalized to 0-100. Unavailable
 * dimensions are excluded from the denominator so missing data doesn't
 * silently tank the overall number — the report surfaces them separately.
 */
export function overallScore(dimensions: DimensionResult[]): number {
  const assessed = dimensions.filter((d): d is DimensionResult & { score: number } => d.score !== null);
  if (assessed.length === 0) return 0;
  const totalWeight = assessed.reduce((sum, d) => sum + d.weight, 0);
  const weightedSum = assessed.reduce((sum, d) => sum + d.score * d.weight, 0);
  if (totalWeight === 0) return 0;
  return Math.round((weightedSum / totalWeight) * 10);
}

export function bucketRecommendations(dimensions: DimensionResult[]): {
  quickWins: Recommendation[];
  highImpact: Recommendation[];
  strategic: Recommendation[];
} {
  const all = dimensions.flatMap((d) => d.recommendations);
  return {
    quickWins: all.filter((r) => r.category === 'quick-win'),
    highImpact: all.filter((r) => r.category === 'high-impact'),
    strategic: all.filter((r) => r.category === 'strategic'),
  };
}
