import type { ItunesLookupResult } from '../lib/itunes/types';
import type { Review } from '../lib/itunes/reviews';
import type { ScrapedListing } from '../lib/scrape/listing';

/**
 * Everything an audit dimension needs to know about the target app — the
 * stable, normalized view that pure scoring functions consume. Anything not
 * available is null; functions decide what to do with missing data.
 */
export interface AuditAppInput {
  appId: string;
  country: string;
  name: string;
  developer: string;
  category: string;
  categoryId: number;
  description: string;
  releaseNotes: string | null;
  version: string | null;
  currentVersionReleaseDate: string | null;
  iconUrl: string | null;
  appStoreUrl: string;
  screenshotUrls: string[];
  ipadScreenshotUrls: string[];
  averageRating: number | null;
  ratingCount: number | null;
  subtitle: string | null;
  promotionalText: string | null;
  previewVideoUrl: string | null;
  reviewSample: Review[];
}

export interface AuditCompetitorInput {
  appId: string;
  name: string;
  developer: string;
  rank: number;
  category: string;
  description: string;
  subtitle: string | null;
  averageRating: number | null;
  ratingCount: number | null;
  iconUrl: string | null;
}

export interface AuditInput {
  app: AuditAppInput;
  competitors: AuditCompetitorInput[];
}

export function buildAuditAppInput(args: {
  appId: string;
  country: string;
  lookup: ItunesLookupResult;
  scraped: Pick<ScrapedListing, 'subtitle' | 'promotionalText' | 'previewVideoUrl'>;
  reviews: Review[];
}): AuditAppInput {
  const { appId, country, lookup, scraped, reviews } = args;
  return {
    appId,
    country,
    name: lookup.trackName,
    developer: lookup.artistName,
    category: lookup.primaryGenreName,
    categoryId: lookup.primaryGenreId,
    description: lookup.description ?? '',
    releaseNotes: lookup.releaseNotes ?? null,
    version: lookup.version ?? null,
    currentVersionReleaseDate: lookup.currentVersionReleaseDate ?? null,
    iconUrl: lookup.artworkUrl512 ?? lookup.artworkUrl100 ?? lookup.artworkUrl60 ?? null,
    appStoreUrl: lookup.trackViewUrl ?? `https://apps.apple.com/${country}/app/id${appId}`,
    screenshotUrls: lookup.screenshotUrls,
    ipadScreenshotUrls: lookup.ipadScreenshotUrls,
    averageRating: lookup.averageUserRating ?? null,
    ratingCount: lookup.userRatingCount ?? null,
    subtitle: scraped.subtitle,
    promotionalText: scraped.promotionalText,
    previewVideoUrl: scraped.previewVideoUrl,
    reviewSample: reviews,
  };
}

export function buildAuditCompetitorInput(args: {
  rank: number;
  lookup: ItunesLookupResult;
  scrapedSubtitle?: string | null;
}): AuditCompetitorInput {
  const { rank, lookup, scrapedSubtitle } = args;
  return {
    appId: String(lookup.trackId),
    name: lookup.trackName,
    developer: lookup.artistName,
    rank,
    category: lookup.primaryGenreName,
    description: lookup.description ?? '',
    subtitle: scrapedSubtitle ?? null,
    averageRating: lookup.averageUserRating ?? null,
    ratingCount: lookup.userRatingCount ?? null,
    iconUrl: lookup.artworkUrl512 ?? lookup.artworkUrl100 ?? lookup.artworkUrl60 ?? null,
  };
}
