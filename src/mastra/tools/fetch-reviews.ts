import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { fetchReviews } from '../../lib/itunes/reviews';

export const fetchReviewsTool = createTool({
  id: 'fetch-recent-reviews',
  description:
    "Fetch recent customer reviews via Apple's RSS feed. Note: as of 2026 the public feed returns empty results for most apps — the audit gracefully degrades when this is the case.",
  inputSchema: z.object({
    appId: z.string(),
    country: z.string().default('us'),
    pages: z.number().int().min(1).max(10).default(1),
  }),
  outputSchema: z.object({
    reviews: z.array(
      z.object({
        id: z.string(),
        author: z.string(),
        rating: z.number(),
        title: z.string(),
        body: z.string(),
        updatedAt: z.string(),
        version: z.string().nullable(),
      })
    ),
    sourceAvailable: z.boolean(),
  }),
  execute: async (input) => {
    const reviews = await fetchReviews({
      appId: input.appId,
      country: input.country ?? 'us',
      pages: input.pages ?? 1,
    });
    return { reviews, sourceAvailable: reviews.length > 0 };
  },
});
