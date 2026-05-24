import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { fetchTopCharts } from '../../lib/itunes/top-charts';

export const fetchTopChartsTool = createTool({
  id: 'fetch-category-top-charts',
  description:
    "Fetch the top free apps in a given iTunes genre/category. Used to discover competitors for the audit's competitive-position dimension.",
  inputSchema: z.object({
    genreId: z.number().int(),
    country: z.string().default('us'),
    limit: z.number().int().min(1).max(50).default(10),
  }),
  outputSchema: z.object({
    entries: z.array(
      z.object({
        appId: z.string(),
        name: z.string(),
        developer: z.string(),
        rank: z.number(),
      })
    ),
  }),
  execute: async (input) => {
    const entries = await fetchTopCharts({
      genreId: input.genreId,
      country: input.country ?? 'us',
      limit: input.limit ?? 10,
    });
    return { entries };
  },
});
