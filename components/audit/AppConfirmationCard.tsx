'use client';

import { useState } from 'react';
import { AuditReportView, type AuditReport } from './AuditReportView';

interface Candidate {
  name: string;
  developer: string;
  category: string;
  iconUrl: string | null;
  appStoreUrl: string;
}

interface AppConfirmationCardProps {
  runId: string;
  candidate: Candidate;
}

type State =
  | { kind: 'idle' }
  | { kind: 'running' }
  | { kind: 'done'; report: AuditReport }
  | { kind: 'cancelled' }
  | { kind: 'error'; message: string };

const PROGRESS_LABELS = [
  'Fetching reviews and screenshots…',
  'Pulling top apps in this category…',
  'Scoring 10 ASO dimensions…',
  'Asking the model for qualitative judgement…',
  'Assembling the report…',
];

export function AppConfirmationCard({ runId, candidate }: AppConfirmationCardProps) {
  const [state, setState] = useState<State>({ kind: 'idle' });

  const respond = async (approved: boolean) => {
    setState({ kind: 'running' });
    try {
      const res = await fetch('/api/audit/resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runId, approved }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        setState({ kind: 'error', message: body.error ?? `HTTP ${res.status}` });
        return;
      }
      const out = (await res.json()) as { status: 'completed' | 'cancelled'; report: AuditReport | null };
      if (out.status === 'cancelled') {
        setState({ kind: 'cancelled' });
        return;
      }
      if (out.status !== 'completed' || !out.report) {
        setState({ kind: 'error', message: 'Audit did not complete.' });
        return;
      }
      setState({ kind: 'done', report: out.report });
    } catch (err) {
      setState({ kind: 'error', message: err instanceof Error ? err.message : 'unknown error' });
    }
  };

  if (state.kind === 'done') {
    return <AuditReportView report={state.report} />;
  }

  if (state.kind === 'cancelled') {
    return (
      <div className="rounded-xl border bg-card px-3 py-2 text-xs text-muted-foreground">
        Audit cancelled. Paste a different URL when you're ready.
      </div>
    );
  }

  if (state.kind === 'error') {
    return (
      <div className="rounded-xl border border-bad/40 bg-bad/5 px-3 py-2 text-xs">
        <div className="font-medium text-bad">Could not run the audit</div>
        <div className="mt-0.5 text-muted-foreground">{state.message}</div>
      </div>
    );
  }

  if (state.kind === 'running') {
    return <RunningProgress />;
  }

  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      <div className="flex items-center gap-4 px-4 py-4">
        {candidate.iconUrl ? (
          <img
            src={candidate.iconUrl}
            alt=""
            className="size-16 shrink-0 rounded-xl border object-cover"
          />
        ) : (
          <div className="size-16 shrink-0 rounded-xl bg-muted" />
        )}
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">{candidate.name}</div>
          <div className="truncate text-xs text-muted-foreground">
            {candidate.developer} · {candidate.category}
          </div>
          <a
            href={candidate.appStoreUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="mt-1 inline-block text-[11px] text-accent underline decoration-accent/30 underline-offset-2 hover:decoration-accent"
          >
            View on App Store
          </a>
        </div>
      </div>
      <div className="flex border-t bg-muted/40">
        <button
          onClick={() => respond(false)}
          className="flex-1 border-r py-2.5 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          Not this one
        </button>
        <button
          onClick={() => respond(true)}
          className="flex-1 py-2.5 text-xs font-semibold text-accent transition hover:bg-accent/5"
        >
          Run the audit →
        </button>
      </div>
    </div>
  );
}

function RunningProgress() {
  const [idx, setIdx] = useState(0);
  if (typeof window !== 'undefined') {
    setTimeout(() => setIdx((i) => Math.min(i + 1, PROGRESS_LABELS.length - 1)), 2500);
  }
  return (
    <div className="overflow-hidden rounded-2xl border bg-card px-4 py-4">
      <div className="flex items-center gap-3">
        <Spinner />
        <div className="flex-1">
          <div className="text-xs font-medium">Auditing — this takes about 10-15 seconds.</div>
          <div className="mt-0.5 text-[11px] text-muted-foreground transition-all">
            {PROGRESS_LABELS[idx]}
          </div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-1">
        {PROGRESS_LABELS.map((_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full ${i <= idx ? 'bg-accent' : 'bg-muted'}`}
          />
        ))}
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <svg className="size-4 shrink-0 animate-spin text-accent" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
