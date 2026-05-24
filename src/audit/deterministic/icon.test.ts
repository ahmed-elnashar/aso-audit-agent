import { describe, expect, it } from 'vitest';
import { scoreIcon } from './icon';
import { makeAuditInput } from '../__fixtures__/build-input';

describe('scoreIcon', () => {
  it('scores 0 when no icon URL is present', () => {
    const result = scoreIcon(makeAuditInput({ app: { iconUrl: null } }));
    expect(result.score).toBe(0);
  });

  it('returns a baseline score with a note that visual review is required', () => {
    const result = scoreIcon(makeAuditInput({ app: { iconUrl: 'https://example.com/icon.png' } }));
    expect(result.score).toBeGreaterThan(0);
    expect(result.evidence.some((e) => /visual review|distinctiveness/i.test(e))).toBe(true);
  });
});
