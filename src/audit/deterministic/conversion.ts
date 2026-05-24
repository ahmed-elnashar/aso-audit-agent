import type { AuditInput } from '../inputs';
import type { Recommendation } from '../types';
import { daysSince } from '../text';

export function scoreConversion(input: AuditInput) {
  const evidence: string[] = [];
  const recommendations: Recommendation[] = [];
  let score = 5;

  const promo = input.app.promotionalText;
  if (promo && promo.trim().length > 0) {
    evidence.push(`Promotional text (170 chars max): "${promo}" (${promo.length} chars).`);
    score += 2;
  } else {
    evidence.push('Promotional text is empty or could not be detected — this 170-char editable field is wasted real estate.');
    recommendations.push({
      dimension: 'conversion',
      category: 'quick-win',
      evidence: 'No promotional text detected.',
      before: null,
      after: null,
      reasoning: 'Promotional text appears above the description, can be edited any time (no app review), and is perfect for current campaigns, seasonal hooks, or new-feature announcements.',
    });
  }

  const releaseNotes = input.app.releaseNotes;
  const releaseAge = daysSince(input.app.currentVersionReleaseDate);
  if (releaseNotes && releaseNotes.trim().length > 30) {
    evidence.push(`"What's New" notes (${releaseNotes.length} chars): "${releaseNotes.slice(0, 200)}${releaseNotes.length > 200 ? '…' : ''}".`);
    score += 1;
  } else {
    evidence.push('"What\'s New" notes are missing or generic.');
    recommendations.push({
      dimension: 'conversion',
      category: 'quick-win',
      evidence: 'Generic or missing release notes.',
      before: releaseNotes ?? null,
      after: null,
      reasoning: 'List 2-3 specific fixes/features in plain language. Returning users read this; "Bug fixes and performance improvements" is a missed trust-building moment.',
    });
  }

  if (releaseAge !== null) {
    if (releaseAge > 180) {
      score -= 2;
      evidence.push(`Last release was ${releaseAge} days ago — staleness hurts both ranking and trust.`);
      recommendations.push({
        dimension: 'conversion',
        category: 'high-impact',
        evidence: `${releaseAge} days since last release.`,
        before: null,
        after: null,
        reasoning: 'Ship a release within 90 days (even a small fix). Apple weights recency in ranking, and users notice the "Updated X months ago" line on the listing.',
      });
    } else if (releaseAge <= 30) {
      score += 1;
      evidence.push(`Last release was ${releaseAge} days ago — healthy update cadence.`);
    }
  }

  return {
    dimension: 'conversion' as const,
    score: Math.max(0, Math.min(10, score)),
    evidence,
    recommendations,
  };
}
