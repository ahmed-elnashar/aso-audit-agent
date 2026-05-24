import type { AuditInput } from '../inputs';
import type { Recommendation } from '../types';

const MAX_SLOTS = 10;
const HEALTHY_MINIMUM = 5;

export function scoreScreenshots(input: AuditInput) {
  const count = input.app.screenshotUrls.length;
  const ipadCount = input.app.ipadScreenshotUrls.length;
  const hasPreviewVideo = Boolean(input.app.previewVideoUrl);

  const evidence: string[] = [
    `${count}/${MAX_SLOTS} iPhone screenshot slots used.`,
    ipadCount > 0 ? `${ipadCount} iPad screenshot(s) provided.` : 'No iPad screenshots provided.',
    hasPreviewVideo ? 'App preview video detected.' : 'No app preview video detected (videos auto-play in search, lifting CTR).',
  ];

  let score = (count / MAX_SLOTS) * 8;
  if (hasPreviewVideo) score += 1;
  if (ipadCount > 0) score += 0.5;
  if (count >= MAX_SLOTS) score += 0.5;
  score = Math.max(0, Math.min(10, score));

  const recommendations: Recommendation[] = [];
  if (count < HEALTHY_MINIMUM) {
    recommendations.push({
      dimension: 'screenshots',
      category: 'high-impact',
      evidence: `Only ${count}/${MAX_SLOTS} screenshot slots used.`,
      before: null,
      after: null,
      reasoning: `Fill at least ${HEALTHY_MINIMUM} slots; the first 2-3 are visible in search results and disproportionately drive tap-through.`,
    });
  } else if (count < MAX_SLOTS) {
    recommendations.push({
      dimension: 'screenshots',
      category: 'quick-win',
      evidence: `${MAX_SLOTS - count} screenshot slot(s) unused.`,
      before: null,
      after: null,
      reasoning: 'Add screenshots that show secondary features, social proof, or differentiators to fill remaining slots.',
    });
  }
  if (!hasPreviewVideo) {
    recommendations.push({
      dimension: 'screenshots',
      category: 'high-impact',
      evidence: 'No app preview video.',
      before: null,
      after: null,
      reasoning: 'Add a 15-30s app preview that hooks in the first 3 seconds and works without sound — videos take the first 2 screenshot slots and lift conversion.',
    });
  }

  return { dimension: 'screenshots' as const, score: Math.round(score * 10) / 10, evidence, recommendations };
}
