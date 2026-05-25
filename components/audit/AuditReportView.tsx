'use client';

import { useState } from 'react';
import { ScoreCard } from './ScoreCard';
import { RecommendationList } from './RecommendationList';
import { CompetitorTable } from './CompetitorTable';
import { ReportActions } from './ReportActions';
import type { AuditReport } from '@/audit/types';

type Tab = 'quick-win' | 'high-impact' | 'strategic';
const TAB_ORDER: readonly Tab[] = ['quick-win', 'high-impact', 'strategic'] as const;

const TAB_LABELS: Record<Tab, string> = {
  'quick-win': 'Quick Wins',
  'high-impact': 'High Impact',
  strategic: 'Strategic',
};

export function AuditReportView({ report }: { report: AuditReport }) {
  const [tab, setTab] = useState<Tab>('quick-win');
  const buckets = {
    'quick-win': report.quickWins,
    'high-impact': report.highImpact,
    strategic: report.strategic,
  } as const;

  return (
    // `data-print-root` marks this subtree as the only thing that prints; the
    // print stylesheet hides everything else on the page.
    <div data-print-root className="space-y-5">
      {/* Document-title banner: visible only on print, sits at the top of page 1. */}
      <div className="hidden print:block">
        <p className="text-[9pt] uppercase tracking-[0.18em] text-muted-foreground">ASO Audit Report</p>
        <p className="mt-0.5 text-[9pt] text-muted-foreground">
          Generated {new Date(report.generatedAt).toLocaleString()}
        </p>
      </div>

      <div className="flex items-center justify-end gap-2 print:hidden">
        <ReportActions report={report} />
      </div>

      <ScoreCard report={report} />

      <ScreenshotStrip iphone={report.app.screenshotUrls} ipad={report.app.ipadScreenshotUrls} />

      <section aria-labelledby="recommendations-heading" className="overflow-hidden rounded-2xl border bg-card">
        <h2 id="recommendations-heading" className="sr-only">
          Recommendations
        </h2>

        {/* Screen-only: tabbed view (one bucket at a time). */}
        <div role="tablist" aria-label="Recommendation category" className="flex items-center gap-1 border-b px-3 py-2 print:hidden">
          {TAB_ORDER.map((t) => {
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
                {TAB_LABELS[t]}
                <span className="ml-1.5 text-[10px] text-muted-foreground" aria-label={`${count} items`}>{count}</span>
              </button>
            );
          })}
        </div>
        <div className="divide-y print:hidden">
          {buckets[tab].length === 0 ? (
            <p className="px-4 py-6 text-xs text-muted-foreground">
              Nothing in this bucket. Either everything looks good or the data wasn't available.
            </p>
          ) : (
            <RecommendationList recommendations={buckets[tab]} />
          )}
        </div>

        {/* Print-only: render all three buckets stacked, each with its heading. */}
        <div className="hidden print:block">
          {TAB_ORDER.map((t) => {
            const list = buckets[t];
            if (list.length === 0) return null;
            return (
              <div key={t}>
                <h3 className="border-b px-4 py-2 text-[10pt] font-semibold uppercase tracking-wider text-muted-foreground">
                  {TAB_LABELS[t]} <span className="ml-1 text-muted-foreground/70">({list.length})</span>
                </h3>
                <RecommendationList recommendations={list} />
              </div>
            );
          })}
        </div>
      </section>

      {report.competitors.length > 0 && <CompetitorTable competitors={report.competitors} />}

      <p className="px-1 text-xs text-muted-foreground print:hidden">
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

function ScreenshotStrip({ iphone, ipad }: { iphone: string[]; ipad: string[] }) {
  // Prefer iPhone (the install majority for most categories). Fall back to
  // iPad only when iPhone has none — apps like Notion ship only iPad shots,
  // and a visual reference is more useful than a blank section.
  const usingIphone = iphone.length > 0;
  const urls = usingIphone ? iphone : ipad;
  if (urls.length === 0) return null;
  return (
    <section aria-labelledby="screenshots-heading" className="overflow-hidden rounded-2xl border bg-card">
      <header className="flex items-baseline gap-2 border-b px-4 py-3">
        <h2 id="screenshots-heading" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Screenshots <span className="ml-1 font-normal normal-case text-muted-foreground/70">({urls.length})</span>
        </h2>
        {!usingIphone && (
          <span className="rounded-full border px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
            iPad — no iPhone screenshots in this listing
          </span>
        )}
      </header>
      {/* Horizontal scroll on screen; wraps onto a grid for print so all frames are visible on the PDF. */}
      <div className="flex gap-2 overflow-x-auto p-3 print:flex-wrap print:overflow-visible">
        {urls.map((url, i) => (
          <img
            key={url}
            src={url}
            alt={`Screenshot ${i + 1}`}
            loading="lazy"
            className="h-44 w-auto shrink-0 rounded-md border object-contain print:h-32"
          />
        ))}
      </div>
    </section>
  );
}
