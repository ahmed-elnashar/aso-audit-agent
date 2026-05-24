import { z } from 'zod';

export const ItunesLookupResultSchema = z
  .object({
    trackId: z.number(),
    trackName: z.string(),
    artistName: z.string(),
    bundleId: z.string().optional(),
    description: z.string().default(''),
    releaseNotes: z.string().optional(),
    version: z.string().optional(),
    currentVersionReleaseDate: z.string().optional(),
    releaseDate: z.string().optional(),
    primaryGenreId: z.number(),
    primaryGenreName: z.string(),
    genres: z.array(z.string()).default([]),
    screenshotUrls: z.array(z.string()).default([]),
    ipadScreenshotUrls: z.array(z.string()).default([]),
    artworkUrl60: z.string().optional(),
    artworkUrl100: z.string().optional(),
    artworkUrl512: z.string().optional(),
    averageUserRating: z.number().optional(),
    averageUserRatingForCurrentVersion: z.number().optional(),
    userRatingCount: z.number().optional(),
    userRatingCountForCurrentVersion: z.number().optional(),
    formattedPrice: z.string().optional(),
    price: z.number().optional(),
    sellerName: z.string().optional(),
    sellerUrl: z.string().optional(),
    trackViewUrl: z.string().optional(),
    minimumOsVersion: z.string().optional(),
    fileSizeBytes: z.string().optional(),
    contentAdvisoryRating: z.string().optional(),
  })
  .passthrough();

export type ItunesLookupResult = z.infer<typeof ItunesLookupResultSchema>;

export const ItunesLookupResponseSchema = z.object({
  resultCount: z.number(),
  results: z.array(ItunesLookupResultSchema),
});

export class AppNotFoundError extends Error {
  constructor(appId: string, country: string) {
    super(`App ${appId} not found in storefront ${country}`);
    this.name = 'AppNotFoundError';
  }
}

export class ItunesApiError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = 'ItunesApiError';
  }
}
