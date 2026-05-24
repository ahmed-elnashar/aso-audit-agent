'use client';

import { useSyncExternalStore } from 'react';
import {
  addRecentAudit,
  clearRecentAudits,
  listRecentAudits,
  RECENT_AUDITS_STORAGE_KEY,
  type RecentAuditEntry,
} from '@/lib/recent-audits-storage';
import type { AuditReport } from '@/audit/types';

type Listener = () => void;

const listeners = new Set<Listener>();

function notify() {
  for (const l of listeners) l();
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  // Cross-tab sync: localStorage emits a 'storage' event in other tabs only,
  // so this still helps if the user opens the app in two tabs.
  const onStorage = (e: StorageEvent) => {
    if (e.key === RECENT_AUDITS_STORAGE_KEY) listener();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

function getSnapshot(): RecentAuditEntry[] {
  return listRecentAudits();
}

const EMPTY: RecentAuditEntry[] = [];
function getServerSnapshot(): RecentAuditEntry[] {
  return EMPTY;
}

/**
 * React hook over the recent-audits storage. `entries` is reactive: any
 * component using the hook re-renders when `add` or `clear` is called from
 * any component in this tab (via the listener set) or from another tab
 * (via the `storage` event).
 */
export function useRecentAudits() {
  const entries = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return {
    entries,
    add: (report: AuditReport) => {
      addRecentAudit(report);
      notify();
    },
    clear: () => {
      clearRecentAudits();
      notify();
    },
  };
}
