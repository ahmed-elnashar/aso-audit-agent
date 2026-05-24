import { describe, expect, it } from 'vitest';
import { scoreTitle } from './title';
import type { AuditInput } from '../inputs';

function makeInput(name: string): AuditInput {
  return {
    app: {
      appId: '1',
      country: 'us',
      name,
      developer: 'X',
      category: 'C',
      categoryId: 1,
      description: '',
      releaseNotes: null,
      version: null,
      currentVersionReleaseDate: null,
      iconUrl: null,
      appStoreUrl: '',
      screenshotUrls: [],
      ipadScreenshotUrls: [],
      averageRating: null,
      ratingCount: null,
      subtitle: null,
      promotionalText: null,
      previewVideoUrl: null,
      reviewSample: [],
    },
    competitors: [],
  };
}

describe('scoreTitle', () => {
  it('penalizes brand-only titles', () => {
    const result = scoreTitle(makeInput('Spotify'));
    expect(result.score).toBeLessThanOrEqual(5);
    expect(result.evidence.some((e) => /brand name/i.test(e))).toBe(true);
    expect(result.recommendations.some((r) => r.category === 'quick-win')).toBe(true);
  });

  it('rewards full utilization with keywords', () => {
    const result = scoreTitle(makeInput('Notes & Tasks: Daily Journal'));
    expect(result.score).toBeGreaterThan(8);
    expect(result.recommendations).toEqual([]);
  });

  it('flags over-limit titles', () => {
    const longName = 'Super Long App Title That Definitely Exceeds The Limit';
    const result = scoreTitle(makeInput(longName));
    expect(result.score).toBeLessThan(8);
    expect(result.evidence.some((e) => /exceeds Apple/.test(e))).toBe(true);
    expect(result.recommendations.some((r) => /over 30/i.test(r.evidence))).toBe(true);
  });

  it('flags token stuffing', () => {
    const result = scoreTitle(makeInput('Notes Notes Notes Pro'));
    expect(result.evidence.some((e) => /repeated/i.test(e))).toBe(true);
    expect(result.recommendations.some((r) => /Repeated/.test(r.evidence))).toBe(true);
  });
});
