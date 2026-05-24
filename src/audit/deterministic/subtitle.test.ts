import { describe, expect, it } from 'vitest';
import { scoreSubtitle } from './subtitle';
import type { AuditInput } from '../inputs';

function makeInput(name: string, subtitle: string | null): AuditInput {
  return {
    app: {
      appId: '1', country: 'us', name, developer: 'X', category: 'C', categoryId: 1,
      description: '', releaseNotes: null, version: null, currentVersionReleaseDate: null,
      iconUrl: null, appStoreUrl: '', screenshotUrls: [], ipadScreenshotUrls: [],
      averageRating: null, ratingCount: null, subtitle, promotionalText: null,
      previewVideoUrl: null, reviewSample: [],
    },
    competitors: [],
  };
}

describe('scoreSubtitle', () => {
  it('scores 0 when subtitle is missing', () => {
    const result = scoreSubtitle(makeInput('Spotify', null));
    expect(result.score).toBe(0);
    expect(result.recommendations).toHaveLength(1);
  });

  it('penalizes title-duplicated tokens', () => {
    const result = scoreSubtitle(makeInput('Notes Pro', 'Notes Pro Daily'));
    expect(result.evidence.some((e) => /duplicated with title/i.test(e))).toBe(true);
    expect(result.recommendations.some((r) => /duplicates title/i.test(r.evidence))).toBe(true);
  });

  it('rewards full distinct utilization', () => {
    const result = scoreSubtitle(makeInput('Spotify', 'Music for every moment'));
    expect(result.score).toBeGreaterThan(6);
  });

  it('recommends extension when subtitle is short and distinct', () => {
    const result = scoreSubtitle(makeInput('Notes', 'Quick'));
    expect(result.recommendations.some((r) => /uses only/i.test(r.evidence))).toBe(true);
  });
});
