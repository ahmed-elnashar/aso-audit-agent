import type { AuditInput } from '../inputs';
import type { Recommendation } from '../types';

export function scorePreviewVideo(input: AuditInput) {
  const url = input.app.previewVideoUrl;
  if (!url) {
    return {
      dimension: 'previewVideo' as const,
      score: 0,
      evidence: ['No app preview video detected on the listing.'],
      recommendations: [
        {
          dimension: 'previewVideo' as const,
          category: 'high-impact' as const,
          evidence: 'Preview video missing.',
          before: null,
          after: null,
          reasoning: 'A 15-30s preview that hooks in the first 3 seconds and works without sound takes the first 1-2 screenshot slots in search and lifts CTR materially.',
        },
      ],
    };
  }
  return {
    dimension: 'previewVideo' as const,
    score: 7,
    evidence: [`Preview video present: ${url}`, 'Qualitative checks (hook timing, sound-off legibility) require manual or vision review.'],
    recommendations: [],
  };
}
