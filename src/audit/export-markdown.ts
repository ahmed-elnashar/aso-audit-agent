import type {
  AuditReport,
  CompetitorSummary,
  DimensionResult,
  Recommendation,
} from './types';

const DIMENSION_LABELS: Record<string, string> = {
  title: 'Title',
  subtitle: 'Subtitle',
  keywords: 'Keyword field',
  description: 'Description',
  screenshots: 'Screenshots',
  previewVideo: 'Preview video',
  ratings: 'Ratings & reviews',
  icon: 'Icon',
  conversion: 'Conversion signals',
  competitive: 'Competitive position',
};

const CATEGORY_LABELS: Record<Recommendation['category'], string> = {
  'quick-win': 'Quick Wins',
  'high-impact': 'High Impact',
  strategic: 'Strategic',
};

/**
 * Serializes an audit report to a portable Markdown document. Stable output
 * (deterministic ordering, no timestamps in body apart from `generatedAt`) so
 * the same report always produces the same markdown — useful for snapshots,
 * diffing, and copy-paste into Slack/Linear.
 */
export function reportToMarkdown(report: AuditReport): string {
  return [
    header(report),
    summaryTable(report.dimensions),
    recommendationsSection('quick-win', report.quickWins),
    recommendationsSection('high-impact', report.highImpact),
    recommendationsSection('strategic', report.strategic),
    competitorsSection(report.competitors),
    footer(report),
  ]
    .filter(Boolean)
    .join('\n\n');
}

function header(report: AuditReport): string {
  const a = report.app;
  return [
    `# ASO Audit — ${a.name}`,
    `**Overall score:** ${report.overallScore} / 100`,
    `**Developer:** ${a.developer}  `,
    `**Category:** ${a.category}  `,
    `**Storefront:** ${a.country.toUpperCase()}  `,
    `**App Store:** <${a.appStoreUrl}>`,
  ].join('\n');
}

function summaryTable(dimensions: DimensionResult[]): string {
  const rows = dimensions
    .map((d) => {
      const label = DIMENSION_LABELS[d.dimension] ?? d.dimension;
      const score = d.score === null ? 'Not detected' : `${d.score.toFixed(1)} / 10`;
      const status = d.status === 'unavailable' ? ` _(${d.unavailableReason ?? 'unavailable'})_` : '';
      return `| ${label} | ${d.weight}% | ${score}${status} |`;
    })
    .join('\n');
  return ['## Dimension scores', '', '| Dimension | Weight | Score |', '| --- | ---: | --- |', rows].join('\n');
}

function recommendationsSection(category: Recommendation['category'], recs: Recommendation[]): string {
  const heading = `## ${CATEGORY_LABELS[category]} (${recs.length})`;
  if (recs.length === 0) return `${heading}\n\n_None — either everything looks good here or the data wasn't available._`;
  const body = recs.map(renderRecommendation).join('\n\n');
  return `${heading}\n\n${body}`;
}

function renderRecommendation(r: Recommendation, idx: number): string {
  const label = DIMENSION_LABELS[r.dimension] ?? r.dimension;
  const parts = [`### ${idx + 1}. ${label}`, `**Why:** ${r.reasoning}`, `**Evidence:** ${r.evidence}`];
  if (r.before !== null && r.after !== null) {
    parts.push('**Before:**', '```', r.before, '```', '**After:**', '```', r.after, '```');
  }
  return parts.join('\n\n');
}

function competitorsSection(competitors: CompetitorSummary[]): string {
  if (competitors.length === 0) return '';
  const rows = competitors
    .map(
      (c) =>
        `| ${c.rank} | ${escapeCell(c.name)} | ${escapeCell(c.developer)} | ${c.averageRating?.toFixed(2) ?? '—'} | ${c.ratingCount?.toLocaleString() ?? '—'} | ${escapeCell(c.subtitle ?? '—')} |`
    )
    .join('\n');
  return [
    '## Competitors in this category',
    '',
    '| Rank | App | Developer | Avg rating | Ratings | Subtitle |',
    '| ---: | --- | --- | ---: | ---: | --- |',
    rows,
  ].join('\n');
}

function footer(report: AuditReport): string {
  return `---\n\nGenerated ${new Date(report.generatedAt).toISOString()} by the ASO Audit Agent.`;
}

function escapeCell(s: string): string {
  return s.replace(/\|/g, '\\|').replace(/\n/g, ' ');
}
