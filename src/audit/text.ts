const STOP_WORDS = new Set([
  'the',
  'a',
  'an',
  'and',
  'or',
  'for',
  'to',
  'of',
  'in',
  'on',
  'with',
  'your',
  'you',
  'is',
  'be',
  'are',
  'app',
  'free',
  'best',
  'new',
  'now',
  'all',
  'my',
]);

export function tokenize(text: string | null | undefined): string[] {
  if (!text) return [];
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

export function keywordTokens(text: string | null | undefined): Set<string> {
  return new Set(tokenize(text).filter((t) => t.length > 2 && !STOP_WORDS.has(t)));
}

export function firstNChars(text: string, n: number): string {
  if (text.length <= n) return text;
  return text.slice(0, n);
}

export function jaccardOverlap(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  const intersection = new Set([...a].filter((x) => b.has(x)));
  const union = new Set([...a, ...b]);
  return intersection.size / union.size;
}

export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

export function daysSince(iso: string | null | undefined, now = Date.now()): number | null {
  if (!iso) return null;
  const ts = Date.parse(iso);
  if (Number.isNaN(ts)) return null;
  return Math.max(0, Math.floor((now - ts) / 86400000));
}
