import type { AuditInput } from '../inputs';
import type { Recommendation } from '../types';
import { firstNChars } from '../text';

const ABOVE_FOLD_CHARS = 170;

const CTA_PATTERNS = [/\bdownload\b/i, /\btry\b/i, /\bget started\b/i, /\bjoin\b/i, /\bstart\b/i, /\bsign up\b/i, /\binstall\b/i];
const SOCIAL_PROOF_PATTERNS = [
  /\b\d[\d,.]*\s*(million|m\b|mn\b|\+|million users|users)/i,
  /featured in/i,
  /award/i,
  /editor['’]?s choice/i,
  /trusted by/i,
  /\bbest\b.*\bapple\b/i,
];

export function scoreDescription(input: AuditInput) {
  const description = input.app.description ?? '';
  const evidence: string[] = [];
  const recommendations: Recommendation[] = [];

  if (description.trim().length === 0) {
    return {
      dimension: 'description' as const,
      score: 0,
      evidence: ['Description is empty.'],
      recommendations: [
        {
          dimension: 'description' as const,
          category: 'quick-win' as const,
          evidence: 'Empty description.',
          before: null,
          after: null,
          reasoning: 'Add a description with a strong hook in the first 170 chars (above the "more" cutoff), benefit-led feature bullets, and a CTA.',
        },
      ],
    };
  }

  const aboveFold = firstNChars(description, ABOVE_FOLD_CHARS);
  evidence.push(`Description is ${description.length} chars total; first ${ABOVE_FOLD_CHARS} chars (above the "more" cutoff): "${aboveFold.trim()}".`);

  const hasCta = CTA_PATTERNS.some((re) => re.test(description));
  const hasSocialProof = SOCIAL_PROOF_PATTERNS.some((re) => re.test(description));

  if (!hasCta) evidence.push('No clear call-to-action verb detected (download, try, get started, join, install).');
  if (!hasSocialProof) evidence.push('No social proof signal detected (user counts, awards, "featured in", editor\'s choice).');

  let score = 6;
  if (hasCta) score += 1;
  if (hasSocialProof) score += 1;
  if (description.length >= 800) score += 1;
  if (description.length < 300) score -= 2;

  if (!hasCta) {
    recommendations.push({
      dimension: 'description',
      category: 'quick-win',
      evidence: 'Description lacks an explicit call-to-action.',
      before: null,
      after: null,
      reasoning: 'Add a CTA line near the top (e.g. "Download free and start in 30 seconds"). Even a soft CTA lifts conversion.',
    });
  }
  if (!hasSocialProof) {
    recommendations.push({
      dimension: 'description',
      category: 'high-impact',
      evidence: 'No social proof in the description.',
      before: null,
      after: null,
      reasoning: 'Add a credible social-proof line in the first 170 chars (e.g., user count, press mention, award). It converts skeptical browsers.',
    });
  }

  return { dimension: 'description' as const, score: Math.max(0, Math.min(10, score)), evidence, recommendations };
}
