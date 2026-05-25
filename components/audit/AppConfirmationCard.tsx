'use client';

import { useEffect, useRef, useState } from 'react';
import { AuditReportView } from './AuditReportView';
import type { AuditReport } from '@/audit/types';
import { useRecentAudits } from '@/hooks/use-recent-audits';

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

type Stage =
  | 'fetching-listing-data'
  | 'fetching-competitors'
  | 'deterministic'
  | 'qualitative-start'
  | 'qualitative-done'
  | 'qualitative-skipped'
  | 'aggregating';

type State =
  | { kind: 'idle' }
  | { kind: 'running'; stage: Stage }
  | { kind: 'done'; report: AuditReport }
  | { kind: 'cancelled' }
  | { kind: 'error'; message: string };

/**
 * Visible-to-user label for each backend stage. Stages that complete in
 * milliseconds (qualitative-done) reuse their predecessor's label so the UI
 * doesn't flash.
 */
const STAGE_LABELS: Record<Stage, string> = {
  'fetching-listing-data': 'Fetching the listing, reviews, and top apps in this category…',
  'fetching-competitors': 'Looking up competitor metadata…',
  deterministic: 'Scoring 10 ASO dimensions…',
  'qualitative-start': 'Asking the model for qualitative judgement…',
  'qualitative-done': 'Assembling the report…',
  'qualitative-skipped': 'Assembling the report (qualitative pass skipped)…',
  aggregating: 'Assembling the report…',
};

const STAGE_ORDER: Stage[] = [
  'fetching-listing-data',
  'fetching-competitors',
  'deterministic',
  'qualitative-start',
  'aggregating',
];

export function AppConfirmationCard({ runId, candidate }: AppConfirmationCardProps) {
  const [state, setState] = useState<State>({ kind: 'idle' });
  const { add } = useRecentAudits();
  const savedRunIdRef = useRef<string | null>(null);

  // Persist a completed audit to localStorage exactly once per runId, even
  // across re-renders / dev-mode double-effects.
  useEffect(() => {
    if (state.kind === 'done' && savedRunIdRef.current !== runId) {
      savedRunIdRef.current = runId;
      add(state.report);
    }
  }, [state, add, runId]);

  const respond = async (approved: boolean) => {
    setState({ kind: 'running', stage: 'fetching-listing-data' });
    try {
      const res = await fetch('/api/audit/resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runId, approved }),
      });
      if (!res.ok || !res.body) {
        const body = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        setState({ kind: 'error', message: body.error ?? `HTTP ${res.status}` });
        return;
      }

      await readEventStream(res.body, (event) => {
        if (event.type === 'progress') {
          setState({ kind: 'running', stage: event.stage });
        } else if (event.type === 'completed') {
          setState({ kind: 'done', report: event.report });
        } else if (event.type === 'cancelled') {
          setState({ kind: 'cancelled' });
        } else if (event.type === 'error') {
          setState({ kind: 'error', message: event.message });
        }
      });
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
    return <RunningProgress stage={state.stage} />;
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

function RunningProgress({ stage }: { stage: Stage }) {
  // qualitative-done / qualitative-skipped don't have their own bar position —
  // they roll into the final 'aggregating' segment.
  const barStage: Stage = stage === 'qualitative-done' || stage === 'qualitative-skipped' ? 'aggregating' : stage;
  const orderIdx = STAGE_ORDER.indexOf(barStage);
  return (
    <div className="overflow-hidden rounded-2xl border bg-card px-4 py-4" role="status" aria-live="polite">
      <div className="flex items-center gap-3">
        <Spinner />
        <div className="flex-1">
          <div className="text-xs font-medium">Auditing — usually 10–20 seconds.</div>
          <div className="mt-0.5 text-[11px] text-muted-foreground transition-all">
            {STAGE_LABELS[stage]}
          </div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-1">
        {STAGE_ORDER.map((_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${i <= orderIdx ? 'bg-accent' : 'bg-muted'}`}
          />
        ))}
      </div>
    </div>
  );
}

async function readEventStream(
  body: ReadableStream<Uint8Array>,
  onEvent: (event: { type: 'progress'; stage: Stage; detail?: string } | { type: 'completed'; report: AuditReport } | { type: 'cancelled' } | { type: 'error'; message: string }) => void
) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  // SSE frames are separated by blank lines. Each frame can have one or more
  // `data:` lines; we concatenate them and JSON.parse the payload.
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let separatorIdx;
    while ((separatorIdx = buffer.indexOf('\n\n')) !== -1) {
      const frame = buffer.slice(0, separatorIdx);
      buffer = buffer.slice(separatorIdx + 2);
      const dataLines = frame
        .split('\n')
        .filter((l) => l.startsWith('data:'))
        .map((l) => l.slice(5).trimStart());
      if (dataLines.length === 0) continue;
      try {
        onEvent(JSON.parse(dataLines.join('\n')));
      } catch {
        // Ignore malformed frames — the stream may still deliver valid ones.
      }
    }
  }
}

function Spinner() {
  return (
    <svg className="size-4 shrink-0 animate-spin text-accent" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
