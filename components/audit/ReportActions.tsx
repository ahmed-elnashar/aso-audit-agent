'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useRecentAudits } from '@/hooks/use-recent-audits';
import { reportToMarkdown } from '@/audit/export-markdown';
import type { AuditReport } from '@/audit/types';

type Menu = 'none' | 'compare' | 'export';

export function ReportActions({ report }: { report: AuditReport }) {
  const { entries } = useRecentAudits();
  const router = useRouter();
  const [menu, setMenu] = useState<Menu>('none');
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Don't let the user compare an audit with itself.
  const compareCandidates = entries.filter((e) => e.appId !== report.app.appId);

  useEffect(() => {
    if (menu === 'none') return;
    const onClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setMenu('none');
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenu('none');
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [menu]);

  const compareWith = (otherAppId: string) => {
    router.push(`/compare?a=${encodeURIComponent(report.app.appId)}&b=${encodeURIComponent(otherAppId)}`);
  };

  const downloadMarkdown = () => {
    const md = reportToMarkdown(report);
    const slug = report.app.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aso-audit-${slug || report.app.appId}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setMenu('none');
  };

  const printToPdf = () => {
    setMenu('none');
    // Defer to next tick so the menu unmounts before the print dialog steals focus.
    setTimeout(() => window.print(), 0);
  };

  return (
    <div className="relative flex items-center gap-2 print:hidden" ref={wrapperRef}>
      <PillButton
        onClick={() => setMenu(menu === 'compare' ? 'none' : 'compare')}
        disabled={compareCandidates.length === 0}
        ariaExpanded={menu === 'compare'}
        title={
          compareCandidates.length === 0
            ? 'Audit another app first, then you can compare them side-by-side.'
            : 'Compare this audit with another recent one'
        }
      >
        Compare with…
      </PillButton>
      <PillButton
        onClick={() => setMenu(menu === 'export' ? 'none' : 'export')}
        ariaExpanded={menu === 'export'}
        title="Download the report or print it as a PDF"
      >
        Export
      </PillButton>

      {menu === 'compare' && compareCandidates.length > 0 && (
        <PopoverMenu ariaLabel="Compare with a recent audit">
          <ul className="divide-y">
            {compareCandidates.map((e) => (
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
        </PopoverMenu>
      )}

      {menu === 'export' && (
        <PopoverMenu ariaLabel="Export options">
          <ul className="divide-y">
            <li>
              <button
                role="menuitem"
                onClick={downloadMarkdown}
                className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-xs transition hover:bg-muted/50"
              >
                <span className="font-medium">Download as Markdown</span>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">.md</span>
              </button>
            </li>
            <li>
              <button
                role="menuitem"
                onClick={printToPdf}
                className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-xs transition hover:bg-muted/50"
              >
                <span className="font-medium">Save as PDF</span>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">print</span>
              </button>
            </li>
          </ul>
        </PopoverMenu>
      )}
    </div>
  );
}

function PillButton({
  children,
  onClick,
  disabled,
  ariaExpanded,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  ariaExpanded: boolean;
  title: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-haspopup="menu"
      aria-expanded={ariaExpanded}
      title={title}
      className="rounded-full border px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-muted-foreground"
    >
      {children}
    </button>
  );
}

function PopoverMenu({
  children,
  ariaLabel,
}: {
  children: React.ReactNode;
  ariaLabel: string;
}) {
  return (
    <div
      role="menu"
      aria-label={ariaLabel}
      className="absolute right-0 top-full z-10 mt-1 w-64 overflow-hidden rounded-xl border bg-card shadow-md"
    >
      {children}
    </div>
  );
}
