import { describe, expect, it, beforeEach } from 'vitest';
import {
  addRecentAudit,
  clearRecentAudits,
  getRecentAudit,
  listRecentAudits,
  RECENT_AUDITS_MAX_ENTRIES,
} from './recent-audits-storage';
import type { AuditReport } from '../audit/types';

function makeStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
    _peek: () => Object.fromEntries(map.entries()),
  };
}

function makeReport(appId: string, score = 70): AuditReport {
  return {
    app: {
      appId,
      name: `App ${appId}`,
      developer: 'dev',
      category: 'Productivity',
      country: 'us',
      iconUrl: `https://cdn/${appId}.png`,
      appStoreUrl: `https://apps.apple.com/us/app/id${appId}`,
      version: '1.0',
      currentVersionReleaseDate: null,
      screenshotUrls: [],
      ipadScreenshotUrls: [],
      averageRating: null,
      ratingCount: null,
    },
    overallScore: score,
    dimensions: [],
    competitors: [],
    quickWins: [],
    highImpact: [],
    strategic: [],
    generatedAt: new Date(2026, 4, 1).toISOString(),
  };
}

describe('recent-audits-storage', () => {
  let storage: ReturnType<typeof makeStorage>;

  beforeEach(() => {
    storage = makeStorage();
  });

  it('returns an empty list when nothing is stored', () => {
    expect(listRecentAudits(storage)).toEqual([]);
  });

  it('adds an entry and reads it back', () => {
    addRecentAudit(makeReport('1', 80), storage);
    const list = listRecentAudits(storage);
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ appId: '1', overallScore: 80, name: 'App 1' });
  });

  it('replaces an existing entry for the same appId rather than duplicating it', () => {
    addRecentAudit(makeReport('1', 70), storage);
    addRecentAudit(makeReport('1', 85), storage);
    const list = listRecentAudits(storage);
    expect(list).toHaveLength(1);
    expect(list[0].overallScore).toBe(85);
  });

  it('orders entries most-recent-first', () => {
    addRecentAudit(makeReport('a'), storage);
    addRecentAudit(makeReport('b'), storage);
    addRecentAudit(makeReport('c'), storage);
    expect(listRecentAudits(storage).map((e) => e.appId)).toEqual(['c', 'b', 'a']);
  });

  it(`caps the list at ${RECENT_AUDITS_MAX_ENTRIES} entries, evicting the oldest`, () => {
    for (let i = 0; i < RECENT_AUDITS_MAX_ENTRIES + 2; i++) {
      addRecentAudit(makeReport(String(i)), storage);
    }
    const list = listRecentAudits(storage);
    expect(list).toHaveLength(RECENT_AUDITS_MAX_ENTRIES);
    // First two added (ids '0' and '1') should have been evicted.
    expect(list.map((e) => e.appId)).not.toContain('0');
    expect(list.map((e) => e.appId)).not.toContain('1');
  });

  it('returns null from getRecentAudit when no entry matches', () => {
    addRecentAudit(makeReport('1'), storage);
    expect(getRecentAudit('missing', storage)).toBeNull();
    expect(getRecentAudit('1', storage)?.appId).toBe('1');
  });

  it('clears the store', () => {
    addRecentAudit(makeReport('1'), storage);
    clearRecentAudits(storage);
    expect(listRecentAudits(storage)).toEqual([]);
  });

  it('returns an empty list when persisted JSON is malformed', () => {
    storage.setItem('aso-audit:recent', 'not-json{');
    expect(listRecentAudits(storage)).toEqual([]);
  });

  it('returns an empty list when the schemaVersion does not match', () => {
    storage.setItem(
      'aso-audit:recent',
      JSON.stringify({ schemaVersion: 99, entries: [{ appId: 'x' }] })
    );
    expect(listRecentAudits(storage)).toEqual([]);
  });
});
