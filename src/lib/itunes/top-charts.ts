import { z } from 'zod';
import { ItunesApiError } from './types';

const ChartEntrySchema = z
  .object({
    id: z
      .object({
        label: z.string(),
        attributes: z.object({ 'im:id': z.string() }).passthrough().optional(),
      })
      .passthrough(),
    'im:name': z.object({ label: z.string() }).optional(),
    'im:artist': z.object({ label: z.string() }).optional(),
  })
  .passthrough();

const ChartFeedSchema = z
  .object({
    feed: z
      .object({
        entry: z.union([z.array(ChartEntrySchema), ChartEntrySchema]).optional(),
      })
      .passthrough(),
  })
  .passthrough();

export interface TopChartEntry {
  appId: string;
  name: string;
  developer: string;
  rank: number;
}

export interface FetchTopChartsOptions {
  genreId: number;
  country?: string;
  limit?: number;
  signal?: AbortSignal;
}

export async function fetchTopCharts({
  genreId,
  country = 'us',
  limit = 10,
  signal,
}: FetchTopChartsOptions): Promise<TopChartEntry[]> {
  const url = `https://itunes.apple.com/${encodeURIComponent(country)}/rss/topfreeapplications/limit=${limit}/genre=${genreId}/json`;
  const res = await fetch(url, { signal });
  if (!res.ok) {
    throw new ItunesApiError(`iTunes top charts HTTP ${res.status}`, res.status);
  }
  const json = await res.json();
  const parsed = ChartFeedSchema.safeParse(json);
  if (!parsed.success) {
    throw new ItunesApiError(`iTunes top charts shape unexpected: ${parsed.error.message}`);
  }
  const raw = parsed.data.feed.entry;
  if (!raw) return [];
  const entries = Array.isArray(raw) ? raw : [raw];
  return entries
    .map((entry, idx) => {
      const appId = entry.id.attributes?.['im:id'];
      const name = entry['im:name']?.label;
      const developer = entry['im:artist']?.label;
      if (!appId || !name) return null;
      return { appId, name, developer: developer ?? '', rank: idx + 1 };
    })
    .filter((x): x is TopChartEntry => x !== null);
}
