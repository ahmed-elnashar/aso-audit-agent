import { z } from 'zod';
import { ItunesApiError } from './types';

const ReviewEntrySchema = z
  .object({
    id: z.object({ label: z.string() }).optional(),
    author: z.object({ name: z.object({ label: z.string() }).optional() }).optional(),
    title: z.object({ label: z.string() }).optional(),
    content: z.object({ label: z.string() }).optional(),
    'im:rating': z.object({ label: z.string() }).optional(),
    'im:version': z.object({ label: z.string() }).optional(),
    updated: z.object({ label: z.string() }).optional(),
  })
  .passthrough();

const ReviewsFeedSchema = z
  .object({
    feed: z
      .object({
        entry: z.union([z.array(ReviewEntrySchema), ReviewEntrySchema]).optional(),
      })
      .passthrough(),
  })
  .passthrough();

export interface Review {
  id: string;
  author: string;
  rating: number;
  title: string;
  body: string;
  updatedAt: string;
  version: string | null;
}

export interface FetchReviewsOptions {
  appId: string;
  country?: string;
  pages?: number;
  signal?: AbortSignal;
}

export async function fetchReviews({
  appId,
  country = 'us',
  pages = 1,
  signal,
}: FetchReviewsOptions): Promise<Review[]> {
  const all: Review[] = [];
  for (let page = 1; page <= pages; page++) {
    const url = `https://itunes.apple.com/${encodeURIComponent(country)}/rss/customerreviews/page=${page}/id=${encodeURIComponent(appId)}/sortBy=mostRecent/json`;
    const res = await fetch(url, { signal });
    if (!res.ok) {
      if (page === 1) {
        throw new ItunesApiError(`iTunes reviews HTTP ${res.status}`, res.status);
      }
      break;
    }
    const json = await res.json();
    const parsed = ReviewsFeedSchema.safeParse(json);
    if (!parsed.success) break;
    const raw = parsed.data.feed.entry;
    if (!raw) break;
    const entries = Array.isArray(raw) ? raw : [raw];
    const reviews = entries
      .filter((e) => e.content && e['im:rating'])
      .map((e) => {
        const rating = Number(e['im:rating']!.label);
        if (!Number.isFinite(rating)) return null;
        return {
          id: e.id?.label ?? '',
          author: e.author?.name?.label ?? 'Anonymous',
          rating,
          title: e.title?.label ?? '',
          body: e.content!.label,
          updatedAt: e.updated?.label ?? '',
          version: e['im:version']?.label ?? null,
        };
      })
      .filter((r): r is Review => r !== null);
    if (reviews.length === 0) break;
    all.push(...reviews);
  }
  return all;
}
