import type { AuditInput } from '../inputs';
import type { Recommendation } from '../types';
import { jaccardOverlap, keywordTokens } from '../text';

export function scoreCompetitive(input: AuditInput) {
  const evidence: string[] = [];
  const recommendations: Recommendation[] = [];

  if (input.competitors.length === 0) {
    return {
      dimension: 'competitive' as const,
      score: null,
      evidence: ['No competitor data available (top charts returned no peers).'],
      recommendations: [],
      unavailableReason: 'iTunes Top Charts returned no peers for this category/country.',
    };
  }

  const appKw = new Set([
    ...keywordTokens(input.app.name),
    ...keywordTokens(input.app.subtitle),
  ]);

  const overlaps = input.competitors.slice(0, 3).map((c) => {
    const cKw = new Set([
      ...keywordTokens(c.name),
      ...keywordTokens(c.subtitle),
    ]);
    return { competitor: c, overlap: jaccardOverlap(appKw, cKw), keywords: cKw };
  });

  const avgOverlap = overlaps.reduce((s, x) => s + x.overlap, 0) / overlaps.length;
  evidence.push(`Visible keyword overlap with top 3 competitors: ${overlaps.map((o) => `${o.competitor.name} ${(o.overlap * 100).toFixed(0)}%`).join('; ')}.`);

  const targetRating = input.app.averageRating;
  const compRatings = input.competitors
    .map((c) => c.averageRating)
    .filter((r): r is number => typeof r === 'number');
  if (compRatings.length && typeof targetRating === 'number') {
    const compAvg = compRatings.reduce((a, b) => a + b, 0) / compRatings.length;
    const gap = targetRating - compAvg;
    evidence.push(`Rating vs. top-3 avg: target ${targetRating.toFixed(2)} ↔ peer avg ${compAvg.toFixed(2)} (gap ${gap >= 0 ? '+' : ''}${gap.toFixed(2)}).`);
    if (gap < -0.2) {
      recommendations.push({
        dimension: 'competitive',
        category: 'strategic',
        evidence: `Rating gap of ${gap.toFixed(2)} stars vs. category peers.`,
        before: null,
        after: null,
        reasoning: 'Close the rating gap with a focused quality release; in the same search results your peer set sets the bar users compare against.',
      });
    }
  }

  let score = 5 + avgOverlap * 4;
  if (avgOverlap < 0.1) {
    score -= 1;
    recommendations.push({
      dimension: 'competitive',
      category: 'strategic',
      evidence: `Less than 10% keyword overlap with top 3 competitors — likely missing common category search terms.`,
      before: null,
      after: null,
      reasoning: `Identify the 3-5 most-searched terms competitors share (e.g. category nouns, common verbs) and integrate them into title/subtitle/keyword field where they fit naturally.`,
    });
  }

  return {
    dimension: 'competitive' as const,
    score: Math.round(Math.max(0, Math.min(10, score)) * 10) / 10,
    evidence,
    recommendations,
  };
}
