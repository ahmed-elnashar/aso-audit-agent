'use client';

import { useState } from 'react';
import { ScoreCard } from './ScoreCard';
import { RecommendationList } from './RecommendationList';
import { CompetitorTable } from './CompetitorTable';
import type { AuditReport } from '@/audit/types';

export type { AuditReport };

type Tab = 'quick-win' | 'high-impact' | 'strategic';

export function AuditReportView({ report }: { report: AuditReport }) {
  const [tab, setTab] = useState<Tab>('quick-win');
  const buckets = {
    'quick-win': report.quickWins,
    'high-impact': report.highImpact,
    strategic: report.strategic,
  } as const;
  const labels: Record<Tab, string> = {
    'quick-win': 'Quick Wins',
    'high-impact': 'High Impact',
    strategic: 'Strategic',
  };

  return (
    <div className="space-y-5">
      <ScoreCard report={report} />

      <section aria-labelledby="recommendations-heading" className="overflow-hidden rounded-2xl border bg-card">
        <h2 id="recommendations-heading" className="sr-only">
          Recommendations
        </h2>
        <div role="tablist" aria-label="Recommendation category" className="flex items-center gap-1 border-b px-3 py-2">
          {(Object.keys(buckets) as Tab[]).map((t) => {
            const count = buckets[t].length;
            const active = tab === t;
            return (
              <button
                key={t}
                role="tab"
                aria-selected={active}
                onClick={() => setTab(t)}
                className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition ${
                  active
                    ? 'bg-foreground/5 text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {labels[t]}
                <span className="ml-1.5 text-[10px] text-muted-foreground" aria-label={`${count} items`}>{count}</span>
              </button>
            );
          })}
        </div>
        <div className="divide-y">
          {buckets[tab].length === 0 ? (
            <p className="px-4 py-6 text-xs text-muted-foreground">
              Nothing in this bucket. Either everything looks good or the data wasn't available.
            </p>
          ) : (
            <RecommendationList recommendations={buckets[tab]} />
          )}
        </div>
      </section>

      {report.competitors.length > 0 && <CompetitorTable target={report.app} competitors={report.competitors} />}

      <p className="px-1 text-xs text-muted-foreground">
        Generated {new Date(report.generatedAt).toLocaleString()} ·
        {' '}<a
          href={report.app.appStoreUrl}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-block py-1 underline underline-offset-2"
        >
          App Store listing
        </a>
      </p>
    </div>
  );
}
