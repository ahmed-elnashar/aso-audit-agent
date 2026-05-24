import {
  AppNotFoundError,
  ItunesApiError,
  ItunesLookupResponseSchema,
  type ItunesLookupResult,
} from './types';

export interface LookupOptions {
  appId: string;
  country?: string;
  signal?: AbortSignal;
}

export async function lookupApp({
  appId,
  country = 'us',
  signal,
}: LookupOptions): Promise<ItunesLookupResult> {
  const url = `https://itunes.apple.com/lookup?id=${encodeURIComponent(appId)}&country=${encodeURIComponent(country)}&entity=software`;
  const res = await fetch(url, { signal });
  if (!res.ok) {
    throw new ItunesApiError(`iTunes lookup HTTP ${res.status}`, res.status);
  }
  const json = await res.json();
  const parsed = ItunesLookupResponseSchema.safeParse(json);
  if (!parsed.success) {
    throw new ItunesApiError(`iTunes lookup response shape unexpected: ${parsed.error.message}`);
  }
  if (parsed.data.resultCount === 0 || parsed.data.results.length === 0) {
    throw new AppNotFoundError(appId, country);
  }
  return parsed.data.results[0]!;
}

export async function lookupApps({
  appIds,
  country = 'us',
  signal,
}: {
  appIds: string[];
  country?: string;
  signal?: AbortSignal;
}): Promise<ItunesLookupResult[]> {
  if (appIds.length === 0) return [];
  const url = `https://itunes.apple.com/lookup?id=${appIds.map(encodeURIComponent).join(',')}&country=${encodeURIComponent(country)}&entity=software`;
  const res = await fetch(url, { signal });
  if (!res.ok) {
    throw new ItunesApiError(`iTunes batch lookup HTTP ${res.status}`, res.status);
  }
  const json = await res.json();
  const parsed = ItunesLookupResponseSchema.safeParse(json);
  if (!parsed.success) {
    throw new ItunesApiError(`iTunes batch lookup response shape unexpected: ${parsed.error.message}`);
  }
  return parsed.data.results;
}
