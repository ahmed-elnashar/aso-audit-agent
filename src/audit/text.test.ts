import { describe, expect, it } from 'vitest';
import { daysSince, jaccardOverlap, keywordTokens, tokenize } from './text';

describe('tokenize', () => {
  it('lowercases and splits on non-alphanumerics', () => {
    expect(tokenize('Notion: Notes, Tasks & AI')).toEqual(['notion', 'notes', 'tasks', 'ai']);
  });

  it('returns [] for null / undefined / empty', () => {
    expect(tokenize(null)).toEqual([]);
    expect(tokenize(undefined)).toEqual([]);
    expect(tokenize('')).toEqual([]);
  });
});

describe('keywordTokens', () => {
  it('drops stop words and short tokens', () => {
    expect([...keywordTokens('the best free app for you')]).toEqual([]);
  });

  it('keeps content-bearing tokens, deduped', () => {
    const tokens = keywordTokens('Notes, Tasks, Notes & Wikis');
    expect([...tokens].sort()).toEqual(['notes', 'tasks', 'wikis']);
  });
});

describe('jaccardOverlap', () => {
  it('is 1 when both sets are empty', () => {
    expect(jaccardOverlap(new Set(), new Set())).toBe(1);
  });

  it('is 0 when sets are disjoint', () => {
    expect(jaccardOverlap(new Set(['a']), new Set(['b']))).toBe(0);
  });

  it('is intersection / union otherwise', () => {
    // {a,b,c} ∩ {b,c,d} = {b,c} (size 2); union = {a,b,c,d} (size 4) → 0.5
    expect(jaccardOverlap(new Set(['a', 'b', 'c']), new Set(['b', 'c', 'd']))).toBe(0.5);
  });
});

describe('daysSince', () => {
  it('returns null for null / invalid input', () => {
    expect(daysSince(null)).toBe(null);
    expect(daysSince(undefined)).toBe(null);
    expect(daysSince('not a date')).toBe(null);
  });

  it('returns integer days since the given ISO date relative to "now"', () => {
    const now = new Date('2026-01-15T12:00:00Z').getTime();
    expect(daysSince('2026-01-01T12:00:00Z', now)).toBe(14);
    expect(daysSince('2026-01-15T11:00:00Z', now)).toBe(0);
  });

  it('clamps to 0 for future dates', () => {
    const now = new Date('2026-01-01T00:00:00Z').getTime();
    expect(daysSince('2026-06-01T00:00:00Z', now)).toBe(0);
  });
});

