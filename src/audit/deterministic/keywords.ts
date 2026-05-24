import type { AuditInput } from '../inputs';
import type { Recommendation } from '../types';
import { keywordTokens } from '../text';

/**
 * The 100-char keyword field is private. We approximate utilization by looking
 * at the visible keyword surface (title + subtitle), since Apple also indexes
 * those — and flag obvious gaps the public ranking signal could fill.
 */
export function scoreKeywords(input: AuditInput) {
  const titleKw = keywordTokens(input.app.name);
  const subKw = keywordTokens(input.app.subtitle);
  const visible = new Set([...titleKw, ...subKw]);

  const descKw = keywordTokens(input.app.description);
  const uniqueInDesc = [...descKw].filter((t) => !visible.has(t));

  const evidence: string[] = [
    `Visible indexed keywords (title + subtitle): ${visible.size} distinct tokens (${[...visible].slice(0, 12).join(', ')}${visible.size > 12 ? '…' : ''}).`,
    `Description-only keywords not in title/subtitle: ${uniqueInDesc.length} (the App Store description does not contribute to keyword ranking).`,
  ];

  let score = 5;
  if (visible.size >= 5) score += 2;
  if (visible.size >= 8) score += 1;
  if (visible.size === 0) score = 0;

  const recommendations: Recommendation[] = [];
  if (uniqueInDesc.length >= 5 && visible.size < 8) {
    const candidates = uniqueInDesc.slice(0, 5);
    recommendations.push({
      dimension: 'keywords',
      category: 'high-impact',
      evidence: `${candidates.length} description-only tokens (e.g. ${candidates.join(', ')}) likely belong in the 100-char keyword field or subtitle.`,
      before: null,
      after: null,
      reasoning: `Apple ranks title, subtitle, and keyword field — not description. Move 3-5 highest-intent terms into the keyword field to capture rank.`,
    });
  }

  return {
    dimension: 'keywords' as const,
    score: Math.min(10, score),
    evidence,
    recommendations,
  };
}
