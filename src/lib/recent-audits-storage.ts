import type { AuditReport } from '../audit/types';

const STORAGE_KEY = 'aso-audit:recent';
const MAX_ENTRIES = 5;
const SCHEMA_VERSION = 1;

export interface RecentAuditEntry {
  appId: string;
  name: string;
  iconUrl: string | null;
  overallScore: number;
  generatedAt: string;
  report: AuditReport;
}

interface PersistedShape {
  schemaVersion: number;
  entries: RecentAuditEntry[];
}

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function defaultStorage(): StorageLike | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function listRecentAudits(storage: StorageLike | null = defaultStorage()): RecentAuditEntry[] {
  if (!storage) return [];
  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as PersistedShape;
    if (parsed?.schemaVersion !== SCHEMA_VERSION || !Array.isArray(parsed.entries)) return [];
    return parsed.entries;
  } catch {
    return [];
  }
}

export function getRecentAudit(
  appId: string,
  storage: StorageLike | null = defaultStorage()
): RecentAuditEntry | null {
  return listRecentAudits(storage).find((e) => e.appId === appId) ?? null;
}

/**
 * Inserts a report at the front. If an entry for the same appId already
 * exists, it is replaced in place (we don't want duplicates) and bubbled
 * to the front. Evicts the oldest when the cap is exceeded.
 */
export function addRecentAudit(
  report: AuditReport,
  storage: StorageLike | null = defaultStorage()
): RecentAuditEntry[] {
  if (!storage) return [];
  const entry: RecentAuditEntry = {
    appId: report.app.appId,
    name: report.app.name,
    iconUrl: report.app.iconUrl,
    overallScore: report.overallScore,
    generatedAt: report.generatedAt,
    report,
  };
  const existing = listRecentAudits(storage).filter((e) => e.appId !== entry.appId);
  const next = [entry, ...existing].slice(0, MAX_ENTRIES);
  storage.setItem(STORAGE_KEY, JSON.stringify({ schemaVersion: SCHEMA_VERSION, entries: next }));
  return next;
}

export function clearRecentAudits(storage: StorageLike | null = defaultStorage()): void {
  if (!storage) return;
  storage.removeItem(STORAGE_KEY);
}

export const RECENT_AUDITS_MAX_ENTRIES = MAX_ENTRIES;
export const RECENT_AUDITS_STORAGE_KEY = STORAGE_KEY;
