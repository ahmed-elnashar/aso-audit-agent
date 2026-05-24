import type { AuditInput } from '../inputs';

export function scoreIcon(input: AuditInput) {
  const iconUrl = input.app.iconUrl;
  if (!iconUrl) {
    return {
      dimension: 'icon' as const,
      score: 0,
      evidence: ['Icon URL not returned by iTunes Lookup.'],
      recommendations: [],
    };
  }
  return {
    dimension: 'icon' as const,
    score: 6,
    evidence: [
      `Icon URL: ${iconUrl}`,
      'Qualitative checks (distinctiveness, legibility at small sizes, text-free design) require visual review.',
    ],
    recommendations: [],
  };
}
