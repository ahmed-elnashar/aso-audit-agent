import type { AuditInput } from '../inputs';
import { DIMENSION_WEIGHTS, type DimensionResult } from '../types';
import { scoreTitle } from './title';
import { scoreSubtitle } from './subtitle';
import { scoreKeywords } from './keywords';
import { scoreDescription } from './description';
import { scoreScreenshots } from './screenshots';
import { scorePreviewVideo } from './preview-video';
import { scoreRatings } from './ratings';
import { scoreIcon } from './icon';
import { scoreConversion } from './conversion';
import { scoreCompetitive } from './competitive';

export {
  scoreTitle,
  scoreSubtitle,
  scoreKeywords,
  scoreDescription,
  scoreScreenshots,
  scorePreviewVideo,
  scoreRatings,
  scoreIcon,
  scoreConversion,
  scoreCompetitive,
};

export function runDeterministicChecks(input: AuditInput): DimensionResult[] {
  const raw = [
    scoreTitle(input),
    scoreSubtitle(input),
    scoreKeywords(input),
    scoreDescription(input),
    scoreScreenshots(input),
    scorePreviewVideo(input),
    scoreRatings(input),
    scoreIcon(input),
    scoreConversion(input),
    scoreCompetitive(input),
  ];

  return raw.map((r) => ({
    dimension: r.dimension,
    weight: DIMENSION_WEIGHTS[r.dimension],
    score: r.score,
    evidence: r.evidence,
    recommendations: r.recommendations,
    status: r.score === null ? 'unavailable' : 'assessed',
    unavailableReason: 'unavailableReason' in r ? r.unavailableReason : undefined,
  }));
}
