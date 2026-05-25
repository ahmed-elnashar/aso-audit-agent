import { describe, expect, it } from 'vitest';
import { diffReports } from './compare';
import { DIMENSIONS, type AuditReport, type DimensionResult, type Dimension } from './types';

function makeDimension(d: Dimension, score: number | null, status: 'assessed' | 'unavailable' = 'assessed'): DimensionResult {
  return { dimension: d, weight: 10, score, evidence: [], recommendations: [], status };
}

function makeReport(overall: number, dims: DimensionResult[]): AuditReport {
  return {
    app: {
      appId: 'x',
      name: 'X',
      developer: 'dev',
      category: 'Productivity',
      country: 'us',
      iconUrl: null,
      appStoreUrl: '',
      version: null,
      currentVersionReleaseDate: null,
      screenshotUrls: [],
      ipadScreenshotUrls: [],
      averageRating: null,
      ratingCount: null,
    },
    overallScore: overall,
    dimensions: dims,
    competitors: [],
    quickWins: [],
    highImpact: [],
    strategic: [],
    generatedAt: new Date().toISOString(),
  };
}

describe('diffReports', () => {
  const allDims = DIMENSIONS.map((d) => makeDimension(d, 7));

  it('emits one row per canonical dimension in stable order', () => {
    const a = makeReport(70, allDims);
    const b = makeReport(70, allDims);
    const diff = diffReports(a, b);
    expect(diff.dimensions.map((d) => d.dimension)).toEqual([...DIMENSIONS]);
  });

  it('reports zero deltas for identical reports', () => {
    const a = makeReport(70, allDims);
    const b = makeReport(70, allDims);
    const diff = diffReports(a, b);
    expect(diff.overall.delta).toBe(0);
    for (const row of diff.dimensions) expect(row.delta).toBe(0);
  });

  it('computes positive delta when A scores higher', () => {
    const a = makeReport(82, [makeDimension('title', 9), ...DIMENSIONS.slice(1).map((d) => makeDimension(d, 7))]);
    const b = makeReport(70, [makeDimension('title', 6), ...DIMENSIONS.slice(1).map((d) => makeDimension(d, 7))]);
    const diff = diffReports(a, b);
    expect(diff.overall.delta).toBe(12);
    expect(diff.dimensions.find((d) => d.dimension === 'title')?.delta).toBe(3);
  });

  it('returns a null delta when either side is unavailable', () => {
    const aDims = DIMENSIONS.map((d) =>
      d === 'ratings' ? makeDimension('ratings', null, 'unavailable') : makeDimension(d, 7)
    );
    const a = makeReport(70, aDims);
    const b = makeReport(70, allDims);
    const diff = diffReports(a, b);
    const row = diff.dimensions.find((d) => d.dimension === 'ratings');
    expect(row?.scoreA).toBe(null);
    expect(row?.scoreB).toBe(7);
    expect(row?.delta).toBe(null);
  });

  it('rounds deltas to one decimal place', () => {
    const a = makeReport(70, [makeDimension('title', 8.34), ...DIMENSIONS.slice(1).map((d) => makeDimension(d, 7))]);
    const b = makeReport(70, [makeDimension('title', 6.13), ...DIMENSIONS.slice(1).map((d) => makeDimension(d, 7))]);
    const diff = diffReports(a, b);
    expect(diff.dimensions.find((d) => d.dimension === 'title')?.delta).toBe(2.2);
  });

  it('handles missing dimensions on one side by emitting null scores', () => {
    const a = makeReport(70, DIMENSIONS.slice(0, 5).map((d) => makeDimension(d, 7)));
    const b = makeReport(70, allDims);
    const diff = diffReports(a, b);
    const missingOnA = diff.dimensions.find((d) => d.dimension === 'previewVideo');
    expect(missingOnA?.scoreA).toBe(null);
    expect(missingOnA?.scoreB).toBe(7);
    expect(missingOnA?.delta).toBe(null);
  });
});
