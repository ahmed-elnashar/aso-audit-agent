'use client';

import { useState } from 'react';
import { useRecentAudits } from '@/hooks/use-recent-audits';
import type { RecentAuditEntry } from '@/lib/recent-audits-storage';
import { AuditReportView } from './AuditReportView';

export function RecentAuditsList() {
  const { entries, clear } = useRecentAudits();
  const [opened, setOpened] = useState<RecentAuditEntry | null>(null);

  if (opened) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setOpened(null)}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            ← Back to recent
          </button>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            cached · {relativeTime(opened.generatedAt)}
          </span>
        </div>
        <AuditReportView report={opened.report} />
      </div>
    );
  }

  if (entries.length === 0) return null;

  return (
    <section aria-labelledby="recent-audits-heading" className="mx-auto mt-10 max-w-xl text-left">
      <div className="mb-3 flex items-center justify-between">
        <h3 id="recent-audits-heading" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Recent audits
        </h3>
        <button
          onClick={clear}
          className="text-[11px] text-muted-foreground hover:text-foreground"
          title="Remove all cached audits"
        >
          Clear
        </button>
      </div>
      <ul className="divide-y rounded-2xl border bg-card">
        {entries.map((e) => (
          <li key={e.appId}>
            <button
              onClick={() => setOpened(e)}
              className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition hover:bg-muted/40"
            >
              {e.iconUrl ? (
                <img src={e.iconUrl} alt="" className="size-9 shrink-0 rounded-lg border object-cover" />
              ) : (
                <div className="size-9 shrink-0 rounded-lg bg-muted" />
              )}
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{e.name}</div>
                <div className="text-[11px] text-muted-foreground">{relativeTime(e.generatedAt)}</div>
              </div>
              <ScoreChip score={e.overallScore} />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ScoreChip({ score }: { score: number }) {
  const tone =
    score >= 80 ? 'bg-good/10 text-good' : score >= 60 ? 'bg-accent/10 text-accent' : 'bg-bad/10 text-bad';
  return (
    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${tone}`}>{score}</span>
  );
}

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diffMs = Date.now() - then;
  const minutes = Math.round(diffMs / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}
