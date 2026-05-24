import { describe, expect, it } from 'vitest';
import { overallScore, bucketRecommendations } from './score';
import type { DimensionResult } from './types';

const dim = (overrides: Partial<DimensionResult> & Pick<DimensionResult, 'dimension' | 'weight' | 'score'>): DimensionResult => ({
  evidence: [],
  recommendations: [],
  status: overrides.score === null ? 'unavailable' : 'assessed',
  ...overrides,
});

describe('overallScore', () => {
  it('normalizes to 0-100 across assessed dims', () => {
    const dims = [
      dim({ dimension: 'title', weight: 20, score: 10 }),
      dim({ dimension: 'subtitle', weight: 15, score: 5 }),
    ];
    // weightedSum = 200 + 75 = 275; totalWeight = 35; (275/35)*10 = 78.57 → 79
    expect(overallScore(dims)).toBe(79);
  });

  it('skips unavailable dimensions instead of zeroing them', () => {
    const dims = [
      dim({ dimension: 'title', weight: 20, score: 10 }),
      dim({ dimension: 'ratings', weight: 15, score: null }),
    ];
    expect(overallScore(dims)).toBe(100);
  });

  it('returns 0 when nothing is assessed', () => {
    const dims = [dim({ dimension: 'title', weight: 20, score: null })];
    expect(overallScore(dims)).toBe(0);
  });
});

describe('bucketRecommendations', () => {
  it('buckets by category', () => {
    const dims: DimensionResult[] = [
      dim({
        dimension: 'title',
        weight: 20,
        score: 5,
        recommendations: [
          { dimension: 'title', category: 'quick-win', evidence: 'a', before: null, after: null, reasoning: '' },
          { dimension: 'title', category: 'strategic', evidence: 'b', before: null, after: null, reasoning: '' },
        ],
      }),
    ];
    const buckets = bucketRecommendations(dims);
    expect(buckets.quickWins).toHaveLength(1);
    expect(buckets.strategic).toHaveLength(1);
    expect(buckets.highImpact).toHaveLength(0);
  });
});
