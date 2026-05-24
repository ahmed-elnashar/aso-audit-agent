import { describe, expect, it } from 'vitest';
import { scoreCompetitive } from './competitive';
import { makeAuditInput, makeCompetitor } from '../__fixtures__/build-input';

describe('scoreCompetitive', () => {
  it('marks the dimension unavailable when no competitors were found', () => {
    const result = scoreCompetitive(makeAuditInput({ competitors: [] }));
    expect(result.score).toBe(null);
    expect(result.unavailableReason).toContain('Top Charts');
  });

  it('reports keyword overlap with the top 3 competitors', () => {
    const result = scoreCompetitive(
      makeAuditInput({
        app: { name: 'Notes Pro', subtitle: 'Capture every idea' },
        competitors: [
          makeCompetitor({ rank: 1, name: 'Notable Notes', subtitle: 'Take notes faster' }),
          makeCompetitor({ rank: 2, appId: '3', name: 'Idea Pad', subtitle: 'Capture quickly' }),
          makeCompetitor({ rank: 3, appId: '4', name: 'Quick Notes', subtitle: 'For busy people' }),
        ],
      })
    );
    expect(result.evidence.some((e) => /overlap/i.test(e))).toBe(true);
  });

  it('flags a rating gap as a strategic recommendation', () => {
    const result = scoreCompetitive(
      makeAuditInput({
        app: { averageRating: 3.9 },
        competitors: [
          makeCompetitor({ rank: 1, averageRating: 4.8 }),
          makeCompetitor({ rank: 2, appId: '3', averageRating: 4.7 }),
          makeCompetitor({ rank: 3, appId: '4', averageRating: 4.6 }),
        ],
      })
    );
    expect(result.recommendations.some((r) => r.category === 'strategic')).toBe(true);
  });

  it('rounds the score to one decimal', () => {
    const result = scoreCompetitive(
      makeAuditInput({
        competitors: [
          makeCompetitor({ rank: 1 }),
          makeCompetitor({ rank: 2, appId: '3' }),
          makeCompetitor({ rank: 3, appId: '4' }),
        ],
      })
    );
    if (result.score !== null) {
      expect(result.score).toBe(Math.round(result.score * 10) / 10);
    }
  });
});
