import type { AuditInput } from '../inputs';
import type { Recommendation } from '../types';
import { keywordTokens } from '../text';

const SUBTITLE_LIMIT = 30;

export function scoreSubtitle(input: AuditInput) {
  const subtitle = input.app.subtitle;
  const evidence: string[] = [];
  const recommendations: Recommendation[] = [];

  if (!subtitle) {
    return {
      dimension: 'subtitle' as const,
      score: 0,
      evidence: ['Subtitle is missing or could not be detected on the listing page.'],
      recommendations: [
        {
          dimension: 'subtitle' as const,
          category: 'quick-win' as const,
          evidence: 'No subtitle present.',
          before: null,
          after: null,
          reasoning: `Add a 30-char benefit-driven subtitle with distinct keywords not already in the title — it's Apple's second-most-indexed field and is free real estate.`,
        },
      ],
    };
  }

  const len = subtitle.length;
  const utilization = len / SUBTITLE_LIMIT;
  evidence.push(`Subtitle is "${subtitle}" (${len}/${SUBTITLE_LIMIT} chars, ${(utilization * 100).toFixed(0)}% utilization).`);

  const titleKeywords = keywordTokens(input.app.name);
  const subKeywords = keywordTokens(subtitle);
  const dupes = [...subKeywords].filter((t) => titleKeywords.has(t));

  let score = Math.min(10, utilization * 10);
  if (dupes.length) {
    score = Math.max(0, score - dupes.length * 1.5);
    evidence.push(`Words duplicated with title: ${dupes.join(', ')}. Repeating title keywords in the subtitle wastes search-rank slots.`);
    recommendations.push({
      dimension: 'subtitle',
      category: 'quick-win',
      evidence: `Subtitle duplicates title tokens: ${dupes.join(', ')}.`,
      before: subtitle,
      after: null,
      reasoning: `Replace duplicate tokens with fresh keywords. Apple indexes title and subtitle separately — duplicates earn no extra rank.`,
    });
  }

  if (len > SUBTITLE_LIMIT) {
    score = Math.max(0, score - 3);
    evidence.push(`Subtitle exceeds 30-char limit by ${len - SUBTITLE_LIMIT} chars.`);
  } else if (utilization < 0.6) {
    recommendations.push({
      dimension: 'subtitle',
      category: 'quick-win',
      evidence: `Subtitle uses only ${len}/${SUBTITLE_LIMIT} chars.`,
      before: subtitle,
      after: null,
      reasoning: `Extend to ~28-30 chars with additional benefit-framed keywords. Empty char budget is wasted ranking potential.`,
    });
  }

  return { dimension: 'subtitle' as const, score: Math.round(score * 10) / 10, evidence, recommendations };
}
