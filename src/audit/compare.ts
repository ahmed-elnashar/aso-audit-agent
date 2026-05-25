import { DIMENSIONS, type AuditReport, type Dimension } from './types';

export interface DimensionDiff {
  dimension: Dimension;
  weight: number;
  scoreA: number | null;
  scoreB: number | null;
  /** Positive: A scores higher than B. Null when either side is unavailable. */
  delta: number | null;
}

export interface ReportDiff {
  overall: { a: number; b: number; delta: number };
  dimensions: DimensionDiff[];
}

/** Iterates DIMENSIONS (not the input arrays) so the UI gets a stable row order. */
export function diffReports(a: AuditReport, b: AuditReport): ReportDiff {
  const byDimA = new Map(a.dimensions.map((d) => [d.dimension, d]));
  const byDimB = new Map(b.dimensions.map((d) => [d.dimension, d]));

  const dimensions: DimensionDiff[] = DIMENSIONS.map((dim) => {
    const da = byDimA.get(dim);
    const db = byDimB.get(dim);
    const scoreA = da?.score ?? null;
    const scoreB = db?.score ?? null;
    return {
      dimension: dim,
      weight: da?.weight ?? db?.weight ?? 0,
      scoreA,
      scoreB,
      delta: scoreA !== null && scoreB !== null ? round1(scoreA - scoreB) : null,
    };
  });

  return {
    overall: {
      a: a.overallScore,
      b: b.overallScore,
      delta: round1(a.overallScore - b.overallScore),
    },
    dimensions,
  };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
