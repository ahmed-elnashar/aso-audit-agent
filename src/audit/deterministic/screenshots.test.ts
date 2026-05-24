import { describe, expect, it } from 'vitest';
import { scoreScreenshots } from './screenshots';
import { makeAuditInput } from '../__fixtures__/build-input';

describe('scoreScreenshots', () => {
  it('high score when all 10 slots used + preview video + iPad', () => {
    const result = scoreScreenshots(
      makeAuditInput({
        app: {
          screenshotUrls: Array.from({ length: 10 }, (_, i) => `s${i}.png`),
          ipadScreenshotUrls: ['ipad1.png'],
          previewVideoUrl: 'https://example.com/preview.mp4',
        },
      })
    );
    expect(result.score).toBeGreaterThanOrEqual(9);
    expect(result.recommendations).toEqual([]);
  });

  it('high-impact rec when fewer than 5 screenshots', () => {
    const result = scoreScreenshots(
      makeAuditInput({ app: { screenshotUrls: ['s1.png', 's2.png'], previewVideoUrl: null } })
    );
    expect(result.recommendations.some((r) => r.category === 'high-impact')).toBe(true);
  });

  it('high-impact rec when preview video missing', () => {
    const result = scoreScreenshots(
      makeAuditInput({
        app: {
          screenshotUrls: Array.from({ length: 10 }, (_, i) => `s${i}.png`),
          previewVideoUrl: null,
        },
      })
    );
    expect(
      result.recommendations.some((r) => r.category === 'high-impact' && /preview/i.test(r.evidence))
    ).toBe(true);
  });
});
