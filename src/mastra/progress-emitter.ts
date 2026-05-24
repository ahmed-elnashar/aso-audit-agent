/**
 * Bridges progress events from inside a workflow step out to the HTTP handler
 * that owns the request. Keyed by runId so each in-flight audit has its own
 * subscriber. Lives in module scope — the emitter and the subscriber are
 * always in the same Node process (Vercel function instance) for the lifetime
 * of a single request because both run inside the same `POST /api/audit/resume`
 * invocation.
 */
export type ProgressStage =
  | 'fetching-listing-data'
  | 'fetching-competitors'
  | 'deterministic'
  | 'qualitative-start'
  | 'qualitative-done'
  | 'qualitative-skipped'
  | 'aggregating';

export interface ProgressEvent {
  stage: ProgressStage;
  detail?: string;
}

type Listener = (event: ProgressEvent) => void;

const listeners = new Map<string, Set<Listener>>();

export function subscribeProgress(runId: string, listener: Listener): () => void {
  const set = listeners.get(runId) ?? new Set<Listener>();
  set.add(listener);
  listeners.set(runId, set);
  return () => {
    set.delete(listener);
    if (set.size === 0) listeners.delete(runId);
  };
}

export function emitProgress(runId: string, event: ProgressEvent): void {
  const set = listeners.get(runId);
  if (!set) return;
  for (const listener of set) listener(event);
}
