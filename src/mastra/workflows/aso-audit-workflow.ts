import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';
import { parseAppStoreUrl } from '../../lib/parse-app-url';
import { lookupApp, lookupApps } from '../../lib/itunes/lookup';
import { fetchReviews } from '../../lib/itunes/reviews';
import { fetchTopCharts } from '../../lib/itunes/top-charts';
import { scrapeListing } from '../../lib/scrape/listing';
import { buildAuditAppInput, buildAuditCompetitorInput } from '../../audit/inputs';
import { runAudit } from '../../audit/run';
import { RecommendationSchema } from '../../audit/types';
import { emitProgress } from '../progress-emitter';

const AppCandidateSchema = z.object({
  appId: z.string(),
  country: z.string(),
  slug: z.string().nullable(),
  name: z.string(),
  developer: z.string(),
  category: z.string(),
  iconUrl: z.string().nullable(),
  appStoreUrl: z.string(),
});

const DimensionResultSchema = z.object({
  dimension: z.string(),
  weight: z.number(),
  score: z.number().nullable(),
  evidence: z.array(z.string()),
  recommendations: z.array(RecommendationSchema),
  status: z.enum(['assessed', 'unavailable']),
  unavailableReason: z.string().optional(),
});

const AuditReportSchema = z.object({
  app: z.object({
    appId: z.string(),
    name: z.string(),
    developer: z.string(),
    category: z.string(),
    country: z.string(),
    iconUrl: z.string().nullable(),
    appStoreUrl: z.string(),
    version: z.string().nullable(),
    currentVersionReleaseDate: z.string().nullable(),
  }),
  overallScore: z.number(),
  dimensions: z.array(DimensionResultSchema),
  competitors: z.array(
    z.object({
      appId: z.string(),
      name: z.string(),
      developer: z.string(),
      rank: z.number(),
      averageRating: z.number().nullable(),
      ratingCount: z.number().nullable(),
      subtitle: z.string().nullable(),
      iconUrl: z.string().nullable(),
    })
  ),
  quickWins: z.array(RecommendationSchema),
  highImpact: z.array(RecommendationSchema),
  strategic: z.array(RecommendationSchema),
  generatedAt: z.string(),
});

const identifyCandidate = createStep({
  id: 'identify-candidate',
  description: 'Parse the Apple App Store URL and fetch surface metadata for confirmation.',
  inputSchema: z.object({
    url: z.string().describe('Full Apple App Store URL'),
  }),
  outputSchema: AppCandidateSchema,
  execute: async ({ inputData }) => {
    const parsed = parseAppStoreUrl(inputData.url);
    const lookup = await lookupApp({ appId: parsed.appId, country: parsed.country });
    return {
      appId: parsed.appId,
      country: parsed.country,
      slug: parsed.slug,
      name: lookup.trackName,
      developer: lookup.artistName,
      category: lookup.primaryGenreName,
      iconUrl: lookup.artworkUrl512 ?? lookup.artworkUrl100 ?? null,
      appStoreUrl:
        lookup.trackViewUrl ?? `https://apps.apple.com/${parsed.country}/app/id${parsed.appId}`,
    };
  },
});

const confirmAndAudit = createStep({
  id: 'confirm-and-audit',
  description:
    'Suspend the workflow to confirm the app with the user. On resume with approved=true, run the full audit. On approved=false, return a cancelled report.',
  inputSchema: AppCandidateSchema,
  suspendSchema: z.object({
    candidate: AppCandidateSchema,
  }),
  resumeSchema: z.object({
    approved: z.boolean(),
  }),
  outputSchema: z.object({
    status: z.enum(['completed', 'cancelled']),
    report: AuditReportSchema.nullable(),
    cancelledFor: AppCandidateSchema.nullable(),
  }),
  execute: async ({ inputData, resumeData, suspend, runId }) => {
    if (!resumeData) {
      await suspend({ candidate: inputData });
      return { status: 'cancelled' as const, report: null, cancelledFor: inputData };
    }
    if (!resumeData.approved) {
      return { status: 'cancelled' as const, report: null, cancelledFor: inputData };
    }

    const { appId, country, slug } = inputData;
    const lookup = await lookupApp({ appId, country });

    emitProgress(runId, { stage: 'fetching-listing-data' });
    const [scraped, reviews, topCharts] = await Promise.all([
      scrapeListing({ appId, country, slug }),
      fetchReviews({ appId, country, pages: 1 }),
      fetchTopCharts({ genreId: lookup.primaryGenreId, country, limit: 11 }),
    ]);

    const competitorIds = topCharts
      .filter((c) => c.appId !== appId)
      .slice(0, 3)
      .map((c) => c.appId);
    emitProgress(runId, { stage: 'fetching-competitors', detail: `${competitorIds.length} apps` });
    const competitorLookups = competitorIds.length
      ? await lookupApps({ appIds: competitorIds, country })
      : [];
    const competitors = competitorLookups.map((l, i) =>
      buildAuditCompetitorInput({ rank: i + 1, lookup: l })
    );

    const auditInput = {
      app: buildAuditAppInput({ appId, country, lookup, scraped, reviews }),
      competitors,
    };

    const report = await runAudit(auditInput, {
      onProgress: (e) => emitProgress(runId, { stage: e.stage }),
    });

    return { status: 'completed' as const, report, cancelledFor: null };
  },
});

export const asoAuditWorkflow = createWorkflow({
  id: 'aso-audit-workflow',
  description:
    'Audits an Apple App Store listing. Step 1 fetches surface metadata for user confirmation. Step 2 suspends until the user approves, then runs the full audit and returns a scorecard with prioritized recommendations.',
  inputSchema: z.object({ url: z.string() }),
  outputSchema: z.object({
    status: z.enum(['completed', 'cancelled']),
    report: AuditReportSchema.nullable(),
    cancelledFor: AppCandidateSchema.nullable(),
  }),
})
  .then(identifyCandidate)
  .then(confirmAndAudit)
  .commit();
