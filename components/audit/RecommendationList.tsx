'use client';

import { DIMENSION_SHORT_LABELS } from '@/audit/dimension-labels';
import type { Recommendation } from '@/audit/types';

export function RecommendationList({ recommendations }: { recommendations: Recommendation[] }) {
  return (
    <div className="divide-y">
      {recommendations.map((r, i) => (
        <RecommendationRow key={i} recommendation={r} />
      ))}
    </div>
  );
}

function RecommendationRow({ recommendation: r }: { recommendation: Recommendation }) {
  return (
    <article className="px-4 py-4">
      <header className="flex items-start gap-2">
        <span className="rounded-full border bg-muted/50 px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
          {DIMENSION_SHORT_LABELS[r.dimension]}
        </span>
      </header>
      <p className="mt-2 text-xs text-muted-foreground">{r.evidence}</p>
      {(r.before || r.after) && (
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {r.before && <BeforeAfter label="Before" text={r.before} tone="bad" />}
          {r.after && <BeforeAfter label="After" text={r.after} tone="good" />}
        </div>
      )}
      <p className="mt-3 text-xs leading-5 text-foreground">{r.reasoning}</p>
    </article>
  );
}

function BeforeAfter({ label, text, tone }: { label: string; text: string; tone: 'good' | 'bad' }) {
  const borderColor = tone === 'good' ? 'var(--color-good)' : 'var(--color-bad)';
  return (
    <div
      className="rounded-md border bg-muted/30 p-2.5"
      style={{ borderLeft: `3px solid ${borderColor}` }}
    >
      <div className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      <p className="mt-1 font-mono text-[12px] leading-5 text-foreground break-words">{text}</p>
    </div>
  );
}
