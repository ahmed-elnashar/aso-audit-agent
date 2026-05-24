import { describe, expect, it } from 'vitest';
import { scoreRatings } from './ratings';
import { makeAuditInput } from '../__fixtures__/build-input';

describe('scoreRatings', () => {
  it('marks dimension unavailable when iTunes Lookup returned no rating fields', () => {
    const result = scoreRatings(
      makeAuditInput({ app: { averageRating: null, ratingCount: null } })
    );
    expect(result.score).toBe(null);
    expect(result.unavailableReason).toContain('iTunes Lookup');
  });

  it('rewards a high rating with high volume', () => {
    const result = scoreRatings(
      makeAuditInput({ app: { averageRating: 4.8, ratingCount: 1_000_000 } })
    );
    expect(result.score!).toBeGreaterThanOrEqual(9);
  });

  it('flags a sub-4.0 average with volume as a high-impact issue', () => {
    const result = scoreRatings(
      makeAuditInput({ app: { averageRating: 3.6, ratingCount: 5000 } })
    );
    expect(result.recommendations.some((r) => r.category === 'high-impact')).toBe(true);
  });

  it('recommends asking for more ratings when volume is sparse but quality is good', () => {
    const result = scoreRatings(
      makeAuditInput({ app: { averageRating: 4.5, ratingCount: 50 } })
    );
    expect(result.recommendations.some((r) => /SKStoreReviewController|prompts/i.test(r.reasoning))).toBe(true);
  });

  it('notes the Apple Reviews RSS deprecation when no reviews were fetched', () => {
    const result = scoreRatings(makeAuditInput({ app: { reviewSample: [] } }));
    expect(result.evidence.some((e) => /deprecated|RSS feed/i.test(e))).toBe(true);
  });
});
