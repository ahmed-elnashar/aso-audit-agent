'use client';

import type { AuditReport } from './AuditReportView';

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

export function ScoreCard({ report }: { report: AuditReport }) {
  // Scope the heading id by appId so multiple ScoreCards on one page
  // (e.g. the /compare view) each get a distinct aria-labelledby target.
  const headingId = `aso-score-heading-${report.app.appId}`;
  return (
    <section
      aria-labelledby={headingId}
      className="overflow-hidden rounded-2xl border bg-card shadow-sm"
    >
      <h2 id={headingId} className="sr-only">
        ASO score card for {report.app.name}
      </h2>
      <div className="flex items-center gap-4 border-b px-5 py-4">
        {report.app.iconUrl ? (
          <img src={report.app.iconUrl} alt="" className="size-14 rounded-xl border" />
        ) : (
          <div className="size-14 rounded-xl bg-muted" aria-hidden="true" />
        )}
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">{report.app.name}</div>
          <div className="truncate text-xs text-muted-foreground">
            {report.app.developer} · {report.app.category} · {report.app.country.toUpperCase()}
          </div>
        </div>
        <ScoreRing score={report.overallScore} />
      </div>

      <ul className="grid grid-cols-1 gap-x-6 gap-y-3 px-5 py-4 sm:grid-cols-2">
        {report.dimensions.map((d) => (
          <DimensionRow key={d.dimension} dimension={d.dimension} score={d.score} weight={d.weight} />
        ))}
      </ul>
    </section>
  );
}

function ScoreRing({ score }: { score: number }) {
  const tone = scoreTone(score);
  return (
    <div
      className="flex flex-col items-center"
      role="img"
      aria-label={`Overall ASO score: ${score} out of 100`}
    >
      <div
        className="grid size-16 place-items-center rounded-full"
        style={{
          background: `conic-gradient(${tone} ${score * 3.6}deg, var(--color-muted) 0deg)`,
        }}
        aria-hidden="true"
      >
        <div className="grid size-12 place-items-center rounded-full bg-card">
          <span className="text-base font-bold tabular-nums">{score}</span>
        </div>
      </div>
      <span aria-hidden="true" className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">/ 100</span>
    </div>
  );
}

function DimensionRow({ dimension, score, weight }: { dimension: string; score: number | null; weight: number }) {
  const label = DIMENSION_LABELS[dimension] ?? dimension;
  if (score === null) {
    return (
      <li
        className="flex items-center gap-3"
        aria-label={`${label}: unavailable (weight ${weight} percent)`}
      >
        <span aria-hidden="true" className="w-32 shrink-0 text-xs font-medium">{label}</span>
        <div aria-hidden="true" className="h-1.5 flex-1 rounded-full bg-muted/40" />
        <span aria-hidden="true" className="w-12 text-right text-[11px] uppercase tracking-wider text-muted-foreground">N/A</span>
      </li>
    );
  }
  const tone = scoreTone(score * 10);
  return (
    <li
      className="flex items-center gap-3"
      aria-label={`${label}: ${score.toFixed(1)} out of 10 (weight ${weight} percent)`}
    >
      <span aria-hidden="true" className="w-32 shrink-0 truncate text-xs font-medium" title={label}>{label}</span>
      <div aria-hidden="true" className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full transition-all" style={{ width: `${score * 10}%`, background: tone }} />
      </div>
      <span aria-hidden="true" className="w-14 text-right text-[11px] tabular-nums text-muted-foreground">
        <span className="font-semibold text-foreground">{score.toFixed(1)}</span>
        <span className="ml-0.5">/10</span>
      </span>
      <span aria-hidden="true" className="hidden w-10 text-right text-[10px] text-muted-foreground sm:inline">{weight}%</span>
    </li>
  );
}

export function scoreTone(scoreOutOf100: number): string {
  if (scoreOutOf100 >= 75) return 'var(--color-good)';
  if (scoreOutOf100 >= 50) return 'var(--color-warn)';
  return 'var(--color-bad)';
}
