import { describe, expect, it } from 'vitest';
import { scoreKeywords } from './keywords';
import { makeAuditInput } from '../__fixtures__/build-input';

describe('scoreKeywords', () => {
  it('rewards more visible keyword tokens', () => {
    const wide = scoreKeywords(
      makeAuditInput({
        app: { name: 'Notes Tasks Journal Diary', subtitle: 'Capture every idea fast' },
      })
    );
    const narrow = scoreKeywords(
      makeAuditInput({ app: { name: 'Brand', subtitle: null } })
    );
    expect(wide.score).toBeGreaterThan(narrow.score!);
  });

  it('recommends moving description-only tokens into the keyword field when visible surface is thin', () => {
    const result = scoreKeywords(
      makeAuditInput({
        app: {
          name: 'Brand',
          subtitle: 'Short',
          description: 'Track expenses, budget categories, recurring bills, savings, subscriptions',
        },
      })
    );
    expect(result.recommendations.some((r) => r.category === 'high-impact')).toBe(true);
  });

  it('scores 0 when there are no visible keywords at all', () => {
    const result = scoreKeywords(
      makeAuditInput({ app: { name: 'X', subtitle: null, description: '' } })
    );
    expect(result.score).toBe(0);
  });
});
