import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { lookupApp, lookupApps } from '../../lib/itunes/lookup';

export const lookupAppTool = createTool({
  id: 'lookup-app',
  description:
    'Fetch surface metadata for an Apple App Store app by ID. Returns name, developer, icon URL, category, rating, and version — enough to confirm the right app with a user before running the full audit.',
  inputSchema: z.object({
    appId: z.string().describe('Numeric Apple App ID (e.g. 324684580 for Spotify)'),
    country: z.string().default('us').describe('Two-letter storefront code, e.g. us, gb, jp'),
  }),
  outputSchema: z.object({
    appId: z.string(),
    name: z.string(),
    developer: z.string(),
    category: z.string(),
    iconUrl: z.string().nullable(),
    averageRating: z.number().nullable(),
    ratingCount: z.number().nullable(),
    version: z.string().nullable(),
    appStoreUrl: z.string(),
  }),
  execute: async (input) => {
    const country = input.country ?? 'us';
    const result = await lookupApp({ appId: input.appId, country });
    return {
      appId: String(result.trackId),
      name: result.trackName,
      developer: result.artistName,
      category: result.primaryGenreName,
      iconUrl: result.artworkUrl512 ?? result.artworkUrl100 ?? null,
      averageRating: result.averageUserRating ?? null,
      ratingCount: result.userRatingCount ?? null,
      version: result.version ?? null,
      appStoreUrl:
        result.trackViewUrl ?? `https://apps.apple.com/${country}/app/id${result.trackId}`,
    };
  },
});

export const lookupAppsTool = createTool({
  id: 'lookup-apps-batch',
  description: 'Batch-fetch metadata for multiple App Store apps by ID (used for competitor analysis).',
  inputSchema: z.object({
    appIds: z.array(z.string()).min(1).max(20),
    country: z.string().default('us'),
  }),
  outputSchema: z.object({
    results: z.array(
      z.object({
        appId: z.string(),
        name: z.string(),
        developer: z.string(),
        category: z.string(),
        averageRating: z.number().nullable(),
        ratingCount: z.number().nullable(),
        iconUrl: z.string().nullable(),
      })
    ),
  }),
  execute: async (input) => {
    const results = await lookupApps({ appIds: input.appIds, country: input.country ?? 'us' });
    return {
      results: results.map((r) => ({
        appId: String(r.trackId),
        name: r.trackName,
        developer: r.artistName,
        category: r.primaryGenreName,
        averageRating: r.averageUserRating ?? null,
        ratingCount: r.userRatingCount ?? null,
        iconUrl: r.artworkUrl512 ?? r.artworkUrl100 ?? null,
      })),
    };
  },
});
