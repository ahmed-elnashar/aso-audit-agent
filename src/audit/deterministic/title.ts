import type { AuditInput } from '../inputs';
import type { Recommendation } from '../types';
import { keywordTokens } from '../text';

const TITLE_LIMIT = 30;

export function scoreTitle(input: AuditInput) {
  const title = input.app.name;
  const len = title.length;
  const utilization = len / TITLE_LIMIT;

  const tokens = title.toLowerCase().split(/[\s\-:·|–—]+/).filter(Boolean);
  const keywords = keywordTokens(title);
  const tokenCounts = new Map<string, number>();
  for (const t of tokens) tokenCounts.set(t, (tokenCounts.get(t) ?? 0) + 1);
  const stuffedTokens = [...tokenCounts.entries()].filter(([, c]) => c > 1).map(([t]) => t);

  const looksBrandOnly = tokens.length === 1 || keywords.size === 0;
  const overLimit = len > TITLE_LIMIT;

  const evidence: string[] = [
    `Title is "${title}" (${len}/${TITLE_LIMIT} chars, ${(utilization * 100).toFixed(0)}% utilization).`,
  ];
  if (overLimit) evidence.push(`Title exceeds Apple's 30-char limit by ${len - TITLE_LIMIT} chars; will be truncated in search results.`);
  if (looksBrandOnly) evidence.push(`Title contains only a brand name with no descriptive keywords — leaves search-rank value on the table.`);
  if (stuffedTokens.length) evidence.push(`Tokens repeated in title: ${stuffedTokens.join(', ')}. Apple penalizes keyword stuffing.`);

  let score = Math.min(10, utilization * 10);
  if (overLimit) score = Math.max(0, score - 4);
  if (looksBrandOnly) score = Math.min(score, 5);
  if (stuffedTokens.length) score = Math.max(0, score - 2);
  score = Math.round(score * 10) / 10;

  const recommendations: Recommendation[] = [];
  if (looksBrandOnly && !overLimit) {
    const headroom = TITLE_LIMIT - len;
    recommendations.push({
      dimension: 'title',
      category: 'quick-win',
      evidence: `Title "${title}" uses only ${len}/${TITLE_LIMIT} chars with no keyword content.`,
      before: title,
      after: null,
      reasoning: `Add a keyword phrase after the brand using the remaining ${headroom} chars. Apple ranks title keywords heavily; a brand-only title forfeits this signal.`,
    });
  }
  if (overLimit) {
    recommendations.push({
      dimension: 'title',
      category: 'quick-win',
      evidence: `Title is ${len} chars (over 30).`,
      before: title,
      after: null,
      reasoning: `Trim to 30 chars so it renders fully in search and product pages.`,
    });
  }
  if (stuffedTokens.length) {
    recommendations.push({
      dimension: 'title',
      category: 'quick-win',
      evidence: `Repeated tokens: ${stuffedTokens.join(', ')}.`,
      before: title,
      after: null,
      reasoning: `Remove duplicates — Apple does not reward repetition and may treat it as stuffing.`,
    });
  }

  return { dimension: 'title' as const, score, evidence, recommendations };
}
