import { describe, expect, it } from 'vitest';
import { scorePreviewVideo } from './preview-video';
import { makeAuditInput } from '../__fixtures__/build-input';

describe('scorePreviewVideo', () => {
  it('scores 0 and recommends adding when missing', () => {
    const result = scorePreviewVideo(makeAuditInput({ app: { previewVideoUrl: null } }));
    expect(result.score).toBe(0);
    expect(result.recommendations).toHaveLength(1);
    expect(result.recommendations[0]!.category).toBe('high-impact');
  });

  it('passes when present (qualitative judgment deferred to LLM)', () => {
    const result = scorePreviewVideo(
      makeAuditInput({ app: { previewVideoUrl: 'https://example.com/preview.mp4' } })
    );
    expect(result.score).toBeGreaterThan(0);
    expect(result.recommendations).toEqual([]);
  });
});
