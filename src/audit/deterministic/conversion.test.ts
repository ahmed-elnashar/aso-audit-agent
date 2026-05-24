import { describe, expect, it } from 'vitest';
import { scoreConversion } from './conversion';
import { makeAuditInput } from '../__fixtures__/build-input';

const RECENT = new Date('2026-05-01T00:00:00Z').toISOString();
const STALE = new Date('2025-01-01T00:00:00Z').toISOString();

describe('scoreConversion', () => {
  it('rewards a populated promotional text', () => {
    const populated = scoreConversion(
      makeAuditInput({ app: { promotionalText: 'Try the new AI summarizer this week.' } })
    );
    const empty = scoreConversion(makeAuditInput({ app: { promotionalText: null } }));
    expect(populated.score).toBeGreaterThan(empty.score!);
  });

  it('flags missing promotional text as a quick win', () => {
    const result = scoreConversion(makeAuditInput({ app: { promotionalText: null } }));
    expect(
      result.recommendations.some(
        (r) => r.category === 'quick-win' && /promotional text/i.test(r.evidence)
      )
    ).toBe(true);
  });

  it('flags generic / very short release notes', () => {
    const result = scoreConversion(makeAuditInput({ app: { releaseNotes: 'Bug fixes.' } }));
    expect(
      result.recommendations.some((r) => r.category === 'quick-win' && /release notes/i.test(r.evidence))
    ).toBe(true);
  });

  it('flags stale releases (>180 days) as high impact', () => {
    const result = scoreConversion(makeAuditInput({ app: { currentVersionReleaseDate: STALE } }));
    expect(result.recommendations.some((r) => r.category === 'high-impact')).toBe(true);
  });

  it('boosts score for recent releases', () => {
    const recent = scoreConversion(
      makeAuditInput({ app: { currentVersionReleaseDate: RECENT } })
    );
    const stale = scoreConversion(makeAuditInput({ app: { currentVersionReleaseDate: STALE } }));
    expect(recent.score).toBeGreaterThan(stale.score!);
  });
});
