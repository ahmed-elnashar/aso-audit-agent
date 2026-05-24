import { describe, expect, it } from 'vitest';
import { runAudit } from './run';
import { makeAuditInput, makeCompetitor } from './__fixtures__/build-input';
import { DIMENSIONS } from './types';

/**
 * Integration test for the audit engine: feeds a complete, fixture-built
 * AuditInput through runAudit() and asserts the full report shape. Skips the
 * LLM (withLlm: false) so this stays hermetic and fast — the LLM path is
 * exercised separately by scripts/smoke-audit.ts against a real API.
 */
describe('runAudit (deterministic-only integration)', () => {
  const input = makeAuditInput({
    competitors: [
      makeCompetitor({ rank: 1 }),
      makeCompetitor({ rank: 2, appId: '3', name: 'Idea Pad' }),
      makeCompetitor({ rank: 3, appId: '4', name: 'Quick Notes' }),
    ],
  });

  it('produces all 10 dimensions in the report', async () => {
    const report = await runAudit(input, { withLlm: false });
    expect(report.dimensions.map((d) => d.dimension).sort()).toEqual([...DIMENSIONS].sort());
  });

  it('returns an overall score in 0..100', async () => {
    const report = await runAudit(input, { withLlm: false });
    expect(report.overallScore).toBeGreaterThanOrEqual(0);
    expect(report.overallScore).toBeLessThanOrEqual(100);
  });

  it('carries the app summary and competitors through to the report', async () => {
    const report = await runAudit(input, { withLlm: false });
    expect(report.app.name).toBe(input.app.name);
    expect(report.competitors).toHaveLength(input.competitors.length);
    expect(report.app.appStoreUrl).toBe(input.app.appStoreUrl);
  });

  it('buckets every deterministic recommendation into exactly one of the three categories', async () => {
    const report = await runAudit(input, { withLlm: false });
    const total = report.dimensions.flatMap((d) => d.recommendations).length;
    expect(report.quickWins.length + report.highImpact.length + report.strategic.length).toBe(total);
  });

  it('emits progress events in the documented order', async () => {
    const stages: string[] = [];
    await runAudit(input, { withLlm: false, onProgress: (e) => stages.push(e.stage) });
    expect(stages[0]).toBe('deterministic');
    expect(stages).toContain('qualitative-skipped');
    expect(stages[stages.length - 1]).toBe('aggregating');
  });

  it('excludes unavailable dimensions from the overall denominator', async () => {
    // Force ratings + competitive to be unavailable by stripping rating data
    // and removing competitors. Overall score should still compute (not be 0)
    // because the other 8 dimensions are still assessed.
    const sparseInput = makeAuditInput({
      app: { averageRating: null, ratingCount: null },
      competitors: [],
    });
    const report = await runAudit(sparseInput, { withLlm: false });
    expect(report.overallScore).toBeGreaterThan(0);
    const unavailable = report.dimensions.filter((d) => d.status === 'unavailable');
    expect(unavailable.map((d) => d.dimension).sort()).toEqual(['competitive', 'ratings']);
  });
});
