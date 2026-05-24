import type { AuditInput } from '../inputs';
import type { Recommendation } from '../types';
import { daysSince } from '../text';

export function scoreRatings(input: AuditInput) {
  const avg = input.app.averageRating;
  const count = input.app.ratingCount;
  const evidence: string[] = [];
  const recommendations: Recommendation[] = [];

  if (avg == null || count == null) {
    return {
      dimension: 'ratings' as const,
      score: null,
      evidence: ['Rating data not available from iTunes Lookup.'],
      recommendations: [],
      unavailableReason: 'iTunes Lookup did not return rating fields.',
    };
  }

  evidence.push(`Current rating: ${avg.toFixed(2)} stars from ${count.toLocaleString()} ratings.`);
  const releaseAgeDays = daysSince(input.app.currentVersionReleaseDate);
  if (releaseAgeDays !== null) {
    evidence.push(`Current version was released ${releaseAgeDays} day(s) ago.`);
  }

  if (input.app.reviewSample.length === 0) {
    evidence.push("Apple's public Customer Reviews RSS feed returned no entries — review-text theme analysis is unavailable. Score reflects numeric signals only.");
  } else {
    evidence.push(`${input.app.reviewSample.length} recent review(s) sampled for theme analysis.`);
  }

  let score = 5;
  if (avg >= 4.7) score += 3;
  else if (avg >= 4.4) score += 2;
  else if (avg >= 4.0) score += 1;
  else if (avg < 3.5) score -= 2;

  if (count >= 100000) score += 1;
  else if (count >= 10000) score += 0.5;
  else if (count < 100) score -= 1;

  score = Math.max(0, Math.min(10, score));

  if (avg < 4.0 && count > 100) {
    recommendations.push({
      dimension: 'ratings',
      category: 'high-impact',
      evidence: `Rating ${avg.toFixed(2)} stars across ${count.toLocaleString()} ratings is below the 4.0 conversion floor.`,
      before: null,
      after: null,
      reasoning: 'Audit recent 1-2 star themes (crashes, billing, missing features). Ship a targeted fix release, then prompt satisfied users to rate after a positive moment.',
    });
  }
  if (count < 1000 && (avg ?? 0) >= 4.0) {
    recommendations.push({
      dimension: 'ratings',
      category: 'quick-win',
      evidence: `Only ${count} ratings — a healthy average is undercounted by sparse volume.`,
      before: null,
      after: null,
      reasoning: 'Add SKStoreReviewController prompts at positive milestones (e.g. after a successful first task). Volume compounds search ranking weight.',
    });
  }

  return {
    dimension: 'ratings' as const,
    score: Math.round(score * 10) / 10,
    evidence,
    recommendations,
  };
}
