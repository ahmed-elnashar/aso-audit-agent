'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useRecentAudits } from '@/hooks/use-recent-audits';
import type { AuditReport } from '@/audit/types';

export function ReportActions({ report }: { report: AuditReport }) {
  const { entries } = useRecentAudits();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Don't let the user compare an audit with itself.
  const candidates = entries.filter((e) => e.appId !== report.app.appId);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const compareWith = (otherAppId: string) => {
    router.push(`/compare?a=${encodeURIComponent(report.app.appId)}&b=${encodeURIComponent(otherAppId)}`);
  };

  return (
    <div className="relative" ref={popoverRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={candidates.length === 0}
        aria-haspopup="menu"
        aria-expanded={open}
        className="rounded-full border px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-muted-foreground"
        title={
          candidates.length === 0
            ? 'Audit another app first, then you can compare them side-by-side.'
            : 'Compare this audit with another recent one'
        }
      >
        Compare with…
      </button>
      {open && candidates.length > 0 && (
        <div
          role="menu"
          aria-label="Compare with a recent audit"
          className="absolute right-0 z-10 mt-1 w-64 overflow-hidden rounded-xl border bg-card shadow-md"
        >
          <ul className="divide-y">
            {candidates.map((e) => (
              <li key={e.appId}>
                <button
                  role="menuitem"
                  onClick={() => compareWith(e.appId)}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs transition hover:bg-muted/50"
                >
                  {e.iconUrl ? (
                    <img src={e.iconUrl} alt="" className="size-7 shrink-0 rounded-md border object-cover" />
                  ) : (
                    <div className="size-7 shrink-0 rounded-md bg-muted" />
                  )}
                  <span className="min-w-0 flex-1 truncate font-medium">{e.name}</span>
                  <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">{e.overallScore}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
