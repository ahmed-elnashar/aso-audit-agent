import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { asoAuditWorkflow } from '../workflows/aso-audit-workflow';

const CandidateSummarySchema = z.object({
  appId: z.string(),
  country: z.string(),
  name: z.string(),
  developer: z.string(),
  category: z.string(),
  iconUrl: z.string().nullable(),
  appStoreUrl: z.string(),
});

const STORE_URL_HINT =
  'Pass the full URL the user shared, e.g. https://apps.apple.com/us/app/spotify-music-and-podcasts/id324684580.';

export const startAuditTool = createTool({
  id: 'start-audit',
  description:
    'Start the ASO audit for an Apple App Store URL. Returns a runId and the candidate app metadata; the workflow then suspends until you call resumeAudit with the user\'s confirmation.',
  inputSchema: z.object({
    url: z.string().describe(STORE_URL_HINT),
  }),
  outputSchema: z.object({
    runId: z.string(),
    status: z.enum(['needs-confirmation', 'failed']),
    candidate: CandidateSummarySchema.nullable(),
    error: z.string().nullable(),
  }),
  execute: async (input) => {
    try {
      const run = await asoAuditWorkflow.createRun();
      const result = await run.start({ inputData: { url: input.url } });
      if (result.status !== 'suspended') {
        return {
          runId: run.runId,
          status: 'failed' as const,
          candidate: null,
          error: `expected suspended after identify step, got ${result.status}`,
        };
      }
      const candidate = result.suspendPayload?.['confirm-and-audit']?.candidate;
      if (!candidate) {
        return {
          runId: run.runId,
          status: 'failed' as const,
          candidate: null,
          error: 'workflow suspended without a candidate payload',
        };
      }
      return {
        runId: run.runId,
        status: 'needs-confirmation' as const,
        candidate: {
          appId: candidate.appId,
          country: candidate.country,
          name: candidate.name,
          developer: candidate.developer,
          category: candidate.category,
          iconUrl: candidate.iconUrl ?? null,
          appStoreUrl: candidate.appStoreUrl,
        },
        error: null,
      };
    } catch (err) {
      return {
        runId: '',
        status: 'failed' as const,
        candidate: null,
        error: err instanceof Error ? err.message : 'unknown error',
      };
    }
  },
});

export const resumeAuditTool = createTool({
  id: 'resume-audit',
  description:
    'Resume a suspended audit run with the user\'s yes/no confirmation. On approved=true, the full audit runs and the structured AuditReport is returned. On approved=false, the workflow ends with status=cancelled.',
  inputSchema: z.object({
    runId: z.string().describe('The runId returned by start-audit.'),
    approved: z.boolean(),
  }),
  outputSchema: z.object({
    status: z.enum(['completed', 'cancelled', 'failed']),
    report: z.unknown().nullable(),
    error: z.string().nullable(),
  }),
  execute: async (input) => {
    try {
      const run = await asoAuditWorkflow.createRun({ runId: input.runId });
      const result = await run.resume({
        step: 'confirm-and-audit',
        resumeData: { approved: input.approved },
      });
      if (result.status !== 'success') {
        return {
          status: 'failed' as const,
          report: null,
          error: `unexpected workflow status ${result.status}`,
        };
      }
      const out = result.result as {
        status: 'completed' | 'cancelled';
        report: unknown;
      };
      return {
        status: out.status,
        report: out.status === 'completed' ? out.report : null,
        error: null,
      };
    } catch (err) {
      return {
        status: 'failed' as const,
        report: null,
        error: err instanceof Error ? err.message : 'unknown error',
      };
    }
  },
});
