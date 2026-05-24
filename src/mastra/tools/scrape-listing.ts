import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { scrapeListing } from '../../lib/scrape/listing';

export const scrapeListingTool = createTool({
  id: 'scrape-listing-page',
  description:
    "Scrape the public App Store listing page to extract fields not exposed by Apple's JSON APIs: subtitle, promotional text, preview video URL. Best-effort — returns nulls if extraction fails.",
  inputSchema: z.object({
    appId: z.string(),
    country: z.string().default('us'),
    slug: z.string().nullable().default(null),
  }),
  outputSchema: z.object({
    subtitle: z.string().nullable(),
    promotionalText: z.string().nullable(),
    previewVideoUrl: z.string().nullable(),
  }),
  execute: async (input) => {
    return scrapeListing({
      appId: input.appId,
      country: input.country ?? 'us',
      slug: input.slug ?? null,
    });
  },
});
