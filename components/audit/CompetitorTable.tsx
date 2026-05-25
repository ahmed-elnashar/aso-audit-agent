'use client';

interface CompetitorSummary {
  appId: string;
  name: string;
  developer: string;
  rank: number;
  averageRating: number | null;
  ratingCount: number | null;
  subtitle: string | null;
  iconUrl: string | null;
}

export function CompetitorTable({ competitors }: { competitors: CompetitorSummary[] }) {
  return (
    <section aria-labelledby="competitive-position-heading" className="overflow-hidden rounded-2xl border bg-card">
      <header className="border-b px-4 py-3">
        <h2 id="competitive-position-heading" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Competitive position
        </h2>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          Top free apps in the same category.
        </p>
      </header>
      <div className="grid grid-cols-1 divide-y sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {competitors.slice(0, 3).map((c) => (
          <CompetitorCell key={c.appId} competitor={c} />
        ))}
      </div>
    </section>
  );
}

function CompetitorCell({ competitor: c }: { competitor: CompetitorSummary }) {
  return (
    <div className="flex flex-col gap-2 px-4 py-3">
      <div className="flex items-center gap-2.5">
        {c.iconUrl ? (
          <img src={c.iconUrl} alt="" className="size-9 shrink-0 rounded-lg border" />
        ) : (
          <div className="size-9 shrink-0 rounded-lg bg-muted" />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-1.5">
            <span className="text-[10px] tabular-nums text-muted-foreground">#{c.rank}</span>
            <span className="truncate text-xs font-medium">{c.name}</span>
          </div>
          <div className="truncate text-[10px] text-muted-foreground">{c.developer}</div>
        </div>
      </div>
      <div className="flex items-center gap-3 text-[11px]">
        <span className="font-semibold tabular-nums">
          {c.averageRating?.toFixed(2) ?? 'N/A'}
          <span className="text-muted-foreground"> ★</span>
        </span>
        <span className="text-[10px] text-muted-foreground">
          {c.ratingCount ? formatCount(c.ratingCount) + ' ratings' : 'no ratings'}
        </span>
      </div>
      {c.subtitle && <p className="text-[10px] text-muted-foreground">{c.subtitle}</p>}
    </div>
  );
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(0) + 'k';
  return String(n);
}
