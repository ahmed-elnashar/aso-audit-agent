'use client';

import Link from 'next/link';
import { ScoreCard } from './ScoreCard';
import type { AuditReport } from '@/audit/types';
import { diffReports, type DimensionDiff } from '@/audit/compare';

const DIMENSION_LABELS: Record<string, string> = {
  title: 'Title',
  subtitle: 'Subtitle',
  keywords: 'Keyword field',
  description: 'Description',
  screenshots: 'Screenshots',
  previewVideo: 'Preview video',
  ratings: 'Ratings & reviews',
  icon: 'Icon',
  conversion: 'Conversion signals',
  competitive: 'Competitive position',
};

export function CompareView({ a, b }: { a: AuditReport; b: AuditReport }) {
  const diff = diffReports(a, b);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-base font-semibold tracking-tight">
          {a.app.name} <span className="text-muted-foreground">vs</span> {b.app.name}
        </h1>
        <Link href="/" className="text-xs text-muted-foreground hover:text-foreground">
          ← Back to chat
        </Link>
      </header>

      <div className="grid gap-5 lg:grid-cols-2">
        <ScoreCard report={a} />
        <ScoreCard report={b} />
      </div>

      <section aria-labelledby="delta-heading" className="overflow-hidden rounded-2xl border bg-card">
        <div className="flex items-center justify-between border-b px-5 py-3">
          <h2 id="delta-heading" className="text-sm font-semibold">Per-dimension delta</h2>
          <OverallDelta a={diff.overall.a} b={diff.overall.b} delta={diff.overall.delta} aName={a.app.name} bName={b.app.name} />
        </div>
        <table className="w-full text-sm">
          <thead className="text-[11px] uppercase tracking-wider text-muted-foreground">
            <tr className="border-b">
              <th className="px-5 py-2 text-left font-medium">Dimension</th>
              <th className="px-2 py-2 text-right font-medium" title={a.app.name}>{truncate(a.app.name, 14)}</th>
              <th className="px-2 py-2 text-right font-medium" title={b.app.name}>{truncate(b.app.name, 14)}</th>
              <th className="px-5 py-2 text-right font-medium">Δ</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {diff.dimensions.map((row) => (
              <DeltaRow key={row.dimension} row={row} />
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function DeltaRow({ row }: { row: DimensionDiff }) {
  const label = DIMENSION_LABELS[row.dimension] ?? row.dimension;
  return (
    <tr>
      <td className="px-5 py-2 text-xs">
        <span className="font-medium">{label}</span>
        <span className="ml-1.5 text-[10px] text-muted-foreground">{row.weight}%</span>
      </td>
      <td className="px-2 py-2 text-right tabular-nums text-xs">{formatScore(row.scoreA)}</td>
      <td className="px-2 py-2 text-right tabular-nums text-xs">{formatScore(row.scoreB)}</td>
      <td className="px-5 py-2 text-right">
        <DeltaCell delta={row.delta} />
      </td>
    </tr>
  );
}

function DeltaCell({ delta }: { delta: number | null }) {
  if (delta === null) {
    return <span className="text-[11px] uppercase tracking-wider text-muted-foreground">N/A</span>;
  }
  if (delta === 0) {
    return <span className="text-xs tabular-nums text-muted-foreground">±0</span>;
  }
  const positive = delta > 0;
  const color = positive ? 'text-good' : 'text-bad';
  const arrow = positive ? '▲' : '▼';
  return (
    <span className={`text-xs font-semibold tabular-nums ${color}`}>
      {arrow} {Math.abs(delta).toFixed(1)}
    </span>
  );
}

function OverallDelta({ a, b, delta, aName, bName }: { a: number; b: number; delta: number; aName: string; bName: string }) {
  if (delta === 0) {
    return <span className="text-xs text-muted-foreground">Tied at {a}</span>;
  }
  const winner = delta > 0 ? aName : bName;
  const color = delta > 0 ? 'text-good' : 'text-bad';
  return (
    <span className="text-xs text-muted-foreground">
      <span className={`font-semibold ${color}`}>{winner}</span> leads by{' '}
      <span className={`font-semibold tabular-nums ${color}`}>{Math.abs(delta).toFixed(1)}</span>
      <span className="ml-1 text-[10px]">({a} vs {b})</span>
    </span>
  );
}

function formatScore(score: number | null): string {
  if (score === null) return '—';
  return score.toFixed(1);
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}
